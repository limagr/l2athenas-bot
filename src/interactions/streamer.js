const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, MessageFlags } = require('discord.js')

const TWITCH_DAYS = parseInt(process.env.STREAMER_TWITCH_DAYS || '14')
const YOUTUBE_DAYS = parseInt(process.env.STREAMER_YOUTUBE_DAYS || '14')

// ─── API (l2athenas_server) ─────────────────────────────────────────────────────

async function callApi(path, body) {
  const baseUrl = process.env.API_BASE_URL
  const secret = process.env.BOT_API_SECRET
  if (!baseUrl || !secret) {
    console.error('[Streamer] API_BASE_URL ou BOT_API_SECRET não configurados.')
    return { ok: false, error: 'API não configurada.' }
  }

  try {
    const res = await fetch(`${baseUrl}/streamers${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Bot-Secret': secret },
      body: JSON.stringify(body),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) return { ok: false, error: data.message ?? `HTTP ${res.status}` }
    return { ok: true, data }
  } catch (err) {
    console.error('[Streamer] Erro ao chamar API:', err.message)
    return { ok: false, error: 'Falha de conexão com a API.' }
  }
}

function linkChannel(discordUserId, platform, identifier, identifierType) {
  return callApi('/link-channel', { discordUserId, platform, identifier, identifierType })
}

function linkCharacter(discordUserId, charName) {
  return callApi('/link-character', { discordUserId, charName })
}

// ─── Duration Helpers ─────────────────────────────────────────────────────────

// Twitch: "3h22m15s" → seconds
function parseTwitchDuration(str) {
  const m = str.match(/(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?/)
  return (parseInt(m?.[1] || 0) * 3600) + (parseInt(m?.[2] || 0) * 60) + parseInt(m?.[3] || 0)
}

// YouTube: "PT3H22M15S" → seconds
function parseIsoDuration(str) {
  const m = str.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  return (parseInt(m?.[1] || 0) * 3600) + (parseInt(m?.[2] || 0) * 60) + parseInt(m?.[3] || 0)
}

function formatHours(seconds) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h === 0) return `${m}min`
  if (m === 0) return `${h}h`
  return `${h}h ${m}min`
}

// ─── URL Parsing ──────────────────────────────────────────────────────────────

function parseStreamUrl(rawUrl) {
  let url
  try {
    url = new URL(rawUrl.trim())
  } catch {
    return null
  }

  const host = url.hostname.replace('www.', '')
  const parts = url.pathname.split('/').filter(Boolean)

  if (host === 'twitch.tv' && parts[0]) {
    return { platform: 'twitch', identifier: parts[0].toLowerCase(), identifierType: 'login' }
  }

  if (host === 'youtube.com' || host === 'youtu.be') {
    if (parts[0]?.startsWith('@'))        return { platform: 'youtube', identifier: parts[0].slice(1), identifierType: 'handle' }
    if (parts[0] === 'channel' && parts[1]) return { platform: 'youtube', identifier: parts[1], identifierType: 'id' }
    if (parts[0] === 'c' && parts[1])     return { platform: 'youtube', identifier: parts[1], identifierType: 'handle' }
    if (parts[0] === 'user' && parts[1])  return { platform: 'youtube', identifier: parts[1], identifierType: 'username' }
  }

  if (host === 'kick.com' && parts[0]) {
    return { platform: 'kick', identifier: parts[0].toLowerCase(), identifierType: 'login' }
  }

  return null
}

// ─── Twitch API ───────────────────────────────────────────────────────────────

let _twitchToken = null
let _twitchTokenExpiry = 0

async function getTwitchToken() {
  if (_twitchToken && Date.now() < _twitchTokenExpiry) return _twitchToken

  const res = await fetch('https://id.twitch.tv/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.TWITCH_CLIENT_ID,
      client_secret: process.env.TWITCH_CLIENT_SECRET,
      grant_type: 'client_credentials',
    }),
  })
  if (!res.ok) throw new Error(`Twitch token HTTP ${res.status}`)
  const data = await res.json()
  _twitchToken = data.access_token
  _twitchTokenExpiry = Date.now() + (data.expires_in - 60) * 1000
  return _twitchToken
}

async function fetchTwitchInfo(login) {
  const token = await getTwitchToken()
  const headers = {
    'Client-ID': process.env.TWITCH_CLIENT_ID,
    'Authorization': `Bearer ${token}`,
  }

  const userRes = await fetch(`https://api.twitch.tv/helix/users?login=${encodeURIComponent(login)}`, { headers })
  const userData = await userRes.json()
  const user = userData.data?.[0]
  if (!user) return null

  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString()

  const [streamRes, vodRes] = await Promise.all([
    fetch(`https://api.twitch.tv/helix/streams?user_id=${user.id}`, { headers }),
    fetch(`https://api.twitch.tv/helix/videos?user_id=${user.id}&type=archive&first=20`, { headers }),
  ])

  const streamData = await streamRes.json()
  const vodData = await vodRes.json()

  const isLive = streamData.data?.length > 0
  const viewers = isLive ? streamData.data[0].viewer_count : null
  const vods = vodData.data ?? []
  const lastVod = vods[0]

  const weeklySeconds = vods
    .filter(v => new Date(v.created_at) >= new Date(weekAgo))
    .reduce((sum, v) => sum + parseTwitchDuration(v.duration), 0)

  return {
    platform: 'twitch',
    displayName: user.display_name,
    profileImage: user.profile_image_url,
    url: `https://twitch.tv/${user.login}`,
    isLive,
    viewers,
    lastStreamDate: lastVod ? new Date(lastVod.created_at) : null,
    weeklySeconds,
  }
}

// ─── YouTube API ──────────────────────────────────────────────────────────────

async function fetchYoutubeInfo(identifier, identifierType) {
  const key = process.env.YOUTUBE_API_KEY
  if (!key) return null

  let channelData = null

  if (identifierType === 'id') {
    const res = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${encodeURIComponent(identifier)}&key=${key}`)
    const data = await res.json()
    channelData = data.items?.[0]
  }

  if (!channelData && (identifierType === 'handle' || identifierType === 'username')) {
    const res = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&forHandle=${encodeURIComponent(identifier)}&key=${key}`)
    const data = await res.json()
    channelData = data.items?.[0]
  }

  if (!channelData && identifierType === 'username') {
    const res = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&forUsername=${encodeURIComponent(identifier)}&key=${key}`)
    const data = await res.json()
    channelData = data.items?.[0]
  }

  if (!channelData) return null

  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString()

  const searchRes = await fetch(
    `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelData.id}&type=video&eventType=completed&order=date&maxResults=20&key=${key}`
  )
  const searchData = await searchRes.json()
  const allStreams = searchData.items ?? []
  const lastStream = allStreams[0]

  // Fetch durations for streams from the last 7 days
  const recentIds = allStreams
    .filter(v => new Date(v.snippet.publishedAt) >= new Date(weekAgo))
    .map(v => v.id.videoId)

  let weeklySeconds = 0
  if (recentIds.length > 0) {
    const detailRes = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${recentIds.join(',')}&key=${key}`
    )
    const detailData = await detailRes.json()
    weeklySeconds = (detailData.items ?? []).reduce((sum, v) => sum + parseIsoDuration(v.contentDetails.duration), 0)
  }

  return {
    platform: 'youtube',
    displayName: channelData.snippet.title,
    profileImage: channelData.snippet.thumbnails?.default?.url,
    url: `https://youtube.com/channel/${channelData.id}`,
    subscribers: parseInt(channelData.statistics?.subscriberCount || '0'),
    lastStreamDate: lastStream ? new Date(lastStream.snippet.publishedAt) : null,
    weeklySeconds,
  }
}

// ─── Criteria ─────────────────────────────────────────────────────────────────

function checkCriteria(info, platform) {
  if (!info) {
    return { approved: false, reason: platform === 'kick'
      ? 'Kick não possui API pública — revisão manual obrigatória.'
      : 'API não configurada ou canal não encontrado — revisão manual.' }
  }

  const daysSince = info.lastStreamDate
    ? (Date.now() - info.lastStreamDate.getTime()) / 86_400_000
    : null

  if (info.platform === 'twitch') {
    if (info.isLive) return { approved: true, reason: `Está ao vivo agora (${info.viewers?.toLocaleString() ?? '?'} viewers).` }
    if (daysSince !== null && daysSince <= TWITCH_DAYS) return { approved: true, reason: `Transmitiu há ${Math.floor(daysSince)} dia(s).` }
    if (daysSince === null) return { approved: false, reason: 'Nenhuma transmissão encontrada neste canal.' }
    return { approved: false, reason: `Última transmissão há ${Math.floor(daysSince)} dias (limite: ${TWITCH_DAYS}).` }
  }

  if (info.platform === 'youtube') {
    if (daysSince !== null && daysSince <= YOUTUBE_DAYS) return { approved: true, reason: `Última live há ${Math.floor(daysSince)} dia(s).` }
    if (daysSince === null) return { approved: false, reason: 'Nenhuma live encontrada neste canal.' }
    return { approved: false, reason: `Última live há ${Math.floor(daysSince)} dias (limite: ${YOUTUBE_DAYS}).` }
  }

  return { approved: false, reason: 'Plataforma requer revisão manual.' }
}

// ─── Embed ────────────────────────────────────────────────────────────────────

function buildReviewEmbed(member, parsed, info, criteria) {
  const embed = new EmbedBuilder()
    .setTitle('📋 Solicitação de Cargo Streamer')
    .setColor(criteria.approved ? 0x00b894 : 0xfdcb6e)
    .setThumbnail(info?.profileImage ?? null)
    .addFields(
      { name: 'Usuário', value: `${member} (${member.user.tag})`, inline: true },
      { name: 'Plataforma', value: parsed.platform.charAt(0).toUpperCase() + parsed.platform.slice(1), inline: true },
      { name: 'Canal', value: info ? `[${info.displayName}](${info.url})` : `\`${parsed.identifier}\``, inline: true },
    )

  if (info?.platform === 'twitch') {
    embed.addFields(
      { name: 'Ao vivo agora', value: info.isLive ? `✅ Sim (${info.viewers?.toLocaleString()} viewers)` : '❌ Não', inline: true },
      { name: 'Última stream', value: info.lastStreamDate ? `<t:${Math.floor(info.lastStreamDate / 1000)}:R>` : 'Desconhecida', inline: true },
      { name: 'Horas (últimos 7 dias)', value: info.weeklySeconds > 0 ? formatHours(info.weeklySeconds) : '—', inline: true },
    )
  }

  if (info?.platform === 'youtube') {
    embed.addFields(
      { name: 'Inscritos', value: info.subscribers?.toLocaleString() ?? '?', inline: true },
      { name: 'Última live', value: info.lastStreamDate ? `<t:${Math.floor(info.lastStreamDate / 1000)}:R>` : 'Desconhecida', inline: true },
      { name: 'Horas (últimos 7 dias)', value: info.weeklySeconds > 0 ? formatHours(info.weeklySeconds) : '—', inline: true },
    )
  }

  embed.addFields({
    name: criteria.approved ? '✅ Auto-aprovado' : '⏳ Revisão manual necessária',
    value: criteria.reason,
  })

  embed.setTimestamp().setFooter({ text: `ID: ${member.id} | ${parsed.platform}:${parsed.identifierType}:${parsed.identifier}` })
  return embed
}

function parseFooter(footerText) {
  const m = footerText.match(/^ID: (\d+) \| (\w+):(\w+):(.+)$/)
  if (!m) return null
  return { userId: m[1], platform: m[2], identifierType: m[3], identifier: m[4] }
}

// ─── Request Embed (canal fixo com botão) ──────────────────────────────────────

function buildStreamerRequestEmbed() {
  const embed = new EmbedBuilder()
    .setTitle('🎥 Cargo Streamer')
    .setColor(0x9146ff)
    .setDescription(
      [
        'É streamer ou criador de conteúdo de L2 Athenas? Solicite o cargo **Streamer**!',
        '',
        '**Como funciona:**',
        '• Clique no botão abaixo e informe o link do seu canal (Twitch, YouTube ou Kick)',
        '• Canais da Twitch/YouTube ativos recentemente são aprovados automaticamente',
        '• Caso contrário, a equipe revisa manualmente em até 48h',
      ].join('\n')
    )
    .setFooter({ text: 'L2 Athenas • Streamers' })

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('solicitar-cargo-streamer')
      .setLabel('🎥  Solicitar Cargo')
      .setStyle(ButtonStyle.Primary)
  )

  return { embeds: [embed], components: [row] }
}

async function handleStreamerRequestButton(interaction) {
  const roleId = process.env.ROLE_STREAMER_ID
  if (roleId && interaction.member.roles.cache.has(roleId)) {
    return interaction.reply({ content: '✅ Você já possui o cargo **Streamer**.', flags: MessageFlags.Ephemeral })
  }

  const modal = new ModalBuilder()
    .setCustomId('modal-streamer-request')
    .setTitle('Solicitar Cargo Streamer')

  const urlInput = new TextInputBuilder()
    .setCustomId('streamer-url')
    .setLabel('Link do seu canal')
    .setPlaceholder('https://twitch.tv/seucanal')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)

  modal.addComponents(new ActionRowBuilder().addComponents(urlInput))
  await interaction.showModal(modal)
}

async function handleStreamerModalSubmit(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral })

  const rawUrl = interaction.fields.getTextInputValue('streamer-url').trim()
  return processStreamerRequest(interaction, rawUrl)
}

// ─── Core Logic ─────────────────────────────────────────────────────────────

async function processStreamerRequest(interaction, rawUrl) {
  const roleId = process.env.ROLE_STREAMER_ID
  if (roleId && interaction.member.roles.cache.has(roleId)) {
    return interaction.editReply({ content: '✅ Você já possui o cargo **Streamer**.' })
  }

  const parsed = parseStreamUrl(rawUrl)

  if (!parsed) {
    return interaction.editReply({
      content: '❌ URL inválida. Envie o link do seu **canal** (não de uma live específica).\nExemplos:\n• `https://twitch.tv/seucanal`\n• `https://youtube.com/@seucanal`\n• `https://kick.com/seucanal`',
    })
  }

  let info = null
  try {
    if (parsed.platform === 'twitch' && process.env.TWITCH_CLIENT_ID && process.env.TWITCH_CLIENT_SECRET) {
      info = await fetchTwitchInfo(parsed.identifier)
    } else if (parsed.platform === 'youtube' && process.env.YOUTUBE_API_KEY) {
      info = await fetchYoutubeInfo(parsed.identifier, parsed.identifierType)
    }
  } catch (err) {
    console.error('[Streamer] API error:', err.message)
  }

  const criteria = checkCriteria(info, parsed.platform)

  const staffChannelId = process.env.CHANNEL_STREAMER_REVIEW_ID
  const staffChannel = staffChannelId ? interaction.guild.channels.cache.get(staffChannelId) : null

  if (criteria.approved && roleId) {
    try {
      await interaction.member.roles.add(roleId, 'Auto-aprovado via solicitação de cargo Streamer')
    } catch (err) {
      console.error('[Streamer] Erro ao atribuir cargo:', err.message)
      return interaction.editReply({ content: '❌ Não foi possível atribuir o cargo. Verifique as permissões do bot.' })
    }

    await linkChannel(interaction.member.id, parsed.platform, parsed.identifier, parsed.identifierType)

    if (staffChannel) {
      const embed = buildReviewEmbed(interaction.member, parsed, info, criteria)
      staffChannel.send({ content: '✅ **Auto-aprovado**', embeds: [embed] }).catch(() => {})
    }

    return interaction.editReply({ content: `✅ Cargo **Streamer** concedido automaticamente!\n> ${criteria.reason}` })
  }

  // Manual review
  if (!staffChannel) {
    return interaction.editReply({ content: '⚠️ Canal de revisão não configurado. Contate um administrador.' })
  }

  const embed = buildReviewEmbed(interaction.member, parsed, info, criteria)
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`aprovar-streamer-${interaction.member.id}`)
      .setLabel('Aprovar')
      .setStyle(ButtonStyle.Success)
      .setEmoji('✅'),
    new ButtonBuilder()
      .setCustomId(`recusar-streamer-${interaction.member.id}`)
      .setLabel('Recusar')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('❌'),
  )

  await staffChannel.send({ embeds: [embed], components: [row] })
  await interaction.editReply({ content: '📋 Sua solicitação foi enviada para revisão da equipe. Você será notificado por DM em breve.' })
}

// ─── Button Handlers ──────────────────────────────────────────────────────────

async function handleStreamerApprove(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral })

  const userId = interaction.customId.replace('aprovar-streamer-', '')
  const roleId = process.env.ROLE_STREAMER_ID
  if (!roleId) return interaction.editReply({ content: '❌ `ROLE_STREAMER_ID` não configurado.' })

  const member = await interaction.guild.members.fetch(userId).catch(() => null)
  if (!member) return interaction.editReply({ content: '❌ Usuário não encontrado no servidor (saiu?).' })

  if (member.roles.cache.has(roleId)) {
    return interaction.editReply({ content: '⚠️ Usuário já possui o cargo Streamer.' })
  }

  await member.roles.add(roleId, `Aprovado por ${interaction.user.tag}`)

  const footer = parseFooter(interaction.message.embeds[0].footer?.text ?? '')
  if (footer) {
    await linkChannel(footer.userId, footer.platform, footer.identifier, footer.identifierType)
  }

  const updatedEmbed = EmbedBuilder.from(interaction.message.embeds[0])
    .setColor(0x00b894)
    .setFooter({ text: `Aprovado por ${interaction.user.tag} • ID: ${userId}` })

  await interaction.message.edit({ embeds: [updatedEmbed], components: [] })
  await interaction.editReply({ content: `✅ Cargo concedido para <@${userId}>.` })

  member.send({ content: '✅ Sua solicitação de cargo **Streamer** foi **aprovada**! Boas lives! 🎮' }).catch(() => {})
}

async function handleStreamerReject(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral })

  const userId = interaction.customId.replace('recusar-streamer-', '')

  const updatedEmbed = EmbedBuilder.from(interaction.message.embeds[0])
    .setColor(0xd63031)
    .setFooter({ text: `Recusado por ${interaction.user.tag} • ID: ${userId}` })

  await interaction.message.edit({ embeds: [updatedEmbed], components: [] })
  await interaction.editReply({ content: `❌ Solicitação de <@${userId}> recusada.` })

  const member = await interaction.guild.members.fetch(userId).catch(() => null)
  member?.send({ content: '❌ Sua solicitação de cargo **Streamer** foi **recusada**. Se tiver dúvidas, entre em contato com a equipe.' }).catch(() => {})
}

// ─── Vincular Personagem ────────────────────────────────────────────────────────

async function handleLinkCharacter(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral })

  const roleId = process.env.ROLE_STREAMER_ID
  if (roleId && !interaction.member.roles.cache.has(roleId)) {
    return interaction.editReply({ content: '❌ Você precisa ter o cargo **Streamer** antes de vincular um personagem.' })
  }

  const charName = interaction.options.getString('personagem').trim()
  const result = await linkCharacter(interaction.member.id, charName)

  if (!result.ok) {
    return interaction.editReply({ content: `❌ ${result.error}` })
  }

  return interaction.editReply({
    content: `✅ Personagem **${result.data.charName}** vinculado à sua conta do Discord. Suas horas de stream vão render Athena Coins automaticamente.`,
  })
}

module.exports = {
  buildStreamerRequestEmbed,
  handleStreamerRequestButton,
  handleStreamerModalSubmit,
  handleStreamerApprove,
  handleStreamerReject,
  handleLinkCharacter,
}

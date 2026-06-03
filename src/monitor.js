const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js')
const fs = require('fs')
const path = require('path')

const DATA_FILE        = path.join(__dirname, '..', 'data', 'status.json')
const INTERVAL         = 30_000  // 30 segundos
const NOTIF_TTL        = 5 * 60_000  // 5 minutos

let lastStatus         = null   // 'online' | 'offline' | null
let statusMsgId        = null   // ID da mensagem fixa no canal
let pendingNotifIds    = []     // IDs de notificações aguardando auto-delete

// ── Persistência ───────────────────────────────────────────────────────────
function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const d = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'))
      statusMsgId     = d.statusMsgId     || null
      pendingNotifIds = d.pendingNotifIds || []
    }
  } catch {}
}

function saveData() {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true })
  fs.writeFileSync(DATA_FILE, JSON.stringify({ statusMsgId, pendingNotifIds }))
}

// ── Busca status na API ────────────────────────────────────────────────────
async function fetchStatus() {
  const url = `${process.env.API_URL}/server/status`
  const res  = await fetch(url, { signal: AbortSignal.timeout(10_000) })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

// ── Monta o embed de status ────────────────────────────────────────────────
function buildStatusEmbed(data) {
  const gameOnline  = data?.gameServer  === 'online'
  const loginOnline = data?.loginServer === 'online'
  const isOnline    = gameOnline && loginOnline

  const color  = isOnline ? 0x2ECC71 : 0xE74C3C
  const status = isOnline ? '🟢  ONLINE' : '🔴  OFFLINE'

  const embed = new EmbedBuilder()
    .setTitle(`${status}  —  L2 Athenas`)
    .setColor(color)
    .addFields(
      { name: 'Servidor de Jogo',  value: gameOnline  ? '🟢 Online'  : '🔴 Offline', inline: true },
      { name: 'Servidor de Login', value: loginOnline ? '🟢 Online'  : '🔴 Offline', inline: true },
      { name: 'Jogadores Online',  value: isOnline ? String(data.playersOnline ?? 0) : '—', inline: true },
    )
    .setFooter({ text: `Atualizado em ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}` })

  return embed
}

// ── Atualiza ou cria a mensagem fixa ──────────────────────────────────────
async function updateStatusMessage(channel, data) {
  const embed = buildStatusEmbed(data)

  if (statusMsgId) {
    try {
      const msg = await channel.messages.fetch(statusMsgId)
      await msg.edit({ embeds: [embed] })
      return
    } catch {
      statusMsgId = null
    }
  }

  const msg = await channel.send({ embeds: [embed] })
  statusMsgId = msg.id
  saveData()
}

// ── Deleta notificações antigas salvas (chamado no startup) ───────────────
async function deleteOldNotifications(channel) {
  if (!pendingNotifIds.length) return
  for (const id of pendingNotifIds) {
    try {
      const msg = await channel.messages.fetch(id)
      await msg.delete()
    } catch {}
  }
  pendingNotifIds = []
  saveData()
}

// ── Envia notificação de mudança e agenda auto-delete ─────────────────────
async function sendChangeNotification(channel, newStatus) {
  const jogadoresId = process.env.ROLE_JOGADORES_ID
  const ping = jogadoresId ? `<@&${jogadoresId}> ` : ''

  const text = newStatus === 'online'
    ? `${ping}🟢 **O servidor voltou!** L2 Athenas está online novamente.`
    : `${ping}🔴 **Servidor offline.** L2 Athenas está fora do ar. Estamos trabalhando para resolver.`

  const msg = await channel.send(text)

  pendingNotifIds.push(msg.id)
  saveData()

  setTimeout(async () => {
    try { await msg.delete() } catch {}
    pendingNotifIds = pendingNotifIds.filter(id => id !== msg.id)
    saveData()
  }, NOTIF_TTL)
}

// ── Loop principal ────────────────────────────────────────────────────────
async function tick(channel) {
  let data = null
  let currentStatus = 'offline'

  try {
    data = await fetchStatus()
    const gameOnline  = data?.gameServer  === 'online'
    const loginOnline = data?.loginServer === 'online'
    currentStatus = (gameOnline && loginOnline) ? 'online' : 'offline'
  } catch (err) {
    console.error('[Monitor] Erro ao buscar status:', err.message)
  }

  await updateStatusMessage(channel, data)

  if (lastStatus !== null && lastStatus !== currentStatus) {
    await sendChangeNotification(channel, currentStatus)
  }

  lastStatus = currentStatus
}

// ── Recupera mensagem do bot no canal caso o arquivo não exista ───────────
async function recoverMessageId(channel, botId) {
  try {
    const messages = await channel.messages.fetch({ limit: 50 })
    const found = messages.find(m => m.author.id === botId && m.embeds.length > 0)
    if (found) {
      statusMsgId = found.id
      saveData()
      console.log('[Monitor] Mensagem de status recuperada:', statusMsgId)
    }
  } catch (err) {
    console.error('[Monitor] Erro ao recuperar mensagem:', err.message)
  }
}

// ── Inicializa o monitor ──────────────────────────────────────────────────
async function startMonitor(client) {
  loadData()

  const channelId = process.env.CHANNEL_STATUS_ID
  if (!channelId) {
    console.warn('[Monitor] CHANNEL_STATUS_ID não definido — monitor desativado.')
    return
  }

  const channel = await client.channels.fetch(channelId).catch(() => null)
  if (!channel) {
    console.error('[Monitor] Canal de status não encontrado:', channelId)
    return
  }

  await deleteOldNotifications(channel)

  if (!statusMsgId) {
    await recoverMessageId(channel, client.user.id)
  }

  console.log('[Monitor] Iniciado — verificando a cada 30s')
  await tick(channel)
  setInterval(() => tick(channel).catch(err => console.error('[Monitor] tick error:', err.message)), INTERVAL)
}

module.exports = { startMonitor, buildStatusEmbed }

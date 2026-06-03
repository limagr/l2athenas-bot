const { EmbedBuilder } = require('discord.js')
const fs   = require('fs')
const path = require('path')

const DATA_FILE = path.join(__dirname, '..', 'data', 'boss.json')
const INTERVAL  = 60_000 // 60 segundos

let bossMsgIds = {} // { epic: string|null, raid: string|null }

// ── Persistência ──────────────────────────────────────────────────────────
function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const d = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'))
      bossMsgIds = d.bossMsgIds || {}
    }
  } catch {}
}

function saveData() {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true })
  fs.writeFileSync(DATA_FILE, JSON.stringify({ bossMsgIds }))
}

// ── Busca bosses na API ───────────────────────────────────────────────────
async function fetchBosses() {
  const url = `${process.env.API_URL}/bosses`
  const res  = await fetch(url, { signal: AbortSignal.timeout(10_000) })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

// ── Formata tempo de respawn ──────────────────────────────────────────────
function formatRespawn(respawnAt) {
  if (!respawnAt) return '—'
  const diff = new Date(respawnAt) - Date.now()
  if (diff <= 0) return 'Em breve'
  const h = Math.floor(diff / 3_600_000)
  const m = Math.floor((diff % 3_600_000) / 60_000)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

// ── Monta embed por categoria ─────────────────────────────────────────────
function buildBossEmbed(bosses, category) {
  const list   = bosses.filter(b => b.category === category)
  const labels = { epic: '⚔️  Épicos', raid: '🗡️  Raid Bosses' }
  const colors = { epic: 0x9B59B6, raid: 0x3498DB }

  const fields = list.map(b => {
    const alive = b.status === 'alive'
    const unknown = b.status === 'unknown'
    const icon  = alive ? '🟢' : unknown ? '⚪' : '🔴'
    const value = alive
      ? 'Vivo'
      : unknown
        ? 'Desconhecido'
        : `Morto — respawn em **${formatRespawn(b.respawnAt)}**`

    return { name: `${icon} ${b.name} (Nv. ${b.level})`, value, inline: true }
  })

  return new EmbedBuilder()
    .setTitle(labels[category])
    .setColor(colors[category])
    .addFields(fields)
    .setFooter({ text: `Atualizado em ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}` })
}

// ── Atualiza ou cria mensagem ─────────────────────────────────────────────
async function updateMessage(channel, embed, key) {
  if (bossMsgIds[key]) {
    try {
      const msg = await channel.messages.fetch(bossMsgIds[key])
      await msg.edit({ embeds: [embed] })
      return
    } catch {
      bossMsgIds[key] = null
    }
  }

  const msg = await channel.send({ embeds: [embed] })
  bossMsgIds[key] = msg.id
  saveData()
}

// ── Recupera mensagens existentes após redeploy ───────────────────────────
async function recoverMessages(channel, botId) {
  try {
    const messages = await channel.messages.fetch({ limit: 20 })
    const botMsgs  = messages
      .filter(m => m.author.id === botId && m.embeds.length > 0)
      .sort((a, b) => a.createdTimestamp - b.createdTimestamp)
      .map(m => m)

    if (botMsgs[0] && !bossMsgIds.epic)  { bossMsgIds.epic = botMsgs[0].id }
    if (botMsgs[1] && !bossMsgIds.raid)  { bossMsgIds.raid = botMsgs[1].id }
    if (bossMsgIds.epic || bossMsgIds.raid) {
      saveData()
      console.log('[BossMonitor] Mensagens recuperadas:', bossMsgIds)
    }
  } catch (err) {
    console.error('[BossMonitor] Erro ao recuperar mensagens:', err.message)
  }
}

// ── Tick ──────────────────────────────────────────────────────────────────
async function tickBoss(channel) {
  let bosses = []
  try {
    bosses = await fetchBosses()
  } catch (err) {
    console.error('[BossMonitor] Erro ao buscar bosses:', err.message)
    return
  }

  await updateMessage(channel, buildBossEmbed(bosses, 'epic'), 'epic')
  await updateMessage(channel, buildBossEmbed(bosses, 'raid'), 'raid')
}

// ── Inicializa ────────────────────────────────────────────────────────────
async function startBossMonitor(client) {
  loadData()

  const channelId = process.env.CHANNEL_BOSS_ID
  if (!channelId) {
    console.warn('[BossMonitor] CHANNEL_BOSS_ID não definido — monitor desativado.')
    return
  }

  const channel = await client.channels.fetch(channelId).catch(() => null)
  if (!channel) {
    console.error('[BossMonitor] Canal de boss não encontrado:', channelId)
    return
  }

  if (!bossMsgIds.epic || !bossMsgIds.raid) {
    await recoverMessages(channel, client.user.id)
  }

  console.log('[BossMonitor] Iniciado — verificando a cada 60s')
  await tickBoss(channel)
  setInterval(() => tickBoss(channel).catch(err => console.error('[BossMonitor] tick error:', err.message)), INTERVAL)
}

module.exports = { startBossMonitor }

const fs   = require('fs')
const path = require('path')
const { buildDownloadsEmbed } = require('./interactions/downloads')

const DATA_FILE = path.join(__dirname, '..', 'data', 'downloads.json')

let downloadsMsgId = null

function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const d = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'))
      downloadsMsgId = d.downloadsMsgId || null
    }
  } catch {}
}

function saveData() {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true })
  fs.writeFileSync(DATA_FILE, JSON.stringify({ downloadsMsgId }))
}

async function recoverMessageId(channel, botId) {
  try {
    const messages = await channel.messages.fetch({ limit: 20 })
    const found = messages.find(m => m.author.id === botId && m.embeds.length > 0)
    if (found) {
      downloadsMsgId = found.id
      saveData()
      console.log('[Downloads] Mensagem recuperada:', downloadsMsgId)
    }
  } catch (err) {
    console.error('[Downloads] Erro ao recuperar mensagem:', err.message)
  }
}

async function postDownloads(channel) {
  const payload = buildDownloadsEmbed()

  if (downloadsMsgId) {
    try {
      const msg = await channel.messages.fetch(downloadsMsgId)
      await msg.edit(payload)
      return
    } catch {
      downloadsMsgId = null
    }
  }

  const msg = await channel.send(payload)
  downloadsMsgId = msg.id
  saveData()
}

async function startDownloadsMonitor(client) {
  loadData()

  const channelId = process.env.CHANNEL_DOWNLOADS_ID
  if (!channelId) {
    console.warn('[Downloads] CHANNEL_DOWNLOADS_ID não definido — monitor desativado.')
    return
  }

  const channel = await client.channels.fetch(channelId).catch(() => null)
  if (!channel) {
    console.error('[Downloads] Canal não encontrado:', channelId)
    return
  }

  if (!downloadsMsgId) {
    await recoverMessageId(channel, client.user.id)
  }

  await postDownloads(channel)
  console.log('[Downloads] Mensagem de downloads publicada.')
}

module.exports = { startDownloadsMonitor }

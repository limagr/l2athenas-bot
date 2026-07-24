require('dotenv').config()
const { Client, GatewayIntentBits, Events, MessageFlags } = require('discord.js')
const { handleRulesAccept } = require('./interactions/rules')
const { handleOpenTicket, handleCloseTicket } = require('./interactions/ticket')
const { handleSetupRules, handleSetupSupport, handleSetupStreamer, handleSetupStatus } = require('./interactions/setup')
const { handleBan, handleKick } = require('./interactions/moderation')
const { handlePoll, handleAnnouncement } = require('./interactions/poll')
const { handleGuildMemberAdd } = require('./interactions/welcome')
const { handleMessageCreate } = require('./interactions/channelguard')
const { handleStreamerRequestButton, handleStreamerModalSubmit, handleStreamerApprove, handleStreamerReject } = require('./interactions/streamer')
const { startMonitor } = require('./monitor')
const { startBossMonitor } = require('./bossmonitor')
const { startDownloadsMonitor } = require('./downloadsmonitor')

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
})

client.once(Events.ClientReady, (c) => {
  console.log(`✅ Bot online como ${c.user.tag}`)
  startMonitor(client).catch(err => console.error('[Monitor] Falha ao iniciar:', err.message))
  startBossMonitor(client).catch(err => console.error('[BossMonitor] Falha ao iniciar:', err.message))
  startDownloadsMonitor(client).catch(err => console.error('[Downloads] Falha ao iniciar:', err.message))
})

client.on(Events.GuildMemberAdd, (member) => {
  handleGuildMemberAdd(member).catch(err =>
    console.error('[Welcome] Erro ao enviar boas-vindas:', err.message)
  )
})

client.on(Events.MessageCreate, (message) => {
  handleMessageCreate(message).catch(err =>
    console.error('[ChannelGuard] Erro:', err.message)
  )
})

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === 'setup-regras')  return await handleSetupRules(interaction)
      if (interaction.commandName === 'setup-suporte') return await handleSetupSupport(interaction)
      if (interaction.commandName === 'setup-status')  return await handleSetupStatus(interaction)
      if (interaction.commandName === 'setup-streamer') return await handleSetupStreamer(interaction)
      if (interaction.commandName === 'ban')           return await handleBan(interaction)
      if (interaction.commandName === 'kick')          return await handleKick(interaction)
      if (interaction.commandName === 'votacao')       return await handlePoll(interaction)
      if (interaction.commandName === 'anuncio')       return await handleAnnouncement(interaction)
    }

    if (interaction.isButton()) {
      if (interaction.customId === 'aceitar-regras')          return await handleRulesAccept(interaction)
      if (interaction.customId === 'abrir-ticket')            return await handleOpenTicket(interaction)
      if (interaction.customId === 'solicitar-cargo-streamer') return await handleStreamerRequestButton(interaction)
      if (interaction.customId.startsWith('fechar-ticket-'))    return await handleCloseTicket(interaction)
      if (interaction.customId.startsWith('aprovar-streamer-')) return await handleStreamerApprove(interaction)
      if (interaction.customId.startsWith('recusar-streamer-')) return await handleStreamerReject(interaction)
    }

    if (interaction.isModalSubmit()) {
      if (interaction.customId === 'modal-streamer-request') return await handleStreamerModalSubmit(interaction)
    }
  } catch (err) {
    console.error('Erro em interação:', err.message, '\n  Stack:', err.stack?.split('\n')[1]?.trim())
    const reply = { content: '❌ Ocorreu um erro. Tente novamente.', flags: MessageFlags.Ephemeral }
    if (interaction.replied || interaction.deferred) {
      interaction.followUp(reply).catch(() => {})
    } else {
      interaction.reply(reply).catch(() => {})
    }
  }
})

client.login(process.env.BOT_TOKEN)

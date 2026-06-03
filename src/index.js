require('dotenv').config()
const { Client, GatewayIntentBits, Events, MessageFlags } = require('discord.js')
const { handleRulesAccept } = require('./interactions/rules')
const { handleOpenTicket, handleCloseTicket } = require('./interactions/ticket')
const { handleSetupRules, handleSetupSupport } = require('./interactions/setup')

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
  ],
})

client.once(Events.ClientReady, (c) => {
  console.log(`✅ Bot online como ${c.user.tag}`)
})

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === 'setup-regras')  return await handleSetupRules(interaction)
      if (interaction.commandName === 'setup-suporte') return await handleSetupSupport(interaction)
    }

    if (interaction.isButton()) {
      if (interaction.customId === 'aceitar-regras')          return await handleRulesAccept(interaction)
      if (interaction.customId === 'abrir-ticket')            return await handleOpenTicket(interaction)
      if (interaction.customId.startsWith('fechar-ticket-'))  return await handleCloseTicket(interaction)
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

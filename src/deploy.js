require('dotenv').config()
const { REST, Routes, SlashCommandBuilder } = require('discord.js')

const commands = [
  new SlashCommandBuilder()
    .setName('setup-regras')
    .setDescription('Envia a mensagem de regras com botão de aceite neste canal')
    .setDefaultMemberPermissions('0'), // só admins
  new SlashCommandBuilder()
    .setName('setup-suporte')
    .setDescription('Envia a mensagem de abertura de ticket neste canal')
    .setDefaultMemberPermissions('0'),
  new SlashCommandBuilder()
    .setName('setup-status')
    .setDescription('Cria a mensagem de status do servidor neste canal (use no canal de status)')
    .setDefaultMemberPermissions('0'),
].map(c => c.toJSON())

const rest = new REST().setToken(process.env.BOT_TOKEN)

;(async () => {
  console.log('Registrando comandos...')
  await rest.put(
    Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
    { body: commands }
  )
  console.log('✅ Comandos registrados!')
})().catch(console.error)

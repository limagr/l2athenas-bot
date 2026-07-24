require('dotenv').config()
const { REST, Routes, SlashCommandBuilder, PermissionFlagsBits } = require('discord.js')

const commands = [
  // ── Setup ──────────────────────────────────────────────────────────────────
  new SlashCommandBuilder()
    .setName('setup-regras')
    .setDescription('Envia a mensagem de regras com botão de aceite neste canal')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('setup-suporte')
    .setDescription('Envia a mensagem de abertura de ticket neste canal')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('setup-status')
    .setDescription('Cria a mensagem de status do servidor neste canal (use no canal de status)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('setup-streamer')
    .setDescription('Envia a mensagem de solicitação de cargo Streamer neste canal')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('vincular-personagem')
    .setDescription('Vincula seu personagem do jogo à sua conta do Discord (necessário para receber Athena Coins por stream)')
    .addStringOption(opt =>
      opt.setName('personagem').setDescription('Nome exato do seu personagem no jogo').setRequired(true)
    ),

  // ── Moderação ──────────────────────────────────────────────────────────────
  new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Bane um membro do servidor')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addUserOption(opt =>
      opt.setName('usuario').setDescription('Membro a ser banido').setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('motivo').setDescription('Motivo do ban').setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Expulsa um membro do servidor')
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .addUserOption(opt =>
      opt.setName('usuario').setDescription('Membro a ser expulso').setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('motivo').setDescription('Motivo da expulsão').setRequired(false)
    ),

  // ── Comunidade ─────────────────────────────────────────────────────────────
  new SlashCommandBuilder()
    .setName('votacao')
    .setDescription('Cria uma votação com reações no canal')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addStringOption(opt =>
      opt.setName('pergunta').setDescription('Pergunta da votação').setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('opcao1').setDescription('Opção 1').setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('opcao2').setDescription('Opção 2').setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('opcao3').setDescription('Opção 3').setRequired(false)
    )
    .addStringOption(opt =>
      opt.setName('opcao4').setDescription('Opção 4').setRequired(false)
    )
    .addChannelOption(opt =>
      opt.setName('canal').setDescription('Canal para enviar (padrão: atual)').setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName('anuncio')
    .setDescription('Envia um anúncio formatado no canal de anúncios')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addStringOption(opt =>
      opt.setName('mensagem').setDescription('Texto do anúncio').setRequired(true)
    )
    .addRoleOption(opt =>
      opt.setName('cargo').setDescription('Cargo a ser marcado (opcional)').setRequired(false)
    ),

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

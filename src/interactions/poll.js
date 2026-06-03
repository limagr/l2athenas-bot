const { EmbedBuilder, MessageFlags } = require('discord.js')

const EMOJI_NUMBERS = ['1️⃣', '2️⃣', '3️⃣', '4️⃣']

async function handlePoll(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral })

  const pergunta = interaction.options.getString('pergunta')
  const opcoes = [
    interaction.options.getString('opcao1'),
    interaction.options.getString('opcao2'),
    interaction.options.getString('opcao3'),
    interaction.options.getString('opcao4'),
  ].filter(Boolean)

  const channel = interaction.options.getChannel('canal') ?? interaction.channel

  const perms = channel.permissionsFor(interaction.guild.members.me)
  if (!perms?.has('SendMessages') || !perms?.has('AddReactions')) {
    return interaction.editReply({ content: `❌ Sem permissão para enviar/reagir em ${channel}.` })
  }

  const linhas = opcoes.map((op, i) => `${EMOJI_NUMBERS[i]}  ${op}`)

  const embed = new EmbedBuilder()
    .setTitle(`📊 ${pergunta}`)
    .setColor(0x9B59B6)
    .setDescription(linhas.join('\n\n'))
    .setFooter({ text: `Votação criada por ${interaction.member.user.username}` })
    .setTimestamp()

  const msg = await channel.send({ embeds: [embed] })

  for (let i = 0; i < opcoes.length; i++) {
    await msg.react(EMOJI_NUMBERS[i])
  }

  await interaction.editReply({ content: `✅ Votação criada em ${channel}!` })
}

async function handleAnnouncement(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral })

  const texto    = interaction.options.getString('mensagem')
  const pingRole = interaction.options.getRole('cargo')
  const channelId = process.env.CHANNEL_ANNOUNCEMENTS_ID

  if (!channelId) {
    return interaction.editReply({ content: '❌ `CHANNEL_ANNOUNCEMENTS_ID` não configurado no `.env`.' })
  }

  const channel = await interaction.guild.channels.fetch(channelId).catch(() => null)
  if (!channel) {
    return interaction.editReply({ content: '❌ Canal de anúncios não encontrado.' })
  }

  const embed = new EmbedBuilder()
    .setTitle('📣 Anúncio')
    .setColor(0xB8860B)
    .setDescription(texto)
    .setFooter({ text: `L2 Athenas • ${interaction.member.user.username}` })
    .setTimestamp()

  const content = pingRole ? `<@&${pingRole.id}>` : undefined
  await channel.send({ content, embeds: [embed] })

  await interaction.editReply({ content: `✅ Anúncio enviado em ${channel}!` })
}

module.exports = { handlePoll, handleAnnouncement }

const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
  ChannelType,
  MessageFlags,
} = require('discord.js')

async function handleOpenTicket(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral })

  const guild       = interaction.guild
  const member      = interaction.member
  const categoryId  = process.env.CATEGORY_TICKETS_ID
  const suporteId   = process.env.ROLE_SUPORTE_ID

  // Evita ticket duplicado
  const existing = guild.channels.cache.find(
    c => c.name === `ticket-${member.user.username.toLowerCase()}` && c.parentId === categoryId
  )
  if (existing) {
    return interaction.editReply({ content: `❌ Você já tem um ticket aberto: ${existing}` })
  }

  const channel = await guild.channels.create({
    name: `ticket-${member.user.username.toLowerCase()}`,
    type: ChannelType.GuildText,
    parent: categoryId,
    permissionOverwrites: [
      { id: guild.id,      deny:  [PermissionFlagsBits.ViewChannel] },
      {
        id: member.id,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
      },
      {
        id: suporteId,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageMessages],
      },
    ],
  })

  const embed = new EmbedBuilder()
    .setTitle('🎫 Ticket de Suporte')
    .setColor(0xB8860B)
    .setDescription(
      [
        `Olá, ${member}! A equipe de suporte foi notificada.`,
        '',
        '**Descreva seu problema** com o máximo de detalhes possível:',
        '• O que aconteceu?',
        '• Quando aconteceu?',
        '• Nome do personagem afetado',
        '',
        'Um membro do suporte responderá em breve.',
      ].join('\n')
    )
    .setFooter({ text: `Ticket criado por ${member.user.username}` })
    .setTimestamp()

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`fechar-ticket-${member.id}`)
      .setLabel('🔒  Fechar Ticket')
      .setStyle(ButtonStyle.Danger)
  )

  await channel.send({ content: `${member} | <@&${suporteId}>`, embeds: [embed], components: [row] })
  await interaction.editReply({ content: `✅ Ticket criado: ${channel}` })
}

async function handleCloseTicket(interaction) {
  await interaction.deferReply()

  const channel    = interaction.channel
  const member     = interaction.member
  const suporteId  = process.env.ROLE_SUPORTE_ID

  const isSupport = member.roles.cache.has(suporteId)
  const isOwner   = channel.name === `ticket-${member.user.username.toLowerCase()}`

  if (!isSupport && !isOwner) {
    return interaction.editReply({ content: '❌ Apenas o dono do ticket ou a equipe de suporte pode fechá-lo.' })
  }

  await interaction.editReply({
    content: `🔒 Ticket fechado por ${member}. Este canal será deletado em 5 segundos.`,
  })

  setTimeout(() => channel.delete().catch(() => {}), 5_000)
}

function buildSupportEmbed() {
  const embed = new EmbedBuilder()
    .setTitle('🎫 Suporte L2 Athenas')
    .setColor(0xB8860B)
    .setDescription(
      [
        'Precisa de ajuda? Abra um ticket e nossa equipe de suporte responderá o mais breve possível.',
        '',
        '**Antes de abrir um ticket, verifique:**',
        '• O canal `#perguntas-frequentes` pode ter sua resposta',
        '• Problemas de conexão geralmente são resolvidos reiniciando o launcher',
        '',
        'Clique no botão abaixo para abrir um ticket privado.',
      ].join('\n')
    )
    .setFooter({ text: 'L2 Athenas • Suporte' })

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('abrir-ticket')
      .setLabel('🎫  Abrir Ticket')
      .setStyle(ButtonStyle.Primary)
  )

  return { embeds: [embed], components: [row] }
}

module.exports = { handleOpenTicket, handleCloseTicket, buildSupportEmbed }

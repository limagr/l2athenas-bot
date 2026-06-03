const { EmbedBuilder, MessageFlags } = require('discord.js')
const { logAction } = require('./modlog')

async function handleBan(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral })

  const target = interaction.options.getMember('usuario')
  const reason = interaction.options.getString('motivo') ?? 'Sem motivo informado'

  if (!target) {
    return interaction.editReply({ content: '❌ Usuário não encontrado no servidor.' })
  }

  if (!target.bannable) {
    return interaction.editReply({ content: '❌ Não consigo banir este usuário (cargo acima do meu).' })
  }

  const dmEmbed = new EmbedBuilder()
    .setTitle('🔨 Você foi banido do L2 Athenas')
    .setColor(0xE74C3C)
    .addFields(
      { name: 'Motivo', value: reason },
      { name: 'Moderador', value: interaction.member.user.username },
    )
    .setTimestamp()

  await target.send({ embeds: [dmEmbed] }).catch(() => {})

  await target.ban({ reason: `${interaction.member.user.username}: ${reason}` })

  await logAction(interaction.client, {
    type: 'ban',
    target: target.user,
    moderator: interaction.member,
    reason,
  })

  await interaction.editReply({ content: `✅ **${target.user.username}** foi banido. Motivo: ${reason}` })
}

async function handleKick(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral })

  const target = interaction.options.getMember('usuario')
  const reason = interaction.options.getString('motivo') ?? 'Sem motivo informado'

  if (!target) {
    return interaction.editReply({ content: '❌ Usuário não encontrado no servidor.' })
  }

  if (!target.kickable) {
    return interaction.editReply({ content: '❌ Não consigo expulsar este usuário (cargo acima do meu).' })
  }

  const dmEmbed = new EmbedBuilder()
    .setTitle('👢 Você foi expulso do L2 Athenas')
    .setColor(0xE67E22)
    .addFields(
      { name: 'Motivo', value: reason },
      { name: 'Moderador', value: interaction.member.user.username },
    )
    .setTimestamp()

  await target.send({ embeds: [dmEmbed] }).catch(() => {})

  await target.kick(`${interaction.member.user.username}: ${reason}`)

  await logAction(interaction.client, {
    type: 'kick',
    target: target.user,
    moderator: interaction.member,
    reason,
  })

  await interaction.editReply({ content: `✅ **${target.user.username}** foi expulso. Motivo: ${reason}` })
}

module.exports = { handleBan, handleKick }

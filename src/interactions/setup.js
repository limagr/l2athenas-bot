const { MessageFlags } = require('discord.js')
const { buildRulesEmbed } = require('./rules')
const { buildSupportEmbed } = require('./ticket')

async function handleSetupRules(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral })

  const perms = interaction.channel.permissionsFor(interaction.guild.members.me)
  if (!perms?.has('SendMessages')) {
    return interaction.editReply({ content: '❌ Sem permissão para enviar mensagens neste canal. Adicione o bot nas permissões do canal.' })
  }

  await interaction.channel.send(buildRulesEmbed())
  await interaction.editReply({ content: '✅ Mensagem de regras enviada.' })
}

async function handleSetupSupport(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral })

  const perms = interaction.channel.permissionsFor(interaction.guild.members.me)
  if (!perms?.has('SendMessages')) {
    return interaction.editReply({ content: '❌ Sem permissão para enviar mensagens neste canal. Adicione o bot nas permissões do canal.' })
  }

  await interaction.channel.send(buildSupportEmbed())
  await interaction.editReply({ content: '✅ Mensagem de suporte enviada.' })
}

module.exports = { handleSetupRules, handleSetupSupport }

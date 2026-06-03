const { MessageFlags } = require('discord.js')
const { buildRulesEmbed } = require('./rules')
const { buildSupportEmbed } = require('./ticket')
const { buildStatusEmbed } = require('../monitor')

async function handleSetupRules(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral })

  const perms = interaction.channel.permissionsFor(interaction.guild.members.me)
  if (!perms?.has('SendMessages')) {
    return interaction.editReply({ content: '❌ Sem permissão para enviar mensagens neste canal.' })
  }

  await interaction.channel.send(buildRulesEmbed())
  await interaction.editReply({ content: '✅ Mensagem de regras enviada.' })
}

async function handleSetupSupport(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral })

  const perms = interaction.channel.permissionsFor(interaction.guild.members.me)
  if (!perms?.has('SendMessages')) {
    return interaction.editReply({ content: '❌ Sem permissão para enviar mensagens neste canal.' })
  }

  await interaction.channel.send(buildSupportEmbed())
  await interaction.editReply({ content: '✅ Mensagem de suporte enviada.' })
}

async function handleSetupStatus(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral })

  const perms = interaction.channel.permissionsFor(interaction.guild.members.me)
  if (!perms?.has('SendMessages')) {
    return interaction.editReply({ content: '❌ Sem permissão para enviar mensagens neste canal.' })
  }

  if (!process.env.CHANNEL_STATUS_ID) {
    return interaction.editReply({ content: '❌ `CHANNEL_STATUS_ID` não configurado no `.env`.' })
  }

  if (interaction.channelId !== process.env.CHANNEL_STATUS_ID) {
    return interaction.editReply({
      content: `❌ Use este comando no canal de status configurado (<#${process.env.CHANNEL_STATUS_ID}>).`,
    })
  }

  // Envia o embed inicial (o monitor vai editá-lo daqui em diante)
  const msg = await interaction.channel.send({ embeds: [buildStatusEmbed(null)] })

  // Salva o ID para o monitor usar
  const { startMonitor } = require('../monitor')
  const fs   = require('fs')
  const path = require('path')
  const dataFile = path.join(__dirname, '..', '..', 'data', 'status.json')
  fs.mkdirSync(path.dirname(dataFile), { recursive: true })
  fs.writeFileSync(dataFile, JSON.stringify({ statusMsgId: msg.id }))

  await interaction.editReply({ content: `✅ Mensagem de status criada. O monitor vai atualizá-la automaticamente a cada 30s.` })
}

module.exports = { handleSetupRules, handleSetupSupport, handleSetupStatus }

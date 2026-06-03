const { EmbedBuilder } = require('discord.js')

const COLORS = {
  ticket_open:  0x3498DB,
  ticket_close: 0x95A5A6,
  ban:          0xE74C3C,
  kick:         0xE67E22,
  warn:         0xF1C40F,
}

const LABELS = {
  ticket_open:  '🎫 Ticket Aberto',
  ticket_close: '🔒 Ticket Fechado',
  ban:          '🔨 Membro Banido',
  kick:         '👢 Membro Expulso',
}

/**
 * @param {import('discord.js').Client} client
 * @param {{ type: string, target?: import('discord.js').User, moderator?: import('discord.js').GuildMember, reason?: string, extra?: string }} opts
 */
async function logAction(client, opts) {
  const channelId = process.env.CHANNEL_MOD_LOG_ID
  if (!channelId) return

  const channel = await client.channels.fetch(channelId).catch(() => null)
  if (!channel) return

  const embed = new EmbedBuilder()
    .setTitle(LABELS[opts.type] ?? opts.type)
    .setColor(COLORS[opts.type] ?? 0x7F8C8D)
    .setTimestamp()

  if (opts.target) {
    embed.addFields({ name: 'Usuário', value: `${opts.target} (${opts.target.tag ?? opts.target.username})`, inline: true })
  }
  if (opts.moderator) {
    embed.addFields({ name: 'Moderador', value: `${opts.moderator}`, inline: true })
  }
  if (opts.reason) {
    embed.addFields({ name: 'Motivo', value: opts.reason })
  }
  if (opts.extra) {
    embed.addFields({ name: 'Detalhes', value: opts.extra })
  }

  await channel.send({ embeds: [embed] }).catch(err =>
    console.error('[ModLog] Erro ao enviar log:', err.message)
  )
}

module.exports = { logAction }

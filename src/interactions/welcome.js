const { EmbedBuilder } = require('discord.js')

async function handleGuildMemberAdd(member) {
  const embed = new EmbedBuilder()
    .setTitle(`⚔️ Bem-vindo ao L2 Athenas, ${member.user.username}!`)
    .setColor(0xB8860B)
    .setThumbnail(member.user.displayAvatarURL({ size: 128 }))
    .setDescription(
      [
        `Olá, ${member}! Fico feliz em ter você aqui.`,
        '',
        '**Para ter acesso completo ao servidor:**',
        '> Vá até o canal **#regras**, leia e clique em **"✅ Li e aceito as regras"**.',
        '',
        '**Links úteis:**',
        `> 🌐 Site: ${process.env.WEBSITE_URL || 'https://l2athenas.com'}`,
        `> ⬇️ Download: ${process.env.WEBSITE_URL || 'https://l2athenas.com'}/downloads`,
        `> 💬 Discord: https://discord.gg/EsPbqVQute`,
        '',
        'Qualquer dúvida, abra um ticket no canal **#suporte**.',
        '',
        '*Bons combates!* ⚔️',
      ].join('\n')
    )
    .setFooter({ text: 'L2 Athenas • Servidor Interlude' })
    .setTimestamp()

  try {
    await member.send({ embeds: [embed] })
  } catch {
    // DMs desabilitadas — sem fallback silencioso
  }
}

module.exports = { handleGuildMemberAdd }

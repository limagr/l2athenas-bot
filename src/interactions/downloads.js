const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js')

function buildDownloadsEmbed() {
  const launcherUrl = process.env.NEXT_PUBLIC_LAUNCHER_DOWNLOAD_URL || 'https://downloads.l2athenas.com/AthenaLauncher.exe'
  const clientUrl   = process.env.NEXT_PUBLIC_CLIENT_DOWNLOAD_URL   || '#'

  const embed = new EmbedBuilder()
    .setTitle('⬇️  Downloads — L2 Athenas')
    .setColor(0xB8860B)
    .setDescription(
      [
        '**Como começar a jogar:**',
        '> **1.** Baixe o **Launcher** — ele instala e atualiza o jogo automaticamente.',
        '> **2.** Se preferir, baixe o **Cliente Completo** e depois abra o Launcher para atualizar.',
        '> **3.** Crie sua conta no site, abra o Launcher e clique em **Jogar**.',
        '',
        '> 💡 Instale em uma pasta limpa, sem sobrescrever outras versões do jogo.',
      ].join('\n')
    )
    .addFields(
      {
        name: '🚀 Launcher L2 Athenas',
        value: `Instala, atualiza e inicia o jogo automaticamente.\n[**Baixar Launcher**](${launcherUrl}) ← _Recomendado_`,
      },
      {
        name: '📦 Cliente Completo',
        value: `Pacote completo do cliente Lineage 2 Interlude.\n[**Baixar Cliente**](${clientUrl})`,
      },
    )
    .setFooter({ text: 'L2 Athenas • Interlude C6' })

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel('Baixar Launcher')
      .setStyle(ButtonStyle.Link)
      .setURL(launcherUrl)
      .setEmoji('🚀'),
    new ButtonBuilder()
      .setLabel('Baixar Cliente')
      .setStyle(ButtonStyle.Link)
      .setURL(clientUrl === '#' ? 'https://l2athenas.com/downloads' : clientUrl)
      .setEmoji('📦'),
  )

  return { embeds: [embed], components: [row] }
}

module.exports = { buildDownloadsEmbed }

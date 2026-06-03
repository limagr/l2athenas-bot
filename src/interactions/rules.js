const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js')

async function handleRulesAccept(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral })

  const member = interaction.member
  const roleId = process.env.ROLE_MEMBRO_ID

  if (member.roles.cache.has(roleId)) {
    return interaction.editReply({ content: '✅ Você já aceitou as regras e tem acesso ao servidor.' })
  }

  try {
    await member.roles.add(roleId)
  } catch (err) {
    console.error('Erro ao adicionar cargo Membro:', err.message)
    console.error('  Role ID configurado:', roleId)
    console.error('  Role existe no servidor:', interaction.guild.roles.cache.has(roleId))
    console.error('  Posição do cargo bot:', interaction.guild.members.me.roles.highest.position)
    console.error('  Posição do cargo Membro:', interaction.guild.roles.cache.get(roleId)?.position)
    return interaction.editReply({ content: '❌ Erro ao atribuir cargo. Avise um administrador.' })
  }
  await interaction.editReply({
    content: '✅ Regras aceitas! Bem-vindo ao **L2 Athenas** — os canais foram liberados.',
  })
}

function buildRulesEmbed() {
  const embed = new EmbedBuilder()
    .setTitle('📜 Regras do L2 Athenas')
    .setColor(0xB8860B)
    .setDescription(
      [
        '**1. Respeito**',
        'Trate todos com respeito. Ofensas, preconceito ou assédio resultam em ban imediato.',
        '',
        '**2. Sem spam**',
        'Não envia mensagens repetidas, floods ou links não autorizados.',
        '',
        '**3. Sem cheats ou exploits**',
        'Uso de programas ilegais, bots ou exploits resulta em ban permanente sem apelação.',
        '',
        '**4. Sem venda de contas/itens fora do jogo**',
        'Transações por dinheiro real são proibidas e resultam em ban.',
        '',
        '**5. Siga as orientações da staff**',
        'Respeite as decisões da administração. Reclamações devem ser feitas via ticket.',
        '',
        '**6. Canais temáticos**',
        'Use cada canal para o seu propósito. Leia o tópico antes de postar.',
        '',
        '━━━━━━━━━━━━━━━━━━━━',
        'Ao clicar em **Aceitar**, você confirma que leu e concorda com as regras.',
      ].join('\n')
    )
    .setFooter({ text: 'L2 Athenas • Interlude' })

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('aceitar-regras')
      .setLabel('✅  Li e aceito as regras')
      .setStyle(ButtonStyle.Success)
  )

  return { embeds: [embed], components: [row] }
}

module.exports = { handleRulesAccept, buildRulesEmbed }

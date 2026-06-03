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
        '**1. Respeito à Comunidade**',
        'Racismo, xenofobia, discriminação, ameaças reais, doxxing (divulgação de dados pessoais), assédio contínuo, cyberbullying e incitamento à violência resultam em **banimento permanente imediato**.',
        '',
        '**2. Abuso no Discord — Tolerância Zero**',
        'São **estritamente proibidos** e sujeitos a mute, kick ou ban permanente:',
        '→ Assédio por mensagem direta (DM) não solicitada',
        '→ Flood, spam e repetição de mensagens em qualquer canal',
        '→ Uso indevido de @everyone, @here ou menções em massa',
        '→ Conteúdo NSFW, pornográfico ou de natureza ilegal',
        '→ Criação de contas alternativas para contornar punições (ban evasion)',
        '→ Provocações, instigação de conflitos e "baiting" em canais públicos',
        '',
        '**3. Linguagem**',
        'Discussões competitivas são toleradas com limites. Ofensas extremas, discurso de ódio e spam ofensivo não serão tolerados. Utilize /block e as ferramentas de chat sempre que necessário.',
        '',
        '**4. Falsificação de Identidade**',
        'É proibido fingir ser membro da staff, usar nomes que induzam outros ao erro ou se passar por parceiros oficiais do servidor.',
        '',
        '**5. Divulgação de Outros Servidores**',
        'Proibido divulgar servidores concorrentes, comunidades ou links externos relacionados a outros servidores em qualquer canal oficial. Punição: mute ou suspensão.',
        '',
        '**6. Programas Proibidos**',
        'Bots, auto farm não autorizado, scripts externos, packet manipulation, radar, wallhack e automações não aprovadas resultam em **ban de conta, hardware e IP**.',
        '',
        '**7. Bugs e Exploits**',
        'Explorar falhas para obter vantagens indevidas é proibido. Todo bug encontrado deve ser reportado imediatamente via ticket. A omissão poderá resultar em punição.',
        '',
        '**8. Anti-Game**',
        'Feed em Olympiad, combinações para manipular rankings, sabotagem de eventos, participação passiva para coletar recompensas e lojas enganosas resultam em suspensão ou ban.',
        '',
        '**9. Siga as Orientações da Staff**',
        'As decisões administrativas são finais. Reclamações e contestações devem ser feitas exclusivamente via ticket — nunca em canais públicos.',
        '',
        '**10. Denúncias**',
        'Toda denúncia deve conter evidências suficientes: print, vídeo, log e horário da ocorrência. Denúncias falsas ou manipuladas resultam em punição para o denunciante.',
        '',
        '━━━━━━━━━━━━━━━━━━━━',
        'Regras completas em: **l2athenas.com/termos**',
        'Ao clicar em **Aceitar**, você confirma que leu, compreendeu e concorda com todas as regras.',
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

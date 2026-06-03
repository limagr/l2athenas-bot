const YOUTUBE_REGEX = /https?:\/\/(www\.)?(youtube\.com\/(watch|shorts|live)|youtu\.be\/)\S+/i

async function handleMessageCreate(message) {
  if (message.author.bot) return
  if (message.channelId !== process.env.CHANNEL_CLIPS_ID) return

  if (YOUTUBE_REGEX.test(message.content)) return

  await message.delete().catch(() => {})

  try {
    await message.author.send(
      `❌ O canal <#${process.env.CHANNEL_CLIPS_ID}> aceita apenas links do YouTube.\n` +
      `Exemplo: \`https://www.youtube.com/watch?v=...\` ou \`https://youtu.be/...\``
    )
  } catch {
    // DMs desabilitadas
  }
}

module.exports = { handleMessageCreate }

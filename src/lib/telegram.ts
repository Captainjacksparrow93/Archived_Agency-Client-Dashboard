const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID

export async function sendTelegramMessage(message: string, chatId?: string): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN) {
    console.log('[Telegram] Bot token not configured. Message:', message)
    return false
  }

  const targetChatId = chatId || TELEGRAM_CHAT_ID
  if (!targetChatId) {
    console.log('[Telegram] Chat ID not configured. Message:', message)
    return false
  }

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: targetChatId,
          text: message,
          parse_mode: 'HTML',
        }),
      }
    )

    const data = await response.json()
    return data.ok
  } catch (error) {
    console.error('[Telegram] Failed to send message:', error)
    return false
  }
}

export function formatTaskNotification(task: {
  id: string
  title: string
  description: string
  totalCost: number
  priority: string
  userName: string
  company?: string
}) {
  return `🆕 <b>New Task Created</b>

📋 <b>Title:</b> ${task.title}
📝 <b>Description:</b> ${task.description}
💰 <b>Cost:</b> ₹${task.totalCost.toLocaleString()}
🔥 <b>Priority:</b> ${task.priority.toUpperCase()}
👤 <b>Client:</b> ${task.userName}${task.company ? ` (${task.company})` : ''}
🔗 <b>Task ID:</b> ${task.id}`
}

export function formatChatMessage(message: {
  userName: string
  taskTitle: string
  content: string
  taskId: string
}) {
  return `💬 <b>New Message</b>

👤 <b>From:</b> ${message.userName}
📋 <b>Task:</b> ${message.taskTitle}
💬 <b>Message:</b> ${message.content}
🔗 <b>Task ID:</b> ${message.taskId}`
}

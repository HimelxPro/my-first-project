export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { userId, userName, amount, phone, trxId } = req.body;
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID;

  const text = `🔔 *নতুন রিচার্জ রিকোয়েস্ট!*\n\n👤 ইউজার: ${userName}\n💵 পরিমাণ: ৳${amount}\n📱 নম্বর: \`${phone}\`\n🔢 TrxID: \`${trxId}\``;

  const inlineKeyboard = {
    inline_keyboard: [
      [
        { text: "✅ Approve", callback_data: `app:${userId}:${amount}:${trxId}` },
        { text: "❌ Reject", callback_data: `rej:${trxId}` }
      ]
    ]
  };

  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'Markdown',
        reply_markup: inlineKeyboard
      })
    });
    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
import { createClient } from '@supabase/supabase-js';

// Vercel Environment Variables থেকে কানেকশন নেওয়া
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { userId, userName, amount, phone, trxId } = req.body;

  try {
    // ১. Supabase deposits টেবিলে ডাটা সেভ করা
    const { error: dbError } = await supabase.from('deposits').insert([
      {
        user_id: userId,
        amount: Number(amount),
        sender_number: phone,
        trx_id: trxId,
        status: 'pending'
      }
    ]);

    if (dbError) {
      console.error('Supabase DB Error:', dbError);
      return res.status(500).json({ error: dbError.message });
    }

    // ২. টেলিগ্রাম বটে অ্যাডমিন অ্যালার্ট মেসেজ পাঠানো
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID;

    if (botToken && chatId) {
      const text = `🔔 *নতুন ডিপোজিট অনুরোধ!*\n\n👤 ইউজার: ${userName}\n💰 পরিমাণ: ৳${amount}\n📱 প্রেরক: \`${phone}\`\n🔢 TrxID: \`${trxId}\``;

      const inlineKeyboard = {
        inline_keyboard: [
          [
            { text: "✅ Approve", callback_data: `app:${userId}:${amount}:${trxId}` },
            { text: "❌ Reject", callback_data: `rej:${trxId}` }
          ]
        ]
      };

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
    }

    return res.status(200).json({ success: true });

  } catch (err) {
    console.error('API Handler Error:', err);
    return res.status(500).json({ error: err.message });
  }
}

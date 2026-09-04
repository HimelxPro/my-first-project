import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL, 
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  // শুধু POST মেথড অ্যাকসেপ্ট করবে
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const update = req.body;
    
    // চেক করি callback_query আছে কিনা
    if (!update || !update.callback_query) {
      return res.status(200).send('OK');
    }

    const query = update.callback_query;
    const data = query.data.split(':');
    const action = data[0];
    const botToken = process.env.TELEGRAM_BOT_TOKEN;

    // শুধু 'app' (approve) অ্যাকশন হ্যান্ডেল করি
    if (action === 'app') {
      const [, userId, amount, trxId] = data;

      console.log(`✅ অ্যাপ্রুভ করছি: ইউজার ${userId}, টাকা ৳${amount}, TrxID ${trxId}`);

      // ১. ডেটাবেজে ট্রানজেকশন আপডেট (approved)
      const { error: updateError } = await supabase
        .from('deposits')
        .update({ status: 'approved' })
        .eq('trx_id', trxId);

      if (updateError) {
        console.error('ডিপোজিট আপডেট করতে সমস্যা:', updateError);
        return res.status(500).send('Error');
      }

      // ২. ইউজারের প্রোফাইল থেকে বর্তমান ব্যালেন্স নেওয়া
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('balance')
        .eq('id', userId)
        .single();

      if (profileError) {
        console.error('প্রোফাইল পাওয়া যায়নি:', profileError);
        return res.status(500).send('Error');
      }

      // ৩. নতুন ব্যালেন্স ক্যালকুলেট করা
      const currentBalance = Number(profile?.balance) || 0;
      const newBalance = currentBalance + Number(amount);

      // ৪. ইউজারের ব্যালেন্স আপডেট করা
      const { error: balanceError } = await supabase
        .from('profiles')
        .update({ balance: newBalance })
        .eq('id', userId);

      if (balanceError) {
        console.error('ব্যালেন্স আপডেট করতে সমস্যা:', balanceError);
        return res.status(500).send('Error');
      }

      console.log(`✅ ব্যালেন্স আপডেট হয়েছে: ৳${newBalance}`);

      // ৫. টেলিগ্রাম মেসেজ আপডেট করা (Approve স্ট্যাটাস দেখানো)
      await fetch(`https://api.telegram.org/bot${botToken}/editMessageText`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: query.message.chat.id,
          message_id: query.message.message_id,
          text: `${query.message.text}\n\n✅ *অ্যাপ্রুভড (Approved)*\n\n⏱️ ${new Date().toLocaleString()}`,
          parse_mode: 'Markdown'
        })
      });

      // ৬. ইউজারকে কনফার্মেশন সেন্ড করা (অপশনাল)
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: query.message.chat.id,
          text: `✅ ইউজারের অ্যাকাউন্টে ৳${amount} যোগ করা হয়েছে!`,
          parse_mode: 'Markdown'
        })
      });
    }

    // 'rej' (reject) অ্যাকশন হ্যান্ডেল করা (অপশনাল)
    if (action === 'rej') {
      const [, trxId] = data;

      console.log(`❌ রিজেক্ট করছি: TrxID ${trxId}`);

      // ট্রানজেকশন রিজেক্ট করা
      await supabase
        .from('deposits')
        .update({ status: 'rejected' })
        .eq('trx_id', trxId);

      // টেলিগ্রাম মেসেজ আপডেট করা
      await fetch(`https://api.telegram.org/bot${botToken}/editMessageText`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: query.message.chat.id,
          message_id: query.message.message_id,
          text: `${query.message.text}\n\n❌ *রিজেক্টেড (Rejected)*`,
          parse_mode: 'Markdown'
        })
      });
    }

    return res.status(200).send('OK');

  } catch (error) {
    console.error('টেলিগ্রাম হুক এরর:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
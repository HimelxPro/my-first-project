import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { userId, serviceId, price } = req.body;

  // ব্যালেন্স যাচাই
  const { data: user } = await supabase.from('profiles').select('balance').eq('id', userId).single();
  if (!user || user.balance < price) {
    return res.status(400).json({ error: "অপর্যাপ্ত ব্যালেন্স। দয়া করে রিচার্জ করুন।" });
  }

  try {
    // ব্যালেন্স কেটে নেওয়া
    await supabase.from('profiles').update({ balance: user.balance - price }).eq('id', userId);

    // এখানে পরবর্তীতে আসল পেইড API কল এবং রেজাল্ট রিটার্ন হবে
    return res.status(200).json({
      success: true,
      pdfUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf"
    });
  } catch (err) {
    return res.status(500).json({ error: "সার্ভার এরর।" });
  }
}
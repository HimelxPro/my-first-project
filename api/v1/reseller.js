import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const clientApiKey = req.headers['x-api-key'];
  if (!clientApiKey) return res.status(401).json({ error: 'API Key পাওয়া যায়নি।' });

  const { serviceId, inputData } = req.body;

  // কি ভ্যালিডেশন
  const { data: user } = await supabase.from('profiles').select('*').eq('api_key', clientApiKey).single();
  if (!user || !user.is_reseller) return res.status(403).json({ error: 'অবৈধ API Key!' });

  const wholesalePrice = 400; // রিসেলারদের পাইকারি রেট
  if (user.balance < wholesalePrice) return res.status(402).json({ error: 'ওয়ালেটে পর্যাপ্ত ব্যালেন্স নেই।' });

  try {
    // রিসেলারের ব্যালেন্স কাটা
    await supabase.from('profiles').update({ balance: user.balance - wholesalePrice }).eq('id', user.id);

    return res.status(200).json({
      success: true,
      service_id: serviceId,
      result: {
        status: "success",
        download_url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf"
      }
    });
  } catch (err) {
    return res.status(500).json({ error: 'প্রসেসিং এরর।' });
  }
}
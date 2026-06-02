export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { date } = req.query;
  if (!date) return res.status(400).json({ error: 'date required (YYYY-MM-DD)' });

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_KEY;

  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/dart_disclosures?rcept_dt=eq.${date}&order=id.desc`,
      {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
        }
      }
    );

    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).json({ error: text });
    }

    const items = await response.json();
    res.status(200).json({ items, date });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

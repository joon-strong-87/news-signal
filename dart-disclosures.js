export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { date, page = 1, count = 100 } = req.query;
  if (!date) return res.status(400).json({ error: 'date required (YYYYMMDD)' });

  const apiKey = process.env.DART_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'DART_API_KEY 환경변수 없음' });

  try {
    const url = `https://opendart.fss.or.kr/api/list.json?crtfc_key=${apiKey}&bgn_de=${date}&end_de=${date}&page_no=${page}&page_count=${count}&sort=date&sort_mth=desc`;
    const response = await fetch(url);

    if (!response.ok) {
      return res.status(response.status).json({ error: `DART API 오류: ${response.status}` });
    }

    const data = await response.json();
    if (data.status !== '000') {
      return res.status(400).json({ error: `DART 오류: ${data.message}` });
    }

    const items = (data.list || []).map(item => ({
      rcept_no: item.rcept_no,
      corp_name: item.corp_name,
      corp_code: item.corp_code,
      stock_code: item.stock_code || '',
      report_nm: item.report_nm,
      rcept_dt: item.rcept_dt,
      flr_nm: item.flr_nm,
      rm: item.rm || '',
    }));

    res.status(200).json({ items, total: data.total_count, page: data.page_no });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

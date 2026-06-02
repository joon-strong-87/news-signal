export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { query = '경제', date, display = 100, start = 1 } = req.query;

  try {
    const url = `https://openapi.naver.com/v1/search/news.json?query=${encodeURIComponent(query)}&display=${display}&start=${start}&sort=date`;
    const response = await fetch(url, {
      headers: {
        'X-Naver-Client-Id': process.env.NAVER_CLIENT_ID,
        'X-Naver-Client-Secret': process.env.NAVER_CLIENT_SECRET,
      }
    });

    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).json({ error: text });
    }

    const data = await response.json();

    // 날짜 필터링 (date 파라미터가 있으면)
    let items = data.items || [];
    if (date) {
      const target = new Date(date);
      items = items.filter(item => {
        const pub = new Date(item.pubDate);
        return pub.toDateString() === target.toDateString();
      });
    }

    // HTML 태그 제거
    const clean = (str) => str ? str.replace(/<[^>]+>/g, '').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&#x27;/g, "'") : '';

    const articles = items.map(item => ({
      title: clean(item.title),
      description: clean(item.description),
      url: item.link,
      publisher: clean(item.originallink || item.link).split('/')[2] || '',
      published_at: new Date(item.pubDate).toISOString(),
    }));

    res.status(200).json({ articles, total: data.total });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

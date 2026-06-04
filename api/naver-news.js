export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { query = '경제', date, dateFrom, dateTo, display = 100, start = 1 } = req.query;

  const clean = (str) => str
    ? str.replace(/<[^>]+>/g, '').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&#x27;/g, "'").replace(/&lt;/g,'<').replace(/&gt;/g,'>')
    : '';

  try {
    // 날짜 필터 모드일 때 최대한 많이 가져오기 위해 여러 페이지 호출
    const needDateFilter = !!date;
    const fetchCount = needDateFilter ? 100 : Number(display);
    const allItems = [];

    if (needDateFilter) {
      // 최대 3페이지(300건)까지 가져와서 날짜 필터링
      for (let page = 0; page < 3; page++) {
        const s = page * 100 + 1;
        const url = `https://openapi.naver.com/v1/search/news.json?query=${encodeURIComponent(query)}&display=100&start=${s}&sort=date`;
        const response = await fetch(url, {
          headers: {
            'X-Naver-Client-Id': process.env.NAVER_CLIENT_ID,
            'X-Naver-Client-Secret': process.env.NAVER_CLIENT_SECRET,
          }
        });
        if (!response.ok) break;
        const data = await response.json();
        const items = data.items || [];
        allItems.push(...items);
        // 마지막 아이템이 타겟 날짜보다 이전이면 더 가져올 필요 없음
        if (items.length < 100) break;
        const lastPub = new Date(items[items.length - 1].pubDate);
        const target = new Date(date);
        target.setHours(0, 0, 0, 0);
        if (lastPub < target) break;
      }
    } else {
      // 날짜 필터 없음 — dateFrom~dateTo 범위 또는 그냥 최신순
      const url = `https://openapi.naver.com/v1/search/news.json?query=${encodeURIComponent(query)}&display=${fetchCount}&start=${start}&sort=date`;
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
      allItems.push(...(data.items || []));
    }

    // 필터링
    let items = allItems;
    if (date) {
      // 특정 날짜 (당일 00:00 ~ 익일 00:00)
      const from = new Date(date); from.setHours(0, 0, 0, 0);
      const to   = new Date(date); to.setHours(23, 59, 59, 999);
      items = allItems.filter(item => {
        const pub = new Date(item.pubDate);
        return pub >= from && pub <= to;
      });
    } else if (dateFrom && dateTo) {
      // 범위 날짜
      const from = new Date(dateFrom); from.setHours(0, 0, 0, 0);
      const to   = new Date(dateTo);   to.setHours(23, 59, 59, 999);
      items = allItems.filter(item => {
        const pub = new Date(item.pubDate);
        return pub >= from && pub <= to;
      });
    }

    const articles = items.map(item => ({
      title:        clean(item.title),
      description:  clean(item.description),
      url:          item.link,
      publisher:    clean(item.originallink || item.link).split('/')[2] || '',
      published_at: new Date(item.pubDate).toISOString(),
    }));

    res.status(200).json({ articles, total: articles.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

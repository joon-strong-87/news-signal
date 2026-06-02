export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { title, description } = req.body;
  if (!title) return res.status(400).json({ error: 'title required' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY 환경변수 없음' });

  const MODEL = 'gemini-1.5-flash';
  console.log('사용 모델:', MODEL, '/ 키 앞 10자:', apiKey.slice(0, 10));

  const prompt = `다음 뉴스 기사를 분석해서 JSON으로만 답해줘. 다른 말은 하지 마.

제목: ${title}
내용: ${description || ''}

반환 형식:
{
  "subject": "핵심 주제 (15자 이내)",
  "sentiment": "긍정" or "부정" or "중립",
  "tickers": ["관련 한국 주식 종목코드 (예: 005930)", ...],
  "category": "경제" or "정치" or "사회" or "IT/과학" or "국제" or "산업" or "금융" or "부동산" or "기타"
}

tickers는 뉴스와 직접 관련된 한국 상장 종목만, 없으면 빈 배열.`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`;
    console.log('요청 URL (키 제외):', url.replace(apiKey, 'KEY_HIDDEN'));

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 256 }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Gemini 오류:', response.status, errText);
      return res.status(500).json({ error: `Gemini API 오류: ${response.status} - ${errText}` });
    }

    const data = await response.json();
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const cleaned = raw.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    res.status(200).json(parsed);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

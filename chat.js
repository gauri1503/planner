// Vercel serverless function: chat ke liye Claude API ko call karta hai.
// API key sirf Vercel ke Environment Variables mein rakho (ANTHROPIC_API_KEY). Kabhi index.html mein mat likho.
const TUTOR = (t) => `Tum Gauri ke personal tutor ho. Wo UPSC EPFO APFC recruitment test (20 Dec 2026) ki tayari kar rahi hai: 2 ghante ka objective MCQ paper, Hindi aur English mein, galat jawab par 1/3 negative marking. Simple Hinglish (Roman script) mein jawab do. Plain text likho, markdown ya ** # jaise symbols mat use karo; chhoti list ke liye 1. ya - chalega. Abhi ka topic: ${t}. Jawab chhote aur exam ke nazariye se rakho. Jab wo practice maange, ek samay par ek MCQ do (4 options), uska jawab aane ke baad sahi option aur chhota explanation batao. Agar koi tathya, dhara, limit ya date tumhe pakki na ho, to saaf bolo ki official source (upsc.gov.in, epfindia.gov.in, labour ministry) se check kare, kyunki ye badalte rehte hain.`;

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  if (!process.env.ANTHROPIC_API_KEY) return res.status(500).json({ error: 'API key set nahi hai' });
  try {
    const b = req.body || {};
    const topic = String(b.topic || '').slice(0, 200);
    const msgs = (Array.isArray(b.messages) ? b.messages : [])
      .slice(0, 20)
      .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
      .map((m) => ({ role: m.role, content: m.content.slice(0, 2000) }));
    if (!msgs.length || msgs[0].role !== 'user') return res.status(400).json({ error: 'bad request' });
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: process.env.CLAUDE_MODEL || 'claude-sonnet-5-5',
        max_tokens: 800,
        system: TUTOR(topic),
        messages: msgs,
      }),
    });
    if (!r.ok) return res.status(502).json({ error: 'upstream error' });
    const j = await r.json();
    const text = (j.content || []).map((c) => c.text || '').join('');
    return res.status(200).json({ text });
  } catch (e) {
    return res.status(500).json({ error: 'server error' });
  }
};

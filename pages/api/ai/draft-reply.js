export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { threadText } = req.body || {};
  if (!threadText) return res.status(400).json({ error: 'Missing threadText' });

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key':         process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type':      'application/json',
      },
      body: JSON.stringify({
        model:      'claude-sonnet-4-20250514',
        max_tokens: 500,
        system:     'You are an assistant for a commercial property manager named Scott Anderson. Draft a professional reply to this email thread. Write only the reply body — no greeting or signature needed.',
        messages:   [{ role: 'user', content: threadText }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[api/ai/draft-reply]', errText);
      return res.status(500).json({ error: 'Anthropic API error' });
    }

    const data  = await response.json();
    const draft = data.content?.[0]?.text || '';
    return res.status(200).json({ draft });
  } catch (err) {
    console.error('[api/ai/draft-reply]', err);
    return res.status(500).json({ error: err.message });
  }
}

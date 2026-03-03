// api/brief.js — AI Strategic Brief via Claude Haiku 4.5 (Anthropic)
// Get your free API key at: platform.anthropic.com/settings/api-keys

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate'); // cache 5 min

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ ok: false, error: 'ANTHROPIC_API_KEY not configured. Add it via: vercel env add ANTHROPIC_API_KEY' });
  }

  try {
    const { headlines = [], earthquakes = [], fires = 0, flights = 0 } = req.body || {};

    const headlineList = headlines.slice(0, 12).map((h, i) => `${i + 1}. ${h}`).join('\n');
    const eqList = earthquakes.slice(0, 5).map(e => `M${e.magnitude} ${e.place}`).join(', ');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001', // ~$0.002/day for this use case
        max_tokens: 200,
        system: 'You are a strategic intelligence analyst for a real-time global conflict monitoring dashboard. Be direct, factual, and analytical. Never use bullet points — write in paragraph form only. Keep responses concise.',
        messages: [{
          role: 'user',
          content: `Based on the following real-time signals, write a 3-sentence strategic intelligence brief.

ACTIVE CONFLICT NEWS (last 24h):
${headlineList || '(no headlines available)'}

SEISMIC ACTIVITY: ${eqList || 'none above M5.0'}
SATELLITE FIRE HOTSPOTS: ${fires} detected
MILITARY/SURVEILLANCE FLIGHTS: ${flights} tracked

Write exactly 3 sentences covering: (1) the most critical active theater right now, (2) any notable signal convergence or escalation pattern, (3) overall global threat posture assessment. Under 90 words total.`
        }]
      }),
      signal: AbortSignal.timeout(15000)
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Anthropic API error ${response.status}: ${errText}`);
    }

    const data = await response.json();
    const brief = data.content?.[0]?.text?.trim() || 'Brief unavailable.';

    res.status(200).json({
      ok: true,
      brief,
      model: data.model,
      usage: data.usage,
      // Cost estimate: Haiku 4.5 = $1/MTok input, $5/MTok output
      estimated_cost_usd: (
        ((data.usage?.input_tokens || 0) / 1_000_000) * 1.00 +
        ((data.usage?.output_tokens || 0) / 1_000_000) * 5.00
      ).toFixed(6),
      fetchedAt: new Date().toISOString()
    });

  } catch (err) {
    console.error('Claude API brief error:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
}

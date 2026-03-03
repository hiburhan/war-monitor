// api/gdelt.js
// Fetches real conflict/war news from GDELT (free, no key needed)

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate'); // cache 5 min

  try {
    // GDELT GKG (Global Knowledge Graph) — conflict/war themed articles, last 24h
    const query = encodeURIComponent('war OR conflict OR missile OR attack OR military OR airstrike OR offensive');
    const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${query}&mode=artlist&maxrecords=25&format=json&timespan=24h&sort=DateDesc&sourcelang=english`;

    const response = await fetch(url, {
      headers: { 'User-Agent': 'WarMonitor/1.0' },
      signal: AbortSignal.timeout(8000)
    });

    if (!response.ok) throw new Error(`GDELT error: ${response.status}`);

    const data = await response.json();
    const articles = (data.articles || []).map(a => ({
      title: a.title,
      url: a.url,
      source: a.domain,
      seenAt: a.seendate,
      country: a.sourcecountry || '',
      language: a.language || 'English',
      // Classify severity from title keywords
      severity: classifySeverity(a.title),
    }));

    res.status(200).json({ ok: true, articles, fetchedAt: new Date().toISOString() });
  } catch (err) {
    console.error('GDELT fetch error:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
}

function classifySeverity(title) {
  const t = title.toLowerCase();
  if (/missile|nuclear|chemical|killed|airstrike|massacre|explosion|bomb/.test(t)) return 'critical';
  if (/attack|offensive|strike|shelling|assault|troops|combat/.test(t)) return 'high';
  if (/ceasefire|tensions|warning|sanction|protest|clash/.test(t)) return 'medium';
  return 'low';
}

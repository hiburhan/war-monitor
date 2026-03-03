// api/firms.js
// Fetches real satellite fire hotspots from NASA FIRMS
// Requires NASA_FIRMS_API_KEY env variable (free at firms.modaps.eosdis.nasa.gov/api)

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate'); // cache 10 min

  const apiKey = process.env.NASA_FIRMS_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ ok: false, error: 'NASA_FIRMS_API_KEY not configured' });
  }

  try {
    const { days = 1, area = 'world' } = req.query;

    // VIIRS SNPP — higher resolution than MODIS
    // Area format: lng_min,lat_min,lng_max,lat_max OR 'world'
    const areaParam = area === 'world' ? '-180,-90,180,90' : area;
    const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${apiKey}/VIIRS_SNPP_NRT/${areaParam}/${days}`;

    const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error(`FIRMS error: ${response.status}`);

    const csv = await response.text();
    const fires = parseCSV(csv);

    // Filter by high confidence and high FRP (fire radiative power) — skip noise
    const significant = fires
      .filter(f => f.confidence === 'h' || parseFloat(f.frp) > 50)
      .slice(0, 200) // cap to 200 hotspots
      .map(f => ({
        lat: parseFloat(f.latitude),
        lng: parseFloat(f.longitude),
        frp: parseFloat(f.frp), // fire radiative power in MW
        confidence: f.confidence,
        acqDate: f.acq_date,
        acqTime: f.acq_time,
        severity: parseFloat(f.frp) > 500 ? 'critical'
                : parseFloat(f.frp) > 200 ? 'high'
                : parseFloat(f.frp) > 50 ? 'medium' : 'low',
      }));

    res.status(200).json({
      ok: true,
      count: significant.length,
      fires: significant,
      fetchedAt: new Date().toISOString()
    });
  } catch (err) {
    console.error('FIRMS fetch error:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
}

function parseCSV(csv) {
  const lines = csv.trim().split('\n');
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim());
  return lines.slice(1).map(line => {
    const vals = line.split(',');
    return Object.fromEntries(headers.map((h, i) => [h, vals[i]?.trim() || '']));
  });
}

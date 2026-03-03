// api/usgs.js
// Fetches real earthquake data from USGS (completely free, no key needed)

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=180, stale-while-revalidate'); // cache 3 min

  try {
    const { timespan = '24h', minmag = '4.0' } = req.query;

    // Map timespan to USGS format
    const startTimeMap = { '1h': 1, '6h': 6, '24h': 24, '48h': 48, '7d': 168 };
    const hours = startTimeMap[timespan] || 24;
    const startTime = new Date(Date.now() - hours * 3600 * 1000).toISOString();

    const url = `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&starttime=${startTime}&minmagnitude=${minmag}&orderby=magnitude&limit=50`;

    const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error(`USGS error: ${response.status}`);

    const data = await response.json();

    const earthquakes = data.features.map(f => ({
      id: f.id,
      magnitude: f.properties.mag,
      place: f.properties.place,
      time: f.properties.time,
      url: f.properties.url,
      lat: f.geometry.coordinates[1],
      lng: f.geometry.coordinates[0],
      depth: f.geometry.coordinates[2],
      // Classify severity
      severity: f.properties.mag >= 7 ? 'critical'
              : f.properties.mag >= 6 ? 'high'
              : f.properties.mag >= 5 ? 'medium' : 'low',
    }));

    res.status(200).json({
      ok: true,
      count: earthquakes.length,
      earthquakes,
      fetchedAt: new Date().toISOString()
    });
  } catch (err) {
    console.error('USGS fetch error:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
}

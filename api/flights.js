// api/flights.js
// Fetches real military/surveillance flight data from OpenSky Network
// Optional: OPENSKY_USERNAME + OPENSKY_PASSWORD for higher rate limits

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate'); // cache 1 min (rate limit friendly)

  try {
    const username = process.env.OPENSKY_USERNAME;
    const password = process.env.OPENSKY_PASSWORD;

    // Build auth header if credentials provided
    const headers = {};
    if (username && password) {
      headers['Authorization'] = 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64');
    }

    // Fetch all current state vectors (no bbox = global)
    // Anonymous: 400 req/day, 10s resolution
    // Authenticated: 4000 req/day, 5s resolution
    const url = 'https://opensky-network.org/api/states/all';
    const response = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(12000)
    });

    if (response.status === 429) {
      return res.status(429).json({ ok: false, error: 'OpenSky rate limit hit. Try again in a few minutes.' });
    }
    if (!response.ok) throw new Error(`OpenSky error: ${response.status}`);

    const data = await response.json();

    // State vector fields:
    // [icao24, callsign, origin_country, time_position, last_contact,
    //  longitude, latitude, baro_altitude, on_ground, velocity,
    //  true_track, vertical_rate, sensors, geo_altitude, squawk, spi, position_source]

    const MILITARY_PREFIXES = [
      'RCH','CTM','JAKE','BART','VALOR','KNIFE','DUKE','REACH',
      'LOBO','PACK','GHOST','SPAR','VENUS','IRON','STEEL','BRONC',
      'HAWK','EAGLE','STORM','FURY','VIPER','TIGER','COBRA','WOLF',
      'ATLAS','ZEUS','ARES','MARS','CHAOS','REAPER','PREDATOR'
    ];

    const SURVEILLANCE_SQUAWKS = ['7700','7600','7500']; // emergency squawks

    const flights = (data.states || [])
      .filter(s => {
        if (!s[5] || !s[6]) return false; // must have position
        if (s[8]) return false; // skip on-ground
        const callsign = (s[1] || '').trim().toUpperCase();
        // Keep military callsigns
        const isMilitary = MILITARY_PREFIXES.some(p => callsign.startsWith(p));
        const isEmergency = SURVEILLANCE_SQUAWKS.includes(s[15]);
        return isMilitary || isEmergency;
      })
      .slice(0, 150)
      .map(s => ({
        icao: s[0],
        callsign: (s[1] || '').trim(),
        country: s[2],
        lat: s[6],
        lng: s[5],
        altitude: s[7], // meters
        velocity: s[9], // m/s
        heading: s[10],
        squawk: s[15],
        lastContact: s[4],
        isMilitary: MILITARY_PREFIXES.some(p => (s[1] || '').trim().toUpperCase().startsWith(p)),
      }));

    res.status(200).json({
      ok: true,
      count: flights.length,
      total_tracked: data.states?.length || 0,
      flights,
      fetchedAt: new Date().toISOString()
    });
  } catch (err) {
    console.error('OpenSky fetch error:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
}

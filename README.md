# WAR MONITOR — Setup Guide

Real-time global conflict intelligence dashboard powered by live APIs + Claude AI.

## Project Structure
```
war-monitor/
├── api/
│   ├── gdelt.js       ← conflict news (FREE, no key)
│   ├── usgs.js        ← earthquakes (FREE, no key)
│   ├── firms.js       ← satellite fires (free key needed)
│   ├── flights.js     ← military flights (free account needed)
│   └── brief.js       ← AI brief via Claude Haiku 4.5 ✨
├── public/
│   └── index.html     ← the dashboard
├── package.json
└── vercel.json
```

---

## Step 1: Get Your Free API Keys

### Anthropic Claude (AI Brief) — REQUIRED
1. Go to https://platform.anthropic.com/settings/api-keys
2. Sign up (free — $5 free credits, no credit card needed)
3. Click "Create Key"
4. Copy your key (starts with `sk-ant-`)

> Cost estimate: ~$0.002/day using Claude Haiku 4.5.
> Your $5 free credits last ~7 years at this usage rate.

### NASA FIRMS (Satellite Fires)
1. Go to https://firms.modaps.eosdis.nasa.gov/api/
2. Click "Get API Key" — free, instant

### OpenSky (Military Flights) — Optional
1. Register at https://opensky-network.org — free account
2. Without account: still works, rate-limited to 400 req/day

---

## Step 2: Deploy to Vercel

```bash
npm install -g vercel
cd war-monitor
vercel
```

## Step 3: Add API Keys

```bash
vercel env add ANTHROPIC_API_KEY    # sk-ant-...
vercel env add NASA_FIRMS_API_KEY
vercel env add OPENSKY_USERNAME
vercel env add OPENSKY_PASSWORD
vercel --prod
```

## Step 4: Connect GitHub (auto-deploy)

```bash
git init && git add . && git commit -m "War Monitor"
git remote add origin https://github.com/YOUR-USERNAME/war-monitor.git
git push -u origin main
```

Import repo at vercel.com — every push auto-deploys!

---

## Cost

| Service | Cost |
|---------|------|
| GDELT, USGS | $0 |
| NASA FIRMS | $0 |
| OpenSky | $0 |
| Claude Haiku 4.5 | ~$0.002/day |
| Vercel | $0 |
| **Total** | **~$0/month** |

## Local Dev

```bash
echo "ANTHROPIC_API_KEY=sk-ant-xxx" >> .env.local
echo "NASA_FIRMS_API_KEY=xxx" >> .env.local
vercel dev
```

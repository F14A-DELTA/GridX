GridX — Agent Build Script
Stack
•	Frontend + Backend: Next.js 14 (App Router), single Vercel deployment
•	Auth + DB + Storage: Supabase
•	Language: TypeScript throughout
Environment Variables
env
NEXT_PUBLIC_SUPABASE_URL=https://zniepvuiqjhdornngynp.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_8_8YFK2ZuEXFPv5SLBszVA_W6G7UJfl

EC2_API_KEY=
EC2_BASE_URL=
OPENELEC_API_KEY=
HF_TOKEN=
FOXTROT_API_KEY=
NEWS_SENTIMENT_API_KEY=
OPENMETEO_BASE_URL=https://api.open-meteo.com/v1

Supabase Schema
sql
create table organisations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz default now()
);

create table profiles (
  id uuid references auth.users primary key,
  display_name text,
  account_type text check (account_type in ('user', 'org_member')),
  org_id uuid references organisations(id),
  role text check (role in ('admin', 'member')) default 'member',
  created_at timestamptz default now()
);

create table mock_trades (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organisations(id),
  region text not null,
  direction text check (direction in ('buy', 'sell')),
  quantity_mwh numeric not null,
  price_at_trade numeric not null,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

create table desk_notes (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organisations(id),
  region text not null,
  content text not null,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

create table activity_log (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organisations(id),
  user_id uuid references auth.users(id),
  action text not null,
  metadata jsonb,
  created_at timestamptz default now()
);

Auth & Access Rules
•	/login, /signup, / — public
•	/(app)/* — requires authenticated Supabase session, redirect to /login if missing
•	/(app)/trading/* — requires account_type = 'org_member', redirect to /overview if not
•	/(app)/admin — requires role = 'admin', redirect to /overview if not
Signup flow:
Keep sign up logic simple, no hard checks for gmail or password (this is a MVP) but implement the following
•	Individual: creates profiles row with account_type = 'user'
•	Organisation: creates organisations row, then profiles row with account_type = 'org_member' and role = 'admin'
________________________________________
API Route Contracts
All upstream keys are server-side only. Frontend only ever calls these product routes.
GET /api/market/overview
Calls ec2LiveAdapter for all regions. Returns:
ts
{ regions: [{ region: string, price: number, demand: number, renewablesPct: number, emissionsIntensity: number, fuelMix: { fuel: string, pct: number }[] }] }
GET /api/market/regions/[region]/live
Same shape as one element from overview. Used for polling individual region KPIs every 30s.
GET /api/market/regions/[region]/history
Calls ec2HistoryAdapter. Deduplicates timestamps before returning. Falls back to openElectricityAdapter if EC2 returns non-200 or empty. Returns:
ts
{ timestamps: string[], price: number[], demand: number[], renewablesPct: number[], emissionsIntensity: number[] }
GET /api/market/regions/[region]/forecast/next-day
Calls hfDailyAveragesAdapter (/load_daily_averages + /forecast_next_day_both). Returns:
ts
{ date: string, forecastPrice: number, forecastDemand: number, historicalAvgPrice: number, historicalAvgDemand: number }
GET /api/market/regions/[region]/forecast/intraday
Calls hfPriceForecastAdapter (electricity_grid_model) and hfRenewablesAdapter (electricity-model-v2). Returns:
ts
{ intervals: [{ t: string, price: number, solar: number, hydro: number, batteryDischarge: number, renewablesPct: number }] }
// intervals at +5m, +15m, +30m
GET /api/market/regions/[region]/solar
Calls hfSolarAdapter (/refresh_solar_dashboard + /refresh_solar_dashboard_1). Returns:
ts
{ rooftopMw: number, utilityMw: number, forecast: [{ t: string, rooftop: number, utility: number }] }
// forecast intervals at +5m, +15m, +30m
GET /api/market/regions/[region]/weather
Calls weatherAdapter using hardcoded state coordinates (never exposed to frontend). Returns:
ts
{ temp: number, weatherCode: number, rain: number, cloudCover: number, windSpeed: number, windDir: number, gusts: number, sunrise: string, sunset: string }
Hardcode in weatherAdapter:
ts
const STATE_COORDS = {
  NSW: { lat: -33.87, lon: 151.21 },
  VIC: { lat: -37.81, lon: 144.96 },
  QLD: { lat: -27.47, lon: 153.02 },
  SA:  { lat: -34.93, lon: 138.60 },
  WA:  { lat: -31.95, lon: 115.86 },
  TAS: { lat: -42.88, lon: 147.33 },
}
GET /api/market/stocks
Calls stocksAdapter (yfinance server-side). Hardcode watchlist: AGL.AX, ORG.AX, WDS.AX, MEZ.AX, NHC.AX. Returns:
ts
{ tickers: [{ symbol: string, name: string, price: number, change: number, changePct: number }] }
GET /api/market/commodities
Calls commoditiesAdapter (FoxTrot). Returns:
ts
{ metals: [{ name: string, price: number, change: number, unit: string, headline: string }] }
GET /api/market/commodities/[metal]/history
FoxTrot historical series for a single metal. Returns:
ts
{ timestamps: string[], prices: number[] }
GET /api/market/news
Calls newsSentimentAdapter. Returns:
ts
{ articles: [{ title: string, source: string, sentiment: 'positive' | 'neutral' | 'negative', sentimentScore: number, url: string, publishedAt: string }] }
POST /api/org/desks/[region]/trades
Auth-gated to org_member. Body: { direction: 'buy' | 'sell', quantity_mwh: number }. Fetches current live price from EC2 for the region, writes to mock_trades, writes to activity_log. Returns saved trade row.
GET /api/org/desks/[region]/trades
Returns all trades for org_id + region, ordered by created_at desc. Includes computed unrealised_pnl = (current_price - price_at_trade) * quantity_mwh using latest live price.
GET/POST /api/org/desks/[region]/notes
GET returns all notes for org + region. POST writes to desk_notes and activity_log.
GET /api/org/members
Admin only. Returns all profiles rows for the org.
________________________________________
Page Data Requirements
/overview
•	Polls GET /api/market/overview every 30s
•	Displays per-region: live price, demand, renewables %, emissions intensity, fuel mix breakdown
•	All data rendered as KPI cards and Recharts charts
/predictions
•	Fetches per selected region: 
o	live — current snapshot
o	forecast/next-day — next day price + demand outlook
o	forecast/intraday — +5m/+15m/+30m price, solar, renewables overlays
•	All three forecast layers displayed as Recharts line charts, each labelled with its data source ("EC2 Live", "HF Next-Day", "HF Intraday")
/solar
•	Fetches solar for selected region
•	Displays rooftop vs utility generation as stacked bar or area chart
•	Arbitrage calculator: user inputs battery capacity (kWh) and feed-in tariff ($/kWh), frontend computes estimated daily savings from solar forecast data — no API call needed, pure client-side math
/markets
Four data sections, each from its own route:
•	Grid: price + demand + renewables across all regions from overview
•	Commodities: metals prices + history sparklines from commodities + commodities/[metal]/history
•	Stocks: ASX energy equities from stocks
•	Weather: per-region weather cards from weather
•	News: article list with sentiment scores from news
/trading/[region] (org only)
•	Polls GET /api/market/regions/[region]/live every 15s — live price displayed as a running ticker/line chart
•	Trade form: Buy/Sell toggle, quantity in MWh, submit hits POST /api/org/desks/[region]/trades
•	Trade history table with columns: time, direction, qty, price at trade, current price, unrealised P&L
•	P&L chart over time using Recharts
•	Notes panel: list + add note via GET/POST /api/org/desks/[region]/notes
•	Activity feed from activity_log for the org
/admin (org admin only)
•	Member list from GET /api/org/members
•	Invite by email via Supabase inviteUserByEmail
•	Role toggle (member ↔ admin) updates profiles.role
________________________________________
Adapter Implementation Notes
HF Spaces cold starts: Free-tier Spaces sleep after inactivity and can take 20–30s to wake. Set an 8s timeout on every HF adapter fetch. On timeout, return the last cached response from a server-side in-memory cache (simple Map keyed by endpoint + region). If no cache exists yet, return a 503 with { error: 'model_warming', retryAfter: 30 } so the frontend can show a "model loading" state rather than a broken chart.
EC2 duplicate timestamps: The /v1/history endpoint can return duplicate timestamps in network-wide responses. In ec2HistoryAdapter, deduplicate by keeping the last occurrence of each timestamp before returning.
Open Electricity fallback: If ec2LiveAdapter or ec2HistoryAdapter returns non-200 or an empty data array, retry once against openElectricityAdapter before returning an error.
Mock trading P&L: unrealised_pnl = (current_live_price - price_at_trade) * quantity_mwh. Computed server-side in the GET trades route by fetching current live price and attaching to each trade row.
yfinance: Run as a Python subprocess or deploy a minimal FastAPI sidecar on the same Vercel project. The Next.js stocksAdapter calls it internally — never from the browser.
________________________________________
Delivery Order
1.	Scaffold Next.js app, configure Supabase auth, create schema, wire middleware
2.	Build all API route handlers with stubbed adapter responses returning hardcoded typed data
3.	Implement adapters one at a time: EC2 live → EC2 history → weather → HF forecasts → solar → stocks → commodities → news
4.	Replace stubs with real adapter calls as each adapter is verified
5.	Build all frontend pages consuming the live routes with Recharts charts and SWR polling
6.	Add org features: trading route, notes, activity log, P&L chart
7.	Add admin page and Supabase invite flow
8.	Add HF cold-start caching, EC2 fallback logic, and error/loading states throughout


import addMilliseconds from 'date-fns/addMilliseconds'
import parseISO from 'date-fns/parseISO'
import { getSpotForecast } from '@/services/ForecastingApi'

const SUPABASE_URL =
  process.env.SUPABASE_URL || 'https://zniepvuiqjhdornngynp.supabase.co'
const SUPABASE_PUBLISHABLE_KEY =
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  'sb_publishable_8_8YFK2ZuEXFPv5SLBszVA_W6G7UJfl'
const OPENELEC_API_KEY =
  process.env.OPENELEC_API_KEY || process.env.API_KEY || ''
const OPENELEC_API_BASE =
  process.env.API_BASE_URL || 'https://api.openelectricity.org.au'

function readJsonLs(key) {
  if (typeof window === 'undefined') return null
  const raw = window.localStorage.getItem(key)
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch (error) {
    return null
  }
}

function supabaseHeaders(prefer) {
  const headers = {
    'Content-Type': 'application/json',
    apikey: SUPABASE_PUBLISHABLE_KEY,
    Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`
  }
  if (prefer) headers.Prefer = prefer

  const profile = readJsonLs('gridx_profile')
  const session = readJsonLs('gridx_session')
  if (profile && profile.org_id) headers['x-gridx-org-id'] = profile.org_id
  if (profile && profile.role) headers['x-gridx-role'] = profile.role
  if (session && session.user && session.user.id) {
    headers['x-gridx-user-id'] = session.user.id
  }
  return headers
}

async function supabaseRequest(path, { method = 'GET', body, prefer } = {}) {
  const response = await fetch(`${SUPABASE_URL}${path}`, {
    method,
    headers: supabaseHeaders(prefer),
    body: body ? JSON.stringify(body) : undefined
  })
  const isJson = (response.headers.get('content-type') || '').includes('application/json')
  const data = isJson ? await response.json() : null
  if (!response.ok) {
    const message = (data && (data.message || data.msg || data.error_description)) || 'Request failed'
    throw new Error(message)
  }
  return data
}

function getOrgContext() {
  const profile = readJsonLs('gridx_profile')
  const session = readJsonLs('gridx_session')
  return {
    orgId: profile && profile.org_id ? profile.org_id : null,
    userId: session && session.user ? session.user.id : null,
    profile
  }
}

function intervalMs(intervalText = '5m') {
  if (intervalText === '5m') return 5 * 60 * 1000
  if (intervalText === '15m') return 15 * 60 * 1000
  if (intervalText === '30m') return 30 * 60 * 1000
  return 5 * 60 * 1000
}

function materializeSeries(history) {
  if (!history || !history.start || !history.interval || !Array.isArray(history.data)) {
    return []
  }
  const start = parseISO(history.start)
  const step = intervalMs(history.interval)
  return history.data.map((value, idx) => ({
    time: addMilliseconds(start, idx * step).getTime(),
    value
  }))
}

function buildGenerationSeries(dataRows = []) {
  const genRows = dataRows.filter((row) => {
    if (!row || !row.id || !row.history || !Array.isArray(row.history.data)) return false
    const id = row.id
    return (
      id.includes('.fuel_tech.') &&
      id.endsWith('.power') &&
      !id.includes('battery_charging')
    )
  })
  if (!genRows.length) return []

  const base = materializeSeries(genRows[0].history)
  return base.map((point, idx) => {
    const sum = genRows.reduce((acc, row) => {
      const v = row.history.data[idx]
      return acc + (Number(v) || 0)
    }, 0)
    return {
      time: point.time,
      value: sum
    }
  })
}

function apiHeaders() {
  const headers = {}
  if (OPENELEC_API_KEY) {
    headers.Authorization = `Bearer ${OPENELEC_API_KEY}`
  }
  return headers
}

async function apiRequest(path) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const requestTargets = [
    `${OPENELEC_API_BASE}${normalizedPath}`,
    `/api${normalizedPath}`
  ]

  let lastError = null
  for (let targetIdx = 0; targetIdx < requestTargets.length; targetIdx += 1) {
    const target = requestTargets[targetIdx]
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 9000)
      try {
        const response = await fetch(target, {
          method: 'GET',
          headers: apiHeaders(),
          signal: controller.signal
        })

        if (response.ok) {
          return response.json()
        }

        // Retry transient upstream errors once, then try next target.
        if (response.status >= 500 || response.status === 429) {
          lastError = new Error(`Trading API transient error (${response.status})`)
          continue
        }

        throw new Error(`Trading API request failed (${response.status})`)
      } catch (error) {
        lastError = error
      } finally {
        clearTimeout(timeout)
      }
    }
  }

  throw lastError || new Error('Trading API request failed')
}

function seriesFromResultData(rows = []) {
  return (rows || [])
    .map((point) => {
      if (!Array.isArray(point) || point.length < 2) return null
      const time = new Date(point[0]).getTime()
      const rawValue = point[1]
      if (rawValue === null || rawValue === undefined || rawValue === '') return null
      const value = Number(rawValue)
      if (!Number.isFinite(time) || !Number.isFinite(value)) return null
      return { time, value }
    })
    .filter(Boolean)
}

function pickMetricResult(payload, metricPrefix, region) {
  const metricRows = payload && payload.data && payload.data[0] && payload.data[0].results
    ? payload.data[0].results
    : []
  const regionUpper = String(region || '').toUpperCase()
  const preferredName = `${metricPrefix}_${regionUpper}`
  return (
    metricRows.find((row) => String(row.name || '').toUpperCase() === preferredName) ||
    metricRows.find((row) => String(row.name || '').toUpperCase().startsWith(`${metricPrefix.toUpperCase()}_${regionUpper}`)) ||
    metricRows[0] ||
    null
  )
}

export async function loadStateDeskSeries(state) {
  const region = String(state || 'NSW1').toUpperCase()
  const [pricePayload, demandPayload, generationPayload] = await Promise.allSettled([
    apiRequest(`/v4/market/network/NEM?metrics=price&interval=5m&network_region=${region}`),
    apiRequest(`/v4/market/network/NEM?metrics=demand&interval=5m&network_region=${region}`),
    apiRequest(`/v4/data/network/NEM?metrics=power&interval=5m&network_region=${region}`)
  ])

  const priceResult = pickMetricResult(
    pricePayload.status === 'fulfilled' ? pricePayload.value : null,
    'price',
    region
  )
  const demandResult = pickMetricResult(
    demandPayload.status === 'fulfilled' ? demandPayload.value : null,
    'demand',
    region
  )
  const generationResult = pickMetricResult(
    generationPayload.status === 'fulfilled' ? generationPayload.value : null,
    'power',
    region
  )

  return {
    price: seriesFromResultData(priceResult ? priceResult.data : []),
    demand: seriesFromResultData(demandResult ? demandResult.data : []),
    generation: seriesFromResultData(generationResult ? generationResult.data : [])
  }
}

export function buildSimulatedDeskSeries(seriesBundle) {
  return {
    price: (seriesBundle.price || []).map((row) => ({ ...row })),
    demand: (seriesBundle.demand || []).map((row) => ({ ...row })),
    generation: (seriesBundle.generation || []).map((row) => ({ ...row }))
  }
}

export function appendLiveTick(series) {
  return series || []
}

export async function fetchForecastOverlays(state) {
  const spot = await getSpotForecast()
  const payload = spot && spot[2] ? spot[2] : null
  if (!payload || !payload.regions) return null
  const region = payload.regions.find((r) => r.region === state)
  if (!region || !region.forecasts) return null
  const getPred = (h, key) => {
    const raw = region.forecasts[h] && region.forecasts[h][key]
    if (!raw) return null
    if (raw.predicted_value !== undefined) return raw.predicted_value
    return raw
  }
  return {
    price: {
      '5m': getPred('5m', 'price'),
      '15m': getPred('15m', 'price'),
      '30m': getPred('30m', 'price')
    },
    demand: {
      '5m': getPred('5m', 'demand'),
      '15m': getPred('15m', 'demand'),
      '30m': getPred('30m', 'demand')
    },
    generation: {
      '5m': getPred('5m', 'gen_total'),
      '15m': getPred('15m', 'gen_total'),
      '30m': getPred('30m', 'gen_total')
    }
  }
}

export async function placeTrade({ state, side, quantityMwh, entryPrice }) {
  const { orgId, userId } = getOrgContext()
  if (!orgId || !userId) throw new Error('Org session not found.')

  const [trade] = await supabaseRequest('/rest/v1/gridx_trades?select=*', {
    method: 'POST',
    prefer: 'return=representation',
    body: {
      org_id: orgId,
      author_user_id: userId,
      state,
      side,
      quantity_mwh: Number(quantityMwh),
      remaining_quantity_mwh: Number(quantityMwh),
      entry_price: Number(entryPrice),
      status: 'open'
    }
  })

  await supabaseRequest('/rest/v1/gridx_trade_events?select=id', {
    method: 'POST',
    prefer: 'return=minimal',
    body: {
      org_id: orgId,
      trade_id: trade.id,
      author_user_id: userId,
      state,
      event_type: 'placed',
      side,
      quantity_mwh: Number(quantityMwh),
      price: Number(entryPrice),
      realised_pnl: 0
    }
  })

  await supabaseRequest('/rest/v1/gridx_order_book_events?select=id', {
    method: 'POST',
    prefer: 'return=minimal',
    body: {
      org_id: orgId,
      author_user_id: userId,
      state,
      side,
      quantity_mwh: Number(quantityMwh),
      price: Number(entryPrice)
    }
  })

  await supabaseRequest('/rest/v1/gridx_trade_activity?select=id', {
    method: 'POST',
    prefer: 'return=minimal',
    body: {
      org_id: orgId,
      author_user_id: userId,
      state,
      activity_type: 'trade_placed',
      message: `${side.toUpperCase()} ${quantityMwh} MWh @ ${entryPrice}`,
      payload: {
        trade_id: trade.id,
        side,
        quantity_mwh: Number(quantityMwh),
        price: Number(entryPrice)
      }
    }
  })

  return trade
}

export async function closeTrade({ tradeId, closePrice }) {
  const { orgId, userId } = getOrgContext()
  if (!orgId || !userId) throw new Error('Org session not found.')
  const rows = await supabaseRequest(
    `/rest/v1/gridx_trades?id=eq.${tradeId}&select=*`,
    { method: 'GET' }
  )
  const trade = rows && rows.length ? rows[0] : null
  if (!trade) throw new Error('Trade not found.')
  if (trade.status !== 'open') throw new Error('Trade is already closed.')

  const qty = Number(trade.remaining_quantity_mwh || trade.quantity_mwh || 0)
  const pnlPerUnit =
    trade.side === 'buy'
      ? Number(closePrice) - Number(trade.entry_price)
      : Number(trade.entry_price) - Number(closePrice)
  const realisedPnl = qty * pnlPerUnit

  const [updated] = await supabaseRequest(
    `/rest/v1/gridx_trades?id=eq.${tradeId}&select=*`,
    {
      method: 'PATCH',
      prefer: 'return=representation',
      body: {
        status: 'closed',
        close_price: Number(closePrice),
        closed_at: new Date().toISOString(),
        realised_pnl: realisedPnl,
        unrealised_pnl_snapshot: 0,
        remaining_quantity_mwh: 0
      }
    }
  )

  await supabaseRequest('/rest/v1/gridx_trade_events?select=id', {
    method: 'POST',
    prefer: 'return=minimal',
    body: {
      org_id: orgId,
      trade_id: trade.id,
      author_user_id: userId,
      state: trade.state,
      event_type: 'closed',
      side: trade.side,
      quantity_mwh: qty,
      price: Number(closePrice),
      realised_pnl: realisedPnl
    }
  })

  await supabaseRequest('/rest/v1/gridx_trade_activity?select=id', {
    method: 'POST',
    prefer: 'return=minimal',
    body: {
      org_id: orgId,
      author_user_id: userId,
      state: trade.state,
      activity_type: 'trade_closed',
      message: `CLOSED ${trade.side.toUpperCase()} ${qty} MWh @ ${closePrice}`,
      payload: {
        trade_id: trade.id,
        realised_pnl: realisedPnl
      }
    }
  })

  return updated
}

export async function listTrades(orgState = '') {
  const stateFilter = orgState ? `&state=eq.${orgState}` : ''
  const rows = await supabaseRequest(
    `/rest/v1/gridx_trades?select=*&order=created_at.desc${stateFilter}`,
    { method: 'GET' }
  )
  return rows || []
}

export async function listOrderBook(state, limit = 20) {
  const rows = await supabaseRequest(
    `/rest/v1/gridx_order_book_events?state=eq.${state}&select=*&order=created_at.desc&limit=${Number(limit)}`,
    { method: 'GET' }
  )
  return rows || []
}

export async function listActivity(state, limit = 50) {
  const stateFilter = state ? `&state=eq.${state}` : ''
  const rows = await supabaseRequest(
    `/rest/v1/gridx_trade_activity?select=*&order=created_at.desc&limit=${Number(limit)}${stateFilter}`,
    { method: 'GET' }
  )
  return rows || []
}

export async function listNotes(state, limit = 50) {
  const stateFilter = state ? `&state=eq.${state}` : ''
  const rows = await supabaseRequest(
    `/rest/v1/gridx_trade_notes?select=*&order=created_at.desc&limit=${Number(limit)}${stateFilter}`,
    { method: 'GET' }
  )
  const notes = rows || []
  if (!notes.length) return notes

  const authorIds = Array.from(
    new Set(
      notes
        .map((note) => note.author_user_id)
        .filter((id) => typeof id === 'string' && id.length)
    )
  )
  if (!authorIds.length) return notes

  try {
    const inClause = authorIds.join(',')
    const profiles = await supabaseRequest(
      `/rest/v1/gridx_profiles?select=user_id,display_name&user_id=in.(${inClause})`,
      { method: 'GET' }
    )
    const nameByUserId = (profiles || []).reduce((acc, profile) => {
      if (profile && profile.user_id) {
        acc[profile.user_id] = profile.display_name || null
      }
      return acc
    }, {})

    return notes.map((note) => ({
      ...note,
      author_display_name: nameByUserId[note.author_user_id] || null
    }))
  } catch (_) {
    return notes
  }
}

export async function addNote({ state, text }) {
  const { orgId, userId } = getOrgContext()
  if (!orgId || !userId) throw new Error('Org session not found.')
  const [note] = await supabaseRequest('/rest/v1/gridx_trade_notes?select=*', {
    method: 'POST',
    prefer: 'return=representation',
    body: {
      org_id: orgId,
      author_user_id: userId,
      state,
      note_text: text
    }
  })

  await supabaseRequest('/rest/v1/gridx_trade_activity?select=id', {
    method: 'POST',
    prefer: 'return=minimal',
    body: {
      org_id: orgId,
      author_user_id: userId,
      state,
      activity_type: 'note_added',
      message: text.slice(0, 120),
      payload: {
        note_id: note.id
      }
    }
  })
  return note
}

const SPACE_BASES = {
  solar: '/hf-solar',
  daily: '/hf-daily',
  spot: '/hf-spot',
  renewables: '/hf-renewables'
}

const configCache = {}

async function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function fetchWithRetry(url, options = {}, retries = 3, delayMs = 700) {
  let lastError = null
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(url, options)
      if (response.ok) {
        return response
      }
      lastError = new Error(`HTTP ${response.status} for ${url}`)
    } catch (error) {
      lastError = error
    }

    if (attempt < retries) {
      await wait(delayMs * attempt)
    }
  }
  throw lastError || new Error(`Request failed for ${url}`)
}

function joinPath(...parts) {
  return parts
    .filter(Boolean)
    .map((part, index) => {
      if (index === 0) {
        return part.replace(/\/+$/, '')
      }
      return part.replace(/^\/+/, '').replace(/\/+$/, '')
    })
    .join('/')
}

function safeJsonParse(raw) {
  try {
    return JSON.parse(raw)
  } catch (e) {
    return null
  }
}

function normalizeApiName(apiName) {
  if (!apiName) return ''
  return apiName.startsWith('/') ? apiName : `/${apiName}`
}

function toComparableApiName(apiName) {
  return normalizeApiName(apiName).replace(/^\/+/, '/')
}

function createSessionHash() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

async function getConfig(spaceBase) {
  if (configCache[spaceBase]) {
    return configCache[spaceBase]
  }

  const response = await fetchWithRetry(`${spaceBase}/config`, {}, 3, 500)

  const config = await response.json()
  configCache[spaceBase] = config
  return config
}

async function findFnIndex(spaceBase, apiName) {
  const config = await getConfig(spaceBase)
  const normalized = toComparableApiName(apiName)
  const dependency = config.dependencies.find((dep) => {
    if (!dep.api_name) return false
    return toComparableApiName(dep.api_name) === normalized
  })

  if (!dependency) {
    throw new Error(`API endpoint not found: ${apiName}`)
  }

  return dependency.id
}

function parseProcessCompleted(payload, eventId) {
  if (!payload || payload.msg !== 'process_completed') {
    return null
  }
  if (payload.event_id !== eventId) {
    return null
  }
  if (!payload.success) {
    throw new Error('Prediction request failed')
  }
  return payload.output && payload.output.data ? payload.output.data : null
}

async function callQueueApi(spaceBase, apiName, data = []) {
  const config = await getConfig(spaceBase)
  const fnIndex = await findFnIndex(spaceBase, apiName)
  const apiPrefix = config.api_prefix || '/gradio_api'
  const sessionHash = createSessionHash()

  const queueJoinUrl = joinPath(spaceBase, apiPrefix, 'queue/join')
  const queueDataBaseUrl = joinPath(spaceBase, apiPrefix, 'queue/data')

  const joinResponse = await fetchWithRetry(queueJoinUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      data,
      fn_index: fnIndex,
      session_hash: sessionHash
    })
  }, 3, 700)

  const joinPayload = await joinResponse.json()
  const eventId = joinPayload.event_id
  if (!eventId) {
    throw new Error(`No event id for ${apiName}`)
  }

  const streamUrl = `${queueDataBaseUrl}?session_hash=${sessionHash}`
  const streamResponse = await fetchWithRetry(streamUrl, {}, 3, 1000)

  const streamText = await streamResponse.text()
  const lines = streamText.split('\n')
  for (const line of lines) {
    if (!line.startsWith('data: ')) {
      continue
    }

    const payload = safeJsonParse(line.slice(6))
    const result = parseProcessCompleted(payload, eventId)
    if (result) {
      return result
    }
  }

  throw new Error(`No completed event payload for ${apiName}`)
}

export async function getSolarForecast() {
  return callQueueApi(SPACE_BASES.solar, '/refresh_solar_dashboard')
}

export async function getDailyAverages(
  state,
  startDate,
  endDate,
  useLive = true
) {
  return callQueueApi(SPACE_BASES.daily, '/load_daily_averages', [
    state,
    startDate,
    endDate,
    useLive
  ])
}

export async function getNextDayForecast(
  state,
  asOf = '',
  historyDays = 120,
  useLive = true
) {
  return callQueueApi(SPACE_BASES.daily, '/forecast_next_day_both', [
    state,
    asOf,
    Number(historyDays),
    useLive
  ])
}

export async function getSpotForecast() {
  return callQueueApi(SPACE_BASES.spot, '/refresh_dashboard_1')
}

export async function getRenewablesForecast() {
  return callQueueApi(SPACE_BASES.renewables, '/refresh_dashboard')
}

export async function getStatePowerSeries(state) {
  const region = String(state || 'NSW1').toUpperCase()
  const url = `/data/v4/stats/au/NEM/${region}/power/30d.json`
  const response = await fetchWithRetry(url, {}, 3, 500)
  return response.json()
}

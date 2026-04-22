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

async function getJson(url, options = {}, retries = 2, delayMs = 600) {
  const response = await fetchWithRetry(url, options, retries, delayMs)
  return response.json()
}

export async function getEquitySnapshot(symbols = []) {
  const requests = symbols.map(async (symbol) => {
    const query = `/yfinance/v8/finance/chart/${encodeURIComponent(symbol)}?range=1mo&interval=1d`
    try {
      const payload = await getJson(query)
      const result = payload && payload.chart && payload.chart.result ? payload.chart.result[0] : null
      if (!result || !result.meta || !result.indicators || !result.indicators.quote) {
        return {
          symbol,
          currentPrice: null,
          previousClose: null,
          changePct: null,
          history: []
        }
      }
      const quote = result.indicators.quote[0]
      const closes = quote.close || []
      const timestamps = result.timestamp || []
      const history = timestamps
        .map((ts, idx) => ({
          ts,
          close: closes[idx]
        }))
        .filter((entry) => entry.close !== null && entry.close !== undefined)
      const currentPrice = result.meta.regularMarketPrice || (history.length ? history[history.length - 1].close : null)
      const previousClose =
        result.meta.previousClose ||
        result.meta.chartPreviousClose ||
        (history.length > 1 ? history[history.length - 2].close : null)
      const changePct =
        currentPrice !== null && previousClose
          ? ((currentPrice - previousClose) / previousClose) * 100
          : null
      return {
        symbol,
        currentPrice,
        previousClose,
        changePct,
        history: history.slice(-20)
      }
    } catch (error) {
      return {
        symbol,
        currentPrice: null,
        previousClose: null,
        changePct: null,
        history: []
      }
    }
  })
  return Promise.all(requests)
}

export async function getMetalsSnapshot(metals = []) {
  const requests = metals.map(async (metal) => {
    const latest = await getJson(`/metals/retrieval/api/v1/prices/${metal}/latest`)
    const history = await getJson(`/metals/retrieval/api/v1/prices/${metal}/history`)
    return {
      metal,
      latest,
      history: Array.isArray(history) ? history.slice(0, 30).reverse() : []
    }
  })
  return Promise.all(requests)
}

export async function getNewsBundle(keyword = 'energy', timeframe = '7d', apiKey = '') {
  const headers = {}
  if (apiKey) {
    headers['x-api-key'] = apiKey
  }

  const [sentiment, sourceComparison, articles, trending] = await Promise.all([
    getJson(`/newsapi/api/sentiment?keyword=${encodeURIComponent(keyword)}&timeframe=${encodeURIComponent(timeframe)}`, { headers }),
    getJson(`/newsapi/api/sentiment/compare?keyword=${encodeURIComponent(keyword)}&timeframe=${encodeURIComponent(timeframe)}`, { headers }),
    getJson(`/newsapi/api/articles?keyword=${encodeURIComponent(keyword)}&timeframe=${encodeURIComponent(timeframe)}&limit=12`, { headers }),
    getJson('/newsapi/api/trending', { headers })
  ])

  return {
    sentiment,
    sourceComparison,
    articles,
    trending
  }
}

export async function getEquityRelatedArticles(symbolKeywordMap = {}, apiKey = '') {
  const headers = {}
  if (apiKey) {
    headers['x-api-key'] = apiKey
  }

  const requests = Object.entries(symbolKeywordMap).map(async ([symbol, stockName]) => {
    const keyword = String(stockName || '').trim()
    const payload = await getJson(
      `/newsapi/api/articles?keyword=${encodeURIComponent(keyword)}&sourceId=&limit=5&startDate=&endDate=`,
      { headers },
      2,
      700
    )
    return {
      symbol,
      keyword,
      payload
    }
  })

  return Promise.all(requests)
}

export async function getMetalHeadlines(metals = []) {
  const requests = metals.map(async (metal) => {
    const payload = await getJson(
      `/metals/collection/api/v1/headlines?metal=${encodeURIComponent(metal)}&limit=5`,
      {},
      2,
      700
    )
    return {
      metal,
      headlines: Array.isArray(payload) ? payload : []
    }
  })
  return Promise.all(requests)
}

export async function getWeatherByState(stateCoordinates) {
  const requests = stateCoordinates.map(async (item) => {
    const params =
      `latitude=${item.lat}&longitude=${item.lon}` +
      '&current=temperature_2m,cloud_cover,wind_speed_10m,rain' +
      '&daily=sunrise,sunset&timezone=Australia%2FSydney'
    const payload = await getJson(`/openmeteo/v1/forecast?${params}`)
    return {
      state: item.state,
      payload
    }
  })
  return Promise.all(requests)
}

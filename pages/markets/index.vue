<template>
  <div class="markets-page">
    <section class="chart-border panel agent-panel">
      <h3>Markets Agent</h3>
      <p class="muted">
        Powered by Gemini. Answers use the equities, metals, news sentiment, and weather data loaded below.
      </p>
      <div class="agent-row">
        <input
          v-model="agentQuery"
          class="input is-small"
          placeholder="e.g. How does sentiment line up with the equity movers today?"
          type="text"
          @keyup.enter="runAgent">
        <button
          class="button is-small is-primary"
          :disabled="agentLoading"
          @click="runAgent">
          {{ agentLoading ? 'Thinking…' : 'Ask' }}
        </button>
      </div>
      <div class="agent-response">
        {{ agentResponse }}
      </div>
    </section>

    <section class="chart-border panel controls">
      <div class="field-group">
        <label>Add Stock Symbol</label>
        <input
          v-model="customStockSymbol"
          class="input is-small"
          placeholder="e.g. BHP.AX"
          type="text">
      </div>
      <div class="field-group">
        <label>Company Name (for news)</label>
        <input
          v-model="customStockName"
          class="input is-small"
          placeholder="e.g. BHP Group"
          type="text">
      </div>
      <button
        class="button is-small is-link"
        @click="addCustomStock">
        Add Stock
      </button>
      <button
        class="button is-small is-dark"
        :disabled="loading"
        @click="fetchAllMarketsData">
        {{ loading ? 'Refreshing…' : 'Refresh Markets' }}
      </button>
    </section>

    <p
      v-if="errorMessage"
      class="error-text">
      {{ errorMessage }}
    </p>

    <section class="chart-border panel">
      <h3>ASX Energy Equities</h3>
      <table class="table is-fullwidth is-striped is-hoverable is-size-7">
        <thead>
          <tr>
            <th>Symbol</th>
            <th>Price</th>
            <th>Change %</th>
            <th>Related News</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in equities"
            :key="row.symbol">
            <td>{{ row.symbol }}</td>
            <td>{{ formatCurrency(row.currentPrice) }}</td>
            <td :class="row.changePct >= 0 ? 'pos' : 'neg'">
              {{ formatPercent(row.changePct) }}
            </td>
            <td class="related-news-cell">
              <ul
                v-if="getEquityArticles(row.symbol).length > 0"
                class="news-links">
                <li
                  v-for="(article, idx) in getEquityArticles(row.symbol)"
                  :key="`${row.symbol}-article-${idx}`"
                  class="news-link-item">
                  <a
                    :href="article.url"
                    target="_blank"
                    rel="noopener noreferrer">
                    {{ article.title || 'Open article' }}
                  </a>
                  <span class="sentiment-chip">
                    {{ article.sentimentLabel || 'unknown' }} sentiment
                  </span>
                </li>
              </ul>
              <span v-else>—</span>
            </td>
          </tr>
        </tbody>
      </table>
    </section>

    <section class="chart-border panel">
      <h3>Precious Metals Relevant to Energy</h3>
      <table class="table is-fullwidth is-striped is-hoverable is-size-7">
        <thead>
          <tr>
            <th>Metal</th>
            <th>Ticker</th>
            <th>Latest Price</th>
            <th>Related News</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in metals"
            :key="row.metal">
            <td class="capitalize">{{ row.metal }}</td>
            <td>{{ row.latest && row.latest.ticker ? row.latest.ticker : '—' }}</td>
            <td>{{ formatCurrency(row.latest ? row.latest.price : null) }}</td>
            <td class="related-news-cell">
              <ul
                v-if="getMetalArticles(row.metal).length > 0"
                class="news-links">
                <li
                  v-for="(article, idx) in getMetalArticles(row.metal)"
                  :key="`${row.metal}-headline-${idx}`"
                  class="news-link-item">
                  <a
                    :href="article.url"
                    target="_blank"
                    rel="noopener noreferrer">
                    {{ article.headline || 'Open article' }}
                  </a>
                  <span class="sentiment-chip">
                    {{ article.sentiment_label || 'unknown' }} sentiment
                  </span>
                </li>
              </ul>
              <span v-else>—</span>
            </td>
          </tr>
        </tbody>
      </table>
    </section>

  </div>
</template>

<script>
import {
  getEquitySnapshot,
  getMetalsSnapshot,
  getWeatherByState,
  getEquityRelatedArticles,
  getMetalHeadlines
} from '@/services/MarketsApi'
import { generateGeminiMarketsAnswer } from '@/services/GeminiMarketsAgent'
import { lsGet, lsSet } from '@/services/LocalStorage'
const EQUITY_SYMBOLS = ['AGL.AX', 'ORG.AX', 'WDS.AX', 'STO.AX', 'YAL.AX']
const METAL_LIST = ['gold', 'silver', 'copper', 'nickel', 'lithium']
const EQUITY_NEWS_KEYWORDS = {
  'AGL.AX': 'AGL Energy',
  'ORG.AX': 'Origin Energy',
  'WDS.AX': 'Woodside Energy',
  'STO.AX': 'Santos Limited Energy',
  'YAL.AX': 'Yancoal energy'
}
const STATE_COORDS = [
  { state: 'NSW1', lat: -33.8688, lon: 151.2093 },
  { state: 'QLD1', lat: -27.4698, lon: 153.0251 },
  { state: 'VIC1', lat: -37.8136, lon: 144.9631 },
  { state: 'SA1', lat: -34.9285, lon: 138.6007 },
  { state: 'TAS1', lat: -42.8821, lon: 147.3272 }
]
const CUSTOM_STOCKS_STORAGE_KEY = 'gridx_custom_stocks'

export default {
  layout: 'main',
  data() {
    return {
      loading: false,
      agentLoading: false,
      errorMessage: '',
      newsApiKey: process.env.NEWS_API_KEY || '',
      geminiApiKey: process.env.GEMINI_API_KEY || '',
      equities: [],
      metals: [],
      customStocks: [],
      customStockSymbol: '',
      customStockName: '',
      equityNewsMap: {},
      metalNewsMap: {},
      weather: [],
      agentQuery: '',
      agentResponse:
        'Load market data (Refresh Markets), then ask a question. The agent uses Gemini with the snapshot below.'
    }
  },
  computed: {
    weatherCards() {
      return this.weather.map((entry) => {
        const payload = entry.payload || {}
        const current = payload.current || {}
        const daily = payload.daily || {}
        return {
          state: entry.state,
          temperature: current.temperature_2m,
          wind: current.wind_speed_10m,
          cloud: current.cloud_cover,
          rain: current.rain,
          sunrise: daily.sunrise && daily.sunrise[0] ? daily.sunrise[0].split('T')[1] : null,
          sunset: daily.sunset && daily.sunset[0] ? daily.sunset[0].split('T')[1] : null
        }
      })
    }
  },
  created() {
    this.$store.dispatch('currentView', 'markets')
    this.restoreCustomStocks()
  },
  mounted() {
    this.fetchAllMarketsData()
  },
  methods: {
    formatNumber(value) {
      if (value === null || value === undefined || Number.isNaN(value)) return '—'
      return Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 })
    },
    formatCurrency(value) {
      if (value === null || value === undefined || Number.isNaN(value)) return '—'
      return `$${Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 })}`
    },
    formatPercent(value) {
      if (value === null || value === undefined || Number.isNaN(value)) return '—'
      return `${Number(value).toFixed(2)}%`
    },
    getEquityArticles(symbol) {
      const payload = this.equityNewsMap[symbol]
      if (!payload || !payload.articles || !Array.isArray(payload.articles.data)) {
        return []
      }
      const labelBySource = (payload.rankings || []).reduce((acc, item) => {
        acc[item.sourceId] = item.sentimentLabel || 'unknown'
        return acc
      }, {})
      return payload.articles.data.map((item) => ({
        ...item,
        sentimentLabel: labelBySource[item.sourceId] || 'unknown'
      }))
    },
    getMetalArticles(metal) {
      return this.metalNewsMap[metal] || []
    },
    addCustomStock() {
      const symbol = (this.customStockSymbol || '').trim().toUpperCase()
      const name = (this.customStockName || '').trim()
      if (!symbol || !name) {
        return
      }
      if (this.customStocks.some((item) => item.symbol === symbol) || EQUITY_SYMBOLS.includes(symbol)) {
        return
      }
      this.customStocks = [...this.customStocks, { symbol, name }]
      this.persistCustomStocks()
      this.customStockSymbol = ''
      this.customStockName = ''
      this.fetchAllMarketsData()
    },
    persistCustomStocks() {
      lsSet(CUSTOM_STOCKS_STORAGE_KEY, JSON.stringify(this.customStocks))
    },
    restoreCustomStocks() {
      const raw = lsGet(CUSTOM_STOCKS_STORAGE_KEY)
      if (!raw) return
      try {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) {
          this.customStocks = parsed
        }
      } catch (error) {
        this.customStocks = []
      }
    },
    buildMarketsContextText() {
      const lines = []
      lines.push('ASX energy-related equities (Yahoo chart snapshot):')
      this.equities.forEach((e) => {
        lines.push(
          `  - ${e.symbol}: price ${this.formatCurrency(e.currentPrice)}, change ${this.formatPercent(e.changePct)}`
        )
        const articles = this.getEquityArticles(e.symbol)
        if (articles.length > 0) {
          lines.push(`    Related news for ${e.symbol}:`)
          articles.slice(0, 5).forEach((article, idx) => {
            lines.push(
              `      ${idx + 1}. ${article.title || 'Untitled'} (${article.sentimentLabel || 'unknown'} sentiment)`
            )
          })
        } else {
          lines.push(`    Related news for ${e.symbol}: none found`)
        }
      })
      lines.push('Precious / battery-relevant metals (FoxTrot latest):')
      this.metals.forEach((m) => {
        const p = m.latest ? m.latest.price : null
        lines.push(`  - ${m.metal}: ${this.formatCurrency(p)} (${m.latest && m.latest.ticker ? m.latest.ticker : 'ticker n/a'})`)
        const headlines = this.getMetalArticles(m.metal)
        if (headlines.length > 0) {
          lines.push(`    Related headlines for ${m.metal}:`)
          headlines.slice(0, 5).forEach((item, idx) => {
            lines.push(
              `      ${idx + 1}. ${item.headline || 'Untitled'} (${item.sentiment_label || 'unknown'} sentiment)`
            )
          })
        } else {
          lines.push(`    Related headlines for ${m.metal}: none found`)
        }
      })
      lines.push('Per-state weather (Open-Meteo, capital proxy):')
      this.weatherCards.forEach((w) => {
        lines.push(
          `  - ${w.state}: temp ${this.formatNumber(w.temperature)} C, wind ${this.formatNumber(w.wind)} km/h, cloud ${this.formatNumber(w.cloud)} %, rain ${this.formatNumber(w.rain)} mm, sunrise ${w.sunrise || '—'}, sunset ${w.sunset || '—'}`
        )
      })
      return lines.join('\n')
    },
    async runAgent() {
      const apiKey = this.geminiApiKey || process.env.GEMINI_API_KEY
      if (!apiKey) {
        this.agentResponse =
          'Gemini API key is not set. Add GEMINI_API_KEY to your .env file and restart the dev server.'
        return
      }
      this.agentLoading = true
      try {
        const context = this.buildMarketsContextText()
        this.agentResponse = await generateGeminiMarketsAnswer(
          apiKey,
          this.agentQuery,
          context
        )
      } catch (error) {
        this.agentResponse =
          error && error.message ? error.message : 'Could not reach Gemini. Check the proxy and API key.'
      } finally {
        this.agentLoading = false
      }
    },
    async fetchAllMarketsData() {
      this.loading = true
      this.errorMessage = ''
      try {
        const allEquitySymbols = EQUITY_SYMBOLS.concat(this.customStocks.map((item) => item.symbol))
        const equityNewsKeywords = this.customStocks.reduce((acc, item) => {
          acc[item.symbol] = item.name
          return acc
        }, { ...EQUITY_NEWS_KEYWORDS })
        const results = await Promise.allSettled([
          getEquitySnapshot(allEquitySymbols),
          getMetalsSnapshot(METAL_LIST),
          getWeatherByState(STATE_COORDS),
          getEquityRelatedArticles(equityNewsKeywords, this.newsApiKey),
          getMetalHeadlines(METAL_LIST)
        ])

        if (results[0].status === 'fulfilled') this.equities = results[0].value
        if (results[1].status === 'fulfilled') this.metals = results[1].value
        if (results[2].status === 'fulfilled') this.weather = results[2].value
        if (results[3].status === 'fulfilled') {
          this.equityNewsMap = results[3].value.reduce((acc, item) => {
            acc[item.symbol] = item.payload
            return acc
          }, {})
        }
        if (results[4].status === 'fulfilled') {
          this.metalNewsMap = results[4].value.reduce((acc, item) => {
            acc[item.metal] = item.headlines
            return acc
          }, {})
        }

        const failed = results.filter((result) => result.status === 'rejected')
        if (failed.length) {
          this.errorMessage = `Loaded with partial data (${failed.length} source${failed.length > 1 ? 's' : ''} failed).`
        }
      } catch (error) {
        this.errorMessage = 'Unable to load markets data right now.'
      } finally {
        this.loading = false
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.markets-page {
  padding: 1rem;
}

.agent-panel {
  margin-bottom: 1rem;
}

.panel {
  padding: 0.75rem;
  margin-bottom: 1rem;
}

.controls {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 0.75rem;
  align-items: end;
}

.field-group {
  display: flex;
  flex-direction: column;
}

.field-group label {
  font-size: 12px;
  margin-bottom: 0.25rem;
}

.related-news-cell {
  min-width: 240px;
  max-width: 360px;
}

.related-news-cell a {
  color: #1658b8;
  text-decoration: underline;
}

.news-links {
  margin: 0;
  padding-left: 1rem;
}

.news-link-item {
  margin-bottom: 0.25rem;
}

.sentiment-chip {
  margin-left: 0.4rem;
  font-size: 11px;
  color: #5f6368;
}

.weather-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 0.75rem;
}

.weather-card {
  border: 1px solid #ececec;
  border-radius: 8px;
  padding: 0.75rem;
}

.weather-card h4 {
  margin-bottom: 0.5rem;
}

.news-top {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.news-metric {
  border: 1px solid #ececec;
  border-radius: 8px;
  padding: 0.5rem;
}

.news-metric p {
  margin: 0.25rem 0 0;
  font-weight: 700;
}

.agent-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.agent-response {
  margin-top: 0.75rem;
  border: 1px solid #ececec;
  border-radius: 8px;
  padding: 0.75rem;
  background: #fafafa;
  line-height: 1.45;
}

.pos {
  color: #1f7a4b;
}

.neg {
  color: #b8433a;
}

.capitalize {
  text-transform: capitalize;
}

.muted {
  color: #6a6a6a;
  font-size: 12px;
}

.error-text {
  color: #c0392b;
  margin-bottom: 0.75rem;
}
</style>

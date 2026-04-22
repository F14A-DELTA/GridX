<template>
  <section class="section trading-page">
    <div class="container is-fluid">
      <div class="level">
        <div class="level-left">
          <h1 class="title is-4">Trading Desk</h1>
        </div>
        <div class="level-right controls-inline">
          <div class="select is-small">
            <select v-model="selectedState">
              <option
                v-for="state in states"
                :key="state"
                :value="state">
                {{ state }}
              </option>
            </select>
          </div>
          <button
            class="button is-small is-dark"
            :class="{ 'is-loading': loadingSeries }"
            @click="refreshSelectedState">
            Refresh
          </button>
        </div>
      </div>

      <div class="kpi-grid">
        <article class="kpi-card kpi-dark">
          <p class="kpi-label">Total Traded Volume</p>
          <p class="kpi-value">{{ formatNumber(totalTradedVolume) }} MWh</p>
        </article>
        <article class="kpi-card kpi-dark">
          <p class="kpi-label">Total Unrealised P&amp;L</p>
          <p
            class="kpi-value"
            :class="pnlClass(totalUnrealisedPnl)">
            {{ formatCurrency(totalUnrealisedPnl) }}
          </p>
        </article>
        <article class="kpi-card kpi-dark">
          <p class="kpi-label">Trades Placed</p>
          <p class="kpi-value">{{ trades.length }}</p>
        </article>
        <article class="kpi-card kpi-dark">
          <p class="kpi-label">Avg Entry Price</p>
          <p class="kpi-value">{{ formatCurrency(avgEntryPrice) }}</p>
        </article>
        <article class="kpi-card kpi-dark">
          <p class="kpi-label">Total Realised P&amp;L</p>
          <p
            class="kpi-value"
            :class="pnlClass(totalRealisedPnl)">
            {{ formatCurrency(totalRealisedPnl) }}
          </p>
        </article>
      </div>

      <div class="terminal-chart-box">
        <div class="terminal-chart-header">
          <div class="terminal-chart-title">
            <span class="live-dot" />
            {{ selectedState }} &mdash; Last 2 min
          </div>
          <div class="series-toggles">
            <label
              class="toggle-pill"
              :class="{ active: showPriceSeries }">
              <input
                v-model="showPriceSeries"
                type="checkbox">
              <span class="pill-dot price-dot" />Price
            </label>
            <label
              class="toggle-pill"
              :class="{ active: showDemandSeries }">
              <input
                v-model="showDemandSeries"
                type="checkbox">
              <span class="pill-dot demand-dot" />Demand
            </label>
            <label
              class="toggle-pill"
              :class="{ active: showGenerationSeries }">
              <input
                v-model="showGenerationSeries"
                type="checkbox">
              <span class="pill-dot gen-dot" />Generation
            </label>
          </div>
        </div>

        <div class="live-values-row">
          <div class="live-val-block">
            <span class="lv-label">PRICE</span>
            <span class="lv-number price-colour">{{ formatCurrency(latestPrice) }}</span>
          </div>
          <div class="live-val-block">
            <span class="lv-label">DEMAND</span>
            <span class="lv-number demand-colour">{{ formatNumber(latestDemand) }} MW</span>
          </div>
          <div class="live-val-block">
            <span class="lv-label">GENERATION</span>
            <span class="lv-number gen-colour">{{ formatNumber(latestGeneration) }} MW</span>
          </div>
          <div
            v-if="overlayPricePredictions['5m'] !== null"
            class="live-val-block">
            <span class="lv-label">+5m</span>
            <span class="lv-number overlay-colour">{{ formatCurrency(overlayPricePredictions['5m']) }}</span>
          </div>
          <div
            v-if="overlayPricePredictions['15m'] !== null"
            class="live-val-block">
            <span class="lv-label">+15m</span>
            <span class="lv-number overlay-colour">{{ formatCurrency(overlayPricePredictions['15m']) }}</span>
          </div>
          <div
            v-if="overlayPricePredictions['30m'] !== null"
            class="live-val-block">
            <span class="lv-label">+30m</span>
            <span class="lv-number overlay-colour">{{ formatCurrency(overlayPricePredictions['30m']) }}</span>
          </div>
        </div>

        <div class="chart-outer">
          <div class="y-axis-left">
            <span>{{ formatCurrency(priceDomain.max) }}</span>
            <span>{{ formatCurrency(priceMid) }}</span>
            <span>{{ formatCurrency(priceDomain.min) }}</span>
          </div>
          <svg
            class="main-chart"
            viewBox="0 0 1000 280"
            preserveAspectRatio="none">
            <defs>
              <linearGradient
                id="demandGrad"
                x1="0"
                y1="0"
                x2="0"
                y2="1">
                <stop
                  offset="0%"
                  stop-color="#c56eff"
                  stop-opacity="0.18" />
                <stop
                  offset="100%"
                  stop-color="#c56eff"
                  stop-opacity="0" />
              </linearGradient>
              <linearGradient
                id="genGrad"
                x1="0"
                y1="0"
                x2="0"
                y2="1">
                <stop
                  offset="0%"
                  stop-color="#43d5c1"
                  stop-opacity="0.15" />
                <stop
                  offset="100%"
                  stop-color="#43d5c1"
                  stop-opacity="0" />
              </linearGradient>
            </defs>
            <line
              x1="0"
              y1="0"
              x2="1000"
              y2="0"
              stroke="#d7dee8"
              stroke-width="1" />
            <line
              x1="0"
              y1="56"
              x2="1000"
              y2="56"
              stroke="#d7dee8"
              stroke-width="1" />
            <line
              x1="0"
              y1="112"
              x2="1000"
              y2="112"
              stroke="#d7dee8"
              stroke-width="1" />
            <line
              x1="0"
              y1="168"
              x2="1000"
              y2="168"
              stroke="#d7dee8"
              stroke-width="1" />
            <line
              x1="0"
              y1="224"
              x2="1000"
              y2="224"
              stroke="#d7dee8"
              stroke-width="1" />
            <line
              x1="0"
              y1="280"
              x2="1000"
              y2="280"
              stroke="#1a2a42"
              stroke-width="1" />

            <path
              v-if="showDemandSeries && demandAreaPath"
              :d="demandAreaPath"
              fill="url(#demandGrad)" />
            <path
              v-if="showGenerationSeries && genAreaPath"
              :d="genAreaPath"
              fill="url(#genGrad)" />

            <polyline
              v-if="showDemandSeries"
              :points="linePoints(mockDemandWindow, valueDomain, 280)"
              fill="none"
              stroke="#c56eff"
              stroke-width="1.8"
              stroke-linejoin="round"
              stroke-linecap="round" />
            <polyline
              v-if="showGenerationSeries"
              :points="linePoints(mockGenerationWindow, valueDomain, 280)"
              fill="none"
              stroke="#43d5c1"
              stroke-width="1.8"
              stroke-linejoin="round"
              stroke-linecap="round" />

            <g v-if="showPriceSeries">
              <line
                v-for="candle in candlestickSeries"
                :key="`wick-${candle.time}`"
                :x1="candle.x"
                :x2="candle.x"
                :y1="candle.yHigh"
                :y2="candle.yLow"
                :stroke="candle.colour"
                stroke-width="1.2" />
              <rect
                v-for="candle in candlestickSeries"
                :key="`body-${candle.time}`"
                :x="candle.x - candle.width / 2"
                :y="Math.min(candle.yOpen, candle.yClose)"
                :width="candle.width"
                :height="Math.max(2, Math.abs(candle.yClose - candle.yOpen))"
                :fill="candle.colour"
                rx="1" />
            </g>

            <g
              v-for="marker in tradeMarkers"
              :key="marker.id">
              <line
                :x1="marker.x"
                :x2="marker.x"
                y1="0"
                y2="280"
                stroke-width="0.8"
                stroke-dasharray="3 3"
                :stroke="marker.side === 'buy' ? '#2ecc71' : '#e74c3c'"
                opacity="0.5" />
              <circle
                :cx="marker.x"
                :cy="marker.y"
                :fill="marker.side === 'buy' ? '#2ecc71' : '#e74c3c'"
                r="5"
                opacity="0.9" />
              <text
                :x="marker.x + 6"
                :y="marker.y - 6"
                font-size="9"
                :fill="marker.side === 'buy' ? '#2ecc71' : '#e74c3c'">
                {{ marker.side === 'buy' ? '▲' : '▼' }}
              </text>
            </g>
          </svg>
          <div class="y-axis-right">
            <span>{{ formatNumber(valueDomain.max) }}</span>
            <span>{{ formatNumber(valueMid) }}</span>
            <span>{{ formatNumber(valueDomain.min) }}</span>
          </div>
        </div>

        <div class="x-axis-labels">
          <span>-2m</span>
          <span>-90s</span>
          <span>-1m</span>
          <span>-30s</span>
          <span>Now</span>
        </div>
        <div class="axis-legend-row">
          <span class="legend-item price-colour">&#9646; Price (candles)</span>
          <span class="legend-item demand-colour">&#9646; Demand</span>
          <span class="legend-item gen-colour">&#9646; Generation</span>
        </div>
      </div>

      <div class="columns is-variable is-4 mt-3 trade-position-row">
        <div class="column is-4">
          <div class="box chart-border">
            <h2 class="title is-6">Place Trade</h2>
            <div class="field">
              <label class="label">Side</label>
              <div class="select is-small">
                <select v-model="orderSide">
                  <option value="buy">Buy</option>
                  <option value="sell">Sell</option>
                </select>
              </div>
            </div>
            <div class="field">
              <label class="label">Quantity (MWh)</label>
              <input
                v-model.number="orderQty"
                class="input is-small"
                min="0.1"
                step="0.1"
                type="number">
            </div>
            <button
              class="button is-primary is-small"
              :class="{ 'is-loading': orderLoading }"
              @click="handlePlaceTrade">
              Submit @ {{ formatCurrency(latestPrice) }}
            </button>
          </div>
        </div>

        <div class="column is-8">
          <div class="box chart-border">
            <h2 class="title is-6">Open Positions</h2>
            <table class="table is-fullwidth is-striped is-size-7">
              <thead>
                <tr>
                  <th>State</th>
                  <th>Side</th>
                  <th>Entry</th>
                  <th>Current</th>
                  <th>Qty</th>
                  <th>Unrealised</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="position in openPositions"
                  :key="position.id">
                  <td>{{ position.state }}</td>
                  <td>{{ position.side }}</td>
                  <td>{{ formatCurrency(position.entry_price) }}</td>
                  <td>{{ formatCurrency(currentPriceForState(position.state)) }}</td>
                  <td>{{ formatNumber(position.remaining_quantity_mwh || position.quantity_mwh) }}</td>
                  <td :class="pnlClass(positionUnrealised(position))">
                    {{ formatCurrency(positionUnrealised(position)) }}
                  </td>
                  <td>
                    <button
                      class="button is-small is-link is-light"
                      :class="{ 'is-loading': closeLoadingIds.includes(position.id) }"
                      :disabled="closeLoadingIds.includes(position.id)"
                      @click="handleCloseTrade(position)">
                      Close
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="box chart-border revenue-box">
        <h2 class="title is-6">Revenue Streams (Realised P&amp;L)</h2>
        <div class="revenue-chart-wrap">
          <div class="revenue-y-axis">
            <span>{{ formatCurrency(revenueDomain.max) }}</span>
            <span>{{ formatCurrency(revenueMid) }}</span>
            <span>{{ formatCurrency(revenueDomain.min) }}</span>
          </div>
          <svg
            class="line-chart revenue-chart"
            viewBox="0 0 1000 220"
            preserveAspectRatio="none">
            <line
              x1="0"
              y1="0"
              x2="1000"
              y2="0"
              stroke="#1a2a42"
              stroke-width="1" />
            <line
              x1="0"
              y1="55"
              x2="1000"
              y2="55"
              stroke="#1a2a42"
              stroke-width="1" />
            <line
              x1="0"
              y1="110"
              x2="1000"
              y2="110"
              stroke="#1a2a42"
              stroke-width="1" />
            <line
              x1="0"
              y1="165"
              x2="1000"
              y2="165"
              stroke="#1a2a42"
              stroke-width="1" />
            <line
              x1="0"
              y1="220"
              x2="1000"
              y2="220"
              stroke="#1a2a42"
              stroke-width="1" />
            <polyline
              v-for="line in revenueLines"
              :key="line.key"
              :points="chartPointsInTimeDomain(revenueSeriesForLine(line), revenueDomain, revenueTimeDomain, 220)"
              fill="none"
              :stroke="line.colour"
              :stroke-width="line.key === 'total' ? 2.8 : 2.2"
              :stroke-dasharray="line.key === 'total' ? '' : '5 3'" />
          </svg>
        </div>
        <div class="revenue-x-axis">
          <span>{{ revenueStartLabel }}</span>
          <span>{{ revenueMidLabel }}</span>
          <span>{{ revenueEndLabel }}</span>
        </div>
        <div class="revenue-legend">
          <span
            v-for="line in revenueLines"
            :key="`legend-${line.key}`"
            class="revenue-legend-item">
            <span
              class="legend-swatch"
              :style="{ backgroundColor: line.colour }" />
            {{ line.key === 'total' ? 'TOTAL CUMULATIVE' : line.key }}
            <strong class="legend-value">{{ formatCurrency(revenueLatestValue(line)) }}</strong>
          </span>
        </div>
      </div>

      <div class="columns is-variable is-4 order-notes-row">
        <div class="column is-6">
          <div class="box chart-border">
            <h2 class="title is-6">Order Book ({{ selectedState }})</h2>
            <table class="table is-fullwidth is-striped is-size-7">
              <thead>
                <tr>
                  <th>Side</th>
                  <th>Qty</th>
                  <th>Price</th>
                  <th>When</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="row in orderBookRows"
                  :key="row.id">
                  <td :class="row.side === 'buy' ? 'pnl-pos' : 'pnl-neg'">{{ row.side }}</td>
                  <td>{{ formatNumber(row.quantity_mwh) }}</td>
                  <td>{{ formatCurrency(row.price) }}</td>
                  <td>{{ formatTime(row.created_at) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <div class="column is-6">
          <div class="box chart-border">
            <h2 class="title is-6">Shared Notes</h2>
            <div class="field has-addons mb-3">
              <div class="control is-expanded">
                <input
                  v-model.trim="noteInput"
                  class="input is-small"
                  placeholder="Add a note for your org..."
                  type="text">
              </div>
              <div class="control">
                <button
                  class="button is-small is-info"
                  @click="handleAddNote">
                  Post
                </button>
              </div>
            </div>
            <div class="feed-list">
              <p
                v-for="note in notesRows"
                :key="note.id"
                class="is-size-7 feed-item">
                <strong class="note-author">{{ noteDisplayName(note) }}</strong>
                <span class="note-comment">{{ note.note_text }}</span>
                <em class="note-time">{{ formatTime(note.created_at) }}</em>
              </p>
            </div>
          </div>
        </div>
      </div>

      <div class="box chart-border activity-box">
        <h2 class="title is-6">Activity Feed</h2>
        <div class="feed-list">
          <p
            v-for="item in activityRows"
            :key="item.id"
            class="is-size-7 feed-item">
            {{ item.message }} — {{ formatTime(item.created_at) }}
          </p>
        </div>
      </div>
    </div>
  </section>
</template>

<script>
import {
  addNote,
  buildSimulatedDeskSeries,
  closeTrade,
  fetchForecastOverlays,
  listActivity,
  listNotes,
  listOrderBook,
  listTrades,
  loadStateDeskSeries,
  placeTrade
} from '@/services/TradingApi'

const STATES = ['NSW1', 'QLD1', 'SA1', 'TAS1', 'VIC1']
const LOOKBACK_MS = 120000
const MOCK_POINTS = 20

export default {
  layout: 'main',
  middleware: 'org-member-only',
  data() {
    return {
      states: STATES,
      selectedState: 'NSW1',
      loadingSeries: false,
      orderLoading: false,
      orderSide: 'buy',
      orderQty: 10,
      seriesByState: {},
      overlaysByState: {},
      showPriceSeries: true,
      showDemandSeries: true,
      showGenerationSeries: true,
      mockPriceWindow: [],
      mockDemandWindow: [],
      mockGenerationWindow: [],
      trades: [],
      notesRows: [],
      activityRows: [],
      orderBookRows: [],
      noteInput: '',
      closeLoadingIds: [],
      tickTimer: null,
      collabTimer: null,
      chartTimer: null,
      liveRefreshInFlight: false,
      chartNow: Date.now(),
      refreshNonce: Math.random()
    }
  },
  computed: {
    currentSeries() {
      return this.seriesByState[this.selectedState] || { price: [], demand: [], generation: [] }
    },
    latestPrice() {
      const mockRows = this.mockPriceWindow || []
      for (let i = mockRows.length - 1; i >= 0; i -= 1) {
        const value = Number(mockRows[i] && mockRows[i].value)
        if (Number.isFinite(value)) return value
      }
      const liveRows = this.currentSeries.price || []
      for (let i = liveRows.length - 1; i >= 0; i -= 1) {
        const value = Number(liveRows[i] && liveRows[i].value)
        if (Number.isFinite(value)) return value
      }
      return null
    },
    latestDemand() {
      const mockRows = this.mockDemandWindow || []
      for (let i = mockRows.length - 1; i >= 0; i -= 1) {
        const value = Number(mockRows[i] && mockRows[i].value)
        if (Number.isFinite(value)) return value
      }
      const liveRows = this.currentSeries.demand || []
      for (let i = liveRows.length - 1; i >= 0; i -= 1) {
        const value = Number(liveRows[i] && liveRows[i].value)
        if (Number.isFinite(value)) return value
      }
      return null
    },
    latestGeneration() {
      const mockRows = this.mockGenerationWindow || []
      for (let i = mockRows.length - 1; i >= 0; i -= 1) {
        const value = Number(mockRows[i] && mockRows[i].value)
        if (Number.isFinite(value)) return value
      }
      const liveRows = this.currentSeries.generation || []
      for (let i = liveRows.length - 1; i >= 0; i -= 1) {
        const value = Number(liveRows[i] && liveRows[i].value)
        if (Number.isFinite(value)) return value
      }
      return null
    },
    xDomain() {
      const now = this.chartNow || Date.now()
      return { min: now - LOOKBACK_MS, max: now }
    },
    priceDomain() {
      return this.numericDomain(this.mockPriceWindow.map((r) => r.value), 0.06)
    },
    priceMid() {
      return (this.priceDomain.min + this.priceDomain.max) / 2
    },
    valueDomain() {
      const values = []
      if (this.showDemandSeries) values.push(...this.mockDemandWindow.map((r) => r.value))
      if (this.showGenerationSeries) values.push(...this.mockGenerationWindow.map((r) => r.value))
      return this.numericDomain(values, 0.04)
    },
    valueMid() {
      return (this.valueDomain.min + this.valueDomain.max) / 2
    },
    candlestickSeries() {
      const ticks = this.mockPriceWindow
      if (ticks.length < 2) return []
      const domain = this.priceDomain
      const ySpan = domain.max - domain.min || 1
      const candles = []
      const bodyWidth = Math.max(8, (1000 / Math.max(ticks.length, 2)) * 0.52)
      for (let i = 1; i < ticks.length; i += 1) {
        const prev = ticks[i - 1].value
        const cur = ticks[i].value
        const high = Math.max(prev, cur)
        const low = Math.min(prev, cur)
        const x = this.xForTime(ticks[i].time)
        candles.push({
          time: ticks[i].time,
          x,
          width: bodyWidth,
          yHigh: 280 - ((high - domain.min) / ySpan) * 280,
          yLow: 280 - ((low - domain.min) / ySpan) * 280,
          yOpen: 280 - ((prev - domain.min) / ySpan) * 280,
          yClose: 280 - ((cur - domain.min) / ySpan) * 280,
          colour: cur >= prev ? '#26a69a' : '#ef5350'
        })
      }
      return candles
    },
    demandAreaPath() {
      return this.areaPath(this.mockDemandWindow, this.valueDomain, 280)
    },
    genAreaPath() {
      return this.areaPath(this.mockGenerationWindow, this.valueDomain, 280)
    },
    tradeMarkers() {
      const ticks = this.mockPriceWindow
      if (!ticks.length) return []
      const domain = this.priceDomain
      const ySpan = domain.max - domain.min || 1
      return this.trades
        .filter((trade) => trade.state === this.selectedState)
        .map((trade) => ({
          id: trade.id,
          side: trade.side,
          x: this.xForTime(new Date(trade.created_at).getTime()),
          y: 280 - (((Number(trade.entry_price) || 0) - domain.min) / ySpan) * 280
        }))
    },
    overlayPricePredictions() {
      const overlays = this.overlaysByState[this.selectedState]
      if (!overlays || !overlays.price) return {}
      return {
        '5m': overlays.price['5m'] !== undefined ? overlays.price['5m'] : null,
        '15m': overlays.price['15m'] !== undefined ? overlays.price['15m'] : null,
        '30m': overlays.price['30m'] !== undefined ? overlays.price['30m'] : null
      }
    },
    openPositions() {
      return this.trades.filter((trade) => trade.status === 'open')
    },
    closedPositions() {
      return this.trades.filter((trade) => trade.status === 'closed')
    },
    totalTradedVolume() {
      return this.trades.reduce((acc, trade) => acc + (Number(trade.quantity_mwh) || 0), 0)
    },
    totalUnrealisedPnl() {
      return this.openPositions.reduce((acc, trade) => acc + this.positionUnrealised(trade), 0)
    },
    totalRealisedPnl() {
      return this.closedPositions.reduce((acc, trade) => acc + (Number(trade.realised_pnl) || 0), 0)
    },
    avgEntryPrice() {
      if (!this.trades.length) return null
      const total = this.trades.reduce((acc, trade) => acc + (Number(trade.entry_price) || 0), 0)
      return total / this.trades.length
    },
    revenueLines() {
      const lines = this.states.map((state, idx) => ({
        key: state,
        colour: ['#3498db', '#9b59b6', '#16a085', '#f39c12', '#e74c3c'][idx % 5],
        series: this.cumulativeSeriesForState(state)
      }))
      lines.push({ key: 'total', colour: '#ecf0f1', series: this.cumulativeSeriesTotal() })
      return lines
    },
    revenueDomain() {
      const allValues = this.revenueLines.flatMap((line) => line.series.map((point) => point.value))
      return this.numericDomain(allValues, 0.05)
    },
    revenueMid() {
      return (this.revenueDomain.min + this.revenueDomain.max) / 2
    },
    revenueTimeDomain() {
      const allTimes = this.revenueLines.flatMap((line) => line.series.map((point) => point.time))
      if (!allTimes.length) {
        const now = Date.now()
        return { min: now - 60000, max: now }
      }
      const min = Math.min(...allTimes)
      const max = Math.max(...allTimes)
      return { min, max: max === min ? max + 1 : max }
    },
    revenueStartLabel() {
      return this.formatShortTime(this.revenueTimeDomain.min)
    },
    revenueMidLabel() {
      return this.formatShortTime((this.revenueTimeDomain.min + this.revenueTimeDomain.max) / 2)
    },
    revenueEndLabel() {
      return this.formatShortTime(this.revenueTimeDomain.max)
    }
  },
  watch: {
    selectedState() {
      this.ensureStateLoaded(this.selectedState)
      this.refreshCollab()
    }
  },
  mounted() {
    this.bootstrap()
  },
  beforeDestroy() {
    if (this.tickTimer) clearInterval(this.tickTimer)
    if (this.collabTimer) clearInterval(this.collabTimer)
    if (this.chartTimer) clearInterval(this.chartTimer)
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
    formatTime(value) {
      if (!value) return '—'
      return new Date(value).toLocaleString()
    },
    formatShortTime(value) {
      if (!value) return '—'
      return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    },
    noteDisplayName(note) {
      if (!note) return 'User'
      if (note.display_name) return note.display_name
      if (note.author_display_name) return note.author_display_name
      if (note.author_name) return note.author_name
      if (note.profile && note.profile.display_name) return note.profile.display_name
      if (note.user && note.user.display_name) return note.user.display_name
      return 'User'
    },
    pnlClass(value) {
      if (value === null || value === undefined) return ''
      return Number(value) >= 0 ? 'pnl-pos' : 'pnl-neg'
    },
    numericDomain(values = [], padFactor = 0.0) {
      if (!values.length) return { min: 0, max: 1 }
      let min = values[0]
      let max = values[0]
      for (let i = 1; i < values.length; i += 1) {
        if (values[i] < min) min = values[i]
        if (values[i] > max) max = values[i]
      }
      if (min === max) return { min: min * 0.95, max: max * 1.05 }
      const pad = (max - min) * padFactor
      return { min: min - pad, max: max + pad }
    },
    xForTime(time) {
      const { min, max } = this.xDomain
      const span = max - min || 1
      return ((time - min) / span) * 1000
    },
    linePoints(series = [], domain, height = 280) {
      if (!series.length) return ''
      const ySpan = domain.max - domain.min || 1
      return series
        .map((pt) => {
          const x = this.xForTime(pt.time)
          const y = height - ((pt.value - domain.min) / ySpan) * height
          return `${x.toFixed(1)},${y.toFixed(1)}`
        })
        .join(' ')
    },
    areaPath(series = [], domain, height = 280) {
      if (series.length < 2) return ''
      const ySpan = domain.max - domain.min || 1
      const pts = series.map((pt) => {
        const x = this.xForTime(pt.time)
        const y = height - ((pt.value - domain.min) / ySpan) * height
        return [x.toFixed(1), y.toFixed(1)]
      })
      const lineStr = pts.map((p) => `${p[0]},${p[1]}`).join(' L ')
      const firstX = pts[0][0]
      const lastX = pts[pts.length - 1][0]
      return `M ${firstX},${height} L ${lineStr} L ${lastX},${height} Z`
    },
    chartPoints(series = [], forcedDomain) {
      if (!series.length) return ''
      const minTime = series[0].time
      const maxTime = series[series.length - 1].time
      const timeSpan = maxTime - minTime || 1
      const domain = forcedDomain || this.numericDomain(series.map((r) => r.value))
      const ySpan = domain.max - domain.min || 1
      return series
        .map((pt) => {
          const x = ((pt.time - minTime) / timeSpan) * 1000
          const y = 220 - ((pt.value - domain.min) / ySpan) * 220
          return `${x.toFixed(1)},${y.toFixed(1)}`
        })
        .join(' ')
    },
    chartPointsInTimeDomain(series = [], yDomain, xDomain, height = 220) {
      if (!series.length) return ''
      const y = yDomain || this.numericDomain(series.map((point) => point.value))
      const x = xDomain || {
        min: series[0].time,
        max: series[series.length - 1].time
      }
      const ySpan = y.max - y.min || 1
      const xSpan = x.max - x.min || 1
      return series
        .map((point) => {
          const px = ((point.time - x.min) / xSpan) * 1000
          const py = height - ((point.value - y.min) / ySpan) * height
          return `${px.toFixed(1)},${py.toFixed(1)}`
        })
        .join(' ')
    },
    revenueSeriesForLine(line) {
      if (!line || !Array.isArray(line.series) || !line.series.length) {
        return [
          { time: this.revenueTimeDomain.min, value: 0 },
          { time: this.revenueTimeDomain.max, value: 0 }
        ]
      }
      if (line.key === 'total') return line.series
      const latest = line.series[line.series.length - 1]
      return [
        { time: this.revenueTimeDomain.min, value: 0 },
        { time: this.revenueTimeDomain.max, value: Number(latest.value) || 0 }
      ]
    },
    revenueLatestValue(line) {
      if (!line || !Array.isArray(line.series) || !line.series.length) return 0
      return line.series[line.series.length - 1].value || 0
    },
    initMockWindows() {
      const now = this.chartNow || Date.now()
      const price = this.currentSeries.price || []
      const demand = this.currentSeries.demand || []
      const gen = this.currentSeries.generation || []
      this.mockPriceWindow = this.buildInitialWindow(price, now, 0.003)
      this.mockDemandWindow = this.buildInitialWindow(demand, now, 0.0012)
      this.mockGenerationWindow = this.buildInitialWindow(gen, now, 0.0014)
    },
    buildInitialWindow(sourceSeries, now, volatility) {
      if (!sourceSeries.length) return []
      const base = Number(sourceSeries[sourceSeries.length - 1].value)
      if (!Number.isFinite(base)) return []
      const prev = sourceSeries.length > 1
        ? Number(sourceSeries[sourceSeries.length - 2].value)
        : base
      const safePrev = Number.isFinite(prev) ? prev : base
      const trendPerTick = (base - safePrev) / Math.max(MOCK_POINTS * 0.5, 1)
      const step = LOOKBACK_MS / (MOCK_POINTS - 1)
      const result = []
      const nonceDrift = (this.refreshNonce - 0.5) * volatility * 0.8
      const waveAmp = volatility * (0.35 + Math.random() * 0.95)
      const waveFreq = 1.8 + Math.random() * 2.2
      let val = base - trendPerTick * MOCK_POINTS * (0.4 + Math.random() * 1.25)
      if (val <= 0) val = base * 0.97
      for (let i = 0; i < MOCK_POINTS; i += 1) {
        const t = now - LOOKBACK_MS + i * step
        const drift = (Math.random() - 0.5) * 2 * volatility
        const wave = Math.sin((i / MOCK_POINTS) * Math.PI * waveFreq + this.refreshNonce * Math.PI * 2)
        const perturbation = drift + nonceDrift + wave * waveAmp
        val = Math.max(0.01, val * (1 + perturbation) + trendPerTick)
        result.push({ time: t, value: val, simulated: true })
      }
      result[result.length - 1] = { time: now, value: base, simulated: true }
      return result
    },
    normalizeWindowSpacing(window = [], now = Date.now()) {
      const step = LOOKBACK_MS / Math.max(MOCK_POINTS - 1, 1)
      const values = window.slice(-MOCK_POINTS).map((point) => Number(point.value) || 0)
      const paddedValues = values.length >= MOCK_POINTS
        ? values
        : [
          ...Array(Math.max(0, MOCK_POINTS - values.length)).fill(values[0] || 0),
          ...values
        ]
      return paddedValues.map((value, idx) => ({
        time: now - LOOKBACK_MS + idx * step,
        value,
        simulated: true
      }))
    },
    appendMockTick() {
      const now = this.chartNow || Date.now()
      const append = (window, realSeries, volatility) => {
        if (!window.length) {
          return this.buildInitialWindow(realSeries || [], now, volatility)
        }
        const last = window[window.length - 1]
        const realBase = realSeries.length
          ? Number(realSeries[realSeries.length - 1].value)
          : last.value
        const pull = (realBase - last.value) * 0.05
        const drift = (Math.random() - 0.5) * 2 * volatility
        const next = {
          time: now,
          value: Math.max(0.01, last.value * (1 + drift) + pull),
          simulated: true
        }
        return this.normalizeWindowSpacing([...window, next], now)
      }
      this.mockPriceWindow = append(
        this.mockPriceWindow,
        this.currentSeries.price || [],
        0.003
      )
      this.mockDemandWindow = append(
        this.mockDemandWindow,
        this.currentSeries.demand || [],
        0.0012
      )
      this.mockGenerationWindow = append(
        this.mockGenerationWindow,
        this.currentSeries.generation || [],
        0.0014
      )
    },
    currentPriceForState(state) {
      if (state === this.selectedState && Number.isFinite(this.latestPrice)) {
        return this.latestPrice
      }
      const series = this.seriesByState[state] && this.seriesByState[state].price
      if (!series || !series.length) return null
      return series[series.length - 1].value
    },
    positionUnrealised(position) {
      const qty = Number(position.remaining_quantity_mwh || position.quantity_mwh || 0)
      const current = this.currentPriceForState(position.state)
      const entry = Number(position.entry_price || 0)
      if (current === null || current === undefined) return 0
      return position.side === 'buy'
        ? (Number(current) - entry) * qty
        : (entry - Number(current)) * qty
    },
    cumulativeSeriesForState(state) {
      const rows = this.closedPositions
        .filter((t) => t.state === state)
        .sort((a, b) => new Date(a.closed_at || a.created_at) - new Date(b.closed_at || b.created_at))
      let running = 0
      return rows.map((row) => {
        running += Number(row.realised_pnl || 0)
        return { time: new Date(row.closed_at || row.created_at).getTime(), value: running }
      })
    },
    cumulativeSeriesTotal() {
      const rows = this.closedPositions
        .slice()
        .sort((a, b) => new Date(a.closed_at || a.created_at) - new Date(b.closed_at || b.created_at))
      let running = 0
      return rows.map((row) => {
        running += Number(row.realised_pnl || 0)
        return { time: new Date(row.closed_at || row.created_at).getTime(), value: running }
      })
    },
    async ensureStateLoaded(state) {
      if (this.seriesByState[state]) return
      this.loadingSeries = true
      try {
        const historical = await loadStateDeskSeries(state)
        this.$set(this.seriesByState, state, buildSimulatedDeskSeries(historical))
        const overlays = await fetchForecastOverlays(state)
        this.$set(this.overlaysByState, state, overlays || { price: {}, demand: {}, generation: {} })
        if (state === this.selectedState) {
          this.chartNow = Date.now()
          this.initMockWindows()
        }
      } finally {
        this.loadingSeries = false
      }
    },
    async refreshSelectedState() {
      this.refreshNonce = Math.random()
      this.$delete(this.seriesByState, this.selectedState)
      await this.ensureStateLoaded(this.selectedState)
      await this.refreshCollab()
      await this.refreshTrades()
    },
    async refreshLoadedStatesLive() {
      if (this.liveRefreshInFlight) return
      this.liveRefreshInFlight = true
      try {
        const loadedStates = Object.keys(this.seriesByState || {})
        if (!loadedStates.length) return
        await Promise.all(
          loadedStates.map(async (state) => {
            const historical = await loadStateDeskSeries(state)
            this.$set(this.seriesByState, state, buildSimulatedDeskSeries(historical))
          })
        )
        if (!this.mockPriceWindow.length || !this.mockDemandWindow.length || !this.mockGenerationWindow.length) {
          this.initMockWindows()
        }
      } finally {
        this.liveRefreshInFlight = false
      }
    },
    async ensureTradeStatesLoaded() {
      const neededStates = Array.from(
        new Set(
          (this.trades || [])
            .map((trade) => trade.state)
            .filter(Boolean)
        )
      )
      const missingStates = neededStates.filter((state) => !this.seriesByState[state])
      if (!missingStates.length) return
      await Promise.all(
        missingStates.map(async (state) => {
          try {
            const historical = await loadStateDeskSeries(state)
            this.$set(this.seriesByState, state, buildSimulatedDeskSeries(historical))
          } catch (error) {
            console.error('Failed to load trade state series', state, error)
          }
        })
      )
    },
    async refreshTrades() {
      this.trades = await listTrades()
      await this.ensureTradeStatesLoaded()
    },
    async refreshCollab() {
      const [notes, activity, orderBook] = await Promise.all([
        listNotes(this.selectedState, 40),
        listActivity(this.selectedState, 80),
        listOrderBook(this.selectedState, 30)
      ])
      this.notesRows = notes
      this.activityRows = activity
      this.orderBookRows = orderBook
    },
    async syncAfterTradeMutation() {
      const [tradesResult, collabResult] = await Promise.allSettled([
        this.refreshTrades(),
        this.refreshCollab()
      ])
      if (tradesResult.status === 'rejected') {
        console.error('Failed to refresh trades after mutation', tradesResult.reason)
      }
      if (collabResult.status === 'rejected') {
        console.error('Failed to refresh collaboration panels after mutation', collabResult.reason)
      }
    },
    replaceTradeLocally(updatedTrade) {
      if (!updatedTrade || !updatedTrade.id) return
      this.trades = this.trades.map((trade) =>
        trade.id === updatedTrade.id ? { ...trade, ...updatedTrade } : trade
      )
    },
    async bootstrap() {
      this.chartNow = Date.now()
      await this.ensureStateLoaded(this.selectedState)
      await this.refreshTrades()
      await this.refreshCollab()
      this.chartTimer = setInterval(() => {
        this.chartNow = Date.now()
        this.appendMockTick()
      }, 10000)
      this.tickTimer = setInterval(() => {
        this.refreshLoadedStatesLive()
      }, 10000)
      this.collabTimer = setInterval(() => {
        this.refreshTrades()
        this.refreshCollab()
      }, 30000)
    },
    async handlePlaceTrade() {
      if (!this.orderQty || this.orderQty <= 0) return
      if (!this.latestPrice) return
      this.orderLoading = true
      try {
        await placeTrade({
          state: this.selectedState,
          side: this.orderSide,
          quantityMwh: this.orderQty,
          entryPrice: this.latestPrice
        })
        await this.refreshTrades()
        await this.refreshCollab()
      } finally {
        this.orderLoading = false
      }
    },
    async handleCloseTrade(position) {
      if (!this.seriesByState[position.state]) {
        await this.ensureStateLoaded(position.state)
      }
      let closePx = this.currentPriceForState(position.state)
      if (!Number.isFinite(closePx) && position.state === this.selectedState) {
        closePx = this.latestPrice
      }
      if (!Number.isFinite(closePx)) {
        console.error('Unable to close trade: no live price available for state', position.state)
        return
      }
      if (this.closeLoadingIds.includes(position.id)) return
      this.closeLoadingIds = [...this.closeLoadingIds, position.id]
      const qty = Number(position.remaining_quantity_mwh || position.quantity_mwh || 0)
      const entry = Number(position.entry_price || 0)
      const realisedPnl =
        position.side === 'buy'
          ? (Number(closePx) - entry) * qty
          : (entry - Number(closePx)) * qty
      const optimisticTrade = {
        ...position,
        status: 'closed',
        close_price: Number(closePx),
        closed_at: new Date().toISOString(),
        realised_pnl: realisedPnl,
        unrealised_pnl_snapshot: 0,
        remaining_quantity_mwh: 0
      }
      const previousTrades = this.trades.slice()
      this.replaceTradeLocally(optimisticTrade)
      try {
        const updatedTrade = await closeTrade({ tradeId: position.id, closePrice: closePx })
        this.replaceTradeLocally(updatedTrade)
        await this.syncAfterTradeMutation()
      } catch (error) {
        this.trades = previousTrades
        console.error('Failed to close trade', error)
      } finally {
        this.closeLoadingIds = this.closeLoadingIds.filter((id) => id !== position.id)
      }
    },
    async handleAddNote() {
      if (!this.noteInput) return
      await addNote({ state: this.selectedState, text: this.noteInput })
      this.noteInput = ''
      await this.refreshCollab()
    }
  }
}
</script>

<style lang="scss" scoped>
.trading-page {
  .trade-position-row {
    margin-bottom: 1rem;
  }

  .revenue-box {
    margin-bottom: 1rem;
  }

  .order-notes-row {
    margin-bottom: 1rem;
  }

  .activity-box {
    margin-top: 0.25rem;
  }

  .level {
    margin-bottom: 2rem;
  }

  .controls-inline {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    margin-top: 0.2rem;
  }

  .kpi-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 0.75rem;
    margin-top: 0.7rem;
    margin-bottom: 1.25rem;
  }

  .kpi-dark {
    background: #0f1b2d;
    border: 1px solid #1e3050;
    border-radius: 8px;
    padding: 0.85rem 1rem;
  }

  .kpi-label {
    font-size: 10px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #6a82a0;
    margin-bottom: 0.3rem;
  }

  .kpi-value {
    font-size: 1.1rem;
    font-weight: 700;
    color: #e8eef8;
  }

  .terminal-chart-box {
    background: #0a1525;
    border: 1px solid #1c2e47;
    border-radius: 10px;
    padding: 1rem 1.25rem 0.75rem;
    margin-bottom: 1.25rem;
  }

  .terminal-chart-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.75rem;
  }

  .terminal-chart-title {
    font-size: 12px;
    font-weight: 600;
    color: #8fa8cc;
    letter-spacing: 0.07em;
    text-transform: uppercase;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .live-dot {
    display: inline-block;
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #26a69a;
    box-shadow: 0 0 6px #26a69a;
    animation: pulse 1.5s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }

  .series-toggles {
    display: flex;
    gap: 0.6rem;
  }

  .toggle-pill {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    font-size: 11px;
    color: #5a7090;
    cursor: pointer;
    padding: 2px 8px;
    border-radius: 20px;
    border: 1px solid #1e3050;
    transition: all 0.15s;

    input { display: none; }

    &.active {
      color: #c8d8f0;
      border-color: #2e5080;
      background: #0f2040;
    }
  }

  .pill-dot {
    display: inline-block;
    width: 7px;
    height: 7px;
    border-radius: 50%;
  }

  .price-dot { background: #26a69a; }
  .demand-dot { background: #c56eff; }
  .gen-dot { background: #43d5c1; }

  .live-values-row {
    display: flex;
    gap: 1.5rem;
    margin-bottom: 0.75rem;
    flex-wrap: wrap;
  }

  .live-val-block {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .lv-label {
    font-size: 9px;
    letter-spacing: 0.1em;
    color: #4a6080;
    text-transform: uppercase;
  }

  .lv-number {
    font-size: 14px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }

  .price-colour { color: #26a69a; }
  .demand-colour { color: #c56eff; }
  .gen-colour { color: #43d5c1; }
  .overlay-colour { color: #f39c12; }

  .chart-outer {
    display: flex;
    align-items: stretch;
    gap: 0;
  }

  .y-axis-left,
  .y-axis-right {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 2px 6px;
    font-size: 10px;
    font-variant-numeric: tabular-nums;
    color: #4a6080;
    min-width: 56px;
    text-align: right;
  }

  .y-axis-left { border-right: 1px solid #1c2e47; }
  .y-axis-right { border-left: 1px solid #1c2e47; text-align: left; }

  .main-chart {
    flex: 1;
    display: block;
    height: 280px;
    background: #081020;
  }

  .x-axis-labels {
    display: flex;
    justify-content: space-between;
    padding: 4px 62px 2px;
    font-size: 10px;
    color: #3a5070;
  }

  .axis-legend-row {
    display: flex;
    gap: 1rem;
    padding: 4px 62px;
    font-size: 11px;
    margin-top: 2px;
  }

  .legend-item { color: #5a7090; }

  .line-chart {
    width: 100%;
    height: 200px;
    display: block;
    background: #ffffff;
    border: 1px solid #d2dbe8;
    border-radius: 6px;
  }

  .revenue-chart-wrap {
    display: flex;
    align-items: stretch;
  }

  .revenue-y-axis {
    width: 74px;
    padding-right: 8px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    font-size: 11px;
    color: #3f546f;
    font-variant-numeric: tabular-nums;
    text-align: right;
  }

  .revenue-chart {
    flex: 1;
  }

  .revenue-x-axis {
    margin-left: 82px;
    margin-top: 4px;
    display: flex;
    justify-content: space-between;
    font-size: 11px;
    color: #3f546f;
  }

  .revenue-legend {
    margin-left: 82px;
    margin-top: 7px;
    display: flex;
    gap: 0.9rem;
    flex-wrap: wrap;
    font-size: 11px;
    color: #4d617b;
  }

  .revenue-legend-item {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
  }

  .legend-value {
    color: #d8e0ee;
    font-weight: 700;
    margin-left: 0.15rem;
  }

  .legend-swatch {
    width: 10px;
    height: 10px;
    border-radius: 2px;
    display: inline-block;
  }

  .feed-list {
    max-height: 220px;
    overflow: auto;
  }

  .feed-item {
    padding: 0.35rem 0;
    border-bottom: 1px solid #f0f0f0;
  }

  .note-author {
    font-weight: 700;
    margin-right: 0.35rem;
  }

  .note-comment {
    margin-right: 0.35rem;
  }

  .note-time {
    font-style: italic;
    color: #7f8fa8;
  }

  .pnl-pos { color: #1f7a4b; }
  .pnl-neg { color: #b8433a; }
}
</style>

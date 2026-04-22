<template>
  <div class="solar-page">
    <section class="controls chart-border">
      <div class="field-group">
        <label>State</label>
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
      </div>

      <button
        class="button is-small is-dark"
        :disabled="loading"
        @click="fetchSolarData">
        {{ loading ? 'Refreshing…' : 'Refresh Solar Data' }}
      </button>
    </section>

    <p
      v-if="errorMessage"
      class="error-text">
      {{ errorMessage }}
    </p>

    <section class="cards-grid">
      <article class="metric-card chart-border">
        <h3>Current Price Now</h3>
        <p class="value">{{ formatCurrencyPerMwh(currentPriceNow) }}</p>
      </article>
      <article class="metric-card chart-border">
        <h3>Cheapest Next Charging Window</h3>
        <p class="value">{{ cheapestWindowLabel }}</p>
      </article>
      <article class="metric-card chart-border">
        <h3>Highest Export Window</h3>
        <p class="value">{{ highestWindowLabel }}</p>
      </article>
      <article class="metric-card chart-border">
        <h3>Grid Volatility</h3>
        <p class="value">{{ volatilityIndicator }}</p>
      </article>
    </section>

    <section class="chart-border panel">
      <h3>Solar Arbitrage Calculator</h3>
      <div class="calculator-grid">
        <div class="field-group">
          <label>Battery Capacity (kWh)</label>
          <input
            v-model.number="batteryCapacityKwh"
            class="input is-small"
            min="1"
            step="0.5"
            type="number">
        </div>
        <div class="field-group">
          <label>Feed-in Tariff ($/kWh)</label>
          <input
            v-model.number="feedInTariff"
            class="input is-small"
            min="0"
            step="0.01"
            type="number">
        </div>
        <button
          class="button is-small is-primary"
          @click="saveBatteryProfile">
          Save Battery Profile
        </button>
      </div>

      <div class="insights-grid">
        <article class="insight-item">
          <strong>If you export 5 kWh now:</strong>
          <span>{{ formatCurrency(earningsIfExportNow) }}</span>
        </article>
        <article class="insight-item">
          <strong>If you wait 2 hours:</strong>
          <span>{{ formatCurrency(earningsIfWaitTwoHours) }}</span>
        </article>
        <article class="insight-item">
          <strong>Estimated Daily Savings:</strong>
          <span>{{ formatCurrency(estimatedDailySavings) }}</span>
        </article>
      </div>
    </section>

    <section class="chart-border panel">
      <h3>Solar Arbitrage App Connectors</h3>
      <div class="connectors-grid">
        <article
          v-for="app in connectors"
          :key="app.key"
          class="connector-card">
          <div>
            <strong>{{ app.label }}</strong>
            <p class="muted">{{ app.description }}</p>
          </div>
          <button
            class="button is-small"
            :class="isConnected(app.key) ? 'is-success' : 'is-light'"
            @click="toggleConnector(app.key)">
            {{ isConnected(app.key) ? 'Connected' : 'Connect' }}
          </button>
        </article>
      </div>
    </section>

    <section
      v-if="connectedApps.length > 0"
      class="chart-border panel">
      <h3>Connected Trading Apps</h3>
      <p class="muted">Grid connection is active and auto-seller rules are running.</p>
      <div class="connected-grid">
        <article
          v-for="app in connectedConnectorApps"
          :key="`connected-${app.key}`"
          class="connected-card">
          <div class="connected-header">
            <strong>{{ app.label }}</strong>
            <span class="status-pill">Live Connected</span>
          </div>
          <p class="connected-line">Current grid price: {{ formatCurrencyPerMwh(currentPriceNow) }}</p>
          <p class="connected-line">
            Auto-seller:
            {{ getAutoSellerSummary(app.key) }}
          </p>
          <div class="connected-actions">
            <button
              class="button is-small is-info is-light"
              @click="openSettingsPopup(app.key)">
              Adjust Auto-Seller
            </button>
          </div>
        </article>
      </div>
    </section>

    <section class="chart-border panel">
      <h3>Current Rooftop vs Utility Solar by State</h3>
      <table class="table is-fullwidth is-striped is-hoverable is-size-7">
        <thead>
          <tr>
            <th>State</th>
            <th>Rooftop Solar (MW)</th>
            <th>Utility Solar (MW)</th>
            <th>Total Solar (MW)</th>
            <th>Data Source</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in solarStateRows"
            :key="row.state">
            <td>{{ row.state }}</td>
            <td>{{ formatNumber(row.rooftopMw) }}</td>
            <td>{{ formatNumber(row.utilityMw) }}</td>
            <td>{{ formatNumber(row.totalMw) }}</td>
            <td>{{ row.source }}</td>
          </tr>
        </tbody>
      </table>
    </section>

    <section class="chart-border panel">
      <h3>Daily Profit Meter</h3>
      <div class="meter-wrap">
        <div class="meter-track">
          <div
            class="meter-fill"
            :style="{ width: `${dailyProfitPercent}%` }" />
        </div>
        <p class="meter-value">
          {{ formatCurrency(estimatedDailySavings) }}
        </p>
      </div>
    </section>

    <div
      v-if="activeSettingsApp"
      class="settings-modal-backdrop"
      @click.self="closeSettingsPopup">
      <div class="settings-modal">
        <div class="modal-header">
          <h4>Auto-Seller Settings: {{ appLabel(activeSettingsApp) }}</h4>
          <button
            type="button"
            class="delete"
            aria-label="close"
            @click="closeSettingsPopup" />
        </div>

        <div class="modal-grid">
          <label class="checkbox">
            <input
              v-model="editingSettings.enabled"
              type="checkbox">
            Enable auto seller
          </label>

          <div class="field-group">
            <label>Sell when price is at or above ($/MWh)</label>
            <input
              v-model.number="editingSettings.sellAtOrAbove"
              class="input is-small"
              min="0"
              step="1"
              type="number">
          </div>

          <div class="field-group">
            <label>Charge when price is at or below ($/MWh)</label>
            <input
              v-model.number="editingSettings.chargeAtOrBelow"
              class="input is-small"
              min="0"
              step="1"
              type="number">
          </div>

          <div class="field-group">
            <label>Default export amount (kWh)</label>
            <input
              v-model.number="editingSettings.exportKwh"
              class="input is-small"
              min="0.5"
              step="0.5"
              type="number">
          </div>
        </div>

        <div class="modal-actions">
          <button
            class="button is-small"
            @click="closeSettingsPopup">
            Cancel
          </button>
          <button
            class="button is-small is-primary"
            @click="saveSettingsPopup">
            Save Settings
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { lsGet, lsSet } from '@/services/LocalStorage'
import {
  getSolarForecast,
  getSpotForecast,
  getStatePowerSeries
} from '@/services/ForecastingApi'

const STATE_OPTIONS = ['NSW1', 'QLD1', 'SA1', 'TAS1', 'VIC1']
const CONNECTOR_STORAGE_KEY = 'gridx_mock_connectors'
const BATTERY_STORAGE_KEY = 'gridx_battery_profile'
const CONNECTOR_SETTINGS_STORAGE_KEY = 'gridx_connector_settings'

function toUsdPerKwhFromMwh(pricePerMwh) {
  if (pricePerMwh === null || pricePerMwh === undefined) return null
  return Number(pricePerMwh) / 1000
}

export default {
  layout: 'main',
  data() {
    return {
      states: STATE_OPTIONS,
      selectedState: 'NSW1',
      loading: false,
      errorMessage: '',
      solarRaw: null,
      spotRaw: null,
      statePowerRaw: null,
      batteryCapacityKwh: 10,
      feedInTariff: 0.12,
      connectedApps: [],
      connectorSettings: {},
      activeSettingsApp: '',
      editingSettings: {
        enabled: true,
        sellAtOrAbove: 120,
        chargeAtOrBelow: 50,
        exportKwh: 5
      },
      connectors: [
        {
          key: 'amber',
          label: 'Amber',
          description: 'VPP connector for real-time export automation.'
        },
        {
          key: 'localvolts',
          label: 'LocalVolts',
          description: 'P2P energy market connector.'
        },
        {
          key: 'flowpower',
          label: 'Flow Power',
          description: 'Wholesale-backed virtual battery connector.'
        },
        {
          key: 'agl',
          label: 'AGL',
          description: 'Retail VPP connector.'
        }
      ]
    }
  },
  computed: {
    selectedSolarRegion() {
      return this.findRegion(this.solarRaw)
    },
    selectedSpotRegion() {
      return this.findRegion(this.spotRaw)
    },
    stateSeriesById() {
      const payload = this.statePowerRaw
      if (!payload || !payload.data) {
        return {}
      }
      return payload.data.reduce((acc, item) => {
        acc[item.id] = item
        return acc
      }, {})
    },
    oeSolarCurrent() {
      const state = this.selectedState.toLowerCase()
      const rooftop = this.getLatestSeriesPoint(`au.nem.${state}.fuel_tech.solar_rooftop.power`)
      const utility = this.getLatestSeriesPoint(`au.nem.${state}.fuel_tech.solar_utility.power`)
      return {
        rooftop,
        utility
      }
    },
    currentPriceNow() {
      return this.getCurrentOrForecast(this.selectedSpotRegion, 'price')
    },
    forecastPricePoints() {
      const current = this.currentPriceNow
      const region = this.selectedSpotRegion
      return [
        { label: 'now', minutes: 0, value: current },
        { label: '+5m', minutes: 5, value: this.getPredictedValue(region, '5m', 'price') },
        { label: '+15m', minutes: 15, value: this.getPredictedValue(region, '15m', 'price') },
        { label: '+30m', minutes: 30, value: this.getPredictedValue(region, '30m', 'price') }
      ].filter((point) => point.value !== null && point.value !== undefined)
    },
    cheapestWindow() {
      if (this.forecastPricePoints.length === 0) return null
      return this.forecastPricePoints.reduce((minPoint, point) => {
        return point.value < minPoint.value ? point : minPoint
      }, this.forecastPricePoints[0])
    },
    highestWindow() {
      if (this.forecastPricePoints.length === 0) return null
      return this.forecastPricePoints.reduce((maxPoint, point) => {
        return point.value > maxPoint.value ? point : maxPoint
      }, this.forecastPricePoints[0])
    },
    cheapestWindowLabel() {
      if (!this.cheapestWindow) return '—'
      return `${this.cheapestWindow.label} (${this.formatCurrencyPerMwh(this.cheapestWindow.value)})`
    },
    highestWindowLabel() {
      if (!this.highestWindow) return '—'
      return `${this.highestWindow.label} (${this.formatCurrencyPerMwh(this.highestWindow.value)})`
    },
    estimatedPriceInTwoHours() {
      const now = this.currentPriceNow
      const p30 = this.getPredictedValue(this.selectedSpotRegion, '30m', 'price')
      if (now === null || p30 === null || p30 === undefined) {
        return now
      }
      const slopePer30m = p30 - now
      const projected = p30 + slopePer30m * 3
      return Math.max(projected, 0)
    },
    earningsIfExportNow() {
      const priceKwh = toUsdPerKwhFromMwh(this.currentPriceNow)
      const effective = Math.max(priceKwh || 0, this.feedInTariff || 0)
      return 5 * effective
    },
    earningsIfWaitTwoHours() {
      const projectedPriceKwh = toUsdPerKwhFromMwh(this.estimatedPriceInTwoHours)
      const effective = Math.max(projectedPriceKwh || 0, this.feedInTariff || 0)
      return 5 * effective
    },
    volatilityIndicator() {
      const values = this.forecastPricePoints.map((point) => point.value)
      if (values.length < 2) return 'Unknown'
      const mean = values.reduce((sum, value) => sum + value, 0) / values.length
      const variance =
        values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length
      const stdDev = Math.sqrt(variance)
      if (stdDev < 3) return 'Low'
      if (stdDev < 10) return 'Medium'
      return 'High'
    },
    solarForecastTotalNow() {
      const region = this.selectedSolarRegion
      if (!region || !region.current_values) return null
      return (
        (region.current_values.solar_rooftop_mw || 0) +
        (region.current_values.solar_utility_mw || 0)
      )
    },
    solarForecastAverageFuture() {
      const region = this.selectedSolarRegion
      if (!region || !region.forecasts) return null
      const points = ['5m', '15m', '30m']
        .map((horizon) => {
          const f = region.forecasts[horizon]
          if (!f) return null
          return (f.solar_rooftop_mw || 0) + (f.solar_utility_mw || 0)
        })
        .filter((value) => value !== null)
      if (points.length === 0) return null
      return points.reduce((sum, value) => sum + value, 0) / points.length
    },
    estimatedDailySavings() {
      const battery = Number(this.batteryCapacityKwh) || 0
      const cheapest = this.cheapestWindow ? this.cheapestWindow.value : null
      const highest = this.highestWindow ? this.highestWindow.value : null
      if (!battery || cheapest === null || highest === null) return 0

      const spreadKwh = Math.max((highest - cheapest) / 1000, 0)
      const solarNow = this.solarForecastTotalNow || 0
      const solarFuture = this.solarForecastAverageFuture || 0
      const solarSignal = Math.max(Math.min((solarNow + solarFuture) / 2000, 1), 0.2)
      return battery * spreadKwh * solarSignal
    },
    dailyProfitPercent() {
      const target = 20
      const pct = (this.estimatedDailySavings / target) * 100
      return Math.max(0, Math.min(100, pct))
    },
    solarStateRows() {
      if (!this.solarRaw || !this.solarRaw.regions) {
        return []
      }
      return this.solarRaw.regions.map((region) => {
        const rooftop = region.current_values
          ? region.current_values.solar_rooftop_mw || 0
          : 0
        const utility = region.current_values
          ? region.current_values.solar_utility_mw || 0
          : 0
        return {
          state: region.region,
          rooftopMw: rooftop,
          utilityMw: utility,
          totalMw: rooftop + utility,
          source: region.source || 'hf_model'
        }
      })
    },
    connectedConnectorApps() {
      return this.connectors.filter((app) => this.connectedApps.includes(app.key))
    }
  },
  watch: {
    selectedState() {
      this.fetchSolarData()
    }
  },
  created() {
    this.$store.dispatch('currentView', 'solar')
    this.restoreSavedProfile()
  },
  mounted() {
    this.fetchSolarData()
  },
  methods: {
    formatNumber(value) {
      if (value === null || value === undefined || Number.isNaN(value)) {
        return '—'
      }
      return Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 })
    },
    formatCurrency(value) {
      if (value === null || value === undefined || Number.isNaN(value)) {
        return '—'
      }
      return `$${Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 })}`
    },
    formatCurrencyPerMwh(value) {
      if (value === null || value === undefined || Number.isNaN(value)) {
        return '—'
      }
      return `${this.formatCurrency(value)}/MWh`
    },
    findRegion(rawPayload) {
      if (!rawPayload || !rawPayload.regions) return null
      return rawPayload.regions.find((region) => region.region === this.selectedState)
    },
    getPredictedValue(region, horizon, key) {
      const value = region && region.forecasts && region.forecasts[horizon]
      const metric = value && value[key]
      if (metric === null || metric === undefined) return null
      if (metric.predicted_value !== undefined) {
        return metric.predicted_value
      }
      return metric
    },
    getCurrentOrForecast(region, key) {
      if (!region) return null
      const current =
        region.current_values && region.current_values[key] !== undefined
          ? region.current_values[key]
          : null
      if (current !== null && current !== undefined) return current
      const f5 = this.getPredictedValue(region, '5m', key)
      if (f5 !== null && f5 !== undefined) return f5
      const f15 = this.getPredictedValue(region, '15m', key)
      if (f15 !== null && f15 !== undefined) return f15
      return this.getPredictedValue(region, '30m', key)
    },
    getLatestSeriesPoint(seriesId) {
      const item = this.stateSeriesById[seriesId]
      if (!item || !item.history || !item.history.data || item.history.data.length === 0) {
        return null
      }
      return item.history.data[item.history.data.length - 1]
    },
    isConnected(key) {
      return this.connectedApps.includes(key)
    },
    appLabel(key) {
      const found = this.connectors.find((connector) => connector.key === key)
      return found ? found.label : key
    },
    defaultAppSettings() {
      return {
        enabled: true,
        sellAtOrAbove: 120,
        chargeAtOrBelow: 50,
        exportKwh: 5
      }
    },
    getAppSettings(key) {
      const existing = this.connectorSettings[key]
      if (!existing) {
        return this.defaultAppSettings()
      }
      return {
        ...this.defaultAppSettings(),
        ...existing
      }
    },
    getAutoSellerSummary(key) {
      const settings = this.getAppSettings(key)
      if (!settings.enabled) {
        return 'Disabled'
      }
      return `Sell >= ${settings.sellAtOrAbove}/MWh, Charge <= ${settings.chargeAtOrBelow}/MWh, Export ${settings.exportKwh} kWh`
    },
    toggleConnector(key) {
      if (this.isConnected(key)) {
        this.connectedApps = this.connectedApps.filter((appKey) => appKey !== key)
      } else {
        this.connectedApps = [...this.connectedApps, key]
        if (!this.connectorSettings[key]) {
          this.connectorSettings = {
            ...this.connectorSettings,
            [key]: this.defaultAppSettings()
          }
        }
      }
      lsSet(CONNECTOR_STORAGE_KEY, JSON.stringify(this.connectedApps))
      lsSet(CONNECTOR_SETTINGS_STORAGE_KEY, JSON.stringify(this.connectorSettings))
    },
    openSettingsPopup(key) {
      this.activeSettingsApp = key
      this.editingSettings = { ...this.getAppSettings(key) }
    },
    closeSettingsPopup() {
      this.activeSettingsApp = ''
    },
    saveSettingsPopup() {
      if (!this.activeSettingsApp) {
        return
      }
      this.connectorSettings = {
        ...this.connectorSettings,
        [this.activeSettingsApp]: { ...this.editingSettings }
      }
      lsSet(CONNECTOR_SETTINGS_STORAGE_KEY, JSON.stringify(this.connectorSettings))
      this.closeSettingsPopup()
    },
    saveBatteryProfile() {
      const payload = {
        batteryCapacityKwh: this.batteryCapacityKwh,
        feedInTariff: this.feedInTariff
      }
      lsSet(BATTERY_STORAGE_KEY, JSON.stringify(payload))
    },
    restoreSavedProfile() {
      const savedProfile = lsGet(BATTERY_STORAGE_KEY)
      const savedConnectors = lsGet(CONNECTOR_STORAGE_KEY)
      const savedSettings = lsGet(CONNECTOR_SETTINGS_STORAGE_KEY)
      if (savedProfile) {
        try {
          const parsed = JSON.parse(savedProfile)
          if (parsed.batteryCapacityKwh) {
            this.batteryCapacityKwh = Number(parsed.batteryCapacityKwh)
          }
          if (parsed.feedInTariff !== undefined) {
            this.feedInTariff = Number(parsed.feedInTariff)
          }
        } catch (e) {
          // no-op for invalid local storage payload
        }
      }
      if (savedConnectors) {
        try {
          const parsed = JSON.parse(savedConnectors)
          if (Array.isArray(parsed)) {
            this.connectedApps = parsed
          }
        } catch (e) {
          // no-op for invalid local storage payload
        }
      }
      if (savedSettings) {
        try {
          const parsed = JSON.parse(savedSettings)
          if (parsed && typeof parsed === 'object') {
            this.connectorSettings = parsed
          }
        } catch (e) {
          // no-op for invalid local storage payload
        }
      }
    },
    async fetchSolarData() {
      this.loading = true
      this.errorMessage = ''
      try {
        const [solar, spot, stateSeries] = await Promise.all([
          getSolarForecast(),
          getSpotForecast(),
          getStatePowerSeries(this.selectedState)
        ])
        this.solarRaw = solar[2]
        this.spotRaw = spot[2]
        this.statePowerRaw = stateSeries
      } catch (error) {
        this.errorMessage = 'Could not load solar/arbitrage data right now.'
      } finally {
        this.loading = false
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.solar-page {
  padding: 1rem;
}

.controls {
  display: flex;
  align-items: flex-end;
  gap: 0.75rem;
  margin-bottom: 1rem;
  padding: 0.75rem;
}

.field-group {
  display: flex;
  flex-direction: column;
  min-width: 180px;
}

.field-group label {
  font-size: 12px;
  margin-bottom: 0.25rem;
}

.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.metric-card {
  padding: 0.75rem;
}

.metric-card h3 {
  font-size: 12px;
  text-transform: uppercase;
  color: #666;
}

.metric-card .value {
  font-size: 1.1rem;
  font-weight: 700;
}

.panel {
  padding: 0.75rem;
  margin-bottom: 1rem;
}

.panel h3 {
  margin-bottom: 0.75rem;
}

.calculator-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 0.75rem;
  align-items: end;
}

.insights-grid {
  margin-top: 1rem;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 0.5rem;
}

.insight-item {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem;
  border: 1px solid #efefef;
  border-radius: 6px;
}

.connectors-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 0.75rem;
}

.connector-card {
  border: 1px solid #ececec;
  border-radius: 8px;
  padding: 0.75rem;
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
}

.connected-grid {
  margin-top: 0.75rem;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 0.75rem;
}

.connected-card {
  border: 1px solid #ececec;
  border-radius: 8px;
  padding: 0.75rem;
}

.connected-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.status-pill {
  font-size: 11px;
  font-weight: 700;
  color: #1f7a4b;
  background: #e8f7ef;
  border-radius: 999px;
  padding: 0.15rem 0.55rem;
}

.connected-line {
  margin: 0.25rem 0;
  font-size: 13px;
}

.connected-actions {
  margin-top: 0.75rem;
}

.muted {
  color: #6a6a6a;
  margin-top: 0.25rem;
  font-size: 12px;
}

.meter-wrap {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.meter-track {
  flex: 1;
  height: 14px;
  background: #efefef;
  border-radius: 8px;
  overflow: hidden;
}

.meter-fill {
  height: 100%;
  background: linear-gradient(90deg, #65c7aa, #49a4e8);
}

.meter-value {
  min-width: 90px;
  font-weight: 700;
  margin: 0;
}

.error-text {
  color: #c0392b;
  margin-bottom: 0.75rem;
}

.settings-modal-backdrop {
  position: fixed;
  z-index: 1000;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.settings-modal {
  width: 100%;
  max-width: 560px;
  background: #fff;
  border-radius: 8px;
  padding: 1rem;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.modal-grid {
  display: grid;
  gap: 0.75rem;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 1rem;
}
</style>

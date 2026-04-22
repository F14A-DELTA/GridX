<template>
  <div class="forecasting-page">
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
        @click="fetchAllPredictions">
        {{ loading ? 'Loading…' : 'Refresh Forecasts' }}
      </button>
    </section>

    <p
      v-if="errorMessage"
      class="error-text">
      {{ errorMessage }}
    </p>

    <section class="source-tags chart-border">
      <span class="tag is-light">Spot/Demand: model prediction</span>
      <span class="tag is-light">Solar: model prediction</span>
      <span class="tag is-light">Renewables: model prediction</span>
      <span class="tag is-light">Next-day: daily average model</span>
    </section>

    <section class="cards-grid">
      <article class="metric-card chart-border">
        <h3>Next Day Avg Price</h3>
        <p class="value">{{ formatNumber(nextDayPrice) }} $/MWh</p>
      </article>
      <article class="metric-card chart-border">
        <h3>Next Day Avg Demand</h3>
        <p class="value">{{ formatNumber(nextDayDemand) }} MW</p>
      </article>
      <article class="metric-card chart-border">
        <h3>As Of</h3>
        <p class="value">{{ nextDayTargetDate || '—' }}</p>
      </article>
    </section>

    <section class="table-wrapper chart-border">
      <h3>Forecast Snapshot ({{ selectedState }})</h3>
      <table class="table is-fullwidth is-striped is-hoverable is-size-7">
        <thead>
          <tr>
            <th>Horizon</th>
            <th>Spot Price ($/MWh)</th>
            <th>Demand (MW)</th>
            <th>Solar Total (MW)</th>
            <th>Renewables (%)</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in intradayRows"
            :key="row.horizon">
            <td>{{ row.horizon }}</td>
            <td>{{ formatNumber(row.price) }}</td>
            <td>{{ formatNumber(row.demand) }}</td>
            <td>{{ formatNumber(row.solarTotal) }}</td>
            <td>{{ formatNumber(row.renewablesPct) }}</td>
          </tr>
        </tbody>
      </table>

      <h3 class="sub-table-heading">Fuel Forecast Detail ({{ selectedState }})</h3>
      <table class="table is-fullwidth is-striped is-hoverable is-size-7">
        <thead>
          <tr>
            <th>Metric</th>
            <th>Current</th>
            <th>+5m</th>
            <th>+15m</th>
            <th>+30m</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in fuelForecastRows"
            :key="row.key">
            <td>{{ row.label }}</td>
            <td>{{ formatNumber(row.current) }}</td>
            <td>{{ formatNumber(row.f5) }}</td>
            <td>{{ formatNumber(row.f15) }}</td>
            <td>{{ formatNumber(row.f30) }}</td>
          </tr>
        </tbody>
      </table>
    </section>
  </div>
</template>

<script>
import OpenChart from '@/components/Charts/OpenChart'
import * as OPTIONS from '@/constants/chart-options'
import {
  getDailyAverages,
  getNextDayForecast,
  getRenewablesForecast,
  getStatePowerSeries,
  getSolarForecast,
  getSpotForecast
} from '@/services/ForecastingApi'

const STATE_OPTIONS = ['NSW1', 'QLD1', 'SA1', 'TAS1', 'VIC1']
const HISTORY_DAYS = 120

function defaultDateOffset(daysBack) {
  const date = new Date()
  date.setDate(date.getDate() - daysBack)
  return date.toISOString().slice(0, 10)
}

export default {
  layout: 'main',
  components: {
    OpenChart
  },
  data() {
    return {
      states: STATE_OPTIONS,
      selectedState: 'NSW1',
      loading: false,
      errorMessage: '',
      solarRaw: null,
      spotRaw: null,
      renewablesRaw: null,
      statePowerRaw: null,
      dailyAveragesFrame: null,
      nextDayJson: null
    }
  },
  computed: {
    priceDomains() {
      return [
        { id: 'actualPrice', label: 'Actual', colour: '#153BA5' },
        { id: 'forecastPrice', label: 'Forecast +5/+15/+30m', colour: '#E34A33' }
      ]
    },
    demandDomains() {
      return [
        { id: 'actualDemand', label: 'Actual', colour: '#153BA5' },
        { id: 'forecastDemand', label: 'Forecast +5/+15/+30m', colour: '#E34A33' }
      ]
    },
    solarDomains() {
      return [{ id: 'solarTotal', label: 'Solar', colour: '#F7C41D' }]
    },
    renewablesDomains() {
      return [{ id: 'renewablesPct', label: 'Renewables %', colour: '#65C7AA' }]
    },
    dailyDomains() {
      return [
        { id: 'avgPrice', label: 'Daily avg price', colour: '#E34A33' },
        { id: 'avgDemand', label: 'Daily avg demand', colour: '#153BA5' }
      ]
    },
    selectedSpotRegion() {
      return this.findRegion(this.spotRaw)
    },
    selectedSolarRegion() {
      return this.findRegion(this.solarRaw)
    },
    selectedRenewablesRegion() {
      return this.findRegion(this.renewablesRaw)
    },
    intradayRows() {
      const spot = this.selectedSpotRegion
      const solar = this.selectedSolarRegion
      const renewables = this.selectedRenewablesRegion
      if (!spot || !solar || !renewables) {
        return []
      }

      return [
        {
          horizon: 'Current',
          price: this.getCurrentOrForecast(spot, 'price'),
          demand: this.getCurrentOrForecast(spot, 'demand'),
          solarTotal:
            (solar.current_values.solar_rooftop_mw || 0) +
            (solar.current_values.solar_utility_mw || 0),
          renewablesPct: this.getCurrentOrForecast(renewables, 'renewables_pct')
        },
        {
          horizon: '+5m',
          price: this.getPredictedValue(spot, '5m', 'price'),
          demand: this.getPredictedValue(spot, '5m', 'demand'),
          solarTotal: this.getSolarForecastValue(solar, '5m'),
          renewablesPct: this.getPredictedValue(renewables, '5m', 'renewables_pct')
        },
        {
          horizon: '+15m',
          price: this.getPredictedValue(spot, '15m', 'price'),
          demand: this.getPredictedValue(spot, '15m', 'demand'),
          solarTotal: this.getSolarForecastValue(solar, '15m'),
          renewablesPct: this.getPredictedValue(renewables, '15m', 'renewables_pct')
        },
        {
          horizon: '+30m',
          price: this.getPredictedValue(spot, '30m', 'price'),
          demand: this.getPredictedValue(spot, '30m', 'demand'),
          solarTotal: this.getSolarForecastValue(solar, '30m'),
          renewablesPct: this.getPredictedValue(renewables, '30m', 'renewables_pct')
        }
      ]
    },
    fuelForecastRows() {
      const spot = this.selectedSpotRegion
      const renewables = this.selectedRenewablesRegion
      const solar = this.selectedSolarRegion

      const get = (region, horizon, key) => this.getPredictedValue(region, horizon, key)
      const solarForecast = (horizon, key) =>
        solar && solar.forecasts && solar.forecasts[horizon]
          ? solar.forecasts[horizon][key]
          : null

      return [
        {
          key: 'wind',
          label: 'Wind Generation (MW)',
          current: this.getCurrentOrForecast(spot, 'gen_wind'),
          f5: get(spot, '5m', 'gen_wind'),
          f15: get(spot, '15m', 'gen_wind'),
          f30: get(spot, '30m', 'gen_wind')
        },
        {
          key: 'coal_black',
          label: 'Black Coal Generation (MW)',
          current: this.getCurrentOrForecast(spot, 'gen_coal_black'),
          f5: get(spot, '5m', 'gen_coal_black'),
          f15: get(spot, '15m', 'gen_coal_black'),
          f30: get(spot, '30m', 'gen_coal_black')
        },
        {
          key: 'coal_brown',
          label: 'Brown Coal Generation (MW)',
          current: this.getCurrentOrForecast(spot, 'gen_coal_brown'),
          f5: get(spot, '5m', 'gen_coal_brown'),
          f15: get(spot, '15m', 'gen_coal_brown'),
          f30: get(spot, '30m', 'gen_coal_brown')
        },
        {
          key: 'hydro',
          label: 'Hydro Generation (MW)',
          current: this.getCurrentOrForecast(renewables, 'gen_hydro'),
          f5: get(renewables, '5m', 'gen_hydro'),
          f15: get(renewables, '15m', 'gen_hydro'),
          f30: get(renewables, '30m', 'gen_hydro')
        },
        {
          key: 'battery',
          label: 'Battery Discharging (MW)',
          current: this.getCurrentOrForecast(renewables, 'gen_battery_discharging'),
          f5: get(renewables, '5m', 'gen_battery_discharging'),
          f15: get(renewables, '15m', 'gen_battery_discharging'),
          f30: get(renewables, '30m', 'gen_battery_discharging')
        },
        {
          key: 'solar_rooftop',
          label: 'Solar Rooftop (MW)',
          current:
            solar && solar.current_values
              ? solar.current_values.solar_rooftop_mw
              : null,
          f5: solarForecast('5m', 'solar_rooftop_mw'),
          f15: solarForecast('15m', 'solar_rooftop_mw'),
          f30: solarForecast('30m', 'solar_rooftop_mw')
        },
        {
          key: 'solar_utility',
          label: 'Solar Utility (MW)',
          current:
            solar && solar.current_values
              ? solar.current_values.solar_utility_mw
              : null,
          f5: solarForecast('5m', 'solar_utility_mw'),
          f15: solarForecast('15m', 'solar_utility_mw'),
          f30: solarForecast('30m', 'solar_utility_mw')
        }
      ]
    },
    intradayChartDataset() {
      const base = Date.now()
      return this.intradayRows.map((row, idx) => {
        const minutes = idx === 0 ? 0 : [5, 15, 30][idx - 1]
        const time = base + minutes * 60 * 1000
        return {
          date: new Date(time),
          time,
          displayTime: time,
          price: row.price,
          demand: row.demand,
          solarTotal: row.solarTotal,
          renewablesPct: row.renewablesPct
        }
      })
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
    demandActualSeries() {
      return this.extractActualSeries('demand')
    },
    priceActualSeries() {
      return this.extractActualSeries('price')
    },
    demandExtensionChartDataset() {
      return this.buildExtensionDataset({
        actualSeries: this.demandActualSeries,
        forecastKey: 'demand',
        actualProp: 'actualDemand',
        forecastProp: 'forecastDemand'
      })
    },
    priceExtensionChartDataset() {
      return this.buildExtensionDataset({
        actualSeries: this.priceActualSeries,
        forecastKey: 'price',
        actualProp: 'actualPrice',
        forecastProp: 'forecastPrice'
      })
    },
    dailyChartDataset() {
      const frame = this.dailyAveragesFrame
      if (!frame || !frame.data) {
        return []
      }

      return frame.data.map((row) => {
        const time = new Date(row[0]).getTime()
        return {
          date: new Date(time),
          time,
          displayTime: time,
          avgPrice: row[1],
          avgDemand: row[2]
        }
      })
    },
    nextDayPrice() {
      return this.nextDayJson
        ? this.nextDayJson.predicted_avg_price_dollar_per_mwh
        : null
    },
    nextDayDemand() {
      return this.nextDayJson ? this.nextDayJson.predicted_avg_demand_mw : null
    },
    nextDayTargetDate() {
      return this.nextDayJson ? this.nextDayJson.target_date : ''
    }
  },
  created() {
    this.$store.dispatch('currentView', 'forecasting')
    this.$store.commit('chartOptions/chartType', OPTIONS.CHART_LINE)
    this.$store.commit('chartOptions/chartYAxis', OPTIONS.CHART_YAXIS_ABSOLUTE)
    this.$store.commit('chartOptions/chartCurve', OPTIONS.CHART_CURVE_SMOOTH)
  },
  mounted() {
    this.fetchAllPredictions()
  },
  methods: {
    formatNumber(value) {
      if (value === null || value === undefined || Number.isNaN(value)) {
        return '—'
      }
      return Number(value).toLocaleString(undefined, {
        maximumFractionDigits: 2
      })
    },
    findRegion(rawPayload) {
      if (!rawPayload || !rawPayload.regions) {
        return null
      }
      return rawPayload.regions.find((region) => region.region === this.selectedState)
    },
    getPredictedValue(region, horizon, key) {
      const value = region && region.forecasts && region.forecasts[horizon]
      const metric = value && value[key]
      if (!metric) return null
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
      if (current !== null && current !== undefined) {
        return current
      }
      return (
        this.getPredictedValue(region, '5m', key) ||
        this.getPredictedValue(region, '15m', key) ||
        this.getPredictedValue(region, '30m', key)
      )
    },
    getSolarForecastValue(region, horizon) {
      const forecast = region && region.forecasts && region.forecasts[horizon]
      if (!forecast) {
        return null
      }
      return (forecast.solar_rooftop_mw || 0) + (forecast.solar_utility_mw || 0)
    },
    async fetchAllPredictions() {
      this.loading = true
      this.errorMessage = ''
      try {
        const endDate = defaultDateOffset(1)
        const startDate = defaultDateOffset(10)
        const results = await Promise.allSettled([
          getSolarForecast(),
          getDailyAverages(this.selectedState, startDate, endDate),
          getNextDayForecast(this.selectedState, '', HISTORY_DAYS),
          getSpotForecast(),
          getRenewablesForecast()
        ])

        const [solarResult, dailyResult, nextDayResult, spotResult, renewablesResult] =
          results

        if (solarResult.status === 'fulfilled') {
          this.solarRaw = solarResult.value[2]
        } else {
          this.solarRaw = null
        }

        if (dailyResult.status === 'fulfilled') {
          this.dailyAveragesFrame = dailyResult.value[0]
        } else {
          this.dailyAveragesFrame = null
        }

        if (nextDayResult.status === 'fulfilled') {
          this.nextDayJson = JSON.parse(nextDayResult.value[1])
        } else {
          this.nextDayJson = null
        }

        if (spotResult.status === 'fulfilled') {
          this.spotRaw = spotResult.value[2]
        } else {
          this.spotRaw = null
        }

        if (renewablesResult.status === 'fulfilled') {
          this.renewablesRaw = renewablesResult.value[2]
        } else {
          this.renewablesRaw = null
        }

        const failed = results.filter((result) => result.status === 'rejected')
        if (failed.length > 0) {
          this.errorMessage = `Loaded with partial data (${failed.length} source${failed.length > 1 ? 's' : ''} failed).`
        }
      } catch (error) {
        this.errorMessage = error && error.message
          ? error.message
          : 'Could not load predictions right now.'
      } finally {
        this.loading = false
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.forecasting-page {
  padding: 1rem;
}

.controls {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-bottom: 1rem;
  padding: 0.75rem;
  align-items: flex-end;
}

.field-group {
  display: flex;
  flex-direction: column;
  min-width: 120px;
}

.field-group label {
  font-size: 12px;
  margin-bottom: 0.25rem;
}

.source-tags {
  margin-bottom: 1rem;
  padding: 0.75rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
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
  font-size: 1.2rem;
  font-weight: 700;
}

.charts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.table-wrapper {
  margin-top: 1rem;
  padding: 0.75rem;
}

.table-wrapper h3 {
  margin-bottom: 0.5rem;
}

.sub-table-heading {
  margin-top: 1rem;
}

.error-text {
  color: #c0392b;
  margin-bottom: 0.75rem;
}
</style>

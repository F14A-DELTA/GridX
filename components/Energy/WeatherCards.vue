<template>
  <section class="chart-border weather-section">
    <h3>State Weather Cards</h3>
    <div class="weather-grid">
      <article
        v-for="card in weatherCards"
        :key="card.state"
        class="weather-card">
        <h4 class="state-heading">{{ card.state }}</h4>
        <div class="weather-row">
          <span class="row-label">Temperature</span>
          <span class="row-value">{{ formatNumber(card.temperature) }} C</span>
        </div>
        <div class="weather-row">
          <span class="row-label">Wind</span>
          <span class="row-value">{{ formatNumber(card.wind) }} km/h</span>
        </div>
        <div class="weather-row">
          <span class="row-label">Cloud Cover</span>
          <span class="row-value">{{ formatNumber(card.cloud) }}%</span>
        </div>
        <div class="weather-row">
          <span class="row-label">Rain</span>
          <span class="row-value">{{ formatNumber(card.rain) }} mm</span>
        </div>
        <div class="weather-row">
          <span class="row-label">Sunrise</span>
          <span class="row-value">{{ card.sunrise || '—' }}</span>
        </div>
        <div class="weather-row">
          <span class="row-label">Sunset</span>
          <span class="row-value">{{ card.sunset || '—' }}</span>
        </div>
      </article>
    </div>
  </section>
</template>

<script>
import { getWeatherByState } from '@/services/MarketsApi'

const STATE_COORDS = [
  { state: 'NSW1', lat: -33.8688, lon: 151.2093 },
  { state: 'QLD1', lat: -27.4698, lon: 153.0251 },
  { state: 'VIC1', lat: -37.8136, lon: 144.9631 },
  { state: 'SA1', lat: -34.9285, lon: 138.6007 },
  { state: 'TAS1', lat: -42.8821, lon: 147.3272 }
]

export default {
  data() {
    return {
      weather: []
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
  mounted() {
    this.fetchWeather()
  },
  methods: {
    formatNumber(value) {
      if (value === null || value === undefined || Number.isNaN(value)) return '—'
      return Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 })
    },
    async fetchWeather() {
      try {
        this.weather = await getWeatherByState(STATE_COORDS)
      } catch (error) {
        this.weather = []
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.weather-section {
  margin: 1rem 0;
  padding: 0.75rem;
}

.weather-section h3 {
  margin-bottom: 0.75rem;
}

.weather-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 0.75rem;
}

.weather-card {
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  padding: 0.9rem 0.85rem;
  background: #fff;
}

.state-heading {
  margin-bottom: 0.6rem;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.2px;
}

.weather-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.35rem 0;
  border-top: 1px solid #f0f0f0;
}

.weather-row:first-of-type {
  border-top: 0;
}

.row-label {
  color: #666;
  font-size: 12px;
}

.row-value {
  color: #1f1f1f;
  font-size: 12px;
  font-weight: 600;
}
</style>

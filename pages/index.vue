<template>
  <section class="section">
    <div
      class="container"
      style="max-width: 1100px"
    >
      <div class="columns is-vcentered is-desktop">
        <div class="column is-6-desktop">
          <img
            src="/gridx.png"
            alt="GridX"
            style="max-width: 480px; width: 100%; height: auto; margin-bottom: 1rem; margin-left: -16px;"
          >
          <p class="subtitle is-5">
            Explore Australia's electricity market with live grid insights,
            emissions data, pricing trends and regional energy performance in one
            place.
          </p>
          <div class="buttons">
            <nuxt-link
              class="button is-light"
              to="/about"
            >
              About
            </nuxt-link>
            <nuxt-link
              class="button is-primary"
              to="/login"
            >
              Login
            </nuxt-link>
            <nuxt-link
              class="button is-info is-light"
              to="/signup"
            >
              Sign Up
            </nuxt-link>
          </div>
        </div>
        <div class="column is-6-desktop">
          <client-only>
            <div style="width: 100%; max-width: 560px; height: 560px; overflow: hidden;">
              <LandingGlobe />
            </div>
          </client-only>
        </div>
      </div>
    </div>
  </section>
</template>

<script>
import { getStoredSession } from '~/services/SupabaseAuth'
import LandingGlobe from '~/components/LandingGlobe.vue'

const TARGET_PAGE =
  '/energy/nem/?range=7d&interval=30m&view=discrete-time&group=Detailed'

export default {
  layout: 'default',
  components: {
    LandingGlobe
  },
  mounted() {
    const session = getStoredSession()
    if (session && session.access_token) {
      this.$router.replace(TARGET_PAGE)
    }
  }
}
</script>
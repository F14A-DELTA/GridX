<template>
  <section class="section">
    <div
      class="container"
      style="max-width: 1100px"
    >
      <div class="mb-5">
        <nuxt-link
          to="/"
          class="button is-light is-small"
        >
          Back to home
        </nuxt-link>
      </div>

      <h1 class="title is-2">About GridX</h1>
      <p class="subtitle is-5">
        GridX helps people and teams understand Australia's electricity system
        with live market, generation, emissions, and forecasting insights.
      </p>

      <div class="columns is-variable is-5">
        <div class="column">
          <div class="card audience-card">
            <header class="card-header">
              <p class="card-header-title">Single User</p>
            </header>
            <div class="card-content">
              <p>
                A single user is an analyst, student, trader, or energy-curious
                person who needs fast, clear electricity insights for day-to-day
                decisions.
              </p>
            </div>
          </div>
        </div>

        <div class="column">
          <div class="card audience-card">
            <header class="card-header">
              <p class="card-header-title">Organisations</p>
            </header>
            <div class="card-content">
              <p>
                An organisation is a business, research group, media team, or
                policy unit that uses shared energy intelligence to monitor markets
                and align strategy across teams.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div class="content mt-6">
        <h2 class="title is-4">Website Features</h2>
        <ul>
          <li>Live energy generation dashboards for NEM, WEM, and regional views.</li>
          <li>Capacity views and exports across regions and fuel technologies.</li>
          <li>Emissions dashboards for Australia and world-level perspectives.</li>
          <li>Facility explorer with detailed plant-level pages by region/network.</li>
          <li>Region and market comparison tools for side-by-side analysis.</li>
          <li>Trading dashboard for electricity market-oriented monitoring.</li>
          <li>Forecasting dashboard for forward-looking market and grid insights.</li>
          <li>Solar-focused page for solar generation related tracking.</li>
          <li>Markets page for broad electricity market metrics and context.</li>
          <li>Stripe visualizations for long-term regional trend storytelling.</li>
          <li>Embeddable widgets in multiple sizes for external publishing.</li>
          <li>Experiments area for prototype and advanced data tools.</li>
          <li>Authentication flow with login and sign-up pages.</li>
          <li>Admin page for privileged operational workflows.</li>
        </ul>
      </div>
    </div>
  </section>
</template>

<script>
export default {
  layout: 'default',
  head: {
    title: 'About GridX'
  }
}
</script>

<style scoped>
.audience-card {
  height: 100%;
  border-radius: 10px;
}
</style>

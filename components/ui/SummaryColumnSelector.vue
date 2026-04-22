<template>
  <div class="column-selector-wrapper">
    <div class="column-selector">
      <span> Pricing <small>$/MWh</small> </span>
    </div>
  </div>
</template>

<script>
export default {
  mounted() {
    this.$store.dispatch('showSummaryColumn', 'av-value')
  }
}
</script>
<style lang="scss" scoped>
@import '~/assets/scss/variables.scss';

.column-selector-wrapper {
  position: relative;

  .column-selector {
    padding: 0 4px;
    small {
      display: block;
    }
  }
}
</style>

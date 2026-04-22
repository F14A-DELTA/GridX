<template>
  <div
    ref="globe"
    class="landing-globe"
  />
</template>

<script>
const TEXTURE_URL = 'https://unpkg.com/three-globe/example/img/earth-dark.jpg'
const COUNTRIES_GEOJSON_URL =
  'https://raw.githubusercontent.com/vasturiano/three-globe/master/example/country-polygons/ne_110m_admin_0_countries.geojson'
const HIGHLIGHT_AUSTRALIA = '#00e5ff'
const OTHER_COUNTRIES = '#aaaaaa'
export default {
  name: 'LandingGlobe',
  data() {
    return {
      globe: null,
      renderer: null,
      scene: null,
      camera: null,
      controls: null,
      animationFrameId: null,
      onResizeHandler: null,
      introStartMs: 0,
      introDurationMs: 5200,
      neutralHoldMs: 900,
      settleRotationY: 0,
      settleRotationX: 0,
      startRotationY: 0,
      startRotationX: 0
    }
  },
  mounted() {
    this.init()
  },
  beforeDestroy() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId)
    }
    if (this.onResizeHandler) {
      window.removeEventListener('resize', this.onResizeHandler)
    }
    if (this.controls && this.controls.dispose) {
      this.controls.dispose()
    }
    if (this.renderer) {
      this.renderer.dispose()
    }
    if (this.$refs.globe && this.renderer && this.renderer.domElement) {
      this.$refs.globe.removeChild(this.renderer.domElement)
    }
  },
  methods: {
    async init() {
      const [{ default: ThreeGlobe }, THREE, { default: TrackballControls }] =
        await Promise.all([
          import('three-globe'),
          import('three'),
          import('three-trackballcontrols')
        ])

      const arcsData = [
        {
          startLat: -33.8688,
          startLng: 151.2093,
          endLat: -37.8136,
          endLng: 144.9631,
          color: ['#00e5ff', '#3b82f6']
        },
        {
          startLat: -33.8688,
          startLng: 151.2093,
          endLat: -27.4698,
          endLng: 153.0251,
          color: ['#00e5ff', '#06b6d4']
        },
        {
          startLat: -37.8136,
          startLng: 144.9631,
          endLat: -34.9285,
          endLng: 138.6007,
          color: ['#3b82f6', '#8b5cf6']
        },
        {
          startLat: -34.9285,
          startLng: 138.6007,
          endLat: -31.9505,
          endLng: 115.8605,
          color: ['#8b5cf6', '#0ea5e9']
        },
        {
          startLat: -27.4698,
          startLng: 153.0251,
          endLat: -12.4634,
          endLng: 130.8456,
          color: ['#06b6d4', '#14b8a6']
        },
        {
          startLat: -12.4634,
          startLng: 130.8456,
          endLat: -31.9505,
          endLng: 115.8605,
          color: ['#14b8a6', '#0ea5e9']
        },
        {
          startLat: -42.8821,
          startLng: 147.3272,
          endLat: -37.8136,
          endLng: 144.9631,
          color: ['#22c55e', '#3b82f6']
        },
        {
          startLat: -35.2809,
          startLng: 149.13,
          endLat: -33.8688,
          endLng: 151.2093,
          color: ['#84cc16', '#00e5ff']
        }
      ]

      this.globe = new ThreeGlobe()
        .globeImageUrl(TEXTURE_URL)
        .atmosphereColor('#aaaaaa')
        .arcsData(arcsData)
        .arcColor('color')
        .arcDashLength(1)
        .arcDashGap(() => Math.random())
        .arcStroke(0.6)
        .arcDashInitialGap(() => Math.random() * 5)
        .arcDashAnimateTime(2000)

      this.loadCountryPolygons()

      this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
      this.scene = new THREE.Scene()
      this.scene.background = null
      this.scene.add(this.globe)
      this.scene.add(new THREE.AmbientLight(0xffffff))
      this.scene.add(new THREE.DirectionalLight(0xffffff, 0.6))

      this.camera = new THREE.PerspectiveCamera()
      this.camera.position.z = 300

      this.$refs.globe.appendChild(this.renderer.domElement)
      this.controls = new TrackballControls(this.camera, this.renderer.domElement)
      this.controls.noZoom = true
      this.controls.noPan = true

      const australiaLng = 134.0
      const startAustraliaLat = 0.0
      const endAustraliaLat = 25.0
      this.settleRotationY = -THREE.MathUtils.degToRad(australiaLng)
      this.settleRotationX = THREE.MathUtils.degToRad(-endAustraliaLat)
      this.startRotationY = this.settleRotationY + Math.PI * 2.2
      this.startRotationX = THREE.MathUtils.degToRad(-startAustraliaLat)
      this.globe.rotation.y = this.startRotationY
      this.globe.rotation.x = this.startRotationX
      this.introStartMs = performance.now()

      this.onResizeHandler = () => this.resize()
      window.addEventListener('resize', this.onResizeHandler)
      this.resize()
      this.animate()
    },
    resize() {
      if (!this.$refs.globe || !this.camera || !this.renderer) {
        return
      }

      const width = this.$refs.globe.clientWidth
      const height = this.$refs.globe.clientHeight

      if (!width || !height) {
        return
      }

      this.camera.aspect = width / height
      this.camera.updateProjectionMatrix()
      this.renderer.setSize(width, height)
    },
    async loadCountryPolygons() {
      try {
        const response = await fetch(COUNTRIES_GEOJSON_URL)
        const countries = await response.json()
        if (!countries || !countries.features || !this.globe) {
          return
        }

        this.globe
          .hexPolygonsData(countries.features)
          .hexPolygonResolution(3)
          .hexPolygonMargin(0.5)
          .hexPolygonColor((feature) =>
            feature.properties && feature.properties.ADMIN === 'Australia'
              ? HIGHLIGHT_AUSTRALIA
              : OTHER_COUNTRIES
          )
      } catch (error) {
        // Keep globe running even if country overlay fails to load.
      }
    },
    animate() {
      if (!this.renderer || !this.scene || !this.camera || !this.controls) {
        return
      }

      const elapsed = performance.now() - this.introStartMs
      const progress = Math.min(elapsed / this.introDurationMs, 1)
      const tiltProgress = Math.min(
        Math.max(
          (elapsed - this.neutralHoldMs) /
            (this.introDurationMs - this.neutralHoldMs),
          0
        ),
        1
      )

      if (progress < 1) {
        const easedY = 1 - Math.pow(1 - progress, 3)
        const easedX = 1 - Math.pow(1 - tiltProgress, 2)
        this.globe.rotation.y =
          this.startRotationY + (this.settleRotationY - this.startRotationY) * easedY
        this.globe.rotation.x =
          this.startRotationX + (this.settleRotationX - this.startRotationX) * easedX
      } else {
        this.globe.rotation.y = this.settleRotationY
        this.globe.rotation.x = this.settleRotationX
      }

      this.renderer.render(this.scene, this.camera)
      this.controls.update()
      this.animationFrameId = requestAnimationFrame(() => this.animate())
    }
  }
}
</script>

<style scoped>
.landing-globe {
  width: 100%;
  height: 100%;
}
</style>
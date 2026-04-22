<template>
  <section class="section">
    <div
      class="container"
      style="max-width: 520px"
    >
      <h1 class="title is-4">Login</h1>
      <p class="subtitle is-6">Use your GridX account to continue.</p>

      <div class="field">
        <label class="label">Email</label>
        <div class="control">
          <input
            v-model.trim="email"
            class="input"
            type="email"
            placeholder="you@example.com"
          >
        </div>
      </div>

      <div class="field">
        <label class="label">Password</label>
        <div class="control">
          <input
            v-model="password"
            class="input"
            type="password"
            placeholder="password"
          >
        </div>
      </div>

      <p
        v-if="error"
        class="has-text-danger mb-3"
      >
        {{ error }}
      </p>

      <div class="buttons">
        <button
          class="button is-primary"
          :class="{ 'is-loading': loading }"
          @click="handleLogin"
        >
          Login
        </button>
        <nuxt-link
          class="button is-light"
          to="/signup"
        >
          Need an account?
        </nuxt-link>
      </div>
    </div>
  </section>
</template>

<script>
import { fetchProfile, signInWithPassword } from '~/services/SupabaseAuth'

const TARGET_PAGE =
  '/energy/nem/?range=7d&interval=30m&view=discrete-time&group=Detailed'

export default {
  data() {
    return {
      email: '',
      password: '',
      loading: false,
      error: ''
    }
  },
  methods: {
    async handleLogin() {
      this.error = ''
      if (!this.email || !this.password) {
        this.error = 'Email and password are required.'
        return
      }
      this.loading = true
      try {
        const session = await signInWithPassword(this.email, this.password)
        if (session && session.user && session.user.id) {
          await fetchProfile(session.user.id)
        }
        this.$router.replace(TARGET_PAGE)
      } catch (err) {
        this.error = err.message || 'Login failed.'
      } finally {
        this.loading = false
      }
    }
  }
}
</script>

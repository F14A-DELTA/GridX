<template>
  <section class="section">
    <div
      class="container"
      style="max-width: 560px"
    >
      <h1 class="title is-4">Create account</h1>
      <p class="subtitle is-6">MVP signup with simple role selection.</p>

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

      <div class="field">
        <label class="label">Display name</label>
        <div class="control">
          <input
            v-model.trim="displayName"
            class="input"
            type="text"
            placeholder="Your name"
          >
        </div>
      </div>

      <div class="field">
        <label class="label">Account type</label>
        <div class="control">
          <label class="radio mr-4">
            <input
              v-model="accountType"
              type="radio"
              value="user"
            >
            Individual
          </label>
          <label class="radio">
            <input
              v-model="accountType"
              type="radio"
              value="org_member"
            >
            Organisation
          </label>
        </div>
      </div>

      <div
        v-if="accountType === 'org_member'"
        class="field"
      >
        <label class="label">Organisation name</label>
        <div class="control">
          <input
            v-model.trim="organisationName"
            class="input"
            type="text"
            placeholder="GridX Trading"
          >
        </div>
      </div>

      <p
        v-if="error"
        class="has-text-danger mb-3"
      >
        {{ error }}
      </p>
      <p
        v-if="info"
        class="has-text-success mb-3"
      >
        {{ info }}
      </p>

      <div class="buttons">
        <button
          class="button is-primary"
          :class="{ 'is-loading': loading }"
          @click="handleSignup"
        >
          Sign up
        </button>
        <nuxt-link
          class="button is-light"
          to="/login"
        >
          Already have an account?
        </nuxt-link>
      </div>
    </div>
  </section>
</template>

<script>
import { fetchProfile, signUpWithPassword } from '~/services/SupabaseAuth'

const TARGET_PAGE =
  '/energy/nem/?range=7d&interval=30m&view=discrete-time&group=Detailed'

export default {
  data() {
    return {
      email: '',
      password: '',
      displayName: '',
      accountType: 'user',
      organisationName: '',
      loading: false,
      error: '',
      info: ''
    }
  },
  methods: {
    async finalizeSession(session) {
      const userId = session && session.user && session.user.id
      if (!userId) {
        this.error = 'Signup succeeded, but user session was not created.'
        return
      }
      await fetchProfile(userId)
      this.$router.replace(TARGET_PAGE)
    },
    async handleSignup() {
      this.error = ''
      this.info = ''
      if (!this.email || !this.password) {
        this.error = 'Email and password are required.'
        return
      }
      if (this.accountType === 'org_member' && !this.organisationName) {
        this.error = 'Organisation name is required for organisation signup.'
        return
      }

      this.loading = true
      try {
        const session = await signUpWithPassword({
          email: this.email,
          password: this.password,
          displayName: this.displayName,
          accountType: this.accountType,
          organisationName: this.organisationName
        })
        await this.finalizeSession(session)
      } catch (err) {
        this.error = err.message || 'Signup failed.'
      } finally {
        this.loading = false
      }
    }
  }
}
</script>

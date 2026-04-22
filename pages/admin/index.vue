<template>
  <section class="section">
    <div
      class="container"
      style="max-width: 980px">
      <h1 class="title is-4">Admin</h1>
      <p class="subtitle is-6">
        Add and manage members in your organisation.
      </p>

      <div class="box">
        <h2 class="title is-6">Add Member</h2>
        <div class="columns is-multiline">
          <div class="column is-4">
            <label class="label">Email</label>
            <input
              v-model.trim="email"
              class="input"
              type="email"
              placeholder="member@example.com">
          </div>
          <div class="column is-4">
            <label class="label">Password</label>
            <input
              v-model="password"
              class="input"
              type="password"
              placeholder="password">
          </div>
          <div class="column is-4">
            <label class="label">Display name</label>
            <input
              v-model.trim="displayName"
              class="input"
              type="text"
              placeholder="Team member name">
          </div>
        </div>
        <button
          class="button is-primary"
          :class="{ 'is-loading': loading }"
          @click="handleAddMember">
          Add member
        </button>
      </div>

      <p
        v-if="error"
        class="has-text-danger mb-3">
        {{ error }}
      </p>
      <p
        v-if="success"
        class="has-text-success mb-3">
        {{ success }}
      </p>

      <div class="box">
        <h2 class="title is-6">Organisation Members</h2>
        <p
          v-if="membersLoading"
          class="is-size-7 mb-2">
          Loading members...
        </p>
        <table
          v-else
          class="table is-fullwidth is-striped is-hoverable is-size-7">
          <thead>
            <tr>
              <th>Display Name</th>
              <th>Email</th>
              <th>Password</th>
              <th>Role</th>
              <th />
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="member in members"
              :key="member.userId">
              <td>
                <input
                  v-model.trim="memberDrafts[member.userId].displayName"
                  class="input is-small"
                  type="text">
              </td>
              <td>{{ member.email }}</td>
              <td>
                <input
                  v-model="memberDrafts[member.userId].password"
                  class="input is-small"
                  type="text"
                  placeholder="Set new password">
              </td>
              <td>
                <div class="select is-small">
                  <select v-model="memberDrafts[member.userId].role">
                    <option value="member">member</option>
                    <option value="admin">admin</option>
                  </select>
                </div>
              </td>
              <td>
                <button
                  class="button is-small is-link"
                  @click="handleSaveMember(member)">
                  Save
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>
</template>

<script>
import {
  createOrganisationMember,
  listOrganisationMembers,
  updateOrganisationMember
} from '~/services/SupabaseAuth'

export default {
  layout: 'main',
  middleware: 'org-admin-only',
  data() {
    return {
      email: '',
      password: '',
      displayName: '',
      loading: false,
      membersLoading: false,
      error: '',
      success: '',
      members: [],
      memberDrafts: {}
    }
  },
  mounted() {
    this.loadMembers()
  },
  methods: {
    async loadMembers() {
      this.membersLoading = true
      try {
        this.members = await listOrganisationMembers()
        this.memberDrafts = this.members.reduce((acc, member) => {
          acc[member.userId] = {
            displayName: member.displayName || '',
            password: '',
            role: member.role || 'member'
          }
          return acc
        }, {})
      } catch (error) {
        this.error = error.message || 'Could not load organisation members.'
      } finally {
        this.membersLoading = false
      }
    },
    async handleSaveMember(member) {
      this.error = ''
      this.success = ''
      const draft = this.memberDrafts[member.userId]
      if (!draft) {
        this.error = 'Member draft not found.'
        return
      }
      try {
        await updateOrganisationMember({
          userId: member.userId,
          displayName: draft.displayName,
          role: draft.role,
          password: draft.password
        })
        draft.password = ''
        this.success = `Updated member: ${member.email}`
        await this.loadMembers()
      } catch (error) {
        this.error = error.message || 'Could not update member.'
      }
    },
    async handleAddMember() {
      this.error = ''
      this.success = ''
      if (!this.email || !this.password || !this.displayName) {
        this.error = 'Email, password, and display name are required.'
        return
      }
      this.loading = true
      try {
        const result = await createOrganisationMember({
          email: this.email,
          password: this.password,
          displayName: this.displayName
        })
        this.success = `Member created: ${result.email}`
        this.email = ''
        this.password = ''
        this.displayName = ''
        await this.loadMembers()
      } catch (error) {
        this.error = error.message || 'Could not create organisation member.'
      } finally {
        this.loading = false
      }
    }
  }
}
</script>

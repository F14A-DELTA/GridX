<template>
  <header>
    <a 
      class="home-link" 
      href="/energy">
      <img
        class="gridx-logo"
        :src="require('~/gridx.png')"
        alt="GridX">
      <span
        v-if="organisationName"
        class="org-name">
        Organisation: {{ organisationName }}
      </span>
    </a>

    <nav :class="{ active: mobileNavActive }">
      <template v-for="link in visibleLinks">
        <button 
          type="button"
          v-if="link.children" 
          :key="`dropdown-${link.name}`"
          class="dropdown"
          @mouseenter="toggleDropdown(link.name)"
          @mouseleave="closeDropdown"
          :class="{ 'is-active': activeDropdown === link.name }"
          v-on-clickaway="closeDropdown"
        >
          <div class="dropdown-trigger">
            <a 
              :class="{ active: checkActive(link.name) }"
              aria-haspopup="true" 
              aria-controls="dropdown-menu">
              <span>{{ link.name }}</span>
              <span class="icon">
                <svg
                  class="dropdown-icon"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  :class="{ 'is-active': activeDropdown === link.name }"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </span>
            </a>
          </div>
          <div
            class="dropdown-menu"
            id="dropdown-menu"
            role="menu">
            <div class="dropdown-content">
              <a 
                v-for="child in link.children"
                :key="child.name"
                :href="child.path"
                :class="{ 'active': child.name === 'Map' && isFacilitiesView }"
                class="dropdown-item">
                {{ child.name }}

                <span
                  v-if="child.name === 'Timeline'"
                  class="beta-badge">Beta</span>
              </a>
            </div>
          </div>
        </button>

        <a 
          v-else
          :key="`link-${link.name}`"
          :href="link.path"
          :class="{ active: checkActive(link.name) }">
          {{ link.name }}
        </a>
      </template>
      <button
        type="button"
        class="logout-button"
        @click="handleLogout">
        Logout
      </button>
    </nav>

    <BurgerButton 
      class="mobile-nav"
      :active="mobileNavActive" 
      @click="() => mobileNavActive = !mobileNavActive" />

  </header>
</template>

<script>
import {mapGetters} from 'vuex';
import { mixin as clickaway } from 'vue-clickaway';
import BurgerButton from './BurgerButton.vue';
import { getStoredProfile, signOut, fetchOrganisation } from '~/services/SupabaseAuth';

const topLevelLinks = [
  {
    name: 'Overview',
    path: '/energy',
    active: true
  },
  {
    name: 'Forecasting',
    path: '/forecasting'
  },
  {
    name: 'Solar',
    path: '/solar'
  },
  {
    name: 'Markets',
    path: '/markets'
  },
  {
    name: 'Trading',
    path: '/trading'
  },
  {
    name: 'Admin',
    path: '/admin'
  }
];

export default {
  mixins: [clickaway],
  components: {
    BurgerButton
  },

  data() {
    return {
      links: topLevelLinks,
      activeDropdown: null,
      organisationName: '',
      canAccessAdmin: false,
      canAccessTrading: false
    };
  },

  computed: {
    ...mapGetters({
      isEnergyView: 'isEnergyView'
    }),
    mobileNavActive: {
      get() {
        return this.$store.state.app.mobileNavActive;
      },
      set(value) {
        this.$store.commit('app/mobileNavActive', value);
      }
    },
    visibleLinks() {
      return this.links.filter((link) => {
        if (link.name === 'Admin') {
          return this.canAccessAdmin
        }
        if (link.name === 'Trading') {
          return this.canAccessTrading
        }
        return true
      });
    }
  },
  mounted() {
    this.loadOrganisationName();
  },

  methods: {
    checkActive(name) {
      if (this.isEnergyView && name === 'Overview') {
        return true;
      } else if (
        name === 'Forecasting' &&
        this.$route.path.startsWith('/forecasting')
      ) {
        return true;
      } else if (
        name === 'Solar' &&
        this.$route.path.startsWith('/solar')
      ) {
        return true;
      } else if (
        name === 'Markets' &&
        this.$route.path.startsWith('/markets')
      ) {
        return true;
      } else if (
        name === 'Trading' &&
        this.$route.path.startsWith('/trading')
      ) {
        return true;
      } else if (
        name === 'Admin' &&
        this.$route.path.startsWith('/admin')
      ) {
        return true;
      } 
      return false
    },
    toggleDropdown(name) {
      this.activeDropdown = this.activeDropdown === name ? null : name;
    },
    closeDropdown() {
      this.activeDropdown = null;
    },
    handleLogout() {
      signOut();
      window.location.href = '/';
    },
    async loadOrganisationName() {
      const profile = getStoredProfile();
      if (!profile || profile.account_type !== 'org_member' || !profile.org_id) {
        this.organisationName = '';
        this.canAccessAdmin = false;
        this.canAccessTrading = false;
        return;
      }
      this.canAccessAdmin = profile.role === 'admin';
      this.canAccessTrading = true;
      try {
        const organisation = await fetchOrganisation(profile.org_id);
        this.organisationName = organisation && organisation.name ? organisation.name : '';
      } catch (error) {
        this.organisationName = '';
      }
    }
  }
}
</script>

<style lang="scss" scoped>
@import '~/assets/scss/variables.scss';

header {
  background-color: #fff;
  border-bottom: 1px solid $border-colour;
  padding: 1rem 30px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: relative;
  z-index: 1000;
  height: 70px;

  .home-link {
    display: flex;
    align-items: center;
  }

  .gridx-logo {
    height: 64px;
    width: auto;
    display: block;
  }

  .org-name {
    margin-left: 0.75rem;
    font-size: 14px;
    font-weight: 700;
    color: #2f2f2f;
    white-space: nowrap;
  }

  @media screen and (max-width: 1036px) {
    position: sticky;
    top: 0;
    left: 0;
    right: 0;
    padding: 20px;
    border-bottom: 0;
    z-index: 1000;
  }
}

nav {
  display: flex;
  justify-content: space-between;
  gap: 40px;

  @media screen and (max-width: 1036px) {
    flex-direction: column;
    gap: 20px;
    position: fixed;
    justify-content: flex-start;
    top: 70px;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 1001;
    background-color: #fff;
    font-weight: 500;
    font-size: 20px;
    padding: 20px;
    display: none;

    &.active {
      display: flex;
    }
  }

  a {
    display: flex;
    align-items: center;
    font-weight: 500;
    color: #6A6A6A;

    &:hover {
      text-decoration: underline;

      .icon {
        text-decoration: none;
      }
    }

    // &::after {
    //   content: "";
    //   display: block;
    //   width: 8px;
    //   height: 8px;
    //   border: .1rem solid #000000;
    //   margin-left: 10px;
    //   opacity: 0;
    // }
  }

  a.active {
    font-weight: 700;
    color: #000;

    /** &::after {
      border-color: #c74523;
      background-color: #c74523;
      opacity: 1;
    }*/
  }
}

.mobile-nav {
  display: none;
  @media screen and (max-width: 1036px) {
    display: block;
  }
}

.beta-badge {
  background-color: #e87809;
  color: #fff;
  font-size: 8px;
  font-weight: 700;
  padding: 2px 4px;
  border-radius: 0.5rem;
  text-transform: lowercase;
  font-family: $font-stack;
}

.logout-button {
  background: transparent;
  border: 0;
  color: #6A6A6A;
  font-weight: 500;
  cursor: pointer;
  padding: 0;
  font-size: 1rem;

  &:hover {
    text-decoration: underline;
  }
}

  .dropdown {
    background-color: transparent;
    border: 0;
    padding: 0;
    margin: 0;
    cursor: pointer;

    .dropdown-trigger {
      a {
        gap: 0.2rem;
      }
      
      .dropdown-icon {
        transition: transform 0.2s ease;
        &.is-active {
          transform: rotate(180deg);
        }
      }
    }

    .dropdown-menu { 
      min-width: 7.5rem;

      .dropdown-content {
        width: 9rem;
        padding: 0;
        background-color: #fff;
        border-radius: 0.625rem;
        border: 1px solid #F1F0ED;
        box-shadow: 0 1px 0 0 rgba(10, 10, 10, 0.1);
      }

      .dropdown-item {
        display: flex;
        justify-content: space-between;
        width: auto;
        padding: 0.55rem 1rem;
        font-size: 1rem;
        color: #4a4a4a;
        border-bottom: 1px solid #F1F0ED;

        &:last-child {
          border-bottom: 0;
        }
        
        &:hover {
          text-decoration: none;
          background-color: #f5f5f5;
        }
      }
    }
  }

  @media screen and (max-width: 1036px) {
    .dropdown {
      width: 100%;
      display: block;

      .dropdown-trigger {
        width: 100%;
        a {
          width: 100%;
          justify-content: start;
          font-size: 20px;
        }
      }

      .dropdown-menu {
        position: static;
        width: 100%;
        display: none;

        .dropdown-content {
          box-shadow: none;
          padding: 0;
          width: 100%;
          margin-top: 0.5rem;
        }

        .dropdown-item {
          font-size: 16px;
          justify-content: start;
          gap: 1rem;
        }
      }

      

      &.is-active .dropdown-menu {
        display: block;
      }
    }
  }
</style>
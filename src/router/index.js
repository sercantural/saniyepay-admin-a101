import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/auth/LoginView.vue'),
    meta: { guest: true },
  },
  {
    path: '/two-factor-challenge',
    name: 'TwoFactorChallenge',
    component: () => import('@/views/auth/TwoFactorChallengeView.vue'),
    meta: { guest: true },
  },
  {
    path: '/',
    component: () => import('@/layouts/AppLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'Home',
        component: () => import('@/views/HomeView.vue'),
      },
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/DashboardView.vue'),
      },
      {
        path: 'transactions/deposits',
        name: 'Deposits',
        component: () => import('@/views/transactions/DepositListView.vue'),
      },
      {
        path: 'transactions/withdrawals',
        name: 'Withdrawals',
        component: () => import('@/views/transactions/WithdrawalListView.vue'),
      },
      {
        path: 'transactions/:id',
        name: 'TxnDetail',
        component: () => import('@/views/transactions/TransactionDetailView.vue'),
      },
      {
        path: 'bank-accounts',
        name: 'BankAccounts',
        component: () => import('@/views/bank-accounts/BankAccountListView.vue'),
      },
      {
        path: 'users',
        name: 'Users',
        component: () => import('@/views/users/UserListView.vue'),
      },
      {
        path: 'team',
        name: 'Team',
        component: () => import('@/views/team/TeamView.vue'),
      },
      {
        path: 'sub-groups',
        name: 'SubGroups',
        component: () => import('@/views/SubGroupView.vue'),
      },
      {
        path: 'merchants',
        name: 'Merchants',
        component: () => import('@/views/MerchantView.vue'),
      },
      {
        path: 'api-logs',
        name: 'ApiLogs',
        component: () => import('@/views/ApiLogView.vue'),
      },
      {
        path: 'reports',
        name: 'Reports',
        component: () => import('@/views/ReportsView.vue'),
      },
      {
        path: 'settings/profile',
        name: 'ProfileSettings',
        component: () => import('@/views/settings/ProfileSettingsView.vue'),
      },
      {
        path: 'settings/platform',
        name: 'PlatformSettings',
        component: () => import('@/views/settings/PlatformSettingsView.vue'),
        meta: { superAdmin: true },
      },
      {
        path: 'settlements',
        name: 'Settlements',
        component: () => import('@/views/SettlementView.vue'),
        meta: { permission: 'settlement.handle' },
      },
      {
        path: 'company-wallets',
        name: 'CompanyWallets',
        component: () => import('@/views/CompanyWalletsView.vue'),
      },
      {
        path: 'teslimler',
        name: 'Teslimler',
        component: () => import('@/views/TeslimView.vue'),
      },
      {
        path: 'proposals',
        name: 'Proposals',
        component: () => import('@/views/proposals/ProposalListView.vue'),
      },
      {
        path: 'proposals/new',
        name: 'ProposalCreate',
        component: () => import('@/views/proposals/ProposalFormView.vue'),
      },
      {
        path: 'proposals/:id',
        name: 'ProposalDetail',
        component: () => import('@/views/proposals/ProposalDetailView.vue'),
      },
      {
        path: 'proposals/:id/edit',
        name: 'ProposalEdit',
        component: () => import('@/views/proposals/ProposalFormView.vue'),
      },
      {
        path: 'clock-tracking',
        name: 'ClockTracking',
        component: () => import('@/views/ClockTrackingView.vue'),
      },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

let fetchMePromise = null

router.beforeEach(async (to) => {
  const auth = useAuthStore()

  if (to.meta.requiresAuth && !auth.isLoggedIn) {
    if (!localStorage.getItem('auth_token')) {
      return '/login'
    }
    try {
      // Deduplicate concurrent fetchMe calls (e.g. rapid navigation)
      if (!fetchMePromise) {
        fetchMePromise = auth.fetchMe().finally(() => { fetchMePromise = null })
      }
      await fetchMePromise
    } catch {
      localStorage.removeItem('auth_token')
      return '/login'
    }
  }

  if (to.meta.guest && auth.isLoggedIn) {
    return '/'
  }

  if (to.meta.permission && !auth.isSuperAdmin && !auth.can(to.meta.permission)) {
    return '/'
  }
})

export default router

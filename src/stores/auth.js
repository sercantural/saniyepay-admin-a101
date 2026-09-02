import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/plugins/axios'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const permissions = ref([])
  const assignableRoles = ref([])
  const twoFactorEnabled = ref(false)

  // Bildirim tercihleri sunucudan geliyor (/portal/me ve /portal/login).
  // Burada tutuluyor cunku tercih kullaniciya ait ve oturum acilir acilmaz
  // gerekiyor: notifications store'u ilk bildirimde bunu okuyor, dolayisiyla
  // ayri bir istek beklemeye vakit yok. Varsayilan ikisi de acik -- sunucu
  // alani hic gondermezse (eski surum) bildirimler susmasin.
  const notificationPreferences = ref({ sound: true, toast: true })

  // 2FA challenge state
  const twoFactorRequired = ref(false)
  const challengeToken = ref(null)

  // Clock state
  const isClockedIn = ref(false)
  const clockInAt = ref(null)

  const isLoggedIn = computed(() => !!user.value)
  const isSuperAdmin = computed(() =>
    user.value?.roles?.some((r) => r.name === 'super_admin')
  )

  // Non-super-admin must clock in to access data
  const needsClockIn = computed(() =>
    isLoggedIn.value && !isSuperAdmin.value && !isClockedIn.value
  )

  const can = (perm) => permissions.value.includes(perm)

  async function login(email, password) {
    const { data } = await api.post('/portal/login', { email, password })

    if (data.two_factor) {
      twoFactorRequired.value = true
      challengeToken.value = data.challenge_token
      return { twoFactor: true }
    }

    localStorage.setItem('auth_token', data.token)
    setAuthData(data)
    return { twoFactor: false }
  }

  async function verifyTwoFactor(code, isRecoveryCode = false) {
    const payload = {
      challenge_token: challengeToken.value,
      ...(isRecoveryCode ? { recovery_code: code } : { code }),
    }

    const { data } = await api.post('/portal/two-factor-challenge', payload)
    twoFactorRequired.value = false
    challengeToken.value = null
    localStorage.setItem('auth_token', data.token)
    setAuthData(data)
  }

  async function fetchMe() {
    const { data } = await api.get('/portal/me')
    setAuthData(data)
  }

  async function logout() {
    // Clock out before logging out
    if (isClockedIn.value && !isSuperAdmin.value) {
      try { await api.post('/portal/clock-out') } catch {}
    }
    try { await api.post('/portal/logout') } catch {}
    localStorage.removeItem('auth_token')
    clearAuth()
  }

  // ── Clock In/Out ──

  async function clockIn() {
    const { data } = await api.post('/portal/clock-in')
    isClockedIn.value = true
    clockInAt.value = data.clock_in_at
  }

  async function clockOut() {
    try {
      await api.post('/portal/clock-out')
    } catch {}
    isClockedIn.value = false
    clockInAt.value = null
  }

  function setAuthData(data) {
    user.value = data.user
    permissions.value = data.permissions
    assignableRoles.value = data.assignable_roles || []
    twoFactorEnabled.value = data.two_factor_enabled || false
    isClockedIn.value = data.is_clocked_in ?? false
    clockInAt.value = data.clock_in_at ?? null
    setNotificationPreferences(data.notification_preferences)
  }

  // Tercihleri tek yerden yaziyoruz ki hem oturum yaniti hem de profil
  // ekranindaki PUT sonrasi ayni normalizasyondan gecsin. Eksik/bozuk alan
  // "acik" kabul ediliyor: bildirimlerin sessizce kaybolmasi, gereksiz
  // bildirim gormekten cok daha pahali bir hata.
  function setNotificationPreferences(prefs) {
    notificationPreferences.value = {
      sound: prefs?.sound ?? true,
      toast: prefs?.toast ?? true,
    }
  }

  function clearAuth() {
    user.value = null
    permissions.value = []
    assignableRoles.value = []
    twoFactorEnabled.value = false
    twoFactorRequired.value = false
    challengeToken.value = null
    isClockedIn.value = false
    clockInAt.value = null
    notificationPreferences.value = { sound: true, toast: true }
  }

  return {
    user, permissions, assignableRoles, twoFactorEnabled,
    twoFactorRequired, challengeToken,
    isClockedIn, clockInAt, needsClockIn,
    notificationPreferences, setNotificationPreferences,
    isLoggedIn, isSuperAdmin,
    can, login, verifyTwoFactor, fetchMe, logout,
    clockIn, clockOut,
  }
})

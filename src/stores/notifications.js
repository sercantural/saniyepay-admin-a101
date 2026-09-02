import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'

export const useNotificationStore = defineStore('notifications', () => {
  const notifications = ref([])
  const showToast = ref(false)
  const toastData = ref(null)
  const maxNotifications = 50

  const unreadCount = computed(() => notifications.value.filter(n => !n.read).length)

  function addNotification({ title, message, type, referenceCode, txnId, icon, color, extra }) {
    const notification = {
      id: Date.now() + Math.random(),
      title,
      message,
      type,
      referenceCode,
      txnId,
      icon: icon || (type === 'deposit' ? 'mdi-plus-circle' : type === 'withdrawal' ? 'mdi-minus-circle' : 'mdi-bell'),
      color: color || (type === 'deposit' ? 'success' : type === 'withdrawal' ? 'info' : 'primary'),
      timestamp: new Date().toISOString(),
      read: false,
      extra: extra || null,
    }

    // Kayit HER ZAMAN listeye dusuyor. Tercihler yalnizca "dikkat cekme"
    // kanallarini (ekran karti + ses) kapatiyor; gecmisi de kapatsaydi
    // operator sesi kapattigi an gelen isi bir daha goremezdi. Zil
    // simgesindeki okunmamis sayaci da bu sayede calismaya devam ediyor.
    notifications.value.unshift(notification)

    if (notifications.value.length > maxNotifications) {
      notifications.value = notifications.value.slice(0, maxNotifications)
    }

    // Auth store'a burada erisiyoruz (modul tepesinde degil): Pinia store'lari
    // ancak app kurulduktan sonra ornekleniyor, cagri aninda okumak dongusel
    // bagimlilik riskini de ortadan kaldiriyor.
    const prefs = useAuthStore().notificationPreferences

    if (prefs?.toast !== false) {
      toastData.value = notification
      showToast.value = true
    }

    if (prefs?.sound !== false) {
      playAlertSound()
    }
  }

  function markAllRead() {
    notifications.value.forEach(n => n.read = true)
  }

  function markRead(id) {
    const n = notifications.value.find(n => n.id === id)
    if (n) n.read = true
  }

  function clearAll() {
    notifications.value = []
  }

  /**
   * Plays a 5-second repeating alert tone that sounds like a proper warning notification.
   * Uses Web Audio API — no external audio files needed.
   * Pattern: 3 short urgent beeps, pause, repeat twice more (total ~5 seconds)
   */
  function playAlertSound() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      const now = ctx.currentTime

      // Create a master gain node to control overall volume
      const masterGain = ctx.createGain()
      masterGain.gain.setValueAtTime(0.25, now)
      masterGain.connect(ctx.destination)

      // Schedule 3 rounds of beeps across ~5 seconds
      const rounds = [
        { start: 0 },      // Round 1: 0.0s
        { start: 1.6 },    // Round 2: 1.6s
        { start: 3.2 },    // Round 3: 3.2s
      ]

      rounds.forEach(round => {
        // Each round: 3 quick beeps
        for (let i = 0; i < 3; i++) {
          const beepStart = now + round.start + (i * 0.35)
          const beepEnd = beepStart + 0.18

          // Main tone — high pitch warning
          const osc1 = ctx.createOscillator()
          const gain1 = ctx.createGain()
          osc1.type = 'sine'
          osc1.frequency.setValueAtTime(1200, beepStart) // High alert tone
          osc1.frequency.setValueAtTime(900, beepStart + 0.09) // Drop pitch for urgency
          gain1.gain.setValueAtTime(0, beepStart)
          gain1.gain.linearRampToValueAtTime(0.8, beepStart + 0.02) // Quick attack
          gain1.gain.setValueAtTime(0.8, beepEnd - 0.03)
          gain1.gain.linearRampToValueAtTime(0, beepEnd) // Quick release
          osc1.connect(gain1)
          gain1.connect(masterGain)
          osc1.start(beepStart)
          osc1.stop(beepEnd + 0.01)

          // Harmonic overlay — adds richness
          const osc2 = ctx.createOscillator()
          const gain2 = ctx.createGain()
          osc2.type = 'triangle'
          osc2.frequency.setValueAtTime(1800, beepStart)
          osc2.frequency.setValueAtTime(1350, beepStart + 0.09)
          gain2.gain.setValueAtTime(0, beepStart)
          gain2.gain.linearRampToValueAtTime(0.3, beepStart + 0.02)
          gain2.gain.setValueAtTime(0.3, beepEnd - 0.03)
          gain2.gain.linearRampToValueAtTime(0, beepEnd)
          osc2.connect(gain2)
          gain2.connect(masterGain)
          osc2.start(beepStart)
          osc2.stop(beepEnd + 0.01)
        }
      })

      // Final long tone at the end — confirmation/attention
      const finalStart = now + 4.4
      const finalEnd = finalStart + 0.5
      const oscFinal = ctx.createOscillator()
      const gainFinal = ctx.createGain()
      oscFinal.type = 'sine'
      oscFinal.frequency.setValueAtTime(1000, finalStart)
      gainFinal.gain.setValueAtTime(0, finalStart)
      gainFinal.gain.linearRampToValueAtTime(0.6, finalStart + 0.03)
      gainFinal.gain.setValueAtTime(0.6, finalEnd - 0.15)
      gainFinal.gain.exponentialRampToValueAtTime(0.001, finalEnd)
      oscFinal.connect(gainFinal)
      gainFinal.connect(masterGain)
      oscFinal.start(finalStart)
      oscFinal.stop(finalEnd + 0.01)

      // Clean up audio context after sound finishes
      setTimeout(() => ctx.close(), 6000)
    } catch {
      // Audio not supported or blocked by browser autoplay policy
    }
  }

  return {
    notifications,
    unreadCount,
    showToast,
    toastData,
    addNotification,
    markAllRead,
    markRead,
    clearAll,
  }
})

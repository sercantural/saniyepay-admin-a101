<template>
  <div class="home">
    <!-- ── Hero strip ────────────────────────────────────────────────
         Welcome + Time + Shift status combined into ONE compact strip
         so the page leads with actionable content (action items + KPIs)
         instead of three rows of dashboard chrome. -->
    <div class="hero-strip mb-4">
      <div class="hero-glow hero-glow-1" />
      <div class="hero-glow hero-glow-2" />

      <!-- Greeting -->
      <div class="hero-greet">
        <div class="hero-greet-line">{{ greeting }},</div>
        <div class="hero-greet-name">{{ auth.user?.name }}</div>
        <div class="hero-greet-role">{{ roleName }}</div>
      </div>

      <div class="hero-divider" />

      <!-- Live Istanbul time -->
      <div class="hero-meta">
        <div class="hero-meta-icon hero-meta-icon--time"><v-icon size="20" color="white">mdi-clock-outline</v-icon></div>
        <div class="hero-meta-body">
          <div class="hero-meta-label">Türkiye Saati</div>
          <div class="hero-meta-big">{{ currentTime }}</div>
          <div class="hero-meta-sub">{{ currentDate }}</div>
        </div>
      </div>

      <!-- Shift status + duration -->
      <div class="hero-meta">
        <div class="hero-meta-icon" :class="isActive ? 'hero-meta-icon--active' : 'hero-meta-icon--inactive'">
          <v-icon size="20" color="white">{{ isActive ? 'mdi-account-check' : 'mdi-account-clock' }}</v-icon>
        </div>
        <div class="hero-meta-body">
          <div class="hero-meta-label">Mesai</div>
          <div class="hero-meta-big" :style="isActive ? 'color: var(--sp-accent-success-bright)' : 'color: var(--sp-accent-error)'">
            {{ isActive ? 'Aktif' : 'Pasif' }}
          </div>
          <div v-if="auth.isClockedIn && elapsedTime" class="hero-meta-sub">{{ elapsedTime }} · giriş {{ formatTime(auth.clockInAt) }}</div>
          <div v-else-if="auth.isSuperAdmin" class="hero-meta-sub">Süper Yönetici · sınırsız</div>
          <div v-else class="hero-meta-sub">Mesaiye başlamak için giriş yapın</div>
        </div>
      </div>

    </div>

    <!-- Action Required — clickable cards driven by pending counts +
         current credit. Hidden if there's nothing actionable. -->
    <div v-if="actionItems.length" class="action-banner mb-5">
      <router-link
        v-for="a in actionItems"
        :key="a.key"
        :to="a.to"
        class="action-card"
        :class="`action-card--${a.tone}`"
      >
        <div class="action-card-icon">
          <v-icon size="22">{{ a.icon }}</v-icon>
        </div>
        <div class="action-card-text">
          <div class="action-card-title">{{ a.title }}</div>
          <div class="action-card-sub">{{ a.sub }}</div>
        </div>
        <v-icon size="20" class="action-card-arrow">mdi-chevron-right</v-icon>
      </router-link>
    </div>

    <!-- ── Özet ──────────────────────────────────────────────────────
         Period filter sits on its own row so it stays prominent on
         every viewport (used to crowd the section title). -->
    <div class="summary-header mb-3">
      <div>
        <div class="section-title">Özet</div>
        <div class="section-sub">{{ periodSubtitle }}</div>
      </div>
      <div class="period-filter">
        <v-btn
          v-for="opt in periodOptions"
          :key="opt.value"
          :variant="period === opt.value ? 'flat' : 'tonal'"
          :color="period === opt.value ? 'primary' : undefined"
          size="small"
          rounded="lg"
          class="period-btn"
          @click="setPeriod(opt.value)"
        >{{ opt.label }}</v-btn>
        <v-menu v-model="customMenu" :close-on-content-click="false" location="bottom end">
          <template #activator="{ props }">
            <v-btn
              v-bind="props"
              :variant="period === 'custom' ? 'flat' : 'tonal'"
              :color="period === 'custom' ? 'primary' : undefined"
              size="small"
              rounded="lg"
              class="period-btn"
            >
              <v-icon start size="16">mdi-calendar</v-icon>
              {{ period === 'custom' && customLabel ? customLabel : 'Özel' }}
            </v-btn>
          </template>
          <v-card min-width="280" class="pa-3">
            <v-text-field
              v-model="customFrom"
              label="Başlangıç"
              type="date"
              density="compact"
              variant="outlined"
              hide-details
              class="mb-2"
            />
            <v-text-field
              v-model="customTo"
              label="Bitiş"
              type="date"
              density="compact"
              variant="outlined"
              hide-details
              class="mb-3"
            />
            <v-btn block color="primary" size="small" @click="applyCustom">Uygula</v-btn>
          </v-card>
        </v-menu>
      </div>
    </div>

    <!-- Tier 1: Hacim — primary KPIs (Yatırım, Çekim, Teslim).
         Bigger numbers, accent borders so operators see the day's headline
         volumes before anything else. -->
    <div class="tier-label">Hacim</div>
    <div class="tier-grid tier-grid--primary mb-4">
      <div v-for="w in primaryCards" :key="w.key" class="widget-card widget-card--primary">
        <div class="widget-icon" :style="{ background: w.gradient }">
          <v-icon size="24" color="white">{{ w.icon }}</v-icon>
        </div>
        <div class="widget-body">
          <div class="widget-label">{{ w.label }}</div>
          <div class="widget-value widget-value--primary" :class="signClass(w)">
            <template v-if="widgetsLoading"><v-progress-circular indeterminate size="20" width="2" /></template>
            <template v-else>{{ displayValue(w) }}</template>
          </div>
          <div v-if="widgetSub(w)" class="widget-sub" :class="signClass(w)">{{ widgetSub(w) }}</div>
        </div>
      </div>
    </div>

    <!-- Tier 2: Komisyon — three commission cards in a 3-up grid. -->
    <div class="tier-label">Komisyon</div>
    <div class="tier-grid tier-grid--secondary mb-4">
      <div v-for="w in commissionCards" :key="w.key" class="widget-card">
        <div class="widget-icon" :style="{ background: w.gradient }">
          <v-icon size="20" color="white">{{ w.icon }}</v-icon>
        </div>
        <div class="widget-body">
          <div class="widget-label">{{ w.label }}</div>
          <div class="widget-value" :class="signClass(w)">
            <template v-if="widgetsLoading"><v-progress-circular indeterminate size="18" width="2" /></template>
            <template v-else>{{ displayValue(w) }}</template>
          </div>
          <div v-if="widgetSub(w)" class="widget-sub" :class="signClass(w)">{{ widgetSub(w) }}</div>
        </div>
      </div>
    </div>

    <!-- Tier 3: Bakiye — Devir, Mevcut/Dönem Sonu Kredi, Ek İşlemler.
         Status of money on hand for the chosen period. -->
    <div class="tier-label">Bakiye</div>
    <div class="tier-grid tier-grid--secondary mb-5">
      <div v-for="w in balanceCards" :key="w.key" class="widget-card">
        <div class="widget-icon" :style="{ background: w.gradient }">
          <v-icon size="20" color="white">{{ w.icon }}</v-icon>
        </div>
        <div class="widget-body">
          <div class="widget-label">{{ w.label }}</div>
          <div class="widget-value" :class="signClass(w)">
            <template v-if="widgetsLoading"><v-progress-circular indeterminate size="18" width="2" /></template>
            <template v-else>{{ displayValue(w) }}</template>
          </div>
          <div v-if="widgetSub(w)" class="widget-sub" :class="signClass(w)">{{ widgetSub(w) }}</div>
        </div>
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="section-label mb-3">Hızlı Erişim</div>
    <v-row>
      <v-col cols="6" sm="4" md="3" v-if="auth.can('transactions.view.deposit') || auth.isSuperAdmin">
        <v-btn variant="tonal" color="success" block size="large" rounded="lg" :to="{ name: 'Deposits' }">
          <v-icon start>mdi-plus-thick</v-icon> Yatırımlar
        </v-btn>
      </v-col>
      <v-col cols="6" sm="4" md="3" v-if="auth.can('transactions.view.withdrawal') || auth.isSuperAdmin">
        <v-btn variant="tonal" color="info" block size="large" rounded="lg" :to="{ name: 'Withdrawals' }">
          <v-icon start>mdi-minus-thick</v-icon> Çekimler
        </v-btn>
      </v-col>
      <v-col cols="6" sm="4" md="3" v-if="auth.can('bank_accounts.view') || auth.isSuperAdmin">
        <v-btn variant="tonal" block size="large" rounded="lg" :to="{ name: 'BankAccounts' }">
          <v-icon start>mdi-bank-outline</v-icon> Hesaplar
        </v-btn>
      </v-col>
      <v-col cols="6" sm="4" md="3">
        <v-btn variant="tonal" block size="large" rounded="lg" :to="{ name: 'Dashboard' }">
          <v-icon start>mdi-chart-box-outline</v-icon> Genel Bakış
        </v-btn>
      </v-col>
    </v-row>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { roleLabel } from '@/utils/roles'
import { useTransactionStore } from '@/stores/transactions'
import api from '@/plugins/axios'

const auth = useAuthStore()
const router = useRouter()
const txnStore = useTransactionStore()

const currentTime = ref('')
const elapsedTime = ref('')
let timeInterval = null

// --- Period filter + widgets ---
const period = ref('today')
const customFrom = ref('')
const customTo = ref('')
const customMenu = ref(false)
const widgetsLoading = ref(false)
const widgets = ref(null)

const periodOptions = [
  { value: 'today', label: 'Bugün' },
  { value: 'yesterday', label: 'Dün' },
]

const customLabel = computed(() => {
  if (!customFrom.value || !customTo.value) return ''
  const fmt = (s) => new Date(s).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' })
  return `${fmt(customFrom.value)} – ${fmt(customTo.value)}`
})

function setPeriod(value) {
  period.value = value
  fetchWidgets()
}

function applyCustom() {
  if (!customFrom.value || !customTo.value) return
  period.value = 'custom'
  customMenu.value = false
  fetchWidgets()
}

async function fetchWidgets() {
  widgetsLoading.value = true
  try {
    // Compute the period in the OPERATOR's local timezone and ship full
    // ISO datetimes with offset so the server always returns the same
    // calendar day the operator sees on their wall clock — regardless
    // of where the server is hosted.
    const range = computeLocalRange(period.value, customFrom.value, customTo.value)
    const params = { period: period.value }
    if (range) {
      params.from = range.from
      params.to = range.to
    }
    if (period.value === 'custom') {
      // Keep the legacy date-only fields too for any caller that still
      // expects them; harmless when `from`/`to` are also present.
      params.date_from = customFrom.value
      params.date_to = customTo.value
    }
    const { data } = await api.get('/portal/home/widgets', { params })
    widgets.value = data
  } catch (e) {
    widgets.value = null
  } finally {
    widgetsLoading.value = false
  }
}

// Company timezone — all "today/yesterday" filters anchor here so an
// operator in a different TZ still sees the same Istanbul calendar day
// the company operates in. Istanbul has been on a fixed +03:00 offset
// (no DST) since 2016, so the offset is hard-coded for unambiguous
// ISO formatting on the wire.
const COMPANY_TZ = 'Europe/Istanbul'
const COMPANY_TZ_OFFSET = '+03:00'

// Read the current Istanbul date as { year, month, day } from any Date
// object. Uses Intl.DateTimeFormat which honours real TZ rules even
// though we only use it to extract the Y-M-D triple.
function getIstanbulDateParts(d) {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: COMPANY_TZ,
    year: 'numeric', month: '2-digit', day: '2-digit',
  })
  const parts = Object.fromEntries(fmt.formatToParts(d).map((p) => [p.type, p.value]))
  return { y: parts.year, m: parts.month, d: parts.day }
}

// Build a YYYY-MM-DD string from a Date by reading its Istanbul Y-M-D,
// optionally offset by N days (e.g. -1 for yesterday).
function istanbulYmd(d, offsetDays = 0) {
  if (offsetDays !== 0) {
    // Apply the day offset BEFORE pulling the Istanbul Y-M-D so we don't
    // double-shift across midnight.
    d = new Date(d.getTime() + offsetDays * 86400000)
  }
  const { y, m, d: dd } = getIstanbulDateParts(d)
  return `${y}-${m}-${dd}`
}

function computeLocalRange(p, customFrom, customTo) {
  let fromYmd = null
  let toYmd = null
  if (p === 'today') {
    fromYmd = istanbulYmd(new Date())
    toYmd = fromYmd
  } else if (p === 'yesterday') {
    fromYmd = istanbulYmd(new Date(), -1)
    toYmd = fromYmd
  } else if (p === 'custom') {
    if (!customFrom || !customTo) return null
    // Operator-picked YYYY-MM-DD dates are treated as Istanbul calendar
    // dates so "5 May" always means 5 May Istanbul, regardless of the
    // operator's browser timezone.
    fromYmd = customFrom
    toYmd = customTo
  } else {
    return null
  }
  return {
    from: `${fromYmd}T00:00:00${COMPANY_TZ_OFFSET}`,
    to:   `${toYmd}T23:59:59${COMPANY_TZ_OFFSET}`,
  }
}

function formatTry(v) {
  if (v === null || v === undefined) return '—'
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 2 }).format(Number(v))
}

// Signed credit widgets (Devir, Mevcut Kredi) hide the minus sign and show
// the absolute value with a state-specific sub-label so non-technical
// operators read "50.000 TRY ✅ Mevcut Krediniz" instead of "−50.000 TRY".
function displayValue(w) {
  // Credit is now a single non-negative balance — display directly.
  return formatTry(w.value)
}

// Action Required cards — only render conditions that need operator attention.
// Click routes to the right list/page, mostly avoiding the dashboard entirely.
const actionItems = computed(() => {
  const items = []
  const w = widgets.value || {}

  if (txnStore.pendingDepositCount > 0) {
    items.push({
      key: 'pending-deposit',
      title: `${txnStore.pendingDepositCount} bekleyen yatırım talebi`,
      sub: 'Onayınız bekleniyor',
      icon: 'mdi-arrow-down-bold-circle',
      tone: 'success',
      to: { name: 'Deposits' },
    })
  }
  if (txnStore.pendingWithdrawalCount > 0) {
    items.push({
      key: 'pending-withdrawal',
      title: `${txnStore.pendingWithdrawalCount} bekleyen çekim talebi`,
      sub: 'İşlem yapmanız bekleniyor',
      icon: 'mdi-arrow-up-bold-circle',
      tone: 'info',
      to: { name: 'Withdrawals' },
    })
  }
  if (txnStore.pendingTeslimCount > 0) {
    items.push({
      key: 'pending-teslim',
      title: `${txnStore.pendingTeslimCount} teslim onay bekliyor`,
      sub: auth.isSuperAdmin || auth.can('teslim.review')
        ? 'Onayınız bekleniyor'
        : 'Admin onayı bekleniyor',
      icon: 'mdi-clock-outline',
      tone: 'warning',
      to: { name: 'Teslimler' },
    })
  }

  // Credit at zero — operator can't accept any more deposits until they top up
  const credit = Number(w.credit_try ?? 0)
  if (credit === 0) {
    items.push({
      key: 'credit-empty',
      title: 'Kredi limitiniz doldu',
      sub: 'Yeni teslim yaparak kredi açın',
      icon: 'mdi-alert-circle',
      tone: 'warning',
      to: { name: 'Teslimler' },
    })
  }

  return items
})

function widgetSub(w) {
  if (!w.signColor) return w.sub || ''
  const v = Number(w.value || 0)
  if (w.key === 'devir') {
    return v > 0 ? 'Dönem başı krediniz' : 'Dönem başı sıfır'
  }
  // Mevcut Kredi
  return v > 0 ? '✅ Yatırım kabul edebilirsin' : '⚠ Limit doldu — Yeni teslim yapın'
}

// Two-tone coloring: positive = green (capacity), zero = amber (warn).
function signClass(w) {
  if (!w.signColor) return ''
  return Number(w.value) > 0 ? 'is-surety' : 'is-warning'
}

// 5-column layout — each column is a vertical stack of related widgets.
// Desktop (lg+): 5 stacks side by side. The Ek İşlemler column has only
// one card (no commission concept). Devir/Mevcut Kredi pair as the
// running-balance column on the right. Smaller viewports collapse to
// fewer columns; pairs stay together within their stack at all sizes.
const widgetColumns = computed(() => {
  const w = widgets.value || {}
  return [
    {
      key: 'col-deposit',
      cards: [
        {
          key: 'deposit',
          label: 'Yatırım',
          value: w.deposit?.volume ?? 0,
          icon: 'mdi-arrow-down-bold',
          gradient: 'linear-gradient(135deg, var(--sp-accent-success), var(--sp-accent-success-bright))',
          sub: w.deposit ? `${w.deposit.count} işlem` : '',
        },
        {
          key: 'deposit_commission',
          label: 'Yatırım Komisyonu',
          value: w.deposit_commission ?? 0,
          icon: 'mdi-percent',
          gradient: 'linear-gradient(135deg, var(--sp-accent-cyan), var(--sp-accent-cyan))',
        },
      ],
    },
    {
      key: 'col-withdraw',
      cards: [
        {
          key: 'withdraw',
          label: 'Çekim',
          value: w.withdraw?.volume ?? 0,
          icon: 'mdi-arrow-up-bold',
          gradient: 'linear-gradient(135deg, var(--sp-accent-info), var(--sp-accent-info))',
          sub: w.withdraw ? `${w.withdraw.count} işlem` : '',
        },
        {
          key: 'withdraw_commission',
          label: 'Çekim Komisyonu',
          value: w.withdraw_commission ?? 0,
          icon: 'mdi-percent-outline',
          gradient: 'linear-gradient(135deg, var(--sp-accent-info), var(--sp-accent-indigo))',
        },
      ],
    },
    {
      key: 'col-teslim',
      cards: [
        {
          key: 'teslim',
          label: 'Teslim',
          value: w.teslim?.volume ?? 0,
          icon: 'mdi-bitcoin',
          gradient: 'linear-gradient(135deg, var(--sp-accent-orange), var(--sp-accent-orange))',
          sub: w.teslim ? `${w.teslim.count} teslim` : '',
        },
        {
          key: 'teslim_commission',
          label: 'Teslim Komisyonu',
          value: w.teslim_commission ?? 0,
          icon: 'mdi-cash-plus',
          gradient: 'linear-gradient(135deg, var(--sp-accent-purple), var(--sp-accent-purple))',
        },
      ],
    },
    {
      key: 'col-ek',
      cards: [
        {
          key: 'ek_islemler',
          label: 'Ek İşlemler',
          value: w.ek_islemler?.total ?? 0,
          icon: 'mdi-swap-horizontal',
          gradient: 'linear-gradient(135deg, var(--sp-text-dim), var(--sp-text-muted))',
          sub: w.ek_islemler ? `${w.ek_islemler.count} kayıt` : '',
        },
      ],
    },
    {
      key: 'col-credit',
      cards: [
        {
          key: 'devir',
          label: 'Devir',
          value: w.devir_try ?? 0,
          icon: 'mdi-history',
          gradient: 'linear-gradient(135deg, var(--sp-text-dim), var(--sp-text-muted))',
          sub: 'Dönem başı kredi',
          signColor: true,
        },
        // Past-period filter (Dün, custom past day, etc.) → show the
        // closing snapshot ("Dönem Sonu Kredi"). Live period (Bugün) →
        // show the live current credit ("Mevcut Kredi"). Driven by the
        // `is_past_period` flag the widgets endpoint computes from the
        // resolved period_end vs server `now()`.
        w.is_past_period
          ? {
              key: 'closing',
              label: 'Dönem Sonu Kredi',
              value: w.closing_credit_try ?? 0,
              icon: 'mdi-wallet-outline',
              gradient: 'linear-gradient(135deg, var(--sp-accent-purple), var(--sp-accent-purple))',
              sub: 'Seçilen dönemin kapanış bakiyesi',
              signColor: true,
            }
          : {
              key: 'credit',
              label: 'Mevcut Kredi',
              value: w.credit_try ?? 0,
              icon: 'mdi-wallet',
              gradient: 'linear-gradient(135deg, var(--sp-accent-error), var(--sp-accent-error))',
              sub: 'Anlık bakiye',
              signColor: true,
            },
      ],
    },
  ]
})

// Flat card lookup: pull a specific card from widgetColumns. Lets the
// new tiered template surface the same data without changing the
// underlying widget computation logic.
function findCard(colKey, cardKey) {
  const col = widgetColumns.value.find((c) => c.key === colKey)
  return col?.cards.find((c) => c.key === cardKey) || null
}

// Tier 1: primary volume KPIs (Yatırım, Çekim, Teslim).
const primaryCards = computed(() => [
  findCard('col-deposit', 'deposit'),
  findCard('col-withdraw', 'withdraw'),
  findCard('col-teslim', 'teslim'),
].filter(Boolean))

// Tier 2: commission cards (one per type).
const commissionCards = computed(() => [
  findCard('col-deposit', 'deposit_commission'),
  findCard('col-withdraw', 'withdraw_commission'),
  findCard('col-teslim', 'teslim_commission'),
].filter(Boolean))

// Tier 3: balance status. Devir + (Mevcut OR Dönem Sonu, picked by the
// existing widgetColumns logic based on is_past_period) + Ek İşlemler.
const balanceCards = computed(() => {
  const credit = widgetColumns.value.find((c) => c.key === 'col-credit')
  const closing = credit?.cards.find((c) => c.key === 'closing' || c.key === 'credit')
  return [
    findCard('col-credit', 'devir'),
    closing,
    findCard('col-ek', 'ek_islemler'),
  ].filter(Boolean)
})

// Subtitle under the "Özet" section title — clarifies what the numbers
// represent without making the operator hunt for the active period chip.
const periodSubtitle = computed(() => {
  if (period.value === 'today') return 'Türkiye saatine göre bugün'
  if (period.value === 'yesterday') return 'Türkiye saatine göre dün'
  if (period.value === 'custom' && customLabel.value) return `Özel aralık · ${customLabel.value}`
  return 'Seçilen dönem'
})

const isActive = computed(() => auth.isClockedIn || auth.isSuperAdmin)

const currentDate = computed(() =>
  new Date().toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Istanbul' })
)

const greeting = computed(() => {
  const h = new Date().getHours()
  if (h < 6) return 'İyi geceler'
  if (h < 12) return 'Günaydın'
  if (h < 18) return 'İyi günler'
  return 'İyi akşamlar'
})

const roleName = computed(() => roleLabel(auth.user?.roles?.[0] || null))

function formatTime(ts) {
  if (!ts) return '--'
  return new Date(ts).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Istanbul' })
}

function updateTime() {
  currentTime.value = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Europe/Istanbul' })

  if (auth.clockInAt) {
    const diff = Date.now() - new Date(auth.clockInAt).getTime()
    const mins = Math.floor(diff / 60000)
    const hrs = Math.floor(mins / 60)
    const m = mins % 60
    elapsedTime.value = hrs > 0 ? `${hrs} saat ${m} dakika` : `${m} dakika`
  } else {
    elapsedTime.value = ''
  }
}

onMounted(() => {
  updateTime()
  timeInterval = setInterval(updateTime, 1000)
  fetchWidgets()
})
onUnmounted(() => { if (timeInterval) clearInterval(timeInterval) })
</script>

<style scoped>
.welcome-card {
  position: relative;
  padding: 40px 32px;
  border-radius: 0;
  background: var(--sp-card-bg);
  border: 1px solid var(--sp-card-border);
  overflow: hidden;
}
.welcome-glow {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
  filter: blur(80px);
  opacity: 0.4;
}
.welcome-glow-1 {
  width: 300px; height: 300px;
  top: -120px; right: -80px;
  background: rgba(102,241,189, 0.2);
}
.welcome-glow-2 {
  width: 200px; height: 200px;
  bottom: -80px; left: -60px;
  background: rgba(112,169,255, 0.15);
}
.welcome-content {
  position: relative;
  z-index: 1;
}
.welcome-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
}
.welcome-logo {
  height: 72px;
  max-width: 180px;
  object-fit: contain;
  opacity: 0.95;
  flex-shrink: 0;
}
@media (max-width: 600px) {
  .welcome-logo { height: 56px; max-width: 130px; }
}
.welcome-greeting {
  font-size: 14px;
  font-weight: 500;
  color: var(--sp-text-muted);
  margin-bottom: 4px;
}
.welcome-name {
  font-size: 28px;
  font-weight: 900;
  color: var(--sp-text);
  letter-spacing: -0.5px;
  margin-bottom: 4px;
}
.welcome-role {
  font-size: 13px;
  font-weight: 600;
  color: var(--sp-primary);
}

/* Info Cards */
.info-card {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 24px;
  border-radius: 0;
  background: var(--sp-card-bg);
  border: 1px solid var(--sp-card-border);
  height: 100%;
}
.info-card-icon {
  width: 52px; height: 52px;
  border-radius: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.info-card-icon--time { background: linear-gradient(135deg, var(--sp-accent-purple), var(--sp-accent-purple)); }
.info-card-icon--active { background: linear-gradient(135deg, var(--sp-accent-success), var(--sp-accent-success-bright)); }
.info-card-icon--inactive { background: linear-gradient(135deg, var(--sp-accent-error), var(--sp-accent-error)); }
.info-card-icon--shift { background: linear-gradient(135deg, var(--sp-accent-info), var(--sp-accent-info)); }

.info-card-body {
  flex: 1;
  min-width: 0;
}
.info-card-label {
  font-size: 11px;
  font-weight: 700;
  color: var(--sp-text-hint);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 4px;
}
.info-card-big {
  font-size: 24px;
  font-weight: 900;
  color: var(--sp-text);
  letter-spacing: -0.5px;
  line-height: 1.2;
  margin-bottom: 4px;
}
.info-card-sub {
  font-size: 13px;
  font-weight: 500;
  color: var(--sp-text-muted);
}

.info-card-detail {
  margin-top: 6px;
}
.detail-row {
  display: flex;
  justify-content: space-between;
  padding: 4px 0;
}
.detail-key {
  font-size: 13px;
  font-weight: 600;
  color: var(--sp-text-muted);
}
.detail-val {
  font-size: 13px;
  font-weight: 700;
  color: var(--sp-text);
}

.section-label {
  font-size: 12px;
  font-weight: 700;
  color: var(--sp-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* Hero strip — combined greeting + Istanbul time + shift status. One
   compact bar so the actual KPIs land above the fold. */
.hero-strip {
  position: relative;
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 18px 22px;
  border-radius: 0;
  background: var(--sp-card-bg);
  border: 1px solid var(--sp-card-border);
  overflow: hidden;
  flex-wrap: wrap;
}
.hero-glow {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
  filter: blur(70px);
  opacity: 0.35;
}
.hero-glow-1 { width: 240px; height: 240px; top: -100px; right: -70px; background: rgba(102,241,189, 0.22); }
.hero-glow-2 { width: 180px; height: 180px; bottom: -70px; left: -40px; background: rgba(112,169,255, 0.18); }
.hero-greet { position: relative; z-index: 1; min-width: 200px; flex: 1; }
.hero-greet-line {
  font-size: 12px;
  font-weight: 500;
  color: var(--sp-text-muted);
  margin-bottom: 2px;
}
.hero-greet-name {
  font-size: 22px;
  font-weight: 900;
  color: var(--sp-text);
  letter-spacing: -0.4px;
  line-height: 1.15;
}
.hero-greet-role {
  font-size: 12px;
  font-weight: 600;
  color: var(--sp-primary);
  margin-top: 2px;
}
.hero-divider {
  width: 1px;
  align-self: stretch;
  background: var(--sp-card-border);
  position: relative;
  z-index: 1;
}
.hero-meta {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 200px;
  flex: 1;
}
.hero-meta-icon {
  width: 38px; height: 38px;
  border-radius: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.hero-meta-icon--time { background: linear-gradient(135deg, var(--sp-accent-purple), var(--sp-accent-purple)); }
.hero-meta-icon--active { background: linear-gradient(135deg, var(--sp-accent-success), var(--sp-accent-success-bright)); }
.hero-meta-icon--inactive { background: linear-gradient(135deg, var(--sp-accent-error), var(--sp-accent-error)); }
.hero-meta-body { line-height: 1.15; min-width: 0; }
.hero-meta-label {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  color: var(--sp-text-hint);
}
.hero-meta-big {
  font-size: 18px;
  font-weight: 800;
  color: var(--sp-text);
  letter-spacing: -0.2px;
}
.hero-meta-sub {
  font-size: 11px;
  font-weight: 500;
  color: var(--sp-text-muted);
  margin-top: 1px;
}
.hero-logo {
  position: relative; z-index: 1;
  height: 48px;
  max-width: 130px;
  object-fit: contain;
  opacity: 0.92;
  flex-shrink: 0;
  margin-left: auto;
}
@media (max-width: 720px) {
  .hero-divider { display: none; }
  .hero-meta { flex-basis: 100%; }
  .hero-logo { display: none; }
}

/* Section title (used for "Özet"). */
.section-title {
  font-size: 16px;
  font-weight: 800;
  color: var(--sp-text);
  letter-spacing: -0.2px;
}
.section-sub {
  font-size: 11px;
  font-weight: 500;
  color: var(--sp-text-muted);
  margin-top: 2px;
}

/* Tiered widget rows. Same card chrome as before; the new layout pulls
   them into themed groups (Hacim → Komisyon → Bakiye) so operators read
   top-to-bottom in priority order instead of scanning a 5-column grid. */
.tier-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: var(--sp-text-hint);
  margin-bottom: 8px;
  padding-left: 4px;
}
.tier-grid {
  display: grid;
  gap: 14px;
  grid-template-columns: 1fr;
}
@media (min-width: 600px) { .tier-grid { grid-template-columns: repeat(2, 1fr); } }
@media (min-width: 960px) { .tier-grid { grid-template-columns: repeat(3, 1fr); } }
.tier-grid--primary .widget-card {
  padding: 22px 22px;
}

.summary-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
}
.period-filter {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.period-btn {
  text-transform: none !important;
  letter-spacing: 0 !important;
  font-weight: 600 !important;
}

.widget-grid {
  display: grid;
  gap: 16px;
  grid-template-columns: 1fr;
  align-items: start;
}
@media (min-width: 600px) {
  .widget-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (min-width: 960px) {
  .widget-grid { grid-template-columns: repeat(3, 1fr); }
}
@media (min-width: 1264px) {
  .widget-grid { grid-template-columns: repeat(5, 1fr); }
}
.widget-stack {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
}

.widget-card {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 18px 18px;
  border-radius: 0;
  background: var(--sp-card-bg);
  border: 1px solid var(--sp-card-border);
}
.widget-icon {
  width: 44px;
  height: 44px;
  border-radius: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.widget-body {
  flex: 1;
  min-width: 0;
}
.widget-label {
  font-size: 11px;
  font-weight: 700;
  color: var(--sp-text-hint);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 4px;
}
.widget-value {
  font-size: 20px;
  font-weight: 900;
  color: var(--sp-text);
  letter-spacing: -0.3px;
  line-height: 1.2;
  margin-bottom: 2px;
  word-break: break-word;
}
/* Bigger headline for primary-tier KPI cards (Yatırım/Çekim/Teslim). */
.widget-value--primary {
  font-size: 28px;
  letter-spacing: -0.6px;
}
.widget-value.is-surety {
  color: var(--sp-accent-success-bright);
}
.widget-value.is-earnings {
  color: var(--sp-accent-info);
}
.widget-value.is-warning {
  color: var(--sp-accent-amber);
}
.widget-sub.is-surety  { color: var(--sp-accent-success); }
.widget-sub.is-earnings { color: var(--sp-accent-info); }
.widget-sub.is-warning { color: var(--sp-accent-amber); font-weight: 600; }

/* Action Required banner — large clickable cards above the period widgets.
   Each card uses a tone-specific accent border + icon background so the
   operator can scan urgency at a glance. */
.action-banner {
  display: grid;
  gap: 12px;
  grid-template-columns: 1fr;
}
@media (min-width: 600px) { .action-banner { grid-template-columns: repeat(2, 1fr); } }
@media (min-width: 1264px) { .action-banner { grid-template-columns: repeat(3, 1fr); } }

.action-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 18px;
  border-radius: 0;
  background: var(--sp-card-bg);
  border: 1px solid var(--sp-card-border);
  border-left-width: 4px;
  text-decoration: none;
  color: inherit;
  transition: transform 0.12s ease, box-shadow 0.12s ease;
}
.action-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px var(--sp-shadow);
}
.action-card-icon {
  width: 40px; height: 40px;
  border-radius: 0;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
  color: white;
}
.action-card-text { flex: 1; min-width: 0; }
.action-card-title {
  font-size: 14px;
  font-weight: 800;
  letter-spacing: -0.2px;
  color: var(--sp-text);
  line-height: 1.25;
}
.action-card-sub {
  font-size: 12px;
  font-weight: 500;
  color: var(--sp-text-muted);
  margin-top: 2px;
}
.action-card-arrow { color: var(--sp-text-muted); }

.action-card--success { border-left-color: var(--sp-accent-success-bright); }
.action-card--success .action-card-icon { background: var(--sp-accent-success-bright); }
.action-card--info { border-left-color: var(--sp-accent-info); }
.action-card--info .action-card-icon { background: var(--sp-accent-info); }
.action-card--amber { border-left-color: var(--sp-accent-amber); }
.action-card--amber .action-card-icon { background: var(--sp-accent-amber); }
.widget-sub {
  font-size: 12px;
  font-weight: 500;
  color: var(--sp-text-muted);
}

@media (max-width: 600px) {
  .widget-card { padding: 14px; gap: 10px; }
  .widget-icon { width: 38px; height: 38px; border-radius: 0; }
  .widget-value { font-size: 17px; }
}

@media (max-width: 600px) {
  .welcome-card { padding: 28px 20px; }
  .welcome-name { font-size: 22px; }
  .info-card { padding: 18px; gap: 12px; }
  .info-card-icon { width: 44px; height: 44px; }
  .info-card-big { font-size: 20px; }
}
</style>

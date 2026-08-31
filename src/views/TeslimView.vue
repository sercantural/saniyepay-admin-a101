<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import api from '@/plugins/axios'
import { useAuthStore } from '@/stores/auth'
import { useTransactionStore } from '@/stores/transactions'
import { useNotificationStore } from '@/stores/notifications'

const auth = useAuthStore()
const route = useRoute()
const txnStore = useTransactionStore()
const notif = useNotificationStore()

const canReview = computed(() => auth.isSuperAdmin || auth.can('teslim.review'))

const items = ref([])
const operators = ref([])
const loading = ref(false)
const submitting = ref(false)
const acting = ref(false)

const statusFilter = ref('')
const operatorFilter = ref(route.query.operator_id ? Number(route.query.operator_id) : null)
const dateFrom = ref('')
const dateTo = ref('')

// Single non-negative credit balance from the backend — amount the
// platform owes the operator. > 0 = capacity to accept deposits;
// = 0 = limit reached, operator needs to do a new teslim.
const balance = ref({ credit_try: 0 })

const createDialog = ref(false)
const rejectDialog = ref(false)
const selectedItem = ref(null)
const formError = ref('')
const rejectReason = ref('')

const activeWallets = ref([])
const createForm = ref({
  amount_try: null,
  coin: 'USDT',
  network: 'TRC20',
  amount_crypto: null,
  conversion_rate: null,
  crypto_hash: '',
  notes: '',
})

const operatorHeaders = [
  { title: 'ID', key: 'id', width: '72px' },
  { title: 'Tarih', key: 'created_at' },
  { title: 'TRY', key: 'amount_try' },
  { title: 'Kripto', key: 'crypto_summary' },
  { title: 'Kur', key: 'conversion_rate' },
  { title: 'TX Hash', key: 'crypto_hash', sortable: false },
  { title: 'Durum', key: 'status' },
  { title: '', key: 'actions', sortable: false, align: 'end' },
]

const adminHeaders = [
  { title: 'ID', key: 'id', width: '72px' },
  { title: 'Tarih', key: 'created_at' },
  { title: 'Operatör', key: 'operator' },
  { title: 'TRY', key: 'amount_try' },
  { title: 'Kripto', key: 'crypto_summary' },
  { title: 'Kur', key: 'conversion_rate' },
  { title: 'TX Hash', key: 'crypto_hash', sortable: false },
  { title: 'Durum', key: 'status' },
  { title: 'İşlem', key: 'actions', sortable: false, align: 'end' },
]

const headers = computed(() => (canReview.value ? adminHeaders : operatorHeaders))

const statusOptions = [
  { title: 'Hepsi', value: '' },
  { title: 'İşlemde', value: 'pending' },
  { title: 'Onaylandı', value: 'approved' },
  { title: 'Reddedildi', value: 'rejected' },
]

const availableNetworks = computed(() => {
  return activeWallets.value
    .filter(w => w.coin === createForm.value.coin)
    .map(w => w.network)
})

const selectedWallet = computed(() => {
  return activeWallets.value.find(
    w => w.coin === createForm.value.coin && w.network === createForm.value.network
  )
})

// Teslim is a prepaid surety — operator can request any amount; the cash
// check no longer applies (teslim IS the credit injection).
const canCreate = computed(() => {
  const f = createForm.value
  return f.amount_try > 0
    && f.amount_crypto > 0
    && f.conversion_rate > 0
    && f.crypto_hash
    && f.coin && f.network
    && !!selectedWallet.value
    && !rateOutOfBand.value
})

// Brief inline "copied" feedback on the copy button (separate from the
// snackbar so the operator sees the confirmation right at the click site).
const addressCopied = ref(false)
let addressCopiedTimer = null

function copyAddress() {
  if (!selectedWallet.value?.address) return
  navigator.clipboard?.writeText(selectedWallet.value.address)
  // No snackbar — the button itself flips to a green tick for 1.5s,
  // which is the right feedback at the point of click.
  addressCopied.value = true
  if (addressCopiedTimer) clearTimeout(addressCopiedTimer)
  addressCopiedTimer = setTimeout(() => { addressCopied.value = false }, 1500)
}

// QR for the destination wallet — re-uses qrserver.com (the same provider
// used by the 2FA setup view) so we don't need to add a QR JS dependency.
const walletQrUrl = computed(() => {
  const addr = selectedWallet.value?.address
  if (!addr) return ''
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=10&data=${encodeURIComponent(addr)}`
})

// Map a (coin, network) pair to its public block-explorer transaction URL
// so SA can click the hash in the detail modal and pop the chain view in
// a new tab. EVM hashes get a 0x prefix when missing; everything else is
// passed through unchanged.
function explorerTxUrl(coin, network, hash) {
  if (!hash) return null
  const c = (coin || '').toUpperCase()
  const n = (network || '').toUpperCase()
  const evmHash = hash.startsWith('0x') ? hash : '0x' + hash
  // Tron family
  if (c === 'TRX' || n === 'TRC20' || n === 'TRON') return `https://tronscan.org/#/transaction/${hash}`
  // EVM family
  if (n === 'ERC20' || (c === 'ETH' && (n === 'ETH' || n === 'ERC20'))) return `https://etherscan.io/tx/${evmHash}`
  if (n === 'BEP20') return `https://bscscan.com/tx/${evmHash}`
  if (n === 'AVAX-C' || c === 'AVAX') return `https://snowtrace.io/tx/${evmHash}`
  // UTXO + non-EVM
  if (c === 'BTC' || n === 'BTC') return `https://mempool.space/tx/${hash}`
  if (c === 'SOL' || n === 'SOL') return `https://solscan.io/tx/${hash}`
  if (c === 'XRP' || n === 'XRP') return `https://xrpscan.com/tx/${hash}`
  if (c === 'DOGE') return `https://dogechain.info/tx/${hash}`
  return null
}


async function loadList() {
  loading.value = true
  try {
    const params = {}
    if (statusFilter.value) params.status = statusFilter.value
    if (operatorFilter.value) params.operator_id = operatorFilter.value
    if (dateFrom.value) params.date_from = dateFrom.value
    if (dateTo.value) params.date_to = dateTo.value
    const { data } = await api.get('/portal/teslimler', { params })
    items.value = data.data || data
  } catch (e) {
    notif.addNotification({ type: 'error', message: 'Teslim listesi yüklenemedi' })
  } finally {
    loading.value = false
  }
}

async function loadBalance() {
  if (canReview.value && !auth.user?.sub_group_id) {
    // Admin-only user without operator role — skip balance card
    return
  }
  try {
    const { data } = await api.get('/portal/teslimler/balance')
    balance.value = data
  } catch { /* silent */ }
}

async function loadWallets() {
  try {
    const { data } = await api.get('/portal/company-wallets/active')
    activeWallets.value = data
  } catch {
    activeWallets.value = []
  }
}

function openCreate() {
  createForm.value = {
    amount_try: null, coin: 'USDT', network: 'TRC20',
    amount_crypto: null, conversion_rate: null, crypto_hash: '', notes: '',
  }
  formError.value = ''
  hashVerification.value = null
  fetchedRate.value = null
  createDialog.value = true
  // Pre-fill the live rate so operator sees current pricing immediately.
  fetchRate()
}

// In-memory rate cache shared across opens of this dialog. Binance prices
// don't move enough in 5 minutes to matter for teslim, and re-hitting their
// API on every form interaction is wasteful.
const RATE_TTL_MS = 5 * 60 * 1000
const rateCache = new Map() // coin → { rate, fetchedAt }
const ratLoading = ref(false)
const rateFetchedAt = ref(null)
// Last live (Binance) rate — the reference the operator's manual rate
// must stay within ±RATE_TOLERANCE of. Cleared until the first fetch
// succeeds so we don't impose a band when there's no reference.
const fetchedRate = ref(null)
const RATE_TOLERANCE = 0.01 // ±1%

const rateBand = computed(() => {
  const ref = fetchedRate.value
  if (!ref || ref <= 0) return null
  return { min: ref * (1 - RATE_TOLERANCE), max: ref * (1 + RATE_TOLERANCE), ref }
})

const rateOutOfBand = computed(() => {
  const band = rateBand.value
  const r = Number(createForm.value.conversion_rate || 0)
  if (!band || !r) return false
  return r < band.min || r > band.max
})

// Live TX-hash verification — supported across Tron, EVM (ETH/BSC/AVAX),
// BTC, SOL and XRP. The supported set mirrors the backend dispatcher.
const verifyingHash = ref(false)
const hashVerification = ref(null)
const VERIFY_SUPPORTED = new Set([
  'TRX/TRC20', 'TRX/TRX', 'TRX/TRON',
  'USDT/TRC20', 'USDT/ERC20', 'USDT/BEP20', 'USDT/AVAX-C',
  'ETH/ERC20', 'ETH/ETH',
  'AVAX/AVAX-C', 'AVAX/AVAX',
  'BTC/BTC',
  'SOL/SOL',
  'XRP/XRP',
])
const canVerifyHash = computed(() => {
  const key = `${createForm.value.coin}/${createForm.value.network}`
  return VERIFY_SUPPORTED.has(key)
})

const hashVerifyClass = computed(() => {
  if (!hashVerification.value) return ''
  if (hashVerification.value.verified) return 'hash-verify-result--ok'
  if (hashVerification.value.actual)   return 'hash-verify-result--warn'
  return 'hash-verify-result--err'
})

const hashVerifyIcon = computed(() => {
  if (!hashVerification.value) return 'mdi-shield-outline'
  if (hashVerification.value.verified) return 'mdi-shield-check'
  if (hashVerification.value.actual)   return 'mdi-shield-alert-outline'
  return 'mdi-shield-off-outline'
})

function onHashChange() {
  // Editing the hash invalidates the previous verdict.
  hashVerification.value = null
}

function shortenAddr(addr) {
  if (!addr || addr.length < 14) return addr
  return addr.slice(0, 6) + '…' + addr.slice(-6)
}

async function verifyHash() {
  if (!createForm.value.crypto_hash || !canVerifyHash.value) return
  verifyingHash.value = true
  hashVerification.value = null
  try {
    const { data } = await api.post('/portal/teslimler/verify-hash', {
      hash: createForm.value.crypto_hash.trim(),
      coin: createForm.value.coin,
      network: createForm.value.network,
      expected_address: selectedWallet.value?.address || null,
      expected_amount: createForm.value.amount_crypto || null,
    })
    hashVerification.value = data

    // Auto-fill crypto amount from blockchain truth whenever we got a
    // parsed transaction back. Operator's typo gets corrected and the
    // TRY conversion recalculates via the existing watcher. We don't
    // overwrite when there's no actual (e.g. tx not found / network err).
    if (data?.actual?.amount != null && data.actual.amount > 0) {
      const onChain = Number(data.actual.amount)
      if (Number.isFinite(onChain) && onChain > 0) {
        // Mark whether we changed the user's value so the UI can flag it.
        const prev = Number(createForm.value.amount_crypto || 0)
        createForm.value.amount_crypto = onChain
        hashVerification.value = {
          ...data,
          amount_was_updated: Math.abs(prev - onChain) > 0.0000001,
          previous_amount: prev,
        }
      }
    }
  } catch (e) {
    hashVerification.value = {
      verified: false,
      message: e?.response?.data?.message || 'Doğrulama isteği başarısız.',
      actual: null,
      expected: null,
    }
  } finally {
    verifyingHash.value = false
  }
}

const rateAgeSeconds = ref(0)
let rateAgeTimer = null

function refreshRateAge() {
  rateAgeSeconds.value = rateFetchedAt.value
    ? Math.floor((Date.now() - rateFetchedAt.value) / 1000)
    : 0
}

watch(createDialog, (open) => {
  if (open) {
    refreshRateAge()
    rateAgeTimer = setInterval(refreshRateAge, 1000)
  } else if (rateAgeTimer) {
    clearInterval(rateAgeTimer)
    rateAgeTimer = null
  }
})

// Re-fetch when operator picks a different coin (rate is per-coin).
// Also clear the previous coin's reference so the band doesn't apply
// across coins until the new live rate lands.
watch(() => createForm.value.coin, () => {
  fetchedRate.value = null
  if (createDialog.value) fetchRate()
})

async function fetchRate({ force = false } = {}) {
  const coin = createForm.value.coin
  const cached = rateCache.get(coin)
  if (!force && cached && (Date.now() - cached.fetchedAt) < RATE_TTL_MS) {
    createForm.value.conversion_rate = cached.rate
    fetchedRate.value = cached.rate
    rateFetchedAt.value = cached.fetchedAt
    refreshRateAge()
    recalcTry()
    return
  }

  ratLoading.value = true
  try {
    let rate = null
    const r = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${coin}TRY`)
    if (r.ok) {
      const d = await r.json()
      rate = parseFloat(d.price)
    } else {
      const r2 = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=USDTTRY`)
      if (r2.ok) {
        const d = await r2.json()
        rate = parseFloat(d.price)
      }
    }
    if (rate && rate > 0) {
      const fetchedAt = Date.now()
      rateCache.set(coin, { rate, fetchedAt })
      createForm.value.conversion_rate = rate
      fetchedRate.value = rate
      rateFetchedAt.value = fetchedAt
      refreshRateAge()
      recalcTry()
    }
  } catch {
    notif.addNotification({ type: 'warning', message: 'Canlı kur alınamadı. Manuel giriniz.' })
  } finally {
    ratLoading.value = false
  }
}

// Always MM:SS so the hint never reflows as the counter ticks. Combined
// with tabular-nums in CSS, every digit occupies a fixed cell.
function fmtRateAge(seconds) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')} önce`
}

// Operator enters the crypto amount they actually sent on-chain. The TRY
// total is derived from amount_crypto × conversion_rate so they always see
// what their teslim is worth in lira.
function recalcTry() {
  const f = createForm.value
  if (f.amount_crypto > 0 && f.conversion_rate > 0) {
    f.amount_try = parseFloat((f.amount_crypto * f.conversion_rate).toFixed(2))
  }
}

watch(() => createForm.value.amount_crypto, recalcTry)
watch(() => createForm.value.conversion_rate, recalcTry)
// Switching coin/network invalidates the on-chain verdict — clear it so
// stale "verified" state can't carry across to a different blockchain.
watch(() => [createForm.value.coin, createForm.value.network], () => {
  hashVerification.value = null
})

async function submitCreate() {
  submitting.value = true
  formError.value = ''
  try {
    await api.post('/portal/teslimler', createForm.value)
    createDialog.value = false
    await Promise.all([loadList(), loadBalance()])
  } catch (e) {
    formError.value = e?.response?.data?.message || 'Teslim oluşturulamadı'
  } finally {
    submitting.value = false
  }
}

// Approve no longer opens a second confirm dialog. The detail modal
// already shows every relevant fact + auto-runs blockchain verification,
// so the second click was just noise. The inline Onayla button in the
// list's actions column funnels through the same direct path.
async function approveTeslim(item) {
  if (!item) return
  acting.value = true
  try {
    await api.post(`/portal/teslimler/${item.id}/approve`)
    if (detailDialog.value && detailItem.value?.id === item.id) {
      detailDialog.value = false
    }
    await loadList()
  } catch (e) {
    notif.addNotification({ type: 'error', message: e?.response?.data?.message || 'Onaylanamadı' })
  } finally {
    acting.value = false
  }
}

function openReject(item) {
  selectedItem.value = item
  rejectReason.value = ''
  rejectDialog.value = true
}

// ── Detail modal — SA only ─────────────────────────────────────────
const detailDialog = ref(false)
const detailItem = ref(null)
const detailVerifying = ref(false)
const detailVerification = ref(null)
const detailHashCopied = ref(false)
const detailAddrCopied = ref(false)

// Open the detail modal directly for a given item — used by the inline
// Onayla button in the actions column (and by onRowClick below). The
// modal auto-runs blockchain verification and gives the admin the final
// Onayla button after they've reviewed everything.
function openDetailFor(item) {
  if (!canReview.value || !item) return
  detailItem.value = item
  detailVerification.value = null
  detailHashCopied.value = false
  detailAddrCopied.value = false
  detailDialog.value = true
  if (detailCanVerify.value && item.crypto_hash) {
    verifyDetailHash()
  }
}

function onRowClick(event, payload) {
  // Vuetify 3.x emits click:row with (event, { item, internalItem }); be
  // defensive about the payload shape so a future minor-version bump
  // doesn't quietly break the open. Action buttons in the table already
  // use @click.stop so they won't bubble here — no need for an extra
  // closest() guard.
  const item = payload?.item ?? payload?.value ?? payload
  if (!item || typeof item !== 'object') return
  openDetailFor(item)
}

const detailCanVerify = computed(() => {
  if (!detailItem.value) return false
  const key = `${detailItem.value.coin}/${detailItem.value.network}`
  return VERIFY_SUPPORTED.has(key)
})

// Field-level match flags drive the green/red equal/not-equal icons and
// red highlight on the side-by-side compare panel.
const amountMatches = computed(() => {
  const v = detailVerification.value
  if (!v?.actual || v.expected?.amount == null) return true
  return Math.abs(Number(v.actual.amount) - Number(v.expected.amount)) <= 0.01
})
const addressMatches = computed(() => {
  const v = detailVerification.value
  if (!v?.actual || !v.expected?.address) return true
  return String(v.actual.address).trim().toLowerCase() === String(v.expected.address).trim().toLowerCase()
})

// Commission breakdown for the detail modal. When the teslim is already
// approved we show the recorded amount/percent (frozen at approval time
// from operator_fee_amount/percent). When still pending we *estimate*
// using the operator's sub-group teslim_fee_percent so SA can see what
// the credit injection will be before clicking Onayla.
const detailCommission = computed(() => {
  const it = detailItem.value
  if (!it) return null
  const sub = it.subGroup ?? it.sub_group ?? {}
  const tryAmount = Number(it.amount_try || 0)
  const recordedAmt = Number(it.operator_fee_amount || 0)
  const recordedPct = Number(it.operator_fee_percent || 0)
  if (recordedAmt > 0 || recordedPct > 0) {
    return { amount: recordedAmt, percent: recordedPct, isRecorded: true }
  }
  const subPct = Number(sub.teslim_fee_percent || 0)
  if (subPct > 0 && tryAmount > 0) {
    return { amount: (tryAmount * subPct) / 100, percent: subPct, isRecorded: false }
  }
  return null
})

async function verifyDetailHash() {
  if (!detailItem.value || !detailCanVerify.value) return
  detailVerifying.value = true
  detailVerification.value = null
  try {
    const { data } = await api.post('/portal/teslimler/verify-hash', {
      hash: detailItem.value.crypto_hash,
      coin: detailItem.value.coin,
      network: detailItem.value.network,
      expected_address: detailItem.value.destination_address,
      expected_amount: Number(detailItem.value.amount_crypto) || null,
    })
    detailVerification.value = data
  } catch (e) {
    detailVerification.value = {
      verified: false,
      message: e?.response?.data?.message || 'Doğrulama isteği başarısız.',
      actual: null,
      expected: null,
    }
  } finally {
    detailVerifying.value = false
  }
}

function copyDetailHash() {
  if (!detailItem.value?.crypto_hash) return
  navigator.clipboard?.writeText(detailItem.value.crypto_hash)
  detailHashCopied.value = true
  setTimeout(() => { detailHashCopied.value = false }, 1500)
}

function copyDetailAddress() {
  if (!detailItem.value?.destination_address) return
  navigator.clipboard?.writeText(detailItem.value.destination_address)
  detailAddrCopied.value = true
  setTimeout(() => { detailAddrCopied.value = false }, 1500)
}

// Bridge from detail modal → existing approve/reject confirm dialogs.
// Closes the detail modal first so the focused confirm modal owns the
// page; if rejected/approved successfully, the list refresh handles the
// rest via the existing approveTeslim / handleReject paths.
function approveFromDetail() {
  // Direct approve — the detail modal already provided the review screen,
  // including auto-verification, so a second confirmation modal is noise.
  if (detailItem.value) approveTeslim(detailItem.value)
}
function rejectFromDetail() {
  const item = detailItem.value
  detailDialog.value = false
  if (item) openReject(item)
}

async function handleReject() {
  acting.value = true
  try {
    await api.post(`/portal/teslimler/${selectedItem.value.id}/reject`, { reason: rejectReason.value })
    rejectDialog.value = false
    await Promise.all([loadList(), loadBalance()])
  } catch (e) {
    notif.addNotification({ type: 'error', message: e?.response?.data?.message || 'Reddedilemedi' })
  } finally {
    acting.value = false
  }
}

function statusColor(s) {
  return { pending: 'warning', approved: 'success', rejected: 'error' }[s] || 'grey'
}

function statusLabel(s) {
  return { pending: 'İşlemde', approved: 'Onaylandı', rejected: 'Reddedildi' }[s] || s
}

function statusIcon(s) {
  return { pending: 'mdi-clock-outline', approved: 'mdi-check-circle', rejected: 'mdi-close-circle' }[s] || 'mdi-help-circle-outline'
}

function rowProps({ item }) {
  // Clickable cursor for SA so the row reads as actionable.
  const base = canReview.value ? { style: 'cursor: pointer' } : {}
  if (item.status === 'approved') return { ...base, class: 'row-approved' }
  if (item.status === 'rejected') return { ...base, class: 'row-rejected' }
  if (item.status === 'pending') return { ...base, class: 'row-in-progress' }
  return base
}

function fmtAmount(n) {
  return n != null ? new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2 }).format(n) : '--'
}

// Always show the absolute value — the sign meaning is conveyed by the
// label/color/template state above (Kredi Bakiyen / Limit Dolu / Kazandığın
// Komisyon). Operators read minus signs as "I owe money" which is wrong.
function fmtCredit(n) {
  if (n == null) return '--'
  // Credit is a single non-negative balance — display directly. Clamp to 0
  // for the rare over-extended case (admin override).
  return new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2 }).format(Math.max(0, Number(n) || 0))
}

function fmtDate(d) {
  return d ? new Date(d).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' }) : '--'
}

// Hash copy state — keyed by teslim id so multiple rows can flash ✓
// independently after their own copy click without interfering.
const copiedHashId = ref(null)
async function copyHash(item) {
  if (!item.crypto_hash) return
  try {
    await navigator.clipboard.writeText(item.crypto_hash)
    copiedHashId.value = item.id
    setTimeout(() => { if (copiedHashId.value === item.id) copiedHashId.value = null }, 1200)
  } catch { /* clipboard denied — silent */ }
}

watch(() => [statusFilter.value, operatorFilter.value, dateFrom.value, dateTo.value], loadList)
watch(() => txnStore.teslimUpdateTick, () => {
  loadList()
  loadBalance()
})
watch(() => txnStore.transactionUpdateTick, () => loadBalance())

async function loadOperators() {
  if (!canReview.value) return
  try {
    const { data } = await api.get('/portal/users', { params: { per_page: 200 } })
    const list = data.data || data
    operators.value = list
      .filter(u => u.sub_group_id)
      .map(u => ({ id: u.id, name: u.name, title: u.name + (u.sub_group ? ` (${u.sub_group.name})` : '') }))
  } catch {
    operators.value = []
  }
}

onMounted(async () => {
  await Promise.all([loadList(), loadBalance(), loadWallets(), loadOperators()])
})
</script>

<template>
  <v-container fluid class="pa-4 teslim-page">
    <!-- Page header -->
    <div class="page-header">
      <div class="page-header-icon">
        <v-icon size="22" color="white">mdi-hand-coin</v-icon>
      </div>
      <div class="flex-grow-1">
        <div class="page-header-title">Teslim</div>
        <div class="page-header-sub">
          {{ canReview ? 'Operatör teslim taleplerini görüntüle ve onayla.' : 'Şirkete kripto gönderdikten sonra teslim oluştur. Onaylandığında TRY karşılığı krediniz olarak yansır.' }}
        </div>
      </div>
      <v-btn
        v-if="!canReview || auth.user?.sub_group_id"
        color="primary"
        size="large"
        prepend-icon="mdi-plus-thick"
        class="page-header-btn"
        @click="openCreate"
      >
        Yeni Teslim
      </v-btn>
    </div>

    <!-- Hero credit card — single positive balance -->
    <v-card v-if="auth.user?.sub_group_id" class="op-credit-card mb-4" :class="balance.credit_try > 0 ? 'op-credit-card--good' : 'op-credit-card--warn'">
      <div class="d-flex align-center justify-space-between flex-wrap ga-3">
        <div>
          <div class="op-credit-label">{{ balance.credit_try > 0 ? 'Mevcut Krediniz' : 'Limit Doldu' }}</div>
          <div class="op-credit-amount">
            {{ fmtCredit(balance.credit_try) }}
            <span class="op-credit-cur">TRY</span>
          </div>
          <div class="op-credit-hint">
            {{ balance.credit_try > 0
              ? '✅ Bu tutar kadar yatırım kabul edebilirsin'
              : '⚠ Yeni teslim yap ya da bekleyen çekimi tamamla' }}
          </div>
        </div>
        <v-icon size="80" :color="balance.credit_try > 0 ? 'var(--sp-accent-success-bright)' : 'var(--sp-accent-amber)'" style="opacity: 0.22">
          mdi-wallet-outline
        </v-icon>
      </div>
    </v-card>

    <!-- Filters -->
    <v-card class="mb-3 pa-3">
      <v-row dense align="center">
        <v-col cols="6" sm="4" md="3">
          <v-select v-model="statusFilter" :items="statusOptions" label="Durum" variant="outlined" density="compact" hide-details />
        </v-col>
        <v-col v-if="canReview" cols="12" sm="4" md="3">
          <v-autocomplete v-model="operatorFilter" :items="operators" item-title="title" item-value="id" label="Operatör" variant="outlined" density="compact" hide-details clearable />
        </v-col>
        <v-col cols="6" sm="4" md="3">
          <v-text-field v-model="dateFrom" type="date" label="Başlangıç" variant="outlined" density="compact" hide-details />
        </v-col>
        <v-col cols="6" sm="4" md="3">
          <v-text-field v-model="dateTo" type="date" label="Bitiş" variant="outlined" density="compact" hide-details />
        </v-col>
      </v-row>
    </v-card>

    <!-- Teslim table -->
    <v-card class="teslim-table-card" :class="{ 'teslim-table-card--reviewable': canReview }">
      <v-data-table
        :headers="headers"
        :items="items"
        :loading="loading"
        density="comfortable"
        items-per-page="50"
        :row-props="rowProps"
        :hover="canReview"
        @click:row="onRowClick"
      >
        <template #item.id="{ item }">
          <span class="cell-id">#{{ item.id }}</span>
        </template>
        <template #item.created_at="{ item }">
          <span class="cell-date">{{ fmtDate(item.created_at) }}</span>
        </template>
        <template #item.operator="{ item }">
          <span class="font-weight-bold">{{ item.operator?.name || '—' }}</span>
        </template>
        <template #item.amount_try="{ item }">
          <div class="cell-try">
            <div class="cell-try-amount">{{ fmtAmount(item.amount_try) }}</div>
            <div class="cell-try-cur">TRY</div>
          </div>
          <div v-if="item.operator_fee_amount && Number(item.operator_fee_amount) > 0" class="cell-commission">
            +{{ fmtAmount(item.operator_fee_amount) }} komisyon
          </div>
        </template>
        <template #item.crypto_summary="{ item }">
          <div class="cell-crypto">
            <div class="cell-crypto-amount">{{ fmtAmount(item.amount_crypto) }}</div>
            <div class="cell-crypto-pair">{{ item.coin }} · {{ item.network }}</div>
          </div>
        </template>
        <template #item.conversion_rate="{ item }">
          <span class="cell-rate">{{ fmtAmount(item.conversion_rate) }}</span>
        </template>
        <template #item.crypto_hash="{ item }">
          <div class="cell-hash">
            <template v-if="item.crypto_hash">
              <v-tooltip :text="item.crypto_hash" location="top">
                <template #activator="{ props }">
                  <span v-bind="props" class="cell-hash-text">{{ shortenAddr(item.crypto_hash) }}</span>
                </template>
              </v-tooltip>
              <v-tooltip :text="copiedHashId === item.id ? 'Kopyalandı' : 'Hash kopyala'" location="top">
                <template #activator="{ props }">
                  <button v-bind="props" class="cell-hash-copy" :class="{ 'cell-hash-copy--ok': copiedHashId === item.id }" @click.stop="copyHash(item)">
                    <v-icon size="14">{{ copiedHashId === item.id ? 'mdi-check' : 'mdi-content-copy' }}</v-icon>
                  </button>
                </template>
              </v-tooltip>
            </template>
            <span v-else class="cell-hash-empty">—</span>
          </div>
        </template>
        <template #item.status="{ item }">
          <v-chip :color="statusColor(item.status)" size="small" variant="flat" label class="font-weight-bold">
            <v-icon start size="14">{{ statusIcon(item.status) }}</v-icon>
            {{ statusLabel(item.status) }}
          </v-chip>
        </template>
        <template #item.actions="{ item }">
          <div class="d-flex justify-end ga-1">
            <template v-if="canReview && item.status === 'pending'">
              <!-- Onayla button opens the detail modal so the admin
                   reviews everything (amounts, commission, on-chain
                   verification) before clicking the final Onayla there.
                   Direct approve was too easy to misclick. -->
              <v-btn size="small" variant="flat" color="success" prepend-icon="mdi-check" @click.stop="openDetailFor(item)">Onayla</v-btn>
              <v-btn size="small" variant="flat" color="error" prepend-icon="mdi-close" @click.stop="openReject(item)">Reddet</v-btn>
            </template>
          </div>
        </template>
      </v-data-table>
    </v-card>

    <!-- Create dialog — compact hero modal sized to fit on a single
         screen without scrollbars even on 768px laptops. -->
    <v-dialog v-model="createDialog" max-width="600">
      <v-card v-if="createDialog" class="teslim-card">
        <!-- Compact horizontal hero: small icon + title + subtitle + credit -->
        <div class="teslim-hero">
          <div class="teslim-hero-icon">
            <v-icon size="22" color="white">mdi-handshake</v-icon>
          </div>
          <div class="teslim-hero-text">
            <div class="teslim-hero-title">YENİ TESLİM</div>
            <div class="teslim-hero-sub">Kredi: <strong>{{ fmtCredit(balance.credit_try) }} TRY</strong></div>
          </div>
          <v-btn class="teslim-hero-close" icon variant="text" size="small" @click="createDialog = false">
            <v-icon color="white">mdi-close</v-icon>
          </v-btn>
        </div>

        <v-card-text class="pa-0">
          <div class="teslim-body">
            <v-alert v-if="formError" type="error" density="compact" class="mb-2">{{ formError }}</v-alert>

            <!-- Coin / network — no section label, the labels on inputs are enough -->
            <v-row dense class="mb-2">
              <v-col cols="6">
                <v-select v-model="createForm.coin" :items="['TRX','USDT','BTC','ETH','SOL','XRP','AVAX','DOGE']" label="Coin" variant="outlined" density="compact" hide-details />
              </v-col>
              <v-col cols="6">
                <v-select v-model="createForm.network" :items="availableNetworks.length ? availableNetworks : ['TRC20','ERC20','BEP20','SOL','BTC','XRP','AVAX-C']" label="Ağ" variant="outlined" density="compact" hide-details />
              </v-col>
            </v-row>

            <!-- Destination wallet — single-line row: label + shortened
                 address + QR popover + copy. -->
            <div v-if="selectedWallet" class="teslim-wallet">
              <v-icon size="13" class="mr-1" color="warning">mdi-wallet-outline</v-icon>
              <span class="teslim-wallet-label">{{ selectedWallet.label }}</span>
              <code class="teslim-wallet-addr">{{ selectedWallet.address }}</code>
              <v-menu :close-on-content-click="false" location="top">
                <template v-slot:activator="{ props }">
                  <v-tooltip text="QR Kodu Göster" location="top">
                    <template v-slot:activator="{ props: tipProps }">
                      <v-btn v-bind="{ ...props, ...tipProps }" size="x-small" variant="text" color="warning" icon="mdi-qrcode" />
                    </template>
                  </v-tooltip>
                </template>
                <div class="teslim-qr-pop">
                  <img :src="walletQrUrl" width="200" height="200" alt="QR" />
                  <div class="teslim-qr-meta">{{ selectedWallet.label }}</div>
                  <code class="teslim-qr-addr">{{ selectedWallet.address }}</code>
                </div>
              </v-menu>
              <v-tooltip :text="addressCopied ? 'Kopyalandı' : 'Adresi Kopyala'" location="top">
                <template v-slot:activator="{ props }">
                  <v-btn v-bind="props" size="x-small" variant="text" :color="addressCopied ? 'success' : 'warning'" :icon="addressCopied ? 'mdi-check' : 'mdi-content-copy'" @click="copyAddress" />
                </template>
              </v-tooltip>
            </div>
            <v-alert v-else type="warning" density="compact" variant="tonal" class="mb-2">
              {{ createForm.coin }}/{{ createForm.network }} için aktif şirket cüzdanı yok.
            </v-alert>

            <!-- Crypto amount + rate -->
            <v-row dense class="align-center mb-2">
              <v-col cols="12">
                <v-text-field
                  v-model.number="createForm.amount_crypto"
                  :label="`Gönderilen Kripto (${createForm.coin})`"
                  type="number" step="0.00000001"
                  variant="outlined" density="compact"
                  hide-details
                />
              </v-col>
            </v-row>
            <v-row dense class="align-center mb-2">
              <v-col cols="8">
                <v-text-field
                  v-model.number="createForm.conversion_rate"
                  :label="`Kur (TRY / ${createForm.coin})`"
                  type="number" step="0.0001"
                  variant="outlined" density="compact"
                  :loading="ratLoading"
                  hide-details
                />
              </v-col>
              <v-col cols="4">
                <v-btn size="small" variant="tonal" color="warning" block :loading="ratLoading" @click="fetchRate({ force: true })">
                  <v-icon start size="14">mdi-refresh</v-icon> Yenile
                </v-btn>
              </v-col>
            </v-row>

            <!-- Compact TRY total — single line so it doesn't dominate. -->
            <div class="teslim-try-line" :class="createForm.amount_try > 0 ? 'is-active' : ''">
              <span class="teslim-try-tag">TRY</span>
              <span class="teslim-try-value">{{ createForm.amount_try > 0 ? fmtAmount(createForm.amount_try) : '--' }}</span>
              <span v-if="createForm.amount_crypto > 0 && createForm.conversion_rate > 0" class="teslim-try-formula">
                {{ fmtAmount(createForm.amount_crypto) }} × {{ fmtAmount(createForm.conversion_rate) }}
              </span>
            </div>
            <v-row dense class="mb-2">
              <v-col cols="8">
                <v-text-field
                  v-model="createForm.crypto_hash"
                  label="TX Hash"
                  variant="outlined" density="compact"
                  hide-details
                  placeholder="Blockchain TX hash'i"
                  prepend-inner-icon="mdi-pound"
                  @update:model-value="onHashChange"
                />
              </v-col>
              <v-col cols="4">
                <v-btn
                  v-if="canVerifyHash"
                  block size="small" variant="tonal" color="info"
                  :loading="verifyingHash"
                  :disabled="!createForm.crypto_hash"
                  @click="verifyHash"
                >
                  <v-icon start size="14">mdi-shield-check</v-icon>
                  Doğrula
                </v-btn>
                <v-tooltip v-else text="Canlı doğrulama yalnızca TRX ve USDT/TRC20 için destekleniyor." location="top">
                  <template v-slot:activator="{ props }">
                    <v-btn v-bind="props" block size="small" variant="tonal" disabled>
                      <v-icon start size="14">mdi-shield-off-outline</v-icon>
                      Doğrula
                    </v-btn>
                  </template>
                </v-tooltip>
              </v-col>
            </v-row>

            <!-- Verification result — green when blockchain matches the
                 form, amber when partial match, red when not found. -->
            <div v-if="hashVerification" class="hash-verify-result" :class="hashVerifyClass">
              <v-icon size="14" class="mr-1">{{ hashVerifyIcon }}</v-icon>
              <div class="hash-verify-body">
                <div class="hash-verify-msg">{{ hashVerification.message }}</div>
                <div v-if="hashVerification.actual" class="hash-verify-detail">
                  <span class="hash-verify-tag">Blokta</span>
                  <span class="hash-verify-mono">{{ hashVerification.actual.amount }} {{ hashVerification.actual.coin }}</span>
                  →
                  <span class="hash-verify-mono">{{ shortenAddr(hashVerification.actual.address) }}</span>
                  <span v-if="hashVerification.actual.block" class="hash-verify-block">· blok #{{ hashVerification.actual.block }}</span>
                </div>
                <div v-if="hashVerification.amount_was_updated" class="hash-verify-amount-update">
                  <v-icon size="11" class="mr-1">mdi-auto-fix</v-icon>
                  Tutar zincire göre güncellendi: <strong>{{ hashVerification.previous_amount || 0 }}</strong>
                  → <strong>{{ hashVerification.actual.amount }} {{ hashVerification.actual.coin }}</strong>
                </div>
              </div>
            </div>

            <v-text-field v-model="createForm.notes" label="Notlar (opsiyonel)" variant="outlined" density="compact" hide-details class="mt-2" />
          </div>
        </v-card-text>

        <!-- Big split actions, primary glow on Gönder -->
        <v-card-actions class="teslim-actions">
          <v-btn variant="text" size="large" class="flex-grow-1" @click="createDialog = false">Vazgeç</v-btn>
          <v-btn
            color="warning"
            variant="flat"
            size="large"
            class="flex-grow-1 teslim-confirm-btn"
            :loading="submitting"
            :disabled="!canCreate"
            prepend-icon="mdi-send"
            @click="submitCreate"
          >
            Gönder
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Detail dialog (SA-only) — opens on row click, shows everything an
         admin needs to act on this teslim, including a re-runnable
         on-chain verification block. -->
    <v-dialog v-model="detailDialog" max-width="640">
      <v-card v-if="detailItem" class="teslim-detail-card">
        <!-- Hero strip — same amber palette as the create modal -->
        <div class="teslim-detail-hero">
          <div class="teslim-detail-hero-icon">
            <v-icon size="22" color="white">mdi-receipt-text-check</v-icon>
          </div>
          <div class="teslim-detail-hero-text">
            <div class="teslim-detail-hero-title">TESLİM #{{ detailItem.id }}</div>
            <div class="teslim-detail-hero-sub">
              <v-chip :color="statusColor(detailItem.status)" size="x-small" variant="flat" class="mr-2">{{ statusLabel(detailItem.status) }}</v-chip>
              {{ fmtDate(detailItem.created_at) }}
            </div>
          </div>
          <v-btn class="teslim-detail-close" icon variant="text" size="small" @click="detailDialog = false">
            <v-icon color="white">mdi-close</v-icon>
          </v-btn>
        </div>

        <v-card-text class="pa-0">
          <div class="teslim-detail-body">
            <!-- Operator + amounts grid -->
            <div class="detail-grid">
              <div class="detail-row">
                <div class="detail-label">Operatör</div>
                <div class="detail-val">{{ detailItem.operator?.name || '—' }}</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">Alt Grup</div>
                <div class="detail-val">{{ detailItem.subGroup?.name || detailItem.sub_group?.name || '—' }}</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">Tutar (TRY)</div>
                <div class="detail-val detail-val--accent">{{ fmtAmount(detailItem.amount_try) }} TRY</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">Komisyon</div>
                <div class="detail-val">
                  <template v-if="detailCommission">
                    <span class="commission-amount">+{{ fmtAmount(detailCommission.amount) }} TRY</span>
                    <span class="commission-rate">· %{{ fmtAmount(detailCommission.percent) }}</span>
                    <span v-if="!detailCommission.isRecorded" class="commission-est">tahmin</span>
                  </template>
                  <template v-else><span class="text-medium-emphasis">—</span></template>
                </div>
              </div>
              <div class="detail-row">
                <div class="detail-label">Kripto</div>
                <div class="detail-val">
                  <strong>{{ fmtAmount(detailItem.amount_crypto) }}</strong>
                  {{ detailItem.coin }} <span class="text-medium-emphasis">· {{ detailItem.network }}</span>
                </div>
              </div>
              <div class="detail-row">
                <div class="detail-label">Kur</div>
                <div class="detail-val">{{ fmtAmount(detailItem.conversion_rate) }} TRY / {{ detailItem.coin }}</div>
              </div>
            </div>

            <!-- Destination address row -->
            <div class="detail-section-label">Hedef Adres</div>
            <div class="detail-addr-row">
              <code class="detail-addr">{{ detailItem.destination_address }}</code>
              <v-tooltip :text="detailAddrCopied ? 'Kopyalandı' : 'Adresi Kopyala'" location="top">
                <template v-slot:activator="{ props }">
                  <v-btn v-bind="props" size="x-small" variant="text" :color="detailAddrCopied ? 'success' : 'warning'" :icon="detailAddrCopied ? 'mdi-check' : 'mdi-content-copy'" @click="copyDetailAddress" />
                </template>
              </v-tooltip>
            </div>

            <!-- TX hash + verify. Hash is a real link to the chain
                 explorer so SA can pop the on-chain view in a new tab. -->
            <div class="detail-section-label mt-3">TX Hash</div>
            <div class="detail-hash-row">
              <a
                v-if="explorerTxUrl(detailItem.coin, detailItem.network, detailItem.crypto_hash)"
                :href="explorerTxUrl(detailItem.coin, detailItem.network, detailItem.crypto_hash)"
                target="_blank"
                rel="noopener noreferrer"
                class="detail-addr detail-addr--mono detail-addr--link"
              >{{ detailItem.crypto_hash }}</a>
              <code v-else class="detail-addr detail-addr--mono">{{ detailItem.crypto_hash }}</code>
              <v-tooltip
                v-if="explorerTxUrl(detailItem.coin, detailItem.network, detailItem.crypto_hash)"
                text="Blockchain'de Aç"
                location="top"
              >
                <template v-slot:activator="{ props }">
                  <v-btn
                    v-bind="props"
                    :href="explorerTxUrl(detailItem.coin, detailItem.network, detailItem.crypto_hash)"
                    target="_blank"
                    rel="noopener noreferrer"
                    size="x-small" variant="text" color="info"
                    icon="mdi-open-in-new"
                  />
                </template>
              </v-tooltip>
              <v-tooltip :text="detailHashCopied ? 'Kopyalandı' : 'Hash Kopyala'" location="top">
                <template v-slot:activator="{ props }">
                  <v-btn v-bind="props" size="x-small" variant="text" :color="detailHashCopied ? 'success' : 'warning'" :icon="detailHashCopied ? 'mdi-check' : 'mdi-content-copy'" @click="copyDetailHash" />
                </template>
              </v-tooltip>
            </div>
            <v-btn
              v-if="detailCanVerify"
              size="small" variant="tonal" color="info" class="mt-2" block
              :loading="detailVerifying"
              prepend-icon="mdi-shield-check"
              @click="verifyDetailHash"
            >
              Hash'i Blockchain'de Doğrula
            </v-btn>
            <v-tooltip v-else text="Bu coin/ağ kombinasyonu için canlı doğrulama desteklenmiyor." location="top">
              <template v-slot:activator="{ props }">
                <v-btn v-bind="props" size="small" variant="tonal" class="mt-2" block disabled prepend-icon="mdi-shield-off-outline">
                  Doğrulama Desteklenmiyor
                </v-btn>
              </template>
            </v-tooltip>

            <!-- Verification result. Auto-runs when the modal opens; the
                 loading row keeps the layout stable while the RPC call
                 lands so SA sees feedback right away. -->
            <div v-if="detailVerifying" class="hash-verify-result hash-verify-result--loading mt-2">
              <v-progress-circular indeterminate size="14" width="2" class="mr-2" color="info" />
              <div class="hash-verify-body">
                <div class="hash-verify-msg">Blockchain'de doğrulanıyor…</div>
              </div>
            </div>
            <div v-else-if="detailVerification" class="hash-verify-result mt-2" :class="{
              'hash-verify-result--ok': detailVerification.verified,
              'hash-verify-result--warn': !detailVerification.verified && detailVerification.actual,
              'hash-verify-result--err': !detailVerification.verified && !detailVerification.actual,
            }">
              <v-icon size="14" class="mr-1 align-self-start mt-1">{{ detailVerification.verified ? 'mdi-shield-check' : (detailVerification.actual ? 'mdi-shield-alert-outline' : 'mdi-shield-off-outline') }}</v-icon>
              <div class="hash-verify-body">
                <div class="hash-verify-msg">{{ detailVerification.message }}</div>

                <!-- Side-by-side comparison: Beklenen vs Blokta. Each row
                     compares one field; mismatches are highlighted so SA
                     can spot the issue at a glance. -->
                <div v-if="detailVerification.actual" class="verify-compare">
                  <div class="verify-compare-row">
                    <div class="verify-compare-label">Tutar</div>
                    <div class="verify-compare-vals">
                      <span class="verify-compare-exp">{{ fmtAmount(detailVerification.expected?.amount) }} {{ detailItem.coin }}</span>
                      <v-icon size="11" :color="amountMatches ? 'success' : 'error'" class="mx-1">{{ amountMatches ? 'mdi-equal' : 'mdi-not-equal-variant' }}</v-icon>
                      <span class="verify-compare-act" :class="amountMatches ? 'is-ok' : 'is-bad'">{{ detailVerification.actual.amount }} {{ detailVerification.actual.coin }}</span>
                    </div>
                  </div>
                  <div class="verify-compare-row">
                    <div class="verify-compare-label">Hedef Adres</div>
                    <div class="verify-compare-vals">
                      <span class="verify-compare-exp verify-mono">{{ shortenAddr(detailVerification.expected?.address) }}</span>
                      <v-icon size="11" :color="addressMatches ? 'success' : 'error'" class="mx-1">{{ addressMatches ? 'mdi-equal' : 'mdi-not-equal-variant' }}</v-icon>
                      <span class="verify-compare-act verify-mono" :class="addressMatches ? 'is-ok' : 'is-bad'">{{ shortenAddr(detailVerification.actual.address) }}</span>
                    </div>
                  </div>
                </div>

                <!-- Extra on-chain context: sender, network fee, block + time. -->
                <div v-if="detailVerification.actual" class="verify-meta">
                  <div v-if="detailVerification.actual.from" class="verify-meta-row">
                    <v-icon size="11" class="mr-1">mdi-account-arrow-right</v-icon>
                    <span class="verify-meta-label">Gönderen</span>
                    <code class="verify-mono">{{ shortenAddr(detailVerification.actual.from) }}</code>
                  </div>
                  <div v-if="detailVerification.actual.fee" class="verify-meta-row">
                    <v-icon size="11" class="mr-1">mdi-cash-clock</v-icon>
                    <span class="verify-meta-label">Ağ Ücreti</span>
                    <span class="verify-mono">{{ detailVerification.actual.fee }} {{ detailVerification.actual.fee_coin }}</span>
                  </div>
                  <div v-if="detailVerification.actual.block" class="verify-meta-row">
                    <v-icon size="11" class="mr-1">mdi-cube-outline</v-icon>
                    <span class="verify-meta-label">Blok</span>
                    <span class="verify-mono">#{{ detailVerification.actual.block }}</span>
                  </div>
                  <div v-if="detailVerification.actual.block_timestamp_ms" class="verify-meta-row">
                    <v-icon size="11" class="mr-1">mdi-clock-check-outline</v-icon>
                    <span class="verify-meta-label">Onay Zamanı</span>
                    <span class="verify-mono">{{ fmtDate(new Date(detailVerification.actual.block_timestamp_ms)) }}</span>
                  </div>
                </div>

                <!-- Re-run + open-on-explorer shortcuts -->
                <div v-if="detailVerification.actual" class="verify-actions">
                  <v-btn size="x-small" variant="text" color="info" prepend-icon="mdi-refresh" @click="verifyDetailHash">Yeniden Doğrula</v-btn>
                  <v-btn
                    v-if="explorerTxUrl(detailItem.coin, detailItem.network, detailItem.crypto_hash)"
                    :href="explorerTxUrl(detailItem.coin, detailItem.network, detailItem.crypto_hash)"
                    target="_blank"
                    rel="noopener noreferrer"
                    size="x-small" variant="text" color="info"
                    prepend-icon="mdi-open-in-new"
                  >
                    Explorer'da Aç
                  </v-btn>
                </div>
              </div>
            </div>

            <!-- Notes & rejection reason -->
            <template v-if="detailItem.notes">
              <div class="detail-section-label mt-3">Notlar</div>
              <div class="detail-note">{{ detailItem.notes }}</div>
            </template>
            <template v-if="detailItem.status === 'rejected' && detailItem.rejection_reason">
              <div class="detail-section-label mt-3" style="color: var(--sp-accent-rose)">Red Nedeni</div>
              <div class="detail-note detail-note--reject">{{ detailItem.rejection_reason }}</div>
            </template>

            <!-- Reviewer trail -->
            <template v-if="detailItem.reviewer">
              <div class="detail-section-label mt-3">İnceleyen</div>
              <div class="detail-row">
                <div class="detail-label">Yönetici</div>
                <div class="detail-val">{{ detailItem.reviewer.name }}</div>
              </div>
              <div v-if="detailItem.reviewed_at" class="detail-row">
                <div class="detail-label">Tarih</div>
                <div class="detail-val">{{ fmtDate(detailItem.reviewed_at) }}</div>
              </div>
            </template>
          </div>
        </v-card-text>

        <!-- Footer — Approve/Reject only when still pending -->
        <v-card-actions class="teslim-detail-actions">
          <v-btn variant="text" size="large" @click="detailDialog = false" class="flex-grow-1">Kapat</v-btn>
          <template v-if="detailItem.status === 'pending'">
            <v-btn variant="tonal" color="error" size="large" prepend-icon="mdi-close-thick" @click="rejectFromDetail" class="flex-grow-1">Reddet</v-btn>
            <v-btn variant="flat" color="success" size="large" prepend-icon="mdi-check-bold" @click="approveFromDetail" class="flex-grow-1">Onayla</v-btn>
          </template>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Reject dialog -->
    <v-dialog v-model="rejectDialog" max-width="500">
      <v-card v-if="selectedItem">
        <v-card-title>Teslim Reddi</v-card-title>
        <v-card-text>
          <div class="mb-2"><strong>Operatör:</strong> {{ selectedItem.operator?.name }}</div>
          <div class="mb-2"><strong>Tutar:</strong> {{ fmtAmount(selectedItem.amount_try) }} TRY</div>
          <v-textarea v-model="rejectReason" label="Red Nedeni" variant="outlined" density="compact" rows="3" class="mt-3" />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="rejectDialog = false">İptal</v-btn>
          <v-btn color="error" :loading="acting" :disabled="!rejectReason" @click="handleReject">Reddet</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<style scoped>
.teslim-page { max-width: 1400px; margin: 0 auto; }

/* Page header */
.page-header {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 20px;
  margin-bottom: 18px;
  border-radius: 0;
  background: linear-gradient(135deg, rgba(102,241,189, 0.10) 0%, rgba(102,241,189, 0.06) 100%);
  border: 1px solid rgba(102,241,189, 0.18);
}
.page-header-icon {
  width: 44px; height: 44px;
  border-radius: 0;
  background: linear-gradient(135deg, var(--sp-accent-orange) 0%, var(--sp-accent-orange) 100%);
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 4px 12px rgba(255,174,91, 0.35);
}
.page-header-title {
  font-size: 22px;
  font-weight: 800;
  letter-spacing: -0.3px;
  color: var(--sp-text);
  line-height: 1.2;
}
.page-header-sub {
  font-size: 13px;
  color: var(--sp-text-muted);
  margin-top: 2px;
  line-height: 1.4;
}
.page-header-btn {
  font-weight: 700 !important;
  letter-spacing: 0 !important;
  text-transform: none !important;
  box-shadow: 0 4px 14px rgba(102,241,189, 0.35) !important;
}

/* Hero credit card — same visual language as the dashboard */
.op-credit-card {
  padding: 22px 26px;
  border-radius: 0;
  background: var(--sp-card-bg);
  border: 1px solid var(--sp-card-border);
  border-left: 5px solid var(--sp-accent-success-bright);
}
.op-credit-card--good { border-left-color: var(--sp-accent-success-bright); }
.op-credit-card--warn { border-left-color: var(--sp-accent-amber); }
.op-credit-label {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  color: var(--sp-text-muted);
  margin-bottom: 6px;
}
.op-credit-amount {
  font-size: 36px;
  font-weight: 900;
  letter-spacing: -1px;
  color: var(--sp-text);
  line-height: 1.1;
  font-variant-numeric: tabular-nums;
}
.op-credit-cur {
  font-size: 16px;
  font-weight: 700;
  color: var(--sp-text-muted);
  margin-left: 4px;
}
.op-credit-hint {
  font-size: 13px;
  font-weight: 600;
  color: var(--sp-text-muted);
  margin-top: 8px;
}

/* Table card */
.teslim-table-card {
  border-radius: 0;
  overflow: hidden;
}

/* Cell styling */
.cell-date { font-size: 12px; color: var(--sp-text-muted); white-space: nowrap; }
.cell-id {
  font-size: 12px;
  font-weight: 800;
  color: var(--sp-text);
  letter-spacing: 0.3px;
  font-variant-numeric: tabular-nums;
}
.cell-try { display: inline-flex; align-items: baseline; gap: 4px; }
.cell-try-amount { font-size: 15px; font-weight: 800; color: var(--sp-text); font-variant-numeric: tabular-nums; }
.cell-try-cur { font-size: 11px; font-weight: 600; color: var(--sp-text-muted); }
.cell-commission {
  font-size: 11px;
  font-weight: 600;
  color: var(--sp-accent-success-bright);
  margin-top: 2px;
}
.cell-crypto { line-height: 1.3; }
.cell-crypto-amount { font-size: 14px; font-weight: 700; color: var(--sp-accent-cyan); font-variant-numeric: tabular-nums; }
.cell-crypto-pair { font-size: 11px; font-weight: 600; color: var(--sp-text-muted); margin-top: 1px; letter-spacing: 0.3px; }
.cell-rate { font-size: 13px; font-weight: 600; color: var(--sp-text); font-variant-numeric: tabular-nums; }

/* TX hash — shortened to "0x1234…abcd" so the table doesn't wrap or
   blow out on smaller screens. Full hash on hover via tooltip; copy
   button still puts the full string on the clipboard. */
.cell-hash {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
}
.cell-hash-text {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  font-weight: 500;
  color: var(--sp-text);
  background: rgba(102,241,189, 0.10);
  padding: 4px 8px;
  border-radius: 0;
  white-space: nowrap;
  cursor: help;
  letter-spacing: 0.2px;
}
.cell-hash-empty {
  font-size: 12px;
  color: var(--sp-text-muted);
}
.cell-hash-copy {
  background: rgba(102,241,189, 0.14);
  border: 0;
  color: var(--sp-accent-blue);
  width: 26px; height: 26px;
  border-radius: 0;
  cursor: pointer;
  display: inline-flex; align-items: center; justify-content: center;
  flex-shrink: 0;
  transition: background 0.15s, color 0.15s, transform 0.15s;
}
.cell-hash-copy:hover {
  background: rgba(102,241,189, 0.24);
  transform: translateY(-1px);
}
.cell-hash-copy--ok {
  background: rgba(102,241,189, 0.20);
  color: var(--sp-accent-success-bright);
}

/* Stable counter (rate dialog) */
.rate-age-hint {
  font-size: 12px;
  color: var(--sp-text-dim);
  line-height: 1.2;
}
.tnum {
  font-variant-numeric: tabular-nums;
  font-feature-settings: 'tnum' 1;
  display: inline-block;
}

/* ── Yeni Teslim modal — compact hero, sized to fit on every screen ── */
.teslim-card {
  border-radius: 0;
  overflow: hidden;
  border: 1px solid rgba(255,190,91, 0.25) !important;
  box-shadow: 0 12px 48px rgba(255,190,91, 0.18), 0 4px 16px rgba(0, 0, 0, 0.35) !important;
}
.teslim-hero {
  background: linear-gradient(135deg, var(--sp-accent-amber) 0%, var(--sp-accent-peach) 100%);
  padding: 10px 14px;
  display: flex;
  align-items: center;
  gap: 12px;
  position: relative;
  overflow: hidden;
}
.teslim-hero::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 50% 0%, rgba(255,255,255,0.18), transparent 60%);
  pointer-events: none;
}
.teslim-hero-icon {
  width: 36px; height: 36px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.22);
  display: flex; align-items: center; justify-content: center;
  border: 2px solid rgba(255, 255, 255, 0.4);
  flex-shrink: 0;
  position: relative; z-index: 1;
}
.teslim-hero-text {
  flex: 1; min-width: 0;
  position: relative; z-index: 1;
}
.teslim-hero-title {
  font-size: 14px;
  font-weight: 800;
  color: #FFFFFF;
  letter-spacing: 1px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.18);
}
.teslim-hero-sub {
  font-size: 11px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.92);
  margin-top: 1px;
  font-variant-numeric: tabular-nums;
}
.teslim-hero-close {
  position: relative; z-index: 2;
  flex-shrink: 0;
}

.teslim-body { padding: 12px 16px 4px; }

/* Single-line wallet row */
.teslim-wallet {
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(102,241,189, 0.06);
  border: 1px solid rgba(102,241,189, 0.22);
  border-radius: 0;
  padding: 4px 8px;
  margin-bottom: 8px;
  font-size: 11px;
}
.teslim-wallet-label {
  font-size: 11.5px;
  font-weight: 700;
  color: var(--sp-text);
  white-space: nowrap;
}
.teslim-wallet-addr {
  flex: 1;
  font-family: 'JetBrains Mono', monospace;
  font-size: 10.5px;
  color: var(--sp-text);
  word-break: break-all;
  line-height: 1.3;
}

/* QR popover — white background so the QR scans reliably from any
   theme. The mono address sits below for fallback / sanity-check. */
.teslim-qr-pop {
  background: #FFFFFF;
  padding: 12px;
  border-radius: 0;
  box-shadow: 0 12px 36px rgba(0,0,0,0.45);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  max-width: 240px;
}
.teslim-qr-pop img {
  display: block;
  border-radius: 0;
}
.teslim-qr-meta {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.4px;
  text-transform: uppercase;
  color: var(--sp-accent-purple);
}
.teslim-qr-addr {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  color: #333;
  word-break: break-all;
  text-align: center;
  max-width: 220px;
  background: rgba(0,0,0,0.04);
  padding: 4px 6px;
  border-radius: 0;
}

/* Compact TRY line */
.teslim-try-line {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-radius: 0;
  border: 1px solid var(--sp-border);
  background: rgba(255,255,255,0.02);
  margin-bottom: 8px;
  font-variant-numeric: tabular-nums;
}
.teslim-try-line.is-active {
  border-color: rgba(102,241,189, 0.4);
  background: rgba(102,241,189,0.06);
}
.teslim-try-tag {
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.5px;
  padding: 2px 6px;
  border-radius: 0;
  background: rgba(255,255,255,0.06);
  color: var(--sp-text-muted);
}
.teslim-try-line.is-active .teslim-try-tag {
  background: rgba(102,241,189,0.15);
  color: var(--sp-accent-success);
}
.teslim-try-value {
  font-size: 16px;
  font-weight: 900;
  color: var(--sp-text);
  letter-spacing: -0.5px;
}
.teslim-try-line.is-active .teslim-try-value { color: var(--sp-accent-success); }
.teslim-try-formula {
  margin-left: auto;
  font-size: 10.5px;
  color: var(--sp-text-dim);
}

/* Footer actions */
.teslim-actions {
  padding: 8px 14px 12px !important;
  gap: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}
.teslim-confirm-btn {
  font-weight: 800 !important;
  letter-spacing: 0.5px !important;
  box-shadow: 0 4px 14px rgba(255,190,91, 0.45) !important;
}
.teslim-confirm-btn:hover {
  box-shadow: 0 6px 20px rgba(255,190,91, 0.6) !important;
  transform: translateY(-1px);
}

/* ── Teslim detail modal (SA) — same amber palette ── */
.teslim-detail-card {
  border-radius: 0;
  overflow: hidden;
  border: 1px solid rgba(255,190,91, 0.25) !important;
  box-shadow: 0 12px 48px rgba(255,190,91, 0.18), 0 4px 16px rgba(0, 0, 0, 0.35) !important;
}
.teslim-detail-hero {
  background: linear-gradient(135deg, var(--sp-accent-amber) 0%, var(--sp-accent-peach) 100%);
  padding: 10px 14px;
  display: flex;
  align-items: center;
  gap: 12px;
  position: relative;
  overflow: hidden;
}
.teslim-detail-hero::before {
  content: '';
  position: absolute; inset: 0;
  background: radial-gradient(circle at 50% 0%, rgba(255,255,255,0.18), transparent 60%);
  pointer-events: none;
}
.teslim-detail-hero-icon {
  width: 36px; height: 36px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.22);
  display: flex; align-items: center; justify-content: center;
  border: 2px solid rgba(255, 255, 255, 0.4);
  flex-shrink: 0; position: relative; z-index: 1;
}
.teslim-detail-hero-text { flex: 1; min-width: 0; position: relative; z-index: 1; }
.teslim-detail-hero-title {
  font-size: 14px; font-weight: 800;
  color: #FFFFFF; letter-spacing: 1px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.18);
}
.teslim-detail-hero-sub {
  font-size: 11px; font-weight: 600;
  color: rgba(255, 255, 255, 0.92); margin-top: 2px;
  display: flex; align-items: center; flex-wrap: wrap;
}
.teslim-detail-close { position: relative; z-index: 2; flex-shrink: 0; }

.teslim-detail-body { padding: 14px 16px 4px; }

.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  column-gap: 16px;
  row-gap: 6px;
  margin-bottom: 8px;
}
.detail-row {
  display: grid;
  grid-template-columns: 86px 1fr;
  align-items: baseline;
  font-size: 12px;
  line-height: 1.35;
}
.detail-label {
  font-size: 10px; font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--sp-text-muted);
}
.detail-val {
  font-weight: 600;
  color: var(--sp-text);
  font-variant-numeric: tabular-nums;
  word-break: break-all;
}
.detail-val--accent { color: var(--sp-accent-orange); font-weight: 800; }

.commission-amount { color: var(--sp-accent-success); font-weight: 800; }
.commission-rate   { color: var(--sp-text-muted); margin-left: 4px; font-weight: 600; }
.commission-est {
  margin-left: 6px;
  display: inline-block;
  font-size: 9.5px;
  font-weight: 800;
  letter-spacing: 0.4px;
  text-transform: uppercase;
  padding: 1px 6px;
  border-radius: 999px;
  background: rgba(255,190,91, 0.16);
  color: var(--sp-accent-orange);
}

.detail-section-label {
  font-size: 10px; font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  color: var(--sp-text-muted);
  margin-bottom: 4px;
}

.detail-addr-row, .detail-hash-row {
  display: flex; align-items: center; gap: 6px;
  background: rgba(102,241,189, 0.06);
  border: 1px solid rgba(102,241,189, 0.22);
  border-radius: 0;
  padding: 6px 10px;
}
.detail-addr {
  flex: 1;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: var(--sp-text);
  word-break: break-all;
}
.detail-addr--mono { font-size: 10.5px; }
.detail-addr--link {
  color: var(--sp-accent-blue);
  text-decoration: none;
  border-bottom: 1px dashed rgba(112,169,255, 0.4);
  transition: color 0.15s ease, border-color 0.15s ease;
}
.detail-addr--link:hover {
  color: var(--sp-accent-blue);
  border-bottom-color: rgba(112,169,255, 0.7);
}

.detail-note {
  font-size: 12px;
  line-height: 1.4;
  color: var(--sp-text);
  background: rgba(255,255,255,0.03);
  border: 1px solid var(--sp-border);
  border-radius: 0;
  padding: 8px 10px;
  white-space: pre-wrap;
}
.detail-note--reject {
  background: rgba(255,142,130, 0.08);
  border-color: rgba(255,142,130, 0.3);
}

.teslim-detail-actions {
  padding: 8px 14px 12px !important;
  gap: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

@media (max-width: 600px) {
  .detail-grid { grid-template-columns: 1fr; }
}

/* Hash verification result inline under the TX-hash row. */
.hash-verify-result {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 0;
  border: 1px solid var(--sp-border);
  font-size: 11px;
  line-height: 1.3;
  margin-top: 4px;
}
.hash-verify-result--ok {
  background: rgba(102,241,189, 0.10);
  border-color: rgba(102,241,189, 0.35);
  color: var(--sp-accent-success);
}
.hash-verify-result--warn {
  background: rgba(255,190,91, 0.10);
  border-color: rgba(255,190,91, 0.35);
  color: var(--sp-accent-orange);
}
.hash-verify-result--err {
  background: rgba(255,142,130, 0.10);
  border-color: rgba(255,142,130, 0.35);
  color: var(--sp-accent-rose);
}
.hash-verify-result--loading {
  background: rgba(112,169,255, 0.08);
  border-color: rgba(112,169,255, 0.30);
  color: var(--sp-accent-blue);
  align-items: center;
}

/* Compare panel — Beklenen ↔ Blokta side-by-side rows. */
.verify-compare {
  margin-top: 8px;
  padding: 8px 10px;
  border-radius: 0;
  background: rgba(0,0,0,0.18);
  border: 1px solid rgba(255,255,255,0.04);
}
.verify-compare-row {
  display: grid;
  grid-template-columns: 90px 1fr;
  align-items: center;
  font-size: 11px;
  margin-bottom: 4px;
}
.verify-compare-row:last-child { margin-bottom: 0; }
.verify-compare-label {
  font-size: 10px; font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  color: var(--sp-text-muted);
}
.verify-compare-vals {
  display: flex; align-items: center; gap: 2px;
  font-variant-numeric: tabular-nums;
  flex-wrap: wrap;
}
.verify-compare-exp {
  color: var(--sp-text-muted);
  font-weight: 600;
}
.verify-compare-act {
  font-weight: 700;
  color: var(--sp-text);
}
.verify-compare-act.is-ok  { color: var(--sp-accent-success); }
.verify-compare-act.is-bad { color: var(--sp-accent-rose); }
.verify-mono {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10.5px;
}

/* Per-field meta (sender, fee, block, timestamp). */
.verify-meta {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.verify-meta-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: var(--sp-text);
}
.verify-meta-label {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  color: var(--sp-text-muted);
  min-width: 70px;
}

.verify-actions {
  display: flex;
  gap: 4px;
  margin-top: 6px;
}
.hash-verify-body { flex: 1; }
.hash-verify-msg { font-weight: 700; }
.hash-verify-detail {
  margin-top: 4px;
  font-size: 11px;
  font-weight: 500;
  color: var(--sp-text-muted);
  display: flex; align-items: center; flex-wrap: wrap; gap: 4px;
}
.hash-verify-tag {
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  padding: 1px 6px;
  border-radius: 0;
  background: rgba(255,255,255,0.06);
}
.hash-verify-mono {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: var(--sp-text);
}
.hash-verify-block {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10.5px;
  color: var(--sp-text-dim);
}
.hash-verify-amount-update {
  margin-top: 6px;
  padding: 6px 8px;
  border-radius: 0;
  background: rgba(102,241,189, 0.08);
  border: 1px dashed rgba(102,241,189, 0.35);
  color: var(--sp-accent-purple);
  font-size: 10.5px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  font-variant-numeric: tabular-nums;
}

</style>

<!-- Unscoped — table cell tweaks need to outrank Vuetify defaults the same
     way the deposit/withdrawal lists do. Status row tints kept gentle so
     the colored chip + cell content stay legible. -->
<style>
.teslim-table-card .v-table > .v-table__wrapper > table > tbody > tr > td {
  border-bottom: 1px solid rgba(128, 128, 128, 0.16) !important;
  padding-top: 10px !important;
  padding-bottom: 10px !important;
  white-space: normal !important;
  vertical-align: top !important;
}
.teslim-table-card .v-table > .v-table__wrapper > table > thead > tr > th {
  font-size: 11px !important;
  font-weight: 800 !important;
  letter-spacing: 0.6px !important;
  text-transform: uppercase !important;
  color: var(--sp-text-muted) !important;
  background: rgba(102,241,189, 0.04) !important;
}

/* Status-tinted rows — same treatment as the txn lists for consistency. */
.teslim-table-card .v-table > .v-table__wrapper > table > tbody > tr.row-in-progress,
.teslim-table-card .v-table > .v-table__wrapper > table > tbody > tr.row-in-progress > td       { background: rgba(255,190,91, 0.08) !important; }
.teslim-table-card .v-table > .v-table__wrapper > table > tbody > tr.row-in-progress:hover,
.teslim-table-card .v-table > .v-table__wrapper > table > tbody > tr.row-in-progress:hover > td { background: rgba(255,190,91, 0.20) !important; }
.teslim-table-card .v-table > .v-table__wrapper > table > tbody > tr.row-in-progress > td:first-child { box-shadow: inset 3px 0 0 var(--sp-accent-orange); }

.teslim-table-card .v-table > .v-table__wrapper > table > tbody > tr.row-approved,
.teslim-table-card .v-table > .v-table__wrapper > table > tbody > tr.row-approved > td       { background: rgba(102,241,189, 0.07) !important; }
.teslim-table-card .v-table > .v-table__wrapper > table > tbody > tr.row-approved:hover,
.teslim-table-card .v-table > .v-table__wrapper > table > tbody > tr.row-approved:hover > td { background: rgba(102,241,189, 0.18) !important; }
.teslim-table-card .v-table > .v-table__wrapper > table > tbody > tr.row-approved > td:first-child { box-shadow: inset 3px 0 0 var(--sp-accent-success); }

.teslim-table-card .v-table > .v-table__wrapper > table > tbody > tr.row-rejected,
.teslim-table-card .v-table > .v-table__wrapper > table > tbody > tr.row-rejected > td       { background: rgba(255,142,130, 0.07) !important; }
.teslim-table-card .v-table > .v-table__wrapper > table > tbody > tr.row-rejected:hover,
.teslim-table-card .v-table > .v-table__wrapper > table > tbody > tr.row-rejected:hover > td { background: rgba(255,142,130, 0.18) !important; }

/* SA-only: make the cursor read as clickable so the click target is
   obvious for the detail-modal trigger. */
.teslim-table-card--reviewable .v-table > .v-table__wrapper > table > tbody > tr {
  cursor: pointer;
}
.teslim-table-card .v-table > .v-table__wrapper > table > tbody > tr.row-rejected > td:first-child { box-shadow: inset 3px 0 0 var(--sp-accent-error); }
</style>

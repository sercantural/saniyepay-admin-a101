import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/plugins/axios'
import { getAbly } from '@/plugins/ably'
import { useAuthStore } from './auth'
import { useNotificationStore } from './notifications'

export const useTransactionStore = defineStore('transactions', () => {
  const items = ref([])
  const pagination = ref({})
  const loading = ref(false)
  const newCount = ref(0)
  const newDepositCount = ref(0)
  const newWithdrawalCount = ref(0)
  const pendingDepositCount = ref(0)
  const pendingWithdrawalCount = ref(0)
  const pendingSettlementCount = ref(0)
  const settlementUpdateTick = ref(0)
  const pendingTeslimCount = ref(0)
  const teslimUpdateTick = ref(0)
  const transactionUpdateTick = ref(0)

  let pendingCountTimer = null
  function debouncedFetchPendingCounts() {
    if (pendingCountTimer) clearTimeout(pendingCountTimer)
    pendingCountTimer = setTimeout(() => fetchPendingCounts(), 500)
  }

  async function fetchPendingCounts() {
    // Only fetch counts for nav badges the user can actually see. Operators
    // were previously hitting /settlements and /teslimler on every page
    // load even though those badges are SA-only — wasteful round trips
    // and unnecessary read access on internal endpoints.
    const auth = useAuthStore()
    const wantsSettlement = auth.isSuperAdmin || auth.can('settlement.handle')
    const wantsTeslim = auth.isSuperAdmin || auth.can('teslim.review')

    const requests = [
      api.get('/portal/transactions', { params: { type: 'deposit', status: 'assigned', sandbox: 'real' } }),
      api.get('/portal/transactions', { params: { type: 'withdrawal', status: 'pending', sandbox: 'real' } }),
      api.get('/portal/transactions', { params: { type: 'withdrawal', status: 'assigned', sandbox: 'real' } }),
      wantsSettlement
        ? api.get('/portal/settlements', { params: { status: 'assigned' } }).catch(() => ({ data: { data: [] } }))
        : Promise.resolve({ data: { data: [] } }),
      wantsTeslim
        ? api.get('/portal/teslimler', { params: { status: 'pending' } }).catch(() => ({ data: { data: [] } }))
        : Promise.resolve({ data: { data: [] } }),
    ]

    try {
      const [depRes, wdPendingRes, wdAssignedRes, stlRes, teslimRes] = await Promise.all(requests)
      pendingDepositCount.value = depRes.data.meta?.total || depRes.data.data?.length || 0
      const wdPending = wdPendingRes.data.meta?.total || wdPendingRes.data.data?.length || 0
      const wdAssigned = wdAssignedRes.data.meta?.total || wdAssignedRes.data.data?.length || 0
      pendingWithdrawalCount.value = wdPending + wdAssigned
      pendingSettlementCount.value = stlRes.data.meta?.total || stlRes.data.data?.length || 0
      pendingTeslimCount.value = teslimRes.data.meta?.total || teslimRes.data.data?.length || 0
    } catch {
      // silent
    }
  }

  async function fetchList(params = {}) {
    loading.value = true
    try {
      const { data } = await api.get('/portal/transactions', { params })
      items.value = data.data
      pagination.value = data.meta || {}
    } finally {
      loading.value = false
    }
  }

  async function lock(id) {
    const { data } = await api.post(`/portal/transactions/${id}/lock`)
    decrementPendingCount(data)
    updateItemInList(data)
    return data
  }

  async function approve(id, amount = null, bankAccountId = null) {
    const payload = { amount }
    if (bankAccountId) payload.bank_account_id = bankAccountId
    const { data } = await api.post(`/portal/transactions/${id}/approve`, payload)
    decrementPendingCount(data)
    updateItemInList(data)
    return data
  }

  async function reject(id, reason = null) {
    const payload = reason ? { reason } : {}
    const { data } = await api.post(`/portal/transactions/${id}/reject`, payload)
    decrementPendingCount(data)
    updateItemInList(data)
    return data
  }

  function decrementPendingCount(txn) {
    if (!txn) return
    if (txn.type === 'deposit') {
      pendingDepositCount.value = Math.max(0, pendingDepositCount.value - 1)
    } else if (txn.type === 'withdrawal') {
      pendingWithdrawalCount.value = Math.max(0, pendingWithdrawalCount.value - 1)
    }
  }

  function updateItemInList(txn) {
    if (!txn) return
    const idx = items.value.findIndex(t => t.id === txn.id)
    if (idx !== -1) {
      items.value[idx] = txn
    }
  }

  async function assign(id, operatorId) {
    const { data } = await api.post(`/portal/transactions/${id}/assign`, { operator_id: operatorId })
    return data
  }

  function subscribeRealtime() {
    const auth = useAuthStore()
    const notifs = useNotificationStore()

    // Track already-processed event IDs to avoid duplicates from multiple channels
    const seen = new Set()

    const ably = getAbly()

    // Channel routing:
    //   SA       → admin.super (sees everything)
    //   Manager  → manager.{sub_group_id} (sees their group's txns)
    //   Operator → operator.{user_id} (sees only txns on their own bank
    //              accounts — fan-out is server-side controlled)
    // Settlements/teslim still use the broad subgroup channel since they're
    // group-level concerns; subscribe to that for non-SA users too.
    function attach(channelName) {
      const ch = ably.channels.get(channelName)
      ch.subscribe(handleMessage)
      // Surface attach failures (silent failures = no notifications when the
      // operator expects them). Helps diagnose token-capability mismatches.
      ch.on('failed', (err) => console.error(`[Ably] ${channelName} attach failed`, err))
      ch.on('suspended', () => console.warn(`[Ably] ${channelName} suspended`))
      return ch
    }

    const isManager = auth.user?.roles?.some?.(r => r?.name === 'grup_yoneticisi')

    if (auth.isSuperAdmin) {
      attach('private:admin.super')
    } else if (isManager && auth.user?.sub_group_id) {
      attach(`private:manager.${auth.user.sub_group_id}`)
      attach(`private:subgroup.${auth.user.sub_group_id}`)
    } else if (auth.user?.id) {
      // Operator: own personal channel for txn events, plus subgroup for
      // settlement/teslim (those don't fan out per-operator).
      attach(`private:operator.${auth.user.id}`)
      if (auth.user?.sub_group_id) {
        attach(`private:subgroup.${auth.user.sub_group_id}`)
      }
    }

    function handleMessage(message) {
      const eventName = message.name
      const data = message.data

      if (eventName === 'App\\Events\\TransactionCreated') {
        handleCreated(data)
      } else if (eventName === 'App\\Events\\TransactionStatusChanged') {
        handleStatusChanged(data)
      } else if (eventName === 'App\\Events\\PaymentNotified') {
        handlePaymentNotified(data)
      } else if (eventName === 'App\\Events\\SettlementUpdated') {
        handleSettlementUpdated(data)
      } else if (eventName === 'App\\Events\\TeslimUpdated') {
        handleTeslimUpdated(data)
      }
    }

    // Notification audience filter:
    //
    // Channel routing on the server already determines who receives a
    // broadcast — operators only get messages on operator.{their_id},
    // managers only on manager.{their_sg_id}. So if a frontend handler
    // is running, the user is the intended audience.
    //
    // SA is the only role that gets noise filtered: they're subscribed
    // to admin.super (which receives every txn event) but only WANT
    // toasts for things needing admin intervention.
    function shouldNotifyOperator(txn) {
      if (auth.isSuperAdmin) {
        // SA: only exceptional cases need a toast — others are silent
        // (data still updates for live dashboards).
        return !txn?.bank_account_id || txn?.status === 'admin_review'
      }
      // Operator / manager: trust server routing — always notify.
      return true
    }

    // ── Handler: New transaction created ──
    function handleCreated(e) {
      const txn = e.transaction
      if (!txn || seen.has('c:' + txn.id)) return
      seen.add('c:' + txn.id)

      newCount.value++
      if (txn.type === 'deposit') newDepositCount.value++
      else if (txn.type === 'withdrawal') newWithdrawalCount.value++

      const exists = items.value.findIndex(t => t.id === txn.id)
      if (exists === -1) {
        items.value.unshift(txn)
      } else {
        items.value[exists] = txn
      }

      debouncedFetchPendingCounts()
      transactionUpdateTick.value++

      // Skip the audible/visible notification for operators who can't
      // act on this txn (i.e., it's not on their own bank account).
      // Counts + list still update silently for everyone on the channel.
      if (!shouldNotifyOperator(txn)) return

      const amount = new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2 }).format(txn.requested_amount)

      notifs.addNotification({
        title: txn.type === 'deposit' ? 'Yeni Yatırım Talebi' : 'Yeni Çekim Talebi',
        message: `${amount} ${txn.currency}`,
        type: txn.type,
        referenceCode: txn.id,
        txnId: txn.id,
        extra: {
          internalId: txn.internal_id,
          amount: txn.requested_amount,
          currency: txn.currency,
          customerName: txn.customer ? `${txn.customer.first_name || ''} ${txn.customer.last_name || ''}`.trim() : null,
          customerId: txn.customer?.external_id,
          bankName: txn.bank_account?.bank_name,
          bankHolder: txn.bank_account?.account_holder,
          playerBank: txn.player_bank_resolved || txn.player_bank_name,
          playerHolder: txn.player_account_holder,
        },
      })
    }

    // ── Handler: Transaction status changed ──
    function handleStatusChanged(e) {
      const txn = e.transaction
      if (!txn || seen.has('s:' + txn.id + ':' + e.to_status)) return
      seen.add('s:' + txn.id + ':' + e.to_status)

      const idx = items.value.findIndex(t => t.id === txn.id)
      if (idx !== -1) {
        items.value[idx] = txn
      } else if (e.to_status === 'assigned' && shouldNotifyOperator(txn)) {
        // Newly (re)assigned to this operator — pop it onto their list so
        // they don't have to refresh to see it.
        items.value.unshift(txn)
      }

      debouncedFetchPendingCounts()
      transactionUpdateTick.value++

      // Notify when a txn is assigned to someone — covers:
      //  - Admin manually assigns (or reassigns from operator A to B; both
      //    states are 'assigned' so don't filter on from_status)
      //  - Operator A releases → system reassigns to B
      //  - Auto-assigner picks B and the txn was previously unassigned
      // Other transitions (processing, approved, rejected, etc.) don't
      // fire notifications — they're either user-initiated or terminal.
      if (e.to_status === 'assigned' && shouldNotifyOperator(txn)) {
        if (txn.type === 'deposit') newDepositCount.value++
        else if (txn.type === 'withdrawal') newWithdrawalCount.value++
        newCount.value++

        const amount = new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2 }).format(txn.requested_amount)
        notifs.addNotification({
          title: txn.type === 'deposit' ? 'Size Atandı: Yeni Yatırım' : 'Size Atandı: Yeni Çekim',
          message: `${amount} ${txn.currency}`,
          type: txn.type,
          referenceCode: txn.id,
          txnId: txn.id,
          extra: {
            internalId: txn.internal_id,
            amount: txn.requested_amount,
            currency: txn.currency,
            customerName: txn.customer ? `${txn.customer.first_name || ''} ${txn.customer.last_name || ''}`.trim() : null,
            customerId: txn.customer?.external_id,
            bankName: txn.bank_account?.bank_name,
            bankHolder: txn.bank_account?.account_holder,
            playerBank: txn.player_bank_resolved || txn.player_bank_name,
            playerHolder: txn.player_account_holder,
          },
        })
      }
    }

    // ── Handler: Player clicked "Ödeme Yaptım" ──
    function handlePaymentNotified(e) {
      const txn = e.transaction
      if (!txn || seen.has('p:' + txn.id)) return
      seen.add('p:' + txn.id)

      const idx = items.value.findIndex(t => t.id === txn.id)
      if (idx !== -1) {
        items.value[idx] = txn
      }

      // Same filter — payment-notified only matters to the assigned operator.
      if (!shouldNotifyOperator(txn)) return

      const amount = new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2 }).format(txn.requested_amount)

      notifs.addNotification({
        title: 'Ödeme Bildirildi!',
        message: `${amount} ${txn.currency} — Oyuncu ödeme yaptığını bildirdi`,
        type: 'payment_notified',
        referenceCode: txn.id,
        txnId: txn.id,
        icon: 'mdi-cash-check',
        color: 'warning',
        extra: {
          internalId: txn.internal_id,
          amount: txn.requested_amount,
          currency: txn.currency,
          customerName: txn.customer ? `${txn.customer.first_name || ''} ${txn.customer.last_name || ''}`.trim() : null,
          bankHolder: txn.bank_account?.account_holder,
        },
      })
    }

    // ── Handler: Settlement updated ──
    function handleSettlementUpdated(e) {
      const s = e.settlement
      if (!s || seen.has('stl:' + s.id + ':' + e.action)) return
      seen.add('stl:' + s.id + ':' + e.action)

      const actionLabels = {
        created: 'Yeni Mutabakat Talebi',
        assigned: 'Mutabakat Atandı',
        finalized: 'Mutabakat Tamamlandı',
        approved: 'Mutabakat Onaylandı',
        rejected: 'Mutabakat Reddedildi',
      }

      const amount = new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2 }).format(s.net_amount || s.amount_try)

      notifs.addNotification({
        title: actionLabels[e.action] || 'Mutabakat Güncellendi',
        message: `${amount} TRY`,
        type: 'settlement',
        referenceCode: s.id,
        txnId: null,
        icon: 'mdi-bank-transfer-out',
        color: e.action === 'rejected' ? 'error' : e.action === 'approved' ? 'success' : 'primary',
        extra: {
          amount: s.net_amount || s.amount_try,
          currency: 'TRY',
          merchantName: s.merchant?.name,
        },
      })

      debouncedFetchPendingCounts()
      settlementUpdateTick.value++
    }

    // ── Handler: Teslim updated ──
    function handleTeslimUpdated(e) {
      const t = e.teslim
      if (!t || seen.has('tsl:' + t.id + ':' + e.action)) return
      seen.add('tsl:' + t.id + ':' + e.action)

      // Tailor the message based on who's receiving it. Operators get a
      // short personal status line with NO amount in the toast; admins
      // (only fired for `created` now) see the full request summary
      // including the amount.
      const isOwnTeslim = auth.user?.id && t.operator?.id === auth.user.id
      const amount = new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2 }).format(t.amount_try)

      let title, message, extra
      if (e.action === 'approved' && isOwnTeslim) {
        title = 'Teslim Onaylandı'
        message = 'Teslimin onaylandı.'
        extra = null // suppress amount block in toast
      } else if (e.action === 'rejected' && isOwnTeslim) {
        title = 'Teslim Reddedildi'
        message = 'Teslimin reddedildi.'
        extra = null
      } else if (e.action === 'created') {
        title = 'Yeni Teslim Talebi'
        message = `${amount} TRY — ${t.operator?.name || ''}`
        extra = { amount: t.amount_try, currency: 'TRY', operatorName: t.operator?.name }
      } else {
        // Defensive fallback — should rarely fire after the broadcast
        // scope was tightened to operator-only for approved/rejected.
        title = e.action === 'approved' ? 'Teslim Onaylandı'
              : e.action === 'rejected' ? 'Teslim Reddedildi'
              : 'Teslim Güncellendi'
        message = `${amount} TRY — ${t.operator?.name || ''}`
        extra = { amount: t.amount_try, currency: 'TRY', operatorName: t.operator?.name }
      }

      notifs.addNotification({
        title,
        message,
        type: 'teslim',
        referenceCode: t.id,
        txnId: null,
        icon: 'mdi-hand-coin-outline',
        color: e.action === 'rejected' ? 'error' : e.action === 'approved' ? 'success' : 'primary',
        extra,
      })

      debouncedFetchPendingCounts()
      teslimUpdateTick.value++
    }
  }

  function resetNewCount(type) {
    if (type === 'deposit') {
      newDepositCount.value = 0
    } else if (type === 'withdrawal') {
      newWithdrawalCount.value = 0
    } else {
      newCount.value = 0
      newDepositCount.value = 0
      newWithdrawalCount.value = 0
    }
  }

  return {
    items,
    pagination,
    loading,
    newCount,
    newDepositCount,
    newWithdrawalCount,
    pendingDepositCount,
    pendingWithdrawalCount,
    pendingSettlementCount,
    settlementUpdateTick,
    pendingTeslimCount,
    teslimUpdateTick,
    transactionUpdateTick,
    fetchPendingCounts,
    fetchList,
    lock,
    approve,
    reject,
    assign,
    subscribeRealtime,
    resetNewCount,
  }
})

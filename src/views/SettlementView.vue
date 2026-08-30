<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useTransactionStore } from '@/stores/transactions'
import { useNotificationStore } from '@/stores/notifications'
import api from '@/plugins/axios'

const auth = useAuthStore()
const txnStore = useTransactionStore()
const notif = useNotificationStore()

const canHandle = computed(() => auth.isSuperAdmin || auth.can('settlement.handle'))

// ── Data ──
const items = ref([])
const loading = ref(false)
const selectedItem = ref(null)
const activeWallets = ref([])
const merchants = ref([])

const statusFilter = ref('')
const typeFilter = ref('')
const merchantFilter = ref(null)
const dateFrom = ref('')
const dateTo = ref('')
const searchFilter = ref('')

const statusOptions = [
  { title: 'Tümü', value: '' },
  { title: 'Onay Bekliyor', value: 'pending_approval' },
  { title: 'Onaylandı', value: 'approved' },
  { title: 'Reddedildi', value: 'rejected' },
]

const typeOptions = [
  { title: 'Tümü', value: '' },
  { title: 'Bayi', value: 'merchant' },
  { title: 'Şirket', value: 'business' },
]

const headers = [
  { title: 'Tarih', key: 'created_at', width: '120px' },
  { title: 'Tür', key: 'settlement_type', width: '100px' },
  { title: 'Hedef', key: 'target' },
  { title: 'Brüt', key: 'amount_try', width: '120px' },
  { title: 'Komisyon', key: 'merchant_fee_amount', width: '110px' },
  { title: 'Net', key: 'net_amount', width: '120px' },
  { title: 'Coin/Ağ', key: 'coin_network', width: '120px' },
  { title: 'Durum', key: 'status', width: '120px' },
  { title: 'İşlem', key: 'actions', sortable: false, width: '170px', align: 'end' },
]

// ── Create dialog ──
const createDialog = ref(false)
const submitting = ref(false)
const formError = ref('')
const createForm = ref({
  settlement_type: 'merchant',
  merchant_id: null,
  amount_try: null,
  wallet_address: '',
  coin: 'USDT',
  network: 'TRC20',
  notes: '',
})
const targetBalance = ref(null)
const balanceLoading = ref(false)

// ── Approve / Reject dialogs ──
const approveDialog = ref(false)
const rejectDialog = ref(false)
const acting = ref(false)
const approveForm = ref({
  crypto_hash: '',
  amount_crypto: null,
  conversion_rate: null,
  source_wallet_id: null,
})
const rejectReason = ref('')

const canCreate = computed(() => {
  const f = createForm.value
  if (!f.amount_try || f.amount_try <= 0) return false
  if (!f.wallet_address || !f.coin || !f.network) return false
  if (f.settlement_type === 'merchant' && !f.merchant_id) return false
  return true
})

const canApprove = computed(() => {
  const f = approveForm.value
  return f.crypto_hash && f.amount_crypto > 0 && f.conversion_rate > 0 && f.source_wallet_id
})

// ── Data loaders ──
async function loadData() {
  loading.value = true
  try {
    const params = {}
    if (statusFilter.value) params.status = statusFilter.value
    if (typeFilter.value) params.settlement_type = typeFilter.value
    if (merchantFilter.value) params.merchant_id = merchantFilter.value
    if (dateFrom.value) params.date_from = dateFrom.value
    if (dateTo.value) params.date_to = dateTo.value
    if (searchFilter.value) params.search = searchFilter.value
    const { data } = await api.get('/portal/settlements', { params })
    items.value = data.data || data
  } catch {
    notif.addNotification({ type: 'error', message: 'Mutabakat listesi yüklenemedi' })
  } finally {
    loading.value = false
  }
}

async function loadMerchants() {
  if (!canHandle.value) return
  try {
    const { data } = await api.get('/portal/settlements/merchants')
    merchants.value = data
  } catch { merchants.value = [] }
}

async function loadWallets() {
  try {
    const { data } = await api.get('/portal/company-wallets/active')
    activeWallets.value = data
  } catch { activeWallets.value = [] }
}

async function loadTargetBalance() {
  if (!canHandle.value) return
  if (createForm.value.settlement_type === 'merchant' && !createForm.value.merchant_id) {
    targetBalance.value = null
    return
  }
  balanceLoading.value = true
  try {
    const params = { settlement_type: createForm.value.settlement_type }
    if (createForm.value.merchant_id) params.merchant_id = createForm.value.merchant_id
    const { data } = await api.get('/portal/settlements/balance', { params })
    targetBalance.value = data
  } catch { targetBalance.value = null }
  finally { balanceLoading.value = false }
}

// ── Dialog handlers ──
function openCreate() {
  createForm.value = {
    settlement_type: 'merchant', merchant_id: null, amount_try: null,
    wallet_address: '', coin: 'USDT', network: 'TRC20', notes: '',
  }
  formError.value = ''
  targetBalance.value = null
  createDialog.value = true
}

async function submitCreate() {
  submitting.value = true
  formError.value = ''
  try {
    await api.post('/portal/settlements', createForm.value)
    createDialog.value = false
    await Promise.all([loadData(), loadMerchants()])
  } catch (e) {
    formError.value = e?.response?.data?.message || 'Mutabakat oluşturulamadı'
  } finally {
    submitting.value = false
  }
}

function openApprove(item) {
  selectedItem.value = item
  const match = activeWallets.value.find(w => w.coin === item.coin && w.network === item.network)
  approveForm.value = {
    crypto_hash: '',
    amount_crypto: null,
    conversion_rate: null,
    source_wallet_id: match?.id || null,
  }
  approveDialog.value = true
}

function openReject(item) {
  selectedItem.value = item
  rejectReason.value = ''
  rejectDialog.value = true
}

async function fetchRate() {
  const coin = selectedItem.value?.coin || 'USDT'
  try {
    const r = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${coin}TRY`)
    if (r.ok) {
      const d = await r.json()
      approveForm.value.conversion_rate = parseFloat(d.price)
    } else {
      const r2 = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=USDTTRY')
      if (r2.ok) approveForm.value.conversion_rate = parseFloat((await r2.json()).price)
    }
    recalcCrypto()
  } catch {
    notif.addNotification({ type: 'warning', message: 'Canlı kur alınamadı' })
  }
}

function recalcCrypto() {
  const item = selectedItem.value
  const f = approveForm.value
  if (item && f.conversion_rate > 0) {
    const base = item.net_amount ?? item.amount_try
    f.amount_crypto = parseFloat((base / f.conversion_rate).toFixed(8))
  }
}

watch(() => approveForm.value.conversion_rate, recalcCrypto)

async function handleApprove() {
  acting.value = true
  try {
    await api.post(`/portal/settlements/${selectedItem.value.id}/approve`, approveForm.value)
    approveDialog.value = false
    await loadData()
  } catch (e) {
    notif.addNotification({ type: 'error', message: e?.response?.data?.message || 'Onaylanamadı' })
  } finally {
    acting.value = false
  }
}

async function handleReject() {
  acting.value = true
  try {
    await api.post(`/portal/settlements/${selectedItem.value.id}/reject`, { reason: rejectReason.value })
    rejectDialog.value = false
    await Promise.all([loadData(), loadMerchants()])
  } catch (e) {
    notif.addNotification({ type: 'error', message: e?.response?.data?.message || 'Reddedilemedi' })
  } finally {
    acting.value = false
  }
}

function selectRow(item) {
  selectedItem.value = selectedItem.value?.id === item.id ? null : item
}

// ── Helpers ──
function statusColor(s) {
  return { pending_approval: 'warning', approved: 'success', rejected: 'error', assigned: 'info', pending_final: 'deep-purple' }[s] || 'grey'
}

function statusLabel(s) {
  return {
    pending_approval: 'Onay Bekliyor',
    approved: 'Onaylandı',
    rejected: 'Reddedildi',
    assigned: 'Atanmış (eski)',
    pending_final: 'Son Onay (eski)',
  }[s] || s
}

function fmtAmount(n) {
  return n != null ? new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2 }).format(n) : '--'
}

function fmtDate(d) {
  return d ? new Date(d).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' }) : '--'
}

function truncate(s, n = 16) {
  if (!s) return ''
  return s.length > n ? s.slice(0, n / 2) + '...' + s.slice(-n / 3) : s
}

// ── Watchers ──
watch(() => [statusFilter.value, typeFilter.value, merchantFilter.value, dateFrom.value, dateTo.value], loadData)
watch(() => searchFilter.value, () => {
  clearTimeout(window.__settleSearchT)
  window.__settleSearchT = setTimeout(loadData, 300)
})
watch(() => txnStore.settlementUpdateTick, () => {
  loadData()
  if (createDialog.value) loadTargetBalance()
})
watch(() => [createForm.value.settlement_type, createForm.value.merchant_id], loadTargetBalance)

onMounted(() => {
  loadData()
  loadMerchants()
  loadWallets()
})
</script>

<template>
  <v-container fluid class="pa-4">
    <div class="d-flex justify-space-between align-center flex-wrap mb-4">
      <div>
        <h2 class="text-h5 font-weight-bold">Mutabakat</h2>
        <div class="text-body-2 text-medium-emphasis">
          Bayi ve şirket mutabakat taleplerini görüntüle ve işle.
        </div>
      </div>
      <v-btn v-if="canHandle" color="primary" prepend-icon="mdi-plus" @click="openCreate">Yeni Mutabakat</v-btn>
    </div>

    <!-- Filters -->
    <v-card class="mb-3 pa-3">
      <v-row dense>
        <v-col cols="6" sm="3"><v-select v-model="statusFilter" :items="statusOptions" label="Durum" variant="outlined" density="compact" hide-details /></v-col>
        <v-col cols="6" sm="3"><v-select v-model="typeFilter" :items="typeOptions" label="Tür" variant="outlined" density="compact" hide-details /></v-col>
        <v-col cols="6" sm="3"><v-text-field v-model="dateFrom" type="date" label="Başlangıç" variant="outlined" density="compact" hide-details /></v-col>
        <v-col cols="6" sm="3"><v-text-field v-model="dateTo" type="date" label="Bitiş" variant="outlined" density="compact" hide-details /></v-col>
        <v-col cols="12"><v-text-field v-model="searchFilter" prepend-inner-icon="mdi-magnify" label="Cüzdan / hash / id ara" variant="outlined" density="compact" hide-details clearable /></v-col>
      </v-row>
    </v-card>

    <v-row>
      <v-col :cols="selectedItem ? 8 : 12">
        <v-card>
          <v-data-table
            :headers="headers"
            :items="items"
            :loading="loading"
            density="comfortable"
            items-per-page="50"
            @click:row="(_, {item}) => selectRow(item)"
            hover
          >
            <template #item.created_at="{ item }">{{ fmtDate(item.created_at) }}</template>
            <template #item.settlement_type="{ item }">
              <v-chip size="x-small" :color="item.settlement_type === 'merchant' ? 'blue' : 'purple'" variant="tonal">
                {{ item.settlement_type === 'merchant' ? 'Bayi' : 'Şirket' }}
              </v-chip>
            </template>
            <template #item.target="{ item }">
              <span v-if="item.merchant?.name">{{ item.merchant.name }}</span>
              <span v-else class="text-medium-emphasis">Şirket</span>
            </template>
            <template #item.amount_try="{ item }">
              <span class="font-weight-bold">{{ fmtAmount(item.amount_try) }}</span>
            </template>
            <template #item.merchant_fee_amount="{ item }">
              <span v-if="item.merchant_fee_amount > 0" style="color: #E4A34F; font-weight: 600">{{ fmtAmount(item.merchant_fee_amount) }}</span>
              <span v-else class="text-medium-emphasis">--</span>
            </template>
            <template #item.net_amount="{ item }">
              <span style="color: #66BB6A; font-weight: 600">{{ fmtAmount(item.net_amount) }}</span>
            </template>
            <template #item.coin_network="{ item }">
              <div style="line-height: 1.2">
                <v-chip size="x-small" color="blue" variant="tonal">{{ item.coin || '--' }}</v-chip>
                <div class="text-caption">{{ item.network }}</div>
              </div>
            </template>
            <template #item.status="{ item }">
              <v-chip :color="statusColor(item.status)" size="small" variant="tonal">{{ statusLabel(item.status) }}</v-chip>
            </template>
            <template #item.actions="{ item }">
              <template v-if="canHandle && item.status === 'pending_approval'">
                <v-btn size="x-small" variant="text" color="success" @click.stop="openApprove(item)">Onayla</v-btn>
                <v-btn size="x-small" variant="text" color="error" @click.stop="openReject(item)">Reddet</v-btn>
              </template>
            </template>
          </v-data-table>
        </v-card>
      </v-col>

      <!-- Detail side panel -->
      <v-col v-if="selectedItem" cols="4">
        <v-card class="pa-4" style="position: sticky; top: 80px">
          <div class="d-flex justify-space-between align-center mb-3">
            <strong>Mutabakat Detay</strong>
            <v-btn icon="mdi-close" size="x-small" variant="text" @click="selectedItem = null" />
          </div>
          <div class="text-caption text-medium-emphasis mb-2">ID: <code>{{ selectedItem.id }}</code></div>
          <v-chip :color="statusColor(selectedItem.status)" size="small" variant="tonal" class="mb-3">{{ statusLabel(selectedItem.status) }}</v-chip>

          <div class="mb-3">
            <div class="text-caption text-medium-emphasis">Hedef</div>
            <div><strong>{{ selectedItem.merchant?.name || 'Şirket Mutabakatı' }}</strong></div>
            <div v-if="selectedItem.source === 'merchant'" class="text-caption" style="color: #4FC3F7">Bayi tarafından oluşturuldu</div>
          </div>

          <div class="mb-3">
            <div class="text-caption text-medium-emphasis">Tutarlar</div>
            <div>Brüt: <strong>{{ fmtAmount(selectedItem.amount_try) }} TRY</strong></div>
            <div v-if="selectedItem.merchant_fee_amount > 0">
              Komisyon (%{{ selectedItem.merchant_fee_percent }}):
              <span style="color: #E4A34F">{{ fmtAmount(selectedItem.merchant_fee_amount) }}</span>
            </div>
            <div>Net: <span style="color: #66BB6A; font-weight: 600">{{ fmtAmount(selectedItem.net_amount) }} TRY</span></div>
          </div>

          <div class="mb-3">
            <div class="text-caption text-medium-emphasis">Hedef Cüzdan</div>
            <code style="font-size: 11px; word-break: break-all">{{ selectedItem.wallet_address }}</code>
            <div class="mt-1">
              <v-chip size="x-small" color="blue" variant="tonal">{{ selectedItem.coin }}</v-chip>
              <v-chip size="x-small" color="purple" variant="tonal" class="ml-1">{{ selectedItem.network }}</v-chip>
            </div>
          </div>

          <div v-if="selectedItem.crypto_hash" class="mb-3">
            <div class="text-caption text-medium-emphasis">İşlem</div>
            <div>{{ fmtAmount(selectedItem.amount_crypto) }} {{ selectedItem.coin }} @ {{ fmtAmount(selectedItem.conversion_rate) }}</div>
            <code style="font-size: 10px; word-break: break-all">{{ selectedItem.crypto_hash }}</code>
            <div v-if="selectedItem.source_wallet" class="text-caption mt-1">
              Kaynak: {{ selectedItem.source_wallet.label }}
            </div>
          </div>

          <div v-if="selectedItem.rejection_reason" class="mb-3">
            <div class="text-caption text-medium-emphasis">Red Nedeni</div>
            <div style="color: #E57373">{{ selectedItem.rejection_reason }}</div>
          </div>

          <div v-if="selectedItem.notes" class="mb-3">
            <div class="text-caption text-medium-emphasis">Notlar</div>
            <div class="text-body-2">{{ selectedItem.notes }}</div>
          </div>

          <div class="text-caption text-medium-emphasis mt-3">
            Oluşturuldu: {{ fmtDate(selectedItem.created_at) }}
            <span v-if="selectedItem.reviewed_at"><br>İncelendi: {{ fmtDate(selectedItem.reviewed_at) }}</span>
            <span v-if="selectedItem.reviewer"><br>İnceleyen: {{ selectedItem.reviewer.name }}</span>
          </div>

          <div v-if="canHandle && selectedItem.status === 'pending_approval'" class="mt-3 d-flex ga-2">
            <v-btn color="success" size="small" @click="openApprove(selectedItem)">Onayla & Gönder</v-btn>
            <v-btn color="error" size="small" variant="tonal" @click="openReject(selectedItem)">Reddet</v-btn>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <!-- Create dialog -->
    <v-dialog v-model="createDialog" max-width="600">
      <v-card>
        <v-card-title>Yeni Mutabakat</v-card-title>
        <v-card-text>
          <v-alert v-if="formError" type="error" density="compact" class="mb-3">{{ formError }}</v-alert>
          <v-select
            v-model="createForm.settlement_type"
            :items="[{title:'Bayi Mutabakatı', value:'merchant'}, {title:'Şirket Mutabakatı', value:'business'}]"
            label="Tür" variant="outlined" density="compact"
          />
          <v-autocomplete
            v-if="createForm.settlement_type === 'merchant'"
            v-model="createForm.merchant_id"
            :items="merchants" item-title="label" item-value="id"
            label="Bayi" variant="outlined" density="compact"
          />
          <v-alert v-if="targetBalance" type="info" density="compact" class="mb-2">
            <div class="text-caption">Kullanılabilir: <strong>{{ fmtAmount(targetBalance.available_balance ?? targetBalance.unsettled_fees) }} TRY</strong></div>
            <div v-if="targetBalance.active_settlements > 0" class="text-caption">Bekleyen: {{ fmtAmount(targetBalance.active_settlements) }} TRY</div>
          </v-alert>
          <v-text-field v-model.number="createForm.amount_try" label="Tutar (TRY)" type="number" step="0.01" variant="outlined" density="compact" />
          <v-text-field v-model="createForm.wallet_address" label="Hedef Cüzdan Adresi" variant="outlined" density="compact" />
          <v-row dense>
            <v-col cols="6"><v-select v-model="createForm.coin" :items="['TRX','USDT','BTC','ETH','SOL','XRP','AVAX','DOGE']" label="Coin" variant="outlined" density="compact" /></v-col>
            <v-col cols="6"><v-select v-model="createForm.network" :items="['TRC20','ERC20','BEP20','SOL','BTC','XRP','AVAX-C']" label="Ağ" variant="outlined" density="compact" /></v-col>
          </v-row>
          <v-textarea v-model="createForm.notes" label="Notlar (ops.)" variant="outlined" density="compact" rows="2" />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="createDialog = false">İptal</v-btn>
          <v-btn color="primary" :loading="submitting" :disabled="!canCreate" @click="submitCreate">Oluştur</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Approve dialog (single step: fill crypto details + approve) -->
    <v-dialog v-model="approveDialog" max-width="600">
      <v-card v-if="selectedItem">
        <v-card-title>Mutabakat Onayı</v-card-title>
        <v-card-text>
          <v-alert type="info" density="compact" class="mb-3">
            Kripto transferi yapıldıktan sonra aşağıdaki bilgileri girip onaylayın.
            Bu tek adımda mutabakat tamamlanır.
          </v-alert>
          <div class="mb-2"><strong>Hedef:</strong> {{ selectedItem.merchant?.name || 'Şirket' }}</div>
          <div class="mb-2"><strong>Net Tutar:</strong> {{ fmtAmount(selectedItem.net_amount) }} TRY</div>
          <div class="mb-2"><strong>Hedef Cüzdan:</strong> <code style="font-size: 11px">{{ truncate(selectedItem.wallet_address, 32) }}</code> ({{ selectedItem.coin }}/{{ selectedItem.network }})</div>
          <v-divider class="my-3" />

          <v-select
            v-model="approveForm.source_wallet_id"
            :items="activeWallets.filter(w => w.coin === selectedItem.coin && w.network === selectedItem.network)"
            item-title="label" item-value="id"
            label="Kaynak Cüzdan (Şirket)" variant="outlined" density="compact"
          />
          <div v-if="!activeWallets.some(w => w.coin === selectedItem.coin && w.network === selectedItem.network)" class="text-caption mb-2" style="color: #E57373">
            <v-icon size="14">mdi-alert</v-icon>
            {{ selectedItem.coin }}/{{ selectedItem.network }} için aktif şirket cüzdanı yok.
          </div>

          <v-row dense class="align-center">
            <v-col cols="8"><v-text-field v-model.number="approveForm.conversion_rate" label="Kur (TRY/Kripto)" type="number" step="0.0001" variant="outlined" density="compact" /></v-col>
            <v-col cols="4"><v-btn size="small" variant="tonal" @click="fetchRate">Canlı Kur</v-btn></v-col>
          </v-row>
          <v-text-field v-model.number="approveForm.amount_crypto" label="Kripto Tutarı" type="number" step="0.00000001" variant="outlined" density="compact" />
          <v-text-field v-model="approveForm.crypto_hash" label="TX Hash" variant="outlined" density="compact" />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="approveDialog = false">İptal</v-btn>
          <v-btn color="success" :loading="acting" :disabled="!canApprove" @click="handleApprove">Onayla</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Reject dialog -->
    <v-dialog v-model="rejectDialog" max-width="500">
      <v-card v-if="selectedItem">
        <v-card-title>Mutabakat Reddi</v-card-title>
        <v-card-text>
          <div class="mb-2"><strong>Hedef:</strong> {{ selectedItem.merchant?.name || 'Şirket' }}</div>
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

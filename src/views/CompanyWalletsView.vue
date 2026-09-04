<script setup>
import { useAuthStore } from '@/stores/auth'
import { ref, onMounted, computed } from 'vue'
import api from '@/plugins/axios'
import { useNotificationStore } from '@/stores/notifications'

const auth = useAuthStore()
// Ekran ici eylemler de izne bagli: menuyu gormek ile
// islem yapabilmek ayni sey degil.
const can = (p) => auth.can(p) || auth.isSuperAdmin

const notif = useNotificationStore()

const COINS = ['TRX', 'USDT', 'BTC', 'ETH', 'SOL', 'XRP', 'AVAX', 'DOGE']
const NETWORKS = ['TRC20', 'ERC20', 'BEP20', 'SOL', 'BTC', 'XRP', 'AVAX-C']

const items = ref([])
const loading = ref(false)
const dialogOpen = ref(false)
const editing = ref(null)
const submitting = ref(false)
const formError = ref('')

const form = ref({
  label: '', coin: 'USDT', network: 'TRC20', address: '', is_active: true, notes: '',
})

const headers = [
  { title: 'Durum', key: 'is_active', width: '80px' },
  { title: 'Etiket', key: 'label' },
  { title: 'Coin', key: 'coin', width: '80px' },
  { title: 'Ağ', key: 'network', width: '100px' },
  { title: 'Adres', key: 'address' },
  { title: 'Oluşturulma', key: 'created_at', width: '130px' },
  { title: 'İşlemler', key: 'actions', sortable: false, align: 'end', width: '180px' },
]

const canSubmit = computed(() =>
  form.value.label && form.value.coin && form.value.network && form.value.address
)

async function load() {
  loading.value = true
  try {
    const { data } = await api.get('/portal/company-wallets')
    items.value = data
  } catch (e) {
    notif.addNotification({ type: 'error', message: 'Cüzdanlar yüklenemedi' })
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editing.value = null
  form.value = { label: '', coin: 'USDT', network: 'TRC20', address: '', is_active: true, notes: '' }
  formError.value = ''
  dialogOpen.value = true
}

function openEdit(item) {
  editing.value = item
  form.value = {
    label: item.label,
    coin: item.coin,
    network: item.network,
    address: item.address,
    is_active: item.is_active,
    notes: item.notes || '',
  }
  formError.value = ''
  dialogOpen.value = true
}

async function submit() {
  submitting.value = true
  formError.value = ''
  try {
    if (editing.value) {
      await api.put(`/portal/company-wallets/${editing.value.id}`, {
        label: form.value.label,
        address: form.value.address,
        notes: form.value.notes,
      })
    } else {
      await api.post('/portal/company-wallets', form.value)
    }
    dialogOpen.value = false
    await load()
  } catch (e) {
    formError.value = e?.response?.data?.message || 'Kaydedilemedi'
  } finally {
    submitting.value = false
  }
}

async function toggle(item) {
  try {
    await api.post(`/portal/company-wallets/${item.id}/toggle`)
    await load()
  } catch (e) {
    notif.addNotification({ type: 'error', message: 'Durum değiştirilemedi' })
  }
}

async function remove(item) {
  if (!confirm(`"${item.label}" silinsin mi?`)) return
  try {
    await api.delete(`/portal/company-wallets/${item.id}`)
    await load()
  } catch (e) {
    notif.addNotification({ type: 'error', message: 'Silinemedi' })
  }
}

function formatDate(d) {
  return d ? new Date(d).toLocaleDateString('tr-TR') : '--'
}

// Adres artik kisaltilmiyor: operator adresi baska yerle karsilastirmak
// zorunda kalinca "..." yuzunden dialogu acip kopyaliyordu. Tam adres +
// kopyala ikonu bu adimi kaldiriyor.
async function copyAddress(a) {
  if (!a) return
  try {
    await navigator.clipboard.writeText(a)
    notif.addNotification({ type: 'success', message: 'Adres panoya kopyalandı' })
  } catch {
    notif.addNotification({ type: 'error', message: 'Kopyalanamadı' })
  }
}

onMounted(load)
</script>

<template>
  <v-container fluid class="pa-4">
    <div class="d-flex justify-space-between align-center mb-4">
      <div>
        <h2 class="text-h5 font-weight-bold">Şirket Cüzdanları</h2>
        <div class="text-body-2 text-medium-emphasis">
          Teslim ve mutabakat işlemlerinde kullanılan şirket kripto cüzdanları.
          Her (coin, ağ) çifti için sadece bir aktif cüzdan olabilir.
        </div>
      </div>
      <v-btn v-if="can('company_wallets.create') || can('company_wallet.manage')" color="primary" prepend-icon="mdi-plus" @click="openCreate">Yeni Cüzdan</v-btn>
    </div>

    <v-card>
      <v-data-table
        :headers="headers"
        :items="items"
        :loading="loading"
        density="comfortable"
        items-per-page="50"
      >
        <template #item.is_active="{ item }">
          <v-chip v-if="item.is_active" color="success" size="small" variant="tonal">Aktif</v-chip>
          <v-chip v-else color="grey" size="small" variant="tonal">Pasif</v-chip>
        </template>
        <template #item.coin="{ item }">
          <v-chip size="small" variant="tonal" color="info">{{ item.coin }}</v-chip>
        </template>
        <template #item.network="{ item }">
          <v-chip size="small" variant="tonal" color="secondary">{{ item.network }}</v-chip>
        </template>
        <template #item.address="{ item }">
          <div class="wallet-address">
            <code class="wallet-address-text">{{ item.address }}</code>
            <v-btn
              icon
              variant="text"
              size="x-small"
              title="Adresi kopyala"
              aria-label="Adresi kopyala"
              @click="copyAddress(item.address)"
            >
              <v-icon size="14">mdi-content-copy</v-icon>
            </v-btn>
          </div>
        </template>
        <template #item.created_at="{ item }">
          {{ formatDate(item.created_at) }}
        </template>
        <template #item.actions="{ item }">
          <v-btn v-if="can('company_wallets.toggle') || can('company_wallet.manage')" size="x-small" variant="text" :color="item.is_active ? 'warning' : 'success'" @click="toggle(item)">
            {{ item.is_active ? 'Pasifleştir' : 'Aktifleştir' }}
          </v-btn>
          <v-btn v-if="can('company_wallets.edit') || can('company_wallet.manage')" size="x-small" variant="text" color="primary" @click="openEdit(item)">Düzenle</v-btn>
          <v-btn v-if="can('company_wallets.delete') || can('company_wallet.manage')" size="x-small" variant="text" color="error" @click="remove(item)">Sil</v-btn>
        </template>
      </v-data-table>
    </v-card>

    <v-dialog v-model="dialogOpen" max-width="600">
      <v-card>
        <v-card-title>{{ editing ? 'Cüzdanı Düzenle' : 'Yeni Cüzdan' }}</v-card-title>
        <v-card-text>
          <v-alert v-if="formError" type="error" density="compact" class="mb-3">{{ formError }}</v-alert>
          <v-text-field v-model="form.label" label="Etiket (ör. Ana USDT TRC20)" variant="outlined" density="compact" />
          <v-row dense>
            <v-col cols="6">
              <v-select v-model="form.coin" :items="COINS" label="Coin" variant="outlined" density="compact" :disabled="!!editing" />
            </v-col>
            <v-col cols="6">
              <v-select v-model="form.network" :items="NETWORKS" label="Ağ" variant="outlined" density="compact" :disabled="!!editing" />
            </v-col>
          </v-row>
          <v-text-field v-model="form.address" label="Cüzdan Adresi" variant="outlined" density="compact" />
          <v-textarea v-model="form.notes" label="Notlar" variant="outlined" density="compact" rows="2" />
          <v-checkbox v-if="!editing" v-model="form.is_active" label="Bu cüzdanı aktif yap (mevcut aktif cüzdanı pasifleştirir)" density="compact" />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="dialogOpen = false">İptal</v-btn>
          <v-btn color="primary" :loading="submitting" :disabled="!canSubmit" @click="submit">Kaydet</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<style scoped>
/* Adres hucresi: tam metin, gerekirse satir kirar; ikon adresin yaninda kalir. */
.wallet-address {
  display: flex;
  align-items: flex-start;
  gap: 4px;
  min-width: 220px;
}
.wallet-address-text {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 11px;
  line-height: 1.5;
  word-break: break-all;
  color: var(--sp-text);
  background: transparent;
  padding: 2px 0;
}

/* Kucuk ekranda tablo yatay kaydirilabilir kalsin. */
@media (max-width: 960px) {
  :deep(.v-data-table) {
    overflow-x: auto;
  }
  :deep(.v-data-table table) {
    min-width: 820px;
  }
}
</style>

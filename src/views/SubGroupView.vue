<template>
  <div>
    <v-card>
      <v-card-title class="d-flex align-center">
        <v-icon start color="primary">mdi-folder-account</v-icon>
        Alt Gruplar
        <v-spacer />
        <v-btn color="primary" @click="openCreate" v-if="can('sub_groups.manage')">
          <v-icon start>mdi-plus</v-icon> Grup Ekle
        </v-btn>
      </v-card-title>

      <!-- Aktif/pasif filtresi. Pasife alinan gruplar listeden silinmiyor,
           sadece gizleniyor; sistem yoneticisi ikisini de tek ekrandan
           gorebilsin diye "Tumu" secenegi varsayilan birakildi. -->
      <div class="filter-shell">
        <div class="filter-row">
          <button
            v-for="opt in statusOptions"
            :key="opt.value || 'all'"
            class="status-pill"
            :class="[opt.color, { 'is-active': statusFilter === opt.value }]"
            type="button"
            @click="setStatus(opt.value)"
          >
            <v-icon size="13" class="mr-1">{{ opt.icon }}</v-icon>{{ opt.text }}
          </button>
        </div>
      </div>

      <v-alert
        v-if="errorText"
        type="error"
        variant="tonal"
        density="compact"
        class="ma-4"
        closable
        @click:close="errorText = ''"
      >
        {{ errorText }}
      </v-alert>

      <v-data-table :headers="headers" :items="groups" :loading="loading" density="compact" no-data-text="Alt grup bulunamadı" loading-text="Yükleniyor...">
        <template v-slot:item.is_active="{ item }">
          <span class="state-pill" :class="item.is_active ? 'is-on' : 'is-off'">
            <span class="state-dot"></span>
            {{ item.is_active ? 'Aktif' : 'Pasif' }}
          </span>
        </template>
        <template v-slot:item.credit="{ item }">
          <span class="amount font-mono" :class="creditClass(item.credit)">{{ money(item.credit) }}</span>
        </template>
        <template v-slot:item.two_step_deposit="{ item }">
          <v-icon :color="item.two_step_deposit ? 'success' : 'grey'">
            {{ item.two_step_deposit ? 'mdi-check' : 'mdi-close' }}
          </v-icon>
        </template>
        <template v-slot:item.actions="{ item }">
          <!-- Tek tusla durum degistirme: sistem yoneticisi grubu kapatmak
               icin duzenleme dialogunu acmak istemiyor. -->
          <v-btn
            v-if="can('sub_groups.manage')"
            size="small"
            variant="outlined"
            :color="item.is_active ? 'error' : 'success'"
            :loading="togglingId === item.id"
            :disabled="togglingId !== null"
            class="mr-2"
            @click="toggleGroup(item)"
          >
            <v-icon start size="16">{{ item.is_active ? 'mdi-pause-circle-outline' : 'mdi-play-circle-outline' }}</v-icon>
            {{ item.is_active ? 'Pasif Et' : 'Aktif Et' }}
          </v-btn>
          <v-btn v-if="can('sub_groups.manage')" size="small" variant="text" color="primary" @click="editGroup(item)">
            <v-icon>mdi-pencil</v-icon>
          </v-btn>
        </template>
      </v-data-table>
    </v-card>

    <v-dialog v-model="dialog" max-width="500">
      <v-card>
        <v-card-title>{{ editing ? 'Alt Grubu Düzenle' : 'Alt Grup Oluştur' }}</v-card-title>
        <v-card-text>
          <v-text-field v-model="form.name" label="Grup Adı" variant="outlined" density="compact" class="mb-2" />
          <v-text-field v-model="form.description" label="Açıklama" variant="outlined" density="compact" class="mb-2" />

          <!-- Komisyon oranlari ve iki asamali yatirim sahibin ticari
               ayarlari; grup yoneticisi ve destek bunlari gormemeli. -->
          <template v-if="auth.isSuperAdmin">
            <v-divider class="my-3" />
            <div class="text-subtitle-2 font-weight-bold mb-2">
              <v-icon start size="18" color="warning">mdi-percent</v-icon> Komisyon Payı
            </div>
            <v-alert type="info" variant="tonal" density="compact" class="mb-3">
              Bu gruba verilecek komisyon oranı. Bayi komisyonundan bu oran düşülür, kalan sahibe kalır.
            </v-alert>
            <v-row dense>
              <v-col cols="12" sm="4">
                <v-text-field
                  v-model.number="form.deposit_fee_percent"
                  label="Yatırım Komisyon Payı (%)"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  variant="outlined"
                  density="compact"
                  class="mb-2"
                />
              </v-col>
              <v-col cols="12" sm="4">
                <v-text-field
                  v-model.number="form.withdrawal_fee_percent"
                  label="Çekim Komisyon Payı (%)"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  variant="outlined"
                  density="compact"
                  class="mb-2"
                />
              </v-col>
              <v-col cols="12" sm="4">
                <v-text-field
                  v-model.number="form.teslim_fee_percent"
                  label="Teslim Komisyon Payı (%)"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  variant="outlined"
                  density="compact"
                  class="mb-2"
                />
              </v-col>
            </v-row>

            <v-switch v-model="form.two_step_deposit" label="İki Aşamalı Yatırım" color="primary" />
          </template>

          <v-switch v-if="editing" v-model="form.is_active" label="Aktif" color="success" />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="dialog = false">İptal</v-btn>
          <v-btn color="primary" variant="elevated" @click="save" :loading="saving">Kaydet</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import api from '@/plugins/axios'

const auth = useAuthStore()
// Ekran ici eylemler de izne bagli: menuyu gormek ile
// islem yapabilmek ayni sey degil.
const can = (p) => auth.can(p) || auth.isSuperAdmin
const groups = ref([])
const loading = ref(false)
const dialog = ref(false)
const saving = ref(false)
const editing = ref(false)
const editingId = ref(null)
const togglingId = ref(null)
const errorText = ref('')
const statusFilter = ref('')
const form = reactive({ name: '', description: '', two_step_deposit: false, is_active: true, deposit_fee_percent: 0, withdrawal_fee_percent: 0, teslim_fee_percent: 0 })

const statusOptions = [
  { value: '',        text: 'Tümü',  icon: 'mdi-format-list-bulleted', color: 'pill-grey' },
  { value: 'active',  text: 'Aktif', icon: 'mdi-check-circle-outline', color: 'pill-success' },
  { value: 'passive', text: 'Pasif', icon: 'mdi-pause-circle-outline', color: 'pill-grey' },
]

// Kredi sutunu sadece bakiye izni olana acilir; destek ekibi
// gruplarin para durumunu gormemeli.
const canSeeCredit = computed(() => can('operator_balances.view'))

// Sutun sirasi sistem yoneticisinin istegi: Grup, Durum, Kredi, Islem.
// Komisyon yuzdeleri ve iki asamali bayrak ticari bilgi oldugu icin
// sadece super yoneticide gorunur.
const headers = computed(() => [
  { title: 'Grup Adı', key: 'name' },
  { title: 'Açıklama', key: 'description' },
  { title: 'Durum', key: 'is_active' },
  ...(canSeeCredit.value ? [{ title: 'Kredi (TRY)', key: 'credit', align: 'end', sortable: false }] : []),
  { title: 'Kullanıcılar', key: 'users_count', align: 'end' },
  { title: 'Hesaplar', key: 'bank_accounts_count', align: 'end' },
  ...(auth.isSuperAdmin ? [
    { title: 'Yatırım %', key: 'deposit_fee_percent' },
    { title: 'Çekim %', key: 'withdrawal_fee_percent' },
    { title: 'Teslim %', key: 'teslim_fee_percent' },
    { title: 'İki Aşamalı', key: 'two_step_deposit' },
  ] : []),
  { title: 'İşlem', key: 'actions', sortable: false, align: 'end' },
])

function money(v) {
  return new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    .format(Number(v || 0))
}

// Sifir kredi "limit doldu" demek; renk farki operatorun dikkatini ceksin.
function creditClass(v) {
  const n = Number(v || 0)
  if (n < 0) return 'neg'
  if (n === 0) return 'zero'
  return 'pos'
}

function setStatus(value) {
  if (statusFilter.value === value) return
  statusFilter.value = value
  loadGroups()
}

function openCreate() {
  editing.value = false
  Object.assign(form, { name: '', description: '', two_step_deposit: false, is_active: true, deposit_fee_percent: 0, withdrawal_fee_percent: 0, teslim_fee_percent: 0 })
  dialog.value = true
}

function editGroup(g) {
  editing.value = true
  editingId.value = g.id
  Object.assign(form, {
    name: g.name, description: g.description,
    two_step_deposit: g.two_step_deposit, is_active: g.is_active,
    deposit_fee_percent: g.deposit_fee_percent || 0,
    withdrawal_fee_percent: g.withdrawal_fee_percent || 0,
    teslim_fee_percent: g.teslim_fee_percent || 0,
  })
  dialog.value = true
}

async function save() {
  saving.value = true
  errorText.value = ''
  try {
    if (editing.value) await api.put(`/portal/sub-groups/${editingId.value}`, form)
    else await api.post('/portal/sub-groups', form)
    dialog.value = false
    await loadGroups()
  } catch (err) {
    errorText.value = err.response?.data?.message || 'Alt grup kaydedilemedi.'
  } finally {
    saving.value = false
  }
}

// Toggle ucu govde beklemiyor; yeni durumu backend belirledigi icin
// satiri elle degistirmeyip listeyi bastan cekiyoruz.
async function toggleGroup(g) {
  togglingId.value = g.id
  errorText.value = ''
  try {
    await api.post(`/portal/sub-groups/${g.id}/toggle`)
    await loadGroups()
  } catch (err) {
    errorText.value = err.response?.data?.message || 'Grup durumu değiştirilemedi.'
  } finally {
    togglingId.value = null
  }
}

async function loadGroups() {
  loading.value = true
  try {
    const params = statusFilter.value ? { status: statusFilter.value } : {}
    const { data } = await api.get('/portal/sub-groups', { params })
    groups.value = Array.isArray(data) ? data : []
  } catch (err) {
    errorText.value = err.response?.data?.message || 'Alt gruplar yüklenemedi.'
  } finally {
    loading.value = false
  }
}
onMounted(() => loadGroups())
</script>

<style scoped>
/* ── Filtre kabugu — Yatirim/Cekim listeleriyle ayni gorsel dil ── */
.filter-shell {
  padding: 12px 16px;
  border-bottom: 1px solid var(--sp-divider, rgba(255, 255, 255, 0.06));
  background: linear-gradient(180deg, rgba(102, 241, 189, 0.04), transparent);
}
.filter-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}

.status-pill {
  display: inline-flex; align-items: center;
  padding: 5px 12px;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 700;
  letter-spacing: 0.3px;
  cursor: pointer;
  background: transparent;
  border: 1px solid var(--sp-border);
  color: var(--sp-text-muted);
  transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease, transform 0.15s ease;
}
.status-pill:hover { transform: translateY(-1px); }
.status-pill.pill-grey.is-active    { background: rgba(113, 132, 122, 0.35); border-color: rgba(160, 160, 160, 0.6); color: #FFF; }
.status-pill.pill-success.is-active { background: rgba(102, 241, 189, 0.22); border-color: rgba(102, 241, 189, 0.55); color: var(--sp-accent-success); }

/* ── Satirdaki durum rozeti (banka hesaplari ekranindaki kalip) ── */
.state-pill {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 10.5px; font-weight: 700; letter-spacing: 0.3px;
  text-transform: uppercase;
}
.state-pill .state-dot {
  width: 6px; height: 6px; border-radius: 50%;
  display: inline-block;
}
.state-pill.is-on {
  background: rgba(102, 241, 189, 0.15);
  color: var(--sp-accent-success);
  border: 1px solid rgba(102, 241, 189, 0.25);
}
.state-pill.is-on .state-dot {
  background: var(--sp-accent-success);
  box-shadow: 0 0 0 3px rgba(102, 241, 189, 0.18);
}
.state-pill.is-off {
  background: rgba(113, 132, 122, 0.12);
  color: var(--sp-text-dim);
  border: 1px solid rgba(113, 132, 122, 0.2);
}
.state-pill.is-off .state-dot { background: var(--sp-text-dim); }

/* Krediler hizali okunsun diye tabular rakam. */
.amount { font-variant-numeric: tabular-nums; font-weight: 600; }
.amount.pos { color: var(--sp-accent-success); }
.amount.zero { color: var(--sp-text-muted); }
.amount.neg { color: var(--sp-accent-rose); }

/* ── Responsive ── */
@media (max-width: 960px) {
  :deep(.v-data-table) {
    overflow-x: auto;
  }
  :deep(.v-data-table table) {
    min-width: 820px;
  }
}
</style>

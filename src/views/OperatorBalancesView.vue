<template>
  <div class="bal-view">
    <div class="bal-head">
      <div>
        <div class="bal-title">Operatör Bakiyeleri</div>
        <div class="bal-sub">
          Alt gruplardaki kullanıcıların güncel kredisi. Rakamlar operatörün
          kendi ekranında gördüğüyle aynı hesaptan gelir.
        </div>
      </div>
      <v-btn variant="tonal" size="small" :loading="loading" @click="load" prepend-icon="mdi-refresh">
        Yenile
      </v-btn>
    </div>

    <!-- Ozet: tek tek satirlara bakmadan once toplamlar -->
    <div class="bal-totals">
      <div class="tot">
        <span class="tot-l">TOPLAM KREDİ</span>
        <span class="tot-n">{{ money(totals.credit) }} <small>TRY</small></span>
      </div>
      <div class="tot">
        <span class="tot-l">TOPLAM TESLİM</span>
        <span class="tot-n">{{ money(totals.teslim) }} <small>TRY</small></span>
      </div>
      <div class="tot">
        <span class="tot-l">BEKLEYEN YATIRIM</span>
        <span class="tot-n">{{ money(totals.in_flight) }} <small>TRY</small></span>
      </div>
    </div>

    <div class="bal-filters">
      <v-text-field
        v-model="search" label="Ara" density="compact" variant="outlined"
        hide-details clearable prepend-inner-icon="mdi-magnify" style="max-width: 280px"
      />
      <v-select
        v-model="groupFilter" :items="groupOptions" label="Alt grup"
        density="compact" variant="outlined" hide-details clearable style="max-width: 220px"
      />
      <v-switch
        v-model="onlyOperators" color="primary" density="compact" hide-details
        label="Yalnızca hesabı olanlar"
      />
    </div>

    <v-data-table
      :headers="headers"
      :items="filtered"
      :loading="loading"
      :items-per-page="25"
      density="comfortable"
      class="bal-table"
      no-data-text="Kayıt yok."
    >
      <template #item.name="{ item }">
        <div class="who">
          <span class="who-name">{{ item.name }}</span>
          <v-chip v-if="!item.is_active" size="x-small" color="error" variant="tonal">pasif</v-chip>
        </div>
        <div class="who-mail">{{ item.email }}</div>
      </template>

      <template #item.sub_group="{ item }">
        {{ item.sub_group || '—' }}
      </template>

      <template #item.roles="{ item }">
        <span class="muted">{{ (item.roles || []).join(', ') || '—' }}</span>
      </template>

      <template #item.bank_account_count="{ item }">
        <span :class="item.bank_account_count ? '' : 'muted'">{{ item.bank_account_count }}</span>
      </template>

      <template #item.credit="{ item }">
        <!-- Kredi > 0 saglikli: platformun operatore borcu / yatirim
             alma kapasitesi. 0 "limit doldu", negatif ise mudahale
             gerektiriyor (bkz. OperatorCredit). -->
        <span class="amount" :class="creditClass(item.credit)">{{ money(item.credit) }}</span>
      </template>

      <template #item.teslim_total="{ item }">
        <span class="amount muted">{{ money(item.teslim_total) }}</span>
      </template>

      <template #item.in_flight="{ item }">
        <span class="amount" :class="item.in_flight > 0 ? 'pending' : 'muted'">
          {{ money(item.in_flight) }}
        </span>
      </template>
    </v-data-table>

    <div class="bal-note">
      <v-icon size="14" class="mr-1">mdi-information-outline</v-icon>
      Kredi = onaylı teslim + ödenen çekimler + komisyonlar − tahsil edilen yatırımlar
      − bekleyen yatırım rezervasyonu. Çekim ödemek krediyi <strong>artırır</strong>;
      yatırım tahsil etmek azaltır.
    </div>

    <v-snackbar v-model="snackbar" color="error" timeout="3500">{{ snackText }}</v-snackbar>
  </div>
</template>

<script setup>
/**
 * Operator bakiyeleri (yonetim gorunumu).
 *
 * Operatorler teslim yapip kendi hesaplarina kredi yukluyordu ama
 * yonetim tarafinda bu bakiyeyi topluca gorecek bir yer yoktu.
 */
import { ref, computed, onMounted } from 'vue'
import api from '@/plugins/axios'

const rows = ref([])
const totals = ref({ credit: 0, teslim: 0, in_flight: 0 })
const loading = ref(false)
const search = ref('')
const groupFilter = ref(null)
const onlyOperators = ref(true)

const snackbar = ref(false)
const snackText = ref('')

const headers = [
  { title: 'Kullanıcı', key: 'name' },
  { title: 'Alt Grup', key: 'sub_group' },
  { title: 'Rol', key: 'roles', sortable: false },
  { title: 'Hesap', key: 'bank_account_count', align: 'center' },
  { title: 'Kredi (TRY)', key: 'credit', align: 'end' },
  { title: 'Teslim (TRY)', key: 'teslim_total', align: 'end' },
  { title: 'Bekleyen (TRY)', key: 'in_flight', align: 'end' },
]

const groupOptions = computed(() =>
  [...new Set(rows.value.map(r => r.sub_group).filter(Boolean))].sort()
)

const filtered = computed(() => {
  const q = (search.value || '').toLowerCase().trim()
  return rows.value.filter(r => {
    // Hesabi olmayan kullanici para tasimiyor; varsayilan olarak
    // gizli, cunku listeyi kalabalik gosteriyor.
    if (onlyOperators.value && !r.bank_account_count) return false
    if (groupFilter.value && r.sub_group !== groupFilter.value) return false
    if (!q) return true
    return `${r.name} ${r.email}`.toLowerCase().includes(q)
  })
})

function money(v) {
  return new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    .format(Number(v || 0))
}

function creditClass(v) {
  const n = Number(v || 0)
  if (n < 0) return 'neg'
  if (n === 0) return 'zero'
  return 'pos'
}

async function load() {
  loading.value = true
  try {
    const { data } = await api.get('/portal/operator-balances')
    rows.value = data.data || []
    totals.value = data.totals || { credit: 0, teslim: 0, in_flight: 0 }
  } catch (e) {
    snackText.value = e.response?.data?.message || 'Bakiyeler yüklenemedi.'
    snackbar.value = true
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.bal-view { padding: 4px; }

.bal-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 14px;
}
.bal-title { font-size: 18px; font-weight: 700; letter-spacing: -0.02em; }
.bal-sub { font-size: 12.5px; color: var(--sp-text-muted); max-width: 620px; }

.bal-totals {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
  margin-bottom: 14px;
}
.tot {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px 14px;
  background: var(--sp-glass-bg);
  border: 1px solid var(--sp-border);
  border-top: 2px solid var(--sp-primary);
}
.tot-l { font-size: 10px; letter-spacing: 0.1em; color: var(--sp-text-muted); }
.tot-n { font-size: 18px; font-weight: 700; font-variant-numeric: tabular-nums; }
.tot-n small { font-size: 11px; color: var(--sp-text-muted); font-weight: 500; }

.bal-filters {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 14px;
  margin-bottom: 12px;
}

.bal-table { background: var(--sp-glass-bg); border: 1px solid var(--sp-border); }

.who { display: flex; align-items: center; gap: 8px; }
.who-name { font-weight: 600; }
.who-mail { font-size: 11px; color: var(--sp-text-muted); }
.muted { color: var(--sp-text-muted); }

.amount { font-variant-numeric: tabular-nums; font-weight: 600; }
.amount.pos { color: var(--sp-primary); }
.amount.zero { color: var(--sp-text-muted); }
.amount.neg { color: var(--sp-accent-error); }
.amount.pending { color: var(--sp-accent-orange); }

.bal-note {
  display: flex;
  align-items: flex-start;
  margin-top: 12px;
  padding: 10px 12px;
  font-size: 11.5px;
  line-height: 1.6;
  color: var(--sp-text-muted);
  background: var(--sp-glass-bg);
  border: 1px solid var(--sp-border);
}
</style>

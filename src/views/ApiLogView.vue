<template>
  <div>
    <!-- ══ Overview Stats ══ -->
    <div class="overview-row mb-4" v-if="stats">
      <div class="ov-card">
        <div class="ov-icon" style="background: rgba(102,241,189,0.1); color: var(--sp-primary)"><v-icon size="20">mdi-swap-horizontal</v-icon></div>
        <div class="ov-body"><div class="ov-val">{{ stats.total_24h }}</div><div class="ov-lbl">Toplam İstek (24s)</div></div>
      </div>
      <div class="ov-card" v-for="(count, source) in stats.by_source" :key="source">
        <div class="ov-icon" :style="{ background: sourceIconBg(source), color: sourceIconColor(source) }"><v-icon size="20">{{ sourceIcon(source) }}</v-icon></div>
        <div class="ov-body"><div class="ov-val">{{ count }}</div><div class="ov-lbl">{{ sourceLabel(source) }}</div></div>
      </div>
      <div class="ov-card">
        <div class="ov-icon" style="background: rgba(6,182,212,0.1); color: var(--sp-accent-cyan)"><v-icon size="20">mdi-timer-outline</v-icon></div>
        <div class="ov-body"><div class="ov-val">{{ stats.avg_duration_ms }}<span class="ov-unit">ms</span></div><div class="ov-lbl">Ort. Yanıt Süresi</div></div>
      </div>
      <div class="ov-card ov-error" v-if="stats.by_status">
        <div class="ov-icon" style="background: rgba(255,142,130,0.1); color: var(--sp-accent-error)"><v-icon size="20">mdi-alert-circle-outline</v-icon></div>
        <div class="ov-body"><div class="ov-val">{{ errorCount }}</div><div class="ov-lbl">Hatalı İstek (24s)</div></div>
      </div>
    </div>

    <!-- ══ Main Card ══ -->
    <v-card>
      <v-card-title class="d-flex align-center flex-wrap ga-2 pa-4">
        <v-icon start color="secondary" size="20">mdi-console-network</v-icon>
        <span class="font-weight-bold">İstek Kayıtları</span>
        <v-spacer />
        <v-text-field
          v-model="search" placeholder="URL, IP veya içerik ara..."
          prepend-inner-icon="mdi-magnify" density="compact" variant="outlined"
          hide-details clearable style="max-width: 260px"
          @keyup.enter="loadData" @click:clear="search = ''; loadData()"
        />
      </v-card-title>

      <!-- Quick Filters -->
      <div class="filter-row">
        <v-select v-model="filters.source" :items="sourceOptions" item-title="text" item-value="value" label="Kaynak" variant="outlined" density="compact" clearable hide-details class="filter-field" @update:model-value="loadData" />
        <v-select v-model="filters.method" :items="['GET','POST','PUT','PATCH','DELETE']" label="Yöntem" variant="outlined" density="compact" clearable hide-details class="filter-field" @update:model-value="loadData" />
        <v-select v-model="filters.statusGroup" :items="statusGroupOptions" item-title="text" item-value="value" label="Sonuç" variant="outlined" density="compact" clearable hide-details class="filter-field" @update:model-value="loadData" />
        <v-select v-model="filters.user_type" :items="userTypeOptions" item-title="text" item-value="value" label="Kim" variant="outlined" density="compact" clearable hide-details class="filter-field" @update:model-value="loadData" />
        <v-text-field v-model="filters.date_from" label="Başlangıç" type="date" variant="outlined" density="compact" hide-details class="filter-field" @change="loadData" />
        <v-text-field v-model="filters.date_to" label="Bitiş" type="date" variant="outlined" density="compact" hide-details class="filter-field" @change="loadData" />
      </div>

      <!-- Table — simplified for quick scanning -->
      <v-data-table-server
        :headers="headers" :items="items" :items-length="total"
        :loading="loading" :items-per-page="50"
        @update:page="page = $event; loadData()"
        density="compact" class="log-table"
        @click:row="(e, { item }) => openDetail(item)"
        no-data-text="Kayıt bulunamadı"
      >
        <template #item.created_at="{ item }">
          <div style="line-height: 1.3">
            <div class="text-caption" style="color: var(--sp-text)">{{ fmtDate(item.created_at) }}</div>
            <div class="text-caption" style="color: var(--sp-text-hint)">{{ fmtClock(item.created_at) }}</div>
          </div>
        </template>

        <template #item.action="{ item }">
          <div style="line-height: 1.3">
            <div class="d-flex align-center ga-1">
              <v-chip :color="methodColor(item.method)" size="x-small" variant="flat" label class="font-weight-bold" style="min-width: 42px; justify-content: center">{{ item.method }}</v-chip>
              <span class="text-caption font-weight-medium" style="color: var(--sp-text)">{{ describeAction(item) }}</span>
            </div>
            <div class="mono" style="font-size: 10px; color: var(--sp-text-hint)">{{ shortenUrl(item.url) }}</div>
          </div>
        </template>

        <template #item.who="{ item }">
          <div style="line-height: 1.4">
            <div class="d-flex align-center ga-1">
              <v-chip :color="sourceColor(item.source)" size="x-small" variant="tonal">{{ sourceLabel(item.source) }}</v-chip>
              <span v-if="item.user_name" class="text-caption font-weight-medium" style="color: var(--sp-text)">{{ item.user_name }}</span>
            </div>
            <div v-if="item.merchant_name" class="text-caption" style="color: var(--sp-text-dim)">
              <v-icon size="10" class="mr-1" style="opacity: 0.5">mdi-store</v-icon>{{ item.merchant_name }}
            </div>
            <div v-else class="text-caption mono" style="color: var(--sp-text-hint); font-size: 10px">{{ item.ip }}</div>
          </div>
        </template>

        <template #item.result="{ item }">
          <div class="d-flex align-center ga-2">
            <v-chip :color="statusColor(item.response_status)" size="x-small" variant="tonal" label>{{ item.response_status }}</v-chip>
            <span class="text-caption" :style="{ color: item.duration_ms > 1000 ? 'var(--sp-accent-error)' : 'var(--sp-text-hint)' }">{{ item.duration_ms }}ms</span>
          </div>
        </template>
      </v-data-table-server>
    </v-card>

    <!-- ══ Detail Dialog ══ -->
    <v-dialog v-model="detailDialog" max-width="800" scrollable>
      <v-card v-if="sel">
        <v-card-title class="d-flex align-center pa-4" style="border-bottom: 1px solid var(--sp-border)">
          <v-chip :color="methodColor(sel.method)" size="small" variant="flat" label class="font-weight-bold mr-3">{{ sel.method }}</v-chip>
          <span class="font-weight-bold" style="color: var(--sp-text)">{{ describeAction(sel) }}</span>
          <v-spacer />
          <v-chip :color="statusColor(sel.response_status)" size="small" variant="tonal" class="mr-2">{{ sel.response_status }}</v-chip>
          <v-btn icon variant="text" size="small" @click="detailDialog = false"><v-icon>mdi-close</v-icon></v-btn>
        </v-card-title>

        <v-card-text class="pa-0" style="max-height: 70vh">
          <!-- Summary — always visible -->
          <div class="detail-summary">
            <div class="ds-item"><v-icon size="14" class="mr-1" style="color: var(--sp-text-hint)">mdi-clock-outline</v-icon>{{ fmtFull(sel.created_at) }}</div>
            <div class="ds-item"><v-icon size="14" class="mr-1" style="color: var(--sp-text-hint)">mdi-timer-outline</v-icon>{{ sel.duration_ms }}ms</div>
            <div class="ds-item"><v-icon size="14" class="mr-1" style="color: var(--sp-text-hint)">mdi-ip-network</v-icon><span class="mono">{{ sel.ip }}</span></div>
            <div class="ds-item"><v-chip :color="sourceColor(sel.source)" size="x-small" variant="tonal">{{ sourceLabel(sel.source) }}</v-chip></div>
            <div class="ds-item" v-if="sel.user_name || sel.user_type">
              <v-icon size="14" class="mr-1" style="color: var(--sp-text-hint)">mdi-account</v-icon>
              <strong v-if="sel.user_name">{{ sel.user_name }}</strong>
              <span v-else>{{ userTypeLabel(sel.user_type) }}</span>
              <span v-if="sel.user_id" style="color: var(--sp-text-hint); margin-left: 4px">#{{ sel.user_id }}</span>
            </div>
            <div class="ds-item" v-if="sel.merchant_name || sel.merchant_id">
              <v-icon size="14" class="mr-1" style="color: var(--sp-text-hint)">mdi-store</v-icon>
              <strong v-if="sel.merchant_name">{{ sel.merchant_name }}</strong>
              <span v-else class="mono">{{ sel.merchant_id.substring(0, 12) }}...</span>
            </div>
          </div>

          <!-- Technical details — expandable -->
          <v-expansion-panels variant="accordion" class="detail-panels">
            <v-expansion-panel>
              <v-expansion-panel-title class="detail-panel-title">
                <v-icon size="16" class="mr-2" style="color: var(--sp-primary)">mdi-link-variant</v-icon> URL & User Agent
              </v-expansion-panel-title>
              <v-expansion-panel-text>
                <div class="detail-code mb-2">{{ sel.url }}</div>
                <div v-if="sel.user_agent" class="detail-code" style="font-size: 10px; color: var(--sp-text-hint)">{{ sel.user_agent }}</div>
              </v-expansion-panel-text>
            </v-expansion-panel>

            <v-expansion-panel v-if="sel.request_headers">
              <v-expansion-panel-title class="detail-panel-title">
                <v-icon size="16" class="mr-2" style="color: var(--sp-accent-blue)">mdi-code-braces</v-icon> İstek Başlıkları
              </v-expansion-panel-title>
              <v-expansion-panel-text>
                <pre class="detail-json">{{ JSON.stringify(sel.request_headers, null, 2) }}</pre>
              </v-expansion-panel-text>
            </v-expansion-panel>

            <v-expansion-panel v-if="sel.request_body">
              <v-expansion-panel-title class="detail-panel-title">
                <v-icon size="16" class="mr-2" style="color: var(--sp-accent-success)">mdi-upload</v-icon> İstek Gövdesi
              </v-expansion-panel-title>
              <v-expansion-panel-text>
                <pre class="detail-json">{{ JSON.stringify(sel.request_body, null, 2) }}</pre>
              </v-expansion-panel-text>
            </v-expansion-panel>

            <v-expansion-panel v-if="sel.response_body">
              <v-expansion-panel-title class="detail-panel-title">
                <v-icon size="16" class="mr-2" style="color: var(--sp-accent-orange)">mdi-download</v-icon> Yanıt Gövdesi
                <v-spacer />
                <v-chip :color="statusColor(sel.response_status)" size="x-small" variant="tonal" class="mr-2">{{ sel.response_status }}</v-chip>
              </v-expansion-panel-title>
              <v-expansion-panel-text>
                <pre class="detail-json">{{ typeof sel.response_body === 'string' ? sel.response_body : JSON.stringify(sel.response_body, null, 2) }}</pre>
              </v-expansion-panel-text>
            </v-expansion-panel>
          </v-expansion-panels>
        </v-card-text>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import api from '@/plugins/axios'

const items = ref([])
const total = ref(0)
const loading = ref(false)
const page = ref(1)
const search = ref('')
const stats = ref(null)
const detailDialog = ref(false)
const sel = ref(null)

const filters = reactive({ source: null, method: null, statusGroup: null, user_type: null, date_from: '', date_to: '' })

const sourceOptions = [
  { text: 'API (Bayi Entegrasyonu)', value: 'api' },
  { text: 'Admin Portal', value: 'portal' },
  { text: 'Bayi Paneli', value: 'merchant' },
  { text: 'Diğer', value: 'other' },
]
const statusGroupOptions = [
  { text: 'Başarılı (2xx)', value: '2xx' },
  { text: 'İstemci Hatası (4xx)', value: '4xx' },
  { text: 'Sunucu Hatası (5xx)', value: '5xx' },
]
const userTypeOptions = [
  { text: 'API Key (Bayi)', value: 'api_key' },
  { text: 'Bayi Kullanıcı', value: 'merchant_user' },
  { text: 'Admin', value: 'user' },
]

const headers = [
  { title: 'Tarih', key: 'created_at', width: '90px', sortable: false },
  { title: 'İşlem', key: 'action', sortable: false },
  { title: 'Kullanıcı / Bayi', key: 'who', width: '180px', sortable: false },
  { title: 'Sonuç', key: 'result', width: '120px', sortable: false },
]

const errorCount = computed(() => {
  if (!stats.value?.by_status) return 0
  const s = stats.value.by_status
  return (s['401'] || 0) + (s['403'] || 0) + (s['422'] || 0) + (s['429'] || 0) + (s['500'] || 0)
})

// ── Human-readable action descriptions ──
function describeAction(item) {
  const path = shortenUrl(item.url)
  const m = item.method

  if (path.includes('/deposit/initiate')) return 'Yatırım İsteği'
  if (path.includes('/withdrawal/initiate')) return 'Çekim İsteği'
  if (path.includes('/notify-payment')) return 'Ödeme Bildirimi'
  if (path.includes('/transactions/') && m === 'GET') return 'İşlem Sorgulama'
  if (path.includes('/banks') && m === 'GET') return 'Banka Listesi'
  if (path.includes('/login') && m === 'POST') return 'Giriş Denemesi'
  if (path.includes('/logout')) return 'Çıkış'
  if (path.includes('/me') && m === 'GET') return 'Oturum Kontrolü'
  if (path.includes('/dashboard')) return 'Dashboard Yükleme'
  if (path.includes('/settlements') && m === 'POST') return 'Mutabakat Talebi'
  if (path.includes('/settlements') && m === 'GET') return 'Mutabakat Listesi'
  if (path.includes('/settings')) return 'Ayar İşlemi'
  if (path.includes('/api-docs')) return 'API Doküman'
  if (path.includes('/proposals')) return 'Teklif İşlemi'
  if (path.includes('/merchants')) return 'Bayi İşlemi'
  if (path.includes('/reports')) return 'Rapor'
  if (path.includes('/api-logs')) return 'Log Görüntüleme'
  if (path.includes('/transactions') && m === 'GET') return 'İşlem Listesi'
  if (path.includes('/approve')) return 'Onay İşlemi'
  if (path.includes('/reject')) return 'Red İşlemi'
  if (path.includes('/lock')) return 'Kilitleme'
  if (path.includes('/bank-accounts')) return 'Banka Hesabı'
  if (path.includes('/users')) return 'Kullanıcı İşlemi'
  if (path.includes('/clock')) return 'Mesai Takip'
  if (path.includes('/sandbox')) return 'Sandbox İşlemi'
  return path.split('?')[0].split('/').pop() || path
}

function sourceLabel(s) { return { api: 'API', portal: 'Admin', merchant: 'Bayi', other: 'Diğer' }[s] || s }
function sourceColor(s) { return { api: 'info', portal: 'secondary', merchant: 'success', other: 'grey' }[s] || 'grey' }
function sourceIcon(s) { return { api: 'mdi-api', portal: 'mdi-shield-account', merchant: 'mdi-store', other: 'mdi-help-circle' }[s] || 'mdi-help' }
function sourceIconBg(s) { return { api: 'rgba(112,169,255,0.1)', portal: 'rgba(102,241,189,0.1)', merchant: 'rgba(102,241,189,0.1)', other: 'rgba(148,163,184,0.1)' }[s] || 'rgba(0,0,0,0.05)' }
function sourceIconColor(s) { return { api: 'var(--sp-accent-blue)', portal: 'var(--sp-primary)', merchant: 'var(--sp-accent-success)', other: 'var(--sp-text-muted)' }[s] || 'var(--sp-text-muted)' }
function methodColor(m) { return { GET: 'info', POST: 'success', PUT: 'warning', PATCH: 'warning', DELETE: 'error' }[m] || 'grey' }
function statusColor(s) { if (s < 300) return 'success'; if (s < 400) return 'info'; if (s < 500) return 'warning'; return 'error' }
function userTypeLabel(t) { return { api_key: 'API', merchant_user: 'Bayi', user: 'Admin' }[t] || t }

function fmtDate(d) { return d ? new Date(d).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' }) : '' }
function fmtClock(d) { return d ? new Date(d).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '' }
function fmtFull(d) { return d ? new Date(d).toLocaleString('tr-TR') : '' }

function shortenUrl(url) {
  if (!url) return ''
  try { return new URL(url).pathname + new URL(url).search } catch { return url }
}

function statusRange(group) {
  return { '2xx': [200, 299], '3xx': [300, 399], '4xx': [400, 499], '5xx': [500, 599] }[group] || null
}

async function loadData() {
  loading.value = true
  try {
    const params = { page: page.value, per_page: 50 }
    if (search.value) params.search = search.value
    if (filters.source) params.source = filters.source
    if (filters.method) params.method_filter = filters.method
    if (filters.user_type) params.user_type = filters.user_type
    if (filters.date_from) params.date_from = filters.date_from
    if (filters.date_to) params.date_to = filters.date_to
    if (filters.statusGroup) {
      const range = statusRange(filters.statusGroup)
      if (range) { params.status_min = range[0]; params.status_max = range[1] }
    }
    const { data } = await api.get('/portal/api-logs', { params })
    items.value = data.data
    total.value = data.meta?.total || data.total || 0
  } finally { loading.value = false }
}

async function loadStats() {
  try { const { data } = await api.get('/portal/api-logs/stats'); stats.value = data } catch {}
}

async function openDetail(item) {
  try { const { data } = await api.get(`/portal/api-logs/${item.id}`); sel.value = data; detailDialog.value = true } catch {}
}

onMounted(() => { loadData(); loadStats() })
</script>

<style scoped>
.mono { font-family: 'JetBrains Mono', 'Fira Code', monospace; }

/* ── Overview Cards ── */
.overview-row { display: flex; gap: 10px; flex-wrap: wrap; }
.ov-card {
  flex: 1; min-width: 140px;
  display: flex; align-items: center; gap: 12px;
  padding: 14px 16px; border-radius: 0;
  background: var(--sp-card, #fff); border: 1px solid var(--sp-border);
}
.ov-icon { width: 40px; height: 40px; border-radius: 0; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.ov-val { font-size: 18px; font-weight: 800; color: var(--sp-text); letter-spacing: -0.5px; }
.ov-unit { font-size: 11px; font-weight: 500; color: var(--sp-text-dim); margin-left: 1px; }
.ov-lbl { font-size: 10px; font-weight: 600; color: var(--sp-text-dim); }
.ov-error .ov-val { color: var(--sp-accent-error); }

/* ── Filters ── */
.filter-row {
  display: flex; gap: 8px; padding: 8px 16px; flex-wrap: wrap;
  border-bottom: 1px solid var(--sp-border);
}
.filter-field { min-width: 120px; max-width: 160px; flex: 1; }

/* ── Table ── */
.log-table :deep(tr) { cursor: pointer; }
.log-table :deep(tr:hover td) { background: var(--sp-hover) !important; }
.log-table :deep(th) { font-weight: 600 !important; text-transform: uppercase; font-size: 10px !important; letter-spacing: 0.5px; color: var(--sp-text-dim) !important; }

/* ── Detail Dialog ── */
.detail-summary {
  display: flex; flex-wrap: wrap; gap: 12px; align-items: center;
  padding: 14px 20px;
  background: var(--sp-surface-1, rgba(102,241,189,0.03));
  border-bottom: 1px solid var(--sp-border);
}
.ds-item { display: flex; align-items: center; font-size: 12px; color: var(--sp-text); }

.detail-panels :deep(.v-expansion-panel) { background: transparent !important; }
.detail-panel-title { font-size: 13px !important; font-weight: 600 !important; min-height: 44px !important; }

.detail-code {
  font-size: 11px; font-family: 'JetBrains Mono', monospace;
  color: var(--sp-text-dim); background: var(--sp-surface-1, rgba(0,0,0,0.03));
  padding: 8px 12px; border-radius: 0; word-break: break-all;
}
.detail-json {
  font-size: 11px; font-family: 'JetBrains Mono', monospace;
  background: var(--sp-surface-bright); color: var(--sp-text);
  padding: 12px 16px; border-radius: 0;
  white-space: pre-wrap; word-break: break-all;
  max-height: 300px; overflow-y: auto;
}

@media (max-width: 600px) {
  .overview-row { flex-direction: column; }
  .filter-row { flex-direction: column; }
  .filter-field { max-width: 100%; }
}
</style>

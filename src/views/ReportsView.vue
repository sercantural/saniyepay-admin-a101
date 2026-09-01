<template>
  <div>
    <!-- Filtreler -->
    <v-card class="mb-4">
      <v-card-text class="pa-4">
        <v-row dense align="center">
          <v-col cols="6" sm="4" md="2">
            <v-text-field v-model="filters.date_from" label="Başlangıç" type="date" density="compact" />
          </v-col>
          <v-col cols="6" sm="4" md="2">
            <v-text-field v-model="filters.date_to" label="Bitiş" type="date" density="compact" />
          </v-col>
          <v-col cols="6" sm="4" md="2" v-if="isSuperAdmin">
            <v-select v-model="filters.merchant_id" :items="merchants" item-title="name" item-value="id" label="Bayi" clearable density="compact" />
          </v-col>
          <v-col cols="6" sm="4" md="2" v-if="isSuperAdmin">
            <v-select v-model="filters.sub_group_id" :items="subGroups" item-title="name" item-value="id" label="Alt Grup" clearable density="compact" />
          </v-col>
          <v-col cols="6" sm="4" md="2">
            <v-select v-model="filters.type" :items="typeOptions" item-title="text" item-value="value" label="Tür" clearable density="compact" />
          </v-col>
          <v-col cols="6" sm="4" md="2">
            <v-btn color="primary" variant="tonal" @click="fetchAll" :loading="loading" block>
              <v-icon start size="18">mdi-magnify</v-icon> Rapor Oluştur
            </v-btn>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Özet Kartlar -->
    <v-row class="mb-4" v-if="summary">
      <v-col cols="6" sm="4" md="2">
        <v-card>
          <v-card-text class="pa-4 text-center">
            <v-icon color="success" size="28" class="mb-1">mdi-plus-thick</v-icon>
            <div class="text-caption text-medium-emphasis">Yatırım</div>
            <div class="text-h6 font-weight-bold">{{ summary.toplam_yatirim_adet }}</div>
            <div class="text-caption" style="color: var(--sp-accent-success)">{{ formatCurrency(summary.toplam_yatirim_hacim) }}</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="6" sm="4" md="2">
        <v-card>
          <v-card-text class="pa-4 text-center">
            <v-icon color="info" size="28" class="mb-1">mdi-minus-thick</v-icon>
            <div class="text-caption text-medium-emphasis">Çekim</div>
            <div class="text-h6 font-weight-bold">{{ summary.toplam_cekim_adet }}</div>
            <div class="text-caption" style="color: var(--sp-accent-cyan)">{{ formatCurrency(summary.toplam_cekim_hacim) }}</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="6" sm="4" md="2">
        <v-card>
          <v-card-text class="pa-4 text-center">
            <v-icon color="primary" size="28" class="mb-1">mdi-sigma</v-icon>
            <div class="text-caption text-medium-emphasis">Toplam Hacim</div>
            <div class="text-h6 font-weight-bold">{{ summary.toplam_islem_adet }}</div>
            <div class="text-caption" style="color: var(--sp-primary)">{{ formatCurrency(summary.toplam_islem_hacmi) }}</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="6" sm="4" md="2">
        <v-card>
          <v-card-text class="pa-4 text-center">
            <v-icon color="error" size="28" class="mb-1">mdi-close-circle</v-icon>
            <div class="text-caption text-medium-emphasis">Reddedilen</div>
            <div class="text-h6 font-weight-bold">{{ summary.reddedilen_adet || 0 }}</div>
          </v-card-text>
        </v-card>
      </v-col>
      <!-- Komisyon kartları — sadece super admin -->
      <template v-if="isSuperAdmin && summary.toplam_komisyon !== undefined">
        <v-col cols="6" sm="4" md="2">
          <v-card>
            <v-card-text class="pa-4 text-center">
              <v-icon color="warning" size="28" class="mb-1">mdi-percent</v-icon>
              <div class="text-caption text-medium-emphasis">Toplam Komisyon</div>
              <div class="text-h6 font-weight-bold" style="color: var(--sp-accent-amber)">{{ formatCurrency(summary.toplam_komisyon) }}</div>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="6" sm="4" md="2">
          <v-card>
            <v-card-text class="pa-4 text-center">
              <v-icon color="success" size="28" class="mb-1">mdi-cash-multiple</v-icon>
              <div class="text-caption text-medium-emphasis">Sahip Kârı</div>
              <div class="text-h6 font-weight-bold" style="color: var(--sp-accent-success)">{{ formatCurrency(summary.toplam_owner_kar) }}</div>
              <div class="text-caption text-medium-emphasis">Grup: {{ formatCurrency(summary.toplam_grup_payi) }}</div>
            </v-card-text>
          </v-card>
        </v-col>
      </template>
    </v-row>

    <!-- Mutabakat Özet — super admin only -->
    <v-row class="mb-4" v-if="isSuperAdmin && summary && summary.mutabakat_bayi_adet !== undefined">
      <v-col cols="12">
        <div class="text-subtitle-2 font-weight-bold mb-2" style="color: var(--sp-text-muted)">MUTABAKAT ÖZETİ</div>
      </v-col>
      <v-col cols="6" sm="4" md="2">
        <v-card>
          <v-card-text class="pa-4 text-center">
            <v-icon color="secondary" size="28" class="mb-1">mdi-bank-transfer-out</v-icon>
            <div class="text-caption text-medium-emphasis">Bayi Mutabakat</div>
            <div class="text-h6 font-weight-bold">{{ summary.mutabakat_bayi_adet }}</div>
            <div class="text-caption" style="color: var(--sp-accent-purple)">{{ formatCurrency(summary.mutabakat_bayi_hacim) }}</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="6" sm="4" md="2">
        <v-card>
          <v-card-text class="pa-4 text-center">
            <v-icon color="warning" size="28" class="mb-1">mdi-percent</v-icon>
            <div class="text-caption text-medium-emphasis">M. Komisyon</div>
            <div class="text-h6 font-weight-bold" style="color: var(--sp-accent-amber)">{{ formatCurrency(summary.mutabakat_bayi_komisyon) }}</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="6" sm="4" md="2">
        <v-card>
          <v-card-text class="pa-4 text-center">
            <v-icon color="success" size="28" class="mb-1">mdi-cash-check</v-icon>
            <div class="text-caption text-medium-emphasis">Bayi Net</div>
            <div class="text-h6 font-weight-bold" style="color: var(--sp-accent-success)">{{ formatCurrency(summary.mutabakat_bayi_net) }}</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="6" sm="4" md="2">
        <v-card>
          <v-card-text class="pa-4 text-center">
            <v-icon color="success" size="28" class="mb-1">mdi-cash-multiple</v-icon>
            <div class="text-caption text-medium-emphasis">M. Sahip Kârı</div>
            <div class="text-h6 font-weight-bold" style="color: var(--sp-accent-success)">{{ formatCurrency(summary.mutabakat_bayi_owner_kar) }}</div>
            <div class="text-caption text-medium-emphasis">Grup: {{ formatCurrency(summary.mutabakat_bayi_grup_payi) }}</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="6" sm="4" md="2">
        <v-card>
          <v-card-text class="pa-4 text-center">
            <v-icon color="grey" size="28" class="mb-1">mdi-domain</v-icon>
            <div class="text-caption text-medium-emphasis">Şirket Mutabakat</div>
            <div class="text-h6 font-weight-bold">{{ summary.mutabakat_sirket_adet }}</div>
            <div class="text-caption" style="color: var(--sp-text-muted)">{{ formatCurrency(summary.mutabakat_sirket_hacim) }}</div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Sekmeler -->
    <v-card>
      <v-tabs v-model="activeTab" color="primary" density="compact">
        <v-tab v-if="isSuperAdmin" value="merchant">Bayi Bazında</v-tab>
        <v-tab v-if="isSuperAdmin" value="subgroup">Grup Bazında</v-tab>
        <v-tab v-if="isSuperAdmin || isGrupYoneticisi" value="operator">Operatör Performansı</v-tab>
        <v-tab v-if="isSuperAdmin || isGrupYoneticisi" value="bank">Banka Hesapları</v-tab>
        <v-tab v-if="isSuperAdmin" value="settlement">Mutabakat</v-tab>
        <v-tab value="trends">Trendler</v-tab>
      </v-tabs>

      <v-divider />

      <v-tabs-window v-model="activeTab">
        <!-- Bayi Bazında -->
        <v-tabs-window-item value="merchant" v-if="isSuperAdmin">
          <v-data-table :headers="merchantHeaders" :items="merchantData" :loading="loading" density="compact" no-data-text="Veri bulunamadı">
            <template v-slot:item.hacim="{ item }">
              <span class="font-weight-medium">{{ formatCurrency(item.hacim) }}</span>
            </template>
            <template v-slot:item.yatirim_hacim="{ item }">
              <span style="color: var(--sp-accent-success)">{{ formatCurrency(item.yatirim_hacim) }}</span>
            </template>
            <template v-slot:item.cekim_hacim="{ item }">
              <span style="color: var(--sp-accent-cyan)">{{ formatCurrency(item.cekim_hacim) }}</span>
            </template>
            <template v-slot:item.toplam_komisyon="{ item }">
              <span style="color: var(--sp-accent-amber)">{{ formatCurrency(item.toplam_komisyon) }}</span>
            </template>
            <template v-slot:item.owner_kar="{ item }">
              <span style="color: var(--sp-accent-success); font-weight: 600">{{ formatCurrency(item.owner_kar) }}</span>
            </template>
          </v-data-table>
        </v-tabs-window-item>

        <!-- Grup Bazında -->
        <v-tabs-window-item value="subgroup" v-if="isSuperAdmin">
          <v-data-table :headers="subGroupHeaders" :items="subGroupData" :loading="loading" density="compact" no-data-text="Veri bulunamadı">
            <template v-slot:item.hacim="{ item }">
              <span class="font-weight-medium">{{ formatCurrency(item.hacim) }}</span>
            </template>
            <template v-slot:item.toplam_komisyon="{ item }">
              <span style="color: var(--sp-accent-amber)">{{ formatCurrency(item.toplam_komisyon) }}</span>
            </template>
            <template v-slot:item.grup_payi="{ item }">
              <span style="color: var(--sp-accent-cyan)">{{ formatCurrency(item.grup_payi) }}</span>
            </template>
            <template v-slot:item.owner_payi="{ item }">
              <span style="color: var(--sp-accent-success); font-weight: 600">{{ formatCurrency(item.owner_payi) }}</span>
            </template>
          </v-data-table>
        </v-tabs-window-item>

        <!-- Operatör Performansı -->
        <v-tabs-window-item value="operator" v-if="isSuperAdmin || isGrupYoneticisi">
          <v-data-table :headers="operatorHeaders" :items="operatorData" :loading="loading" density="compact" no-data-text="Veri bulunamadı">
            <template v-slot:item.hacim="{ item }">
              {{ formatCurrency(item.hacim) }}
            </template>
            <template v-slot:item.ort_dakika="{ item }">
              <v-chip size="small" :color="item.ort_dakika < 10 ? 'success' : item.ort_dakika < 30 ? 'warning' : 'error'" variant="tonal">
                {{ item.ort_dakika || 0 }} dk
              </v-chip>
            </template>
          </v-data-table>
        </v-tabs-window-item>

        <!-- Banka Hesapları -->
        <v-tabs-window-item value="bank" v-if="isSuperAdmin || isGrupYoneticisi">
          <v-data-table :headers="bankHeaders" :items="bankData" :loading="loading" density="compact" no-data-text="Veri bulunamadı">
            <template v-slot:item.iban="{ item }">
              <code class="text-caption">{{ item.iban }}</code>
            </template>
            <template v-slot:item.hacim="{ item }">
              {{ formatCurrency(item.hacim) }}
            </template>
            <template v-slot:item.yatirim_hacim="{ item }">
              <span style="color: var(--sp-accent-success)">{{ formatCurrency(item.yatirim_hacim) }}</span>
            </template>
            <template v-slot:item.cekim_hacim="{ item }">
              <span style="color: var(--sp-accent-cyan)">{{ formatCurrency(item.cekim_hacim) }}</span>
            </template>
          </v-data-table>
        </v-tabs-window-item>

        <!-- Mutabakat -->
        <v-tabs-window-item value="settlement" v-if="isSuperAdmin">
          <div v-if="settlementReport" class="pa-4">
            <!-- Settlement summary row -->
            <v-row dense class="mb-4">
              <v-col cols="6" md="3">
                <div class="settle-stat">
                  <div class="settle-stat-label">Bayi Brüt</div>
                  <div class="settle-stat-value" style="color: var(--sp-accent-purple)">{{ formatCurrency(settlementReport.summary?.toplam_bayi_brut) }}</div>
                </div>
              </v-col>
              <v-col cols="6" md="3">
                <div class="settle-stat">
                  <div class="settle-stat-label">Bayi Komisyon</div>
                  <div class="settle-stat-value" style="color: var(--sp-accent-amber)">{{ formatCurrency(settlementReport.summary?.toplam_bayi_komisyon) }}</div>
                </div>
              </v-col>
              <v-col cols="6" md="3">
                <div class="settle-stat">
                  <div class="settle-stat-label">Bayi Net</div>
                  <div class="settle-stat-value" style="color: var(--sp-accent-success)">{{ formatCurrency(settlementReport.summary?.toplam_bayi_net) }}</div>
                </div>
              </v-col>
              <v-col cols="6" md="3">
                <div class="settle-stat">
                  <div class="settle-stat-label">Toplam USDT</div>
                  <div class="settle-stat-value" style="color: var(--sp-accent-blue)">{{ Number(settlementReport.summary?.toplam_bayi_usdt || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 }) }}</div>
                </div>
              </v-col>
            </v-row>

            <!-- Per-merchant settlement table -->
            <v-data-table
              :headers="settlementHeaders"
              :items="settlementReport.by_merchant || []"
              :loading="loading"
              density="compact"
              no-data-text="Mutabakat verisi bulunamadı"
            >
              <template v-slot:item.brut_hacim="{ item }">
                <span class="font-weight-medium">{{ formatCurrency(item.brut_hacim) }}</span>
              </template>
              <template v-slot:item.toplam_komisyon="{ item }">
                <span style="color: var(--sp-accent-amber)">{{ formatCurrency(item.toplam_komisyon) }}</span>
              </template>
              <template v-slot:item.net_hacim="{ item }">
                <span style="color: var(--sp-accent-success); font-weight: 600">{{ formatCurrency(item.net_hacim) }}</span>
              </template>
              <template v-slot:item.grup_payi="{ item }">
                <span style="color: var(--sp-accent-cyan)">{{ formatCurrency(item.grup_payi) }}</span>
              </template>
              <template v-slot:item.owner_payi="{ item }">
                <span style="color: var(--sp-accent-success); font-weight: 600">{{ formatCurrency(item.owner_payi) }}</span>
              </template>
              <template v-slot:item.toplam_usdt="{ item }">
                <span style="color: var(--sp-accent-blue)">{{ Number(item.toplam_usdt || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 }) }}</span>
              </template>
            </v-data-table>
          </div>
          <v-alert v-else type="info" variant="tonal" density="compact" class="ma-4">Rapor oluşturmak için filtreleri kullanın.</v-alert>
        </v-tabs-window-item>

        <!-- Trendler -->
        <v-tabs-window-item value="trends">
          <div class="pa-4">
            <div class="d-flex align-center mb-4">
              <v-btn-toggle v-model="trendPeriod" mandatory density="compact" color="primary" variant="outlined" rounded="lg">
                <v-btn value="daily" size="small">Günlük</v-btn>
                <v-btn value="weekly" size="small">Haftalık</v-btn>
                <v-btn value="monthly" size="small">Aylık</v-btn>
              </v-btn-toggle>
              <v-spacer />
              <v-btn size="small" variant="tonal" color="primary" @click="fetchTrends" :loading="loading">
                <v-icon start size="16">mdi-refresh</v-icon> Yenile
              </v-btn>
            </div>

            <div v-if="trendData.length" class="trend-chart">
              <div v-for="(row, i) in trendData" :key="i" class="trend-row mb-2">
                <div class="trend-label">{{ row.tarih }}</div>
                <div class="trend-bars">
                  <div class="trend-bar-wrap">
                    <div class="trend-bar bg-success" :style="{ width: barWidth(row.yatirim_hacim, maxTrendVolume) }">
                      <span class="trend-bar-text" v-if="barWidthNum(row.yatirim_hacim, maxTrendVolume) > 15">{{ formatShort(row.yatirim_hacim) }}</span>
                    </div>
                  </div>
                  <div class="trend-bar-wrap">
                    <div class="trend-bar bg-info" :style="{ width: barWidth(row.cekim_hacim, maxTrendVolume) }">
                      <span class="trend-bar-text" v-if="barWidthNum(row.cekim_hacim, maxTrendVolume) > 15">{{ formatShort(row.cekim_hacim) }}</span>
                    </div>
                  </div>
                </div>
                <div class="trend-count">{{ row.islem_adet }}</div>
                <div v-if="isSuperAdmin && row.owner_kar !== undefined" class="trend-profit" style="color: var(--sp-accent-success)">
                  {{ formatShort(row.owner_kar) }}
                </div>
              </div>
            </div>

            <v-alert v-else type="info" variant="tonal" density="compact">
              Seçilen tarih aralığında veri bulunamadı.
            </v-alert>

            <!-- Legend -->
            <div class="d-flex ga-4 mt-4">
              <div class="d-flex align-center"><div class="legend-dot bg-success mr-2" /> Yatırım</div>
              <div class="d-flex align-center"><div class="legend-dot bg-info mr-2" /> Çekim</div>
              <div v-if="isSuperAdmin" class="d-flex align-center"><span style="color: var(--sp-accent-success); font-weight: 600" class="mr-1">₺</span> Sahip Kârı</div>
            </div>
          </div>
        </v-tabs-window-item>
      </v-tabs-window>
    </v-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import api from '@/plugins/axios'

const auth = useAuthStore()

/*
 * Rol ADINA degil izne bakiyoruz. Eskiden burada 'grup_yoneticisi' ve
 * 'muhasebe' aranıyordu; panelden olusturulan yeni bir rol -- izinleri
 * ne olursa olsun -- bu sekmeleri hic goremiyordu.
 */
const isSuperAdmin = computed(() => auth.isSuperAdmin)
const isGrupYoneticisi = computed(() => auth.can('scope.sub_group'))
const isMuhasebe = computed(() => auth.can('scope.sub_group'))

// Filters
const now = new Date()
const filters = ref({
  date_from: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`,
  date_to: now.toISOString().slice(0, 10),
  merchant_id: null,
  sub_group_id: null,
  type: null,
})

const typeOptions = [
  { text: 'Yatırım', value: 'deposit' },
  { text: 'Çekim', value: 'withdrawal' },
]

// Dropdown data
const merchants = ref([])
const subGroups = ref([])

// Report data
const loading = ref(false)
const activeTab = ref('trends')
const summary = ref(null)
const merchantData = ref([])
const subGroupData = ref([])
const operatorData = ref([])
const bankData = ref([])
const trendData = ref([])
const trendPeriod = ref('daily')
const settlementReport = ref(null)

// Table headers
const merchantHeaders = computed(() => {
  const h = [
    { title: 'Bayi', key: 'name' },
    { title: 'İşlem', key: 'islem_adet', align: 'end' },
    { title: 'Yatırım', key: 'yatirim_adet', align: 'end' },
    { title: 'Çekim', key: 'cekim_adet', align: 'end' },
    { title: 'Toplam Hacim', key: 'hacim', align: 'end' },
    { title: 'Yatırım Hacmi', key: 'yatirim_hacim', align: 'end' },
    { title: 'Çekim Hacmi', key: 'cekim_hacim', align: 'end' },
  ]
  if (isSuperAdmin.value) {
    h.push({ title: 'Komisyon', key: 'toplam_komisyon', align: 'end' })
    h.push({ title: 'Sahip Kârı', key: 'owner_kar', align: 'end' })
  }
  return h
})

const subGroupHeaders = [
  { title: 'Grup', key: 'name' },
  { title: 'İşlem', key: 'islem_adet', align: 'end' },
  { title: 'Hacim', key: 'hacim', align: 'end' },
  { title: 'Toplam Komisyon', key: 'toplam_komisyon', align: 'end' },
  { title: 'Grup Payı', key: 'grup_payi', align: 'end' },
  { title: 'Sahip Payı', key: 'owner_payi', align: 'end' },
]

const operatorHeaders = [
  { title: 'Operatör', key: 'name' },
  { title: 'İşlem', key: 'islem_adet', align: 'end' },
  { title: 'Yatırım', key: 'yatirim_adet', align: 'end' },
  { title: 'Çekim', key: 'cekim_adet', align: 'end' },
  { title: 'Hacim', key: 'hacim', align: 'end' },
  { title: 'Ort. Süre', key: 'ort_dakika', align: 'center' },
]

const bankHeaders = [
  { title: 'Hesap Sahibi', key: 'account_holder' },
  { title: 'Banka', key: 'bank_name' },
  { title: 'IBAN', key: 'iban' },
  { title: 'İşlem', key: 'islem_adet', align: 'end' },
  { title: 'Hacim', key: 'hacim', align: 'end' },
  { title: 'Yatırım', key: 'yatirim_hacim', align: 'end' },
  { title: 'Çekim', key: 'cekim_hacim', align: 'end' },
]

const settlementHeaders = [
  { title: 'Bayi', key: 'name' },
  { title: 'Adet', key: 'adet', align: 'end' },
  { title: 'Brüt Hacim', key: 'brut_hacim', align: 'end' },
  { title: 'Komisyon', key: 'toplam_komisyon', align: 'end' },
  { title: 'Net Hacim', key: 'net_hacim', align: 'end' },
  { title: 'Grup Payı', key: 'grup_payi', align: 'end' },
  { title: 'Sahip Payı', key: 'owner_payi', align: 'end' },
  { title: 'USDT', key: 'toplam_usdt', align: 'end' },
]

// Trend chart helpers
const maxTrendVolume = computed(() => {
  if (!trendData.value.length) return 1
  return Math.max(...trendData.value.map(r => Math.max(Number(r.yatirim_hacim) || 0, Number(r.cekim_hacim) || 0)), 1)
})

function barWidthNum(val, max) {
  return Math.max((Number(val) / max) * 100, 0)
}
function barWidth(val, max) {
  return `${Math.max(barWidthNum(val, max), 2)}%`
}

// Formatters
function formatCurrency(amount) {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(amount || 0)
}
function formatShort(amount) {
  const n = Number(amount) || 0
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
  return n.toFixed(0)
}

// Build params
function getParams(extra = {}) {
  const p = {}
  Object.entries(filters.value).forEach(([k, v]) => {
    if (v !== null && v !== '') p[k] = v
  })
  return { ...p, ...extra }
}

// Fetch functions
async function fetchAll() {
  loading.value = true
  const params = getParams()

  const promises = [
    api.get('/portal/reports/summary', { params }).then(r => { summary.value = r.data }).catch(() => {}),
  ]

  if (isSuperAdmin.value)
    promises.push(api.get('/portal/reports/by-merchant', { params }).then(r => { merchantData.value = r.data }).catch(() => {}))

  if (isSuperAdmin.value)
    promises.push(api.get('/portal/reports/by-sub-group', { params }).then(r => { subGroupData.value = r.data }).catch(() => {}))

  if (isSuperAdmin.value || isGrupYoneticisi.value) {
    promises.push(api.get('/portal/reports/by-operator', { params }).then(r => { operatorData.value = r.data }).catch(() => {}))
    promises.push(api.get('/portal/reports/bank-accounts', { params }).then(r => { bankData.value = r.data }).catch(() => {}))
  }

  if (isSuperAdmin.value) {
    promises.push(api.get('/portal/reports/settlements', { params }).then(r => { settlementReport.value = r.data }).catch(() => {}))
  }

  promises.push(fetchTrends())

  await Promise.allSettled(promises)
  loading.value = false
}

async function fetchTrends() {
  const params = getParams({ period: trendPeriod.value })
  try {
    const { data } = await api.get('/portal/reports/trends', { params })
    trendData.value = data
  } catch { trendData.value = [] }
}

// Re-fetch trends when period changes
watch(trendPeriod, () => fetchTrends())

// Load filter dropdowns + initial data
onMounted(async () => {
  if (isSuperAdmin.value) {
    try { const { data } = await api.get('/portal/merchants'); merchants.value = data } catch {}
  }
  if (isSuperAdmin.value) {
    try { const { data } = await api.get('/portal/sub-groups'); subGroups.value = data } catch {}
  }
  fetchAll()
})
</script>

<style scoped>
.trend-chart {
  max-height: 500px;
  overflow-y: auto;
}

.trend-row {
  display: grid;
  grid-template-columns: 90px 1fr 50px 70px;
  align-items: center;
  gap: 12px;
}

.trend-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--sp-text-muted);
  text-align: right;
  font-family: 'JetBrains Mono', monospace;
}

.trend-bars {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.trend-bar-wrap {
  height: 16px;
  background: var(--sp-glass-bg);
  border-radius: 0;
  overflow: hidden;
}

.trend-bar {
  height: 100%;
  border-radius: 0;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-right: 6px;
  transition: width 0.3s ease;
  min-width: 2px;
}

.bg-success { background: rgba(102,241,189, 0.6) !important; }
.bg-info { background: rgba(94, 175, 199, 0.6) !important; }

.trend-bar-text {
  font-size: 10px;
  font-weight: 700;
  color: white;
  white-space: nowrap;
}

.trend-count {
  font-size: 12px;
  font-weight: 700;
  color: var(--sp-text-secondary);
  text-align: center;
}

.trend-profit {
  font-size: 12px;
  font-weight: 700;
  text-align: right;
  font-family: 'JetBrains Mono', monospace;
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 0;
}

.settle-stat {
  padding: 12px;
  border-radius: 0;
  background: var(--sp-glass-bg);
  border: 1px solid var(--sp-accent-bg-hover);
  text-align: center;
}
.settle-stat-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--sp-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.3px;
  margin-bottom: 4px;
}
.settle-stat-value {
  font-size: 18px;
  font-weight: 800;
  letter-spacing: -0.5px;
}

/* ── Responsive ── */
@media (max-width: 960px) {
  :deep(.v-data-table) {
    overflow-x: auto;
  }
  :deep(.v-data-table table) {
    min-width: 650px;
  }
  .trend-row {
    grid-template-columns: 70px 1fr 40px 60px;
    gap: 8px;
  }
}

@media (max-width: 600px) {
  .trend-row {
    grid-template-columns: 60px 1fr 35px;
    gap: 6px;
  }
  .trend-profit {
    display: none;
  }
  .trend-label {
    font-size: 10px;
  }
}
</style>

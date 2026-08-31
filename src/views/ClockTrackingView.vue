<template>
  <div>
    <!-- Canlı Durum -->
    <v-card class="mb-4">
      <v-card-title class="d-flex align-center">
        <v-icon start color="success" size="20">mdi-access-point</v-icon>
        Canlı Mesai Durumu
        <v-spacer />
        <v-chip size="small" color="success" variant="tonal">
          {{ onlineCount }} aktif
        </v-chip>
        <v-btn size="small" variant="text" color="primary" @click="loadLive" class="ml-2" :loading="liveLoading">
          <v-icon size="16">mdi-refresh</v-icon>
        </v-btn>
      </v-card-title>

      <v-card-text class="pa-0">
        <div class="d-flex flex-wrap ga-2 pa-4" v-if="liveUsers.length">
          <div
            v-for="u in liveUsers"
            :key="u.id"
            class="live-user-card pa-3"
            :class="{ 'live-active': u.is_clocked_in }"
          >
            <div class="d-flex align-center mb-1">
              <div class="live-dot" :class="u.is_clocked_in ? 'dot-online' : 'dot-offline'" />
              <span class="text-body-2 font-weight-bold" style="color: var(--sp-text)">{{ u.name }}</span>
            </div>
            <div class="text-caption" style="color: var(--sp-text-dimmer)">
              {{ roleLabel(u.role) }}
              <span v-if="u.sub_group"> &bull; {{ u.sub_group }}</span>
            </div>
            <div v-if="u.is_clocked_in" class="text-caption mt-1" style="color: var(--sp-accent-success)">
              <v-icon size="12" class="mr-1">mdi-clock-outline</v-icon>
              {{ formatMinutes(u.today_total_minutes) }}
            </div>
            <div v-else class="text-caption mt-1" style="color: var(--sp-text-faint)">
              Mesaide değil
            </div>
          </div>
        </div>
        <div v-else class="pa-4 text-center text-medium-emphasis">
          Kullanıcı bulunamadı
        </div>
      </v-card-text>
    </v-card>

    <!-- Filtreler -->
    <v-card class="mb-4">
      <v-card-text class="pa-4">
        <v-row dense align="center">
          <v-col cols="6" sm="6" md="3">
            <v-text-field v-model="filters.date_from" label="Başlangıç" type="date" density="compact" />
          </v-col>
          <v-col cols="6" sm="6" md="3">
            <v-text-field v-model="filters.date_to" label="Bitiş" type="date" density="compact" />
          </v-col>
          <v-col cols="6" sm="6" md="3">
            <v-select
              v-model="filters.user_id"
              :items="userOptions"
              item-title="name"
              item-value="id"
              label="Kullanıcı"
              clearable
              density="compact"
            />
          </v-col>
          <v-col cols="6" sm="6" md="3">
            <v-btn color="primary" variant="tonal" @click="loadAll" :loading="loading" block>
              <v-icon start size="18">mdi-magnify</v-icon> Sorgula
            </v-btn>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Özet Kartlar -->
    <v-row class="mb-4" v-if="summary">
      <v-col cols="6" md="3">
        <v-card>
          <v-card-text class="pa-4 text-center">
            <v-icon color="primary" size="28" class="mb-1">mdi-account-group</v-icon>
            <div class="text-caption text-medium-emphasis">Toplam Personel</div>
            <div class="text-h6 font-weight-bold">{{ summary.totals?.unique_users || 0 }}</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="6" md="3">
        <v-card>
          <v-card-text class="pa-4 text-center">
            <v-icon color="success" size="28" class="mb-1">mdi-login</v-icon>
            <div class="text-caption text-medium-emphasis">Toplam Vardiya</div>
            <div class="text-h6 font-weight-bold">{{ summary.totals?.total_shifts || 0 }}</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="6" md="3">
        <v-card>
          <v-card-text class="pa-4 text-center">
            <v-icon color="info" size="28" class="mb-1">mdi-clock-outline</v-icon>
            <div class="text-caption text-medium-emphasis">Toplam Mesai</div>
            <div class="text-h6 font-weight-bold">{{ formatMinutes(summary.totals?.total_minutes || 0) }}</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="6" md="3">
        <v-card>
          <v-card-text class="pa-4 text-center">
            <v-icon color="warning" size="28" class="mb-1">mdi-timer-sand</v-icon>
            <div class="text-caption text-medium-emphasis">Ort. Vardiya</div>
            <div class="text-h6 font-weight-bold">{{ formatMinutes(summary.totals?.avg_shift_minutes || 0) }}</div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Sekmeler -->
    <v-card>
      <v-tabs v-model="activeTab" color="primary" density="compact">
        <v-tab value="per_user">Personel Bazında</v-tab>
        <v-tab value="history">Mesai Geçmişi</v-tab>
      </v-tabs>

      <v-divider />

      <v-tabs-window v-model="activeTab">
        <!-- Personel Bazında -->
        <v-tabs-window-item value="per_user">
          <v-data-table
            :headers="perUserHeaders"
            :items="summary?.per_user || []"
            :loading="loading"
            density="compact"
            no-data-text="Veri bulunamadı"
          >
            <template v-slot:item.total_minutes="{ item }">
              <span class="font-weight-bold">{{ formatMinutes(item.total_minutes) }}</span>
            </template>
            <template v-slot:item.avg_minutes="{ item }">
              <v-chip size="small" :color="item.avg_minutes > 480 ? 'success' : item.avg_minutes > 240 ? 'warning' : 'grey'" variant="tonal">
                {{ formatMinutes(item.avg_minutes) }}
              </v-chip>
            </template>
            <template v-slot:item.first_clock_in="{ item }">
              <span class="text-caption">{{ formatDate(item.first_clock_in) }}</span>
            </template>
            <template v-slot:item.last_clock_out="{ item }">
              <span class="text-caption">{{ formatDate(item.last_clock_out) }}</span>
            </template>
          </v-data-table>
        </v-tabs-window-item>

        <!-- Mesai Geçmişi -->
        <v-tabs-window-item value="history">
          <v-data-table-server
            :headers="historyHeaders"
            :items="historyItems"
            :items-length="historyTotal"
            :loading="historyLoading"
            :items-per-page="20"
            @update:page="historyPage = $event; loadHistory()"
            density="compact"
            no-data-text="Mesai kaydı bulunamadı"
          >
            <template v-slot:item.user="{ item }">
              <div>
                <div class="font-weight-medium">{{ item.user?.name }}</div>
                <div class="text-caption text-medium-emphasis">{{ roleLabel(item.user?.roles?.[0]?.name) }}</div>
              </div>
            </template>
            <template v-slot:item.clock_in_at="{ item }">
              <span class="text-caption">{{ formatDateTime(item.clock_in_at) }}</span>
            </template>
            <template v-slot:item.clock_out_at="{ item }">
              <span v-if="item.clock_out_at" class="text-caption">{{ formatDateTime(item.clock_out_at) }}</span>
              <v-chip v-else size="x-small" color="success">Aktif</v-chip>
            </template>
            <template v-slot:item.duration_minutes="{ item }">
              <span v-if="item.duration_minutes" class="font-weight-bold">{{ formatMinutes(item.duration_minutes) }}</span>
              <span v-else class="text-medium-emphasis">—</span>
            </template>
            <template v-slot:item.ip_address="{ item }">
              <code class="text-caption">{{ item.ip_address || '—' }}</code>
            </template>
          </v-data-table-server>
        </v-tabs-window-item>
      </v-tabs-window>
    </v-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import api from '@/plugins/axios'

const auth = useAuthStore()

const liveUsers = ref([])
const liveLoading = ref(false)
const summary = ref(null)
const loading = ref(false)
const activeTab = ref('per_user')
const userOptions = ref([])

const historyItems = ref([])
const historyTotal = ref(0)
const historyLoading = ref(false)
const historyPage = ref(1)

const now = new Date()
const filters = reactive({
  date_from: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`,
  date_to: now.toISOString().slice(0, 10),
  user_id: null,
})

const onlineCount = computed(() => liveUsers.value.filter(u => u.is_clocked_in).length)

const roleLabels = {
  super_admin: 'Süper Yönetici', grup_yoneticisi: 'Grup Yöneticisi',
  yatirim_sorumlusu: 'Yatırım Sorumlusu', cekim_sorumlusu: 'Çekim Sorumlusu',
  muhasebe: 'Muhasebe', izleyici: 'İzleyici',
  sub_group_manager: 'Grup Yöneticisi', deposit_operator: 'Yatırım Op.',
  withdrawal_operator: 'Çekim Op.', bank_checker: 'Banka Kontrol', viewer: 'İzleyici',
}

function roleLabel(role) { return roleLabels[role] || role }

function formatMinutes(mins) {
  if (!mins) return '0dk'
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return h > 0 ? `${h}sa ${m}dk` : `${m}dk`
}

function formatDate(d) { return d ? new Date(d).toLocaleDateString('tr-TR') : '—' }
function formatDateTime(d) { return d ? new Date(d).toLocaleString('tr-TR') : '—' }

const perUserHeaders = [
  { title: 'Personel', key: 'name' },
  { title: 'Vardiya', key: 'shift_count', align: 'end' },
  { title: 'Toplam Mesai', key: 'total_minutes', align: 'end' },
  { title: 'Ort. Vardiya', key: 'avg_minutes', align: 'center' },
  { title: 'İlk Giriş', key: 'first_clock_in' },
  { title: 'Son Çıkış', key: 'last_clock_out' },
]

const historyHeaders = [
  { title: 'Personel', key: 'user', sortable: false },
  { title: 'Giriş', key: 'clock_in_at' },
  { title: 'Çıkış', key: 'clock_out_at' },
  { title: 'Süre', key: 'duration_minutes', align: 'end' },
  { title: 'IP', key: 'ip_address' },
]

async function loadLive() {
  liveLoading.value = true
  try {
    const { data } = await api.get('/portal/clock-live')
    liveUsers.value = data
    // Build user options for filter
    userOptions.value = data.map(u => ({ id: u.id, name: u.name }))
  } finally { liveLoading.value = false }
}

async function loadSummary() {
  const params = {}
  if (filters.date_from) params.date_from = filters.date_from
  if (filters.date_to) params.date_to = filters.date_to
  const { data } = await api.get('/portal/clock-summary', { params })
  summary.value = data
}

async function loadHistory() {
  historyLoading.value = true
  const params = { page: historyPage.value }
  if (filters.date_from) params.date_from = filters.date_from
  if (filters.date_to) params.date_to = filters.date_to
  if (filters.user_id) params.user_id = filters.user_id
  const { data } = await api.get('/portal/clock-history', { params })
  historyItems.value = data.data
  historyTotal.value = data.total
  historyLoading.value = false
}

async function loadAll() {
  loading.value = true
  await Promise.allSettled([loadSummary(), loadHistory()])
  loading.value = false
}

onMounted(async () => {
  await loadLive()
  await loadAll()
})
</script>

<style scoped>
.live-user-card {
  background: var(--sp-glass-bg);
  border: 1px solid var(--sp-glass-border);
  border-radius: 0;
  min-width: 180px;
  flex: 0 0 auto;
}
.live-active {
  border-color: rgba(102,241,189, 0.2);
  background: rgba(102,241,189, 0.04);
}

.live-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 8px;
  flex-shrink: 0;
}
.dot-online {
  background: var(--sp-accent-success);
  box-shadow: 0 0 6px rgba(102,241,189, 0.5);
  animation: blink 2s ease-in-out infinite;
}
.dot-offline {
  background: var(--sp-text-ghost);
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

/* ── Responsive ── */
@media (max-width: 960px) {
  .live-user-card {
    min-width: 150px;
    flex: 1 1 calc(50% - 8px);
  }
  :deep(.v-data-table),
  :deep(.v-data-table-server) {
    overflow-x: auto;
  }
  :deep(.v-data-table table),
  :deep(.v-data-table-server table) {
    min-width: 600px;
  }
}

@media (max-width: 600px) {
  .live-user-card {
    min-width: unset;
    flex: 1 1 100%;
  }
}
</style>

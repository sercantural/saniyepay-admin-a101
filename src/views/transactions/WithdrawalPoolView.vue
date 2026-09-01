<template>
  <div class="pool-view">
    <!-- Havuz kapaliysa listeyi hic gostermeyelim: bos tablo, "is yok"
         gibi okunur ve yanlis izlenim birakir. -->
    <v-alert v-if="!enabled" type="info" variant="tonal" density="comfortable" class="mb-4">
      Çekim havuzu şu anda kapalı. Çekimler operatörlere sistem tarafından otomatik atanıyor.
      <template v-if="auth.isSuperAdmin">
        Havuzu <RouterLink :to="{ name: 'PlatformSettings' }">Platform Ayarları</RouterLink>
        ekranından açabilirsiniz.
      </template>
    </v-alert>

    <template v-else>
      <div class="pool-head">
        <div>
          <div class="pool-title">
            Çekim Havuzu
            <span class="pool-count">{{ total }}</span>
          </div>
          <div class="pool-sub">
            Sahipsiz bekleyen çekimler. Kendinize aldığınız işlem
            <strong>Çekimler</strong> ekranına geçer.
          </div>
        </div>
        <v-btn variant="tonal" size="small" :loading="loading" @click="load" prepend-icon="mdi-refresh">
          Yenile
        </v-btn>
      </div>

      <!-- Aralik bilgisi YALNIZCA super admin'e. Operatore "size su
           araligi gosteriyoruz" demek ic politikayi ifsa ediyor ve
           onun icin bir ise yaramiyor: aralik disindaki kayitlari
           zaten hic gormuyor. -->
      <div v-if="isSuperAdmin" class="pool-limits">
        <v-icon size="14" class="mr-1">mdi-arrow-expand-vertical</v-icon>
        Alt gruplar {{ limitText }} aralığındaki çekimleri görür.
        Aralık dışındakiler yalnızca size görünür; elle atamanız gerekir.
      </div>

      <v-alert
        v-if="!canClaim && !auth.isSuperAdmin"
        type="warning" variant="tonal" density="compact" class="mb-3"
      >
        Havuzdan işlem alabilmek için aktif bir banka hesabınız olmalı.
      </v-alert>

      <v-data-table
        :headers="headers"
        :items="items"
        :loading="loading"
        :items-per-page="25"
        density="comfortable"
        class="pool-table"
        no-data-text="Havuzda bekleyen çekim yok."
      >
        <template #item.created_at="{ item }">
          <div class="mono">{{ formatDate(item.created_at) }}</div>
          <div class="waited">{{ waited(item.created_at) }}</div>
        </template>

        <template #item.merchant="{ item }">
          {{ item.merchant?.name || '—' }}
        </template>

        <template #item.player="{ item }">
          <div>{{ item.player_account_holder || playerName(item) || '—' }}</div>
          <div class="muted mono">{{ item.customer?.external_id || '' }}</div>
        </template>

        <template #item.player_iban="{ item }">
          <span class="mono">{{ formatIban(item.player_iban) }}</span>
        </template>

        <template #item.requested_amount="{ item }">
          <span class="amount">{{ money(item.requested_amount) }} {{ item.currency }}</span>
        </template>

        <template #item.actions="{ item }">
          <!-- Super admin havuzdan is ALMAZ; sahada parayi tasiyan taraf
               degil. Onun eylemi elle atamak, o da islem detayinda. -->
          <v-btn
            v-if="canClaim"
            size="small" color="primary" variant="flat"
            :loading="claiming === item.id"
            :disabled="claiming !== null"
            @click="claim(item)"
          >
            Bana ata
          </v-btn>
          <v-btn
            v-else-if="auth.isSuperAdmin"
            size="small" variant="tonal"
            :to="{ name: 'TxnDetail', params: { id: item.id } }"
          >
            Detay / ata
          </v-btn>
        </template>
      </v-data-table>
    </template>

    <v-snackbar v-model="snackbar" :color="snackColor" timeout="3500">{{ snackText }}</v-snackbar>
  </div>
</template>

<script setup>
/**
 * Cekim Havuzu.
 *
 * Havuz aciksa gelen cekimler kimseye atanmaz; burada bekler ve operator
 * kendine alir. Aldigi anda kayit havuzdan duser ve Cekimler ekranina
 * gecer.
 *
 * Bakiye kosulu YOK ve olmamali: cekim operatorun kredisini artirir,
 * azaltmaz. Bakiyesi sifir olan operator tam da cekim yaparak yatirim
 * alabilir hale gelir.
 */
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { RouterLink } from 'vue-router'
import api from '@/plugins/axios'
import { useAuthStore } from '@/stores/auth'
import { useTransactionStore } from '@/stores/transactions'

const auth = useAuthStore()
const txnStore = useTransactionStore()

const items = ref([])
const total = ref(0)
const enabled = ref(true)
const canClaim = ref(false)
// Sunucunun soyledigi; auth store ile ayni olmali ama yetki kararini
// veren taraf sunucu oldugu icin onu esas aliyoruz.
const isSuperAdmin = ref(false)
const limits = ref({ min: 0, max: null })
const loading = ref(false)
const claiming = ref(null)

const snackbar = ref(false)
const snackText = ref('')
const snackColor = ref('success')

/*
 * Bayi adi yalnizca super admin'e gosteriliyor -- panelin genelinde
 * gecerli olan kural. Sunucu zaten iliskiyi non-SA icin hic yuklemiyor;
 * sutunu da gizliyoruz ki bos bir kolon kalmasin.
 */
const headers = computed(() => [
  { title: 'Talep', key: 'created_at', sortable: false, width: 160 },
  ...(isSuperAdmin.value ? [{ title: 'Bayi', key: 'merchant', sortable: false }] : []),
  { title: 'Oyuncu', key: 'player', sortable: false },
  { title: 'IBAN', key: 'player_iban', sortable: false },
  { title: 'Tutar', key: 'requested_amount', sortable: false, align: 'end' },
  { title: '', key: 'actions', sortable: false, align: 'end', width: 120 },
])

const limitText = computed(() => {
  const min = limits.value.min || 0
  const max = limits.value.max
  if (!min && !max) return 'sınırsız'
  if (!max) return `${money(min)} ve üzeri`
  if (!min) return `${money(max)} ve altı`
  return `${money(min)} – ${money(max)}`
})

function money(v) {
  return new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    .format(Number(v || 0))
}

function formatIban(iban) {
  if (!iban) return '—'
  return iban.replace(/(.{4})/g, '$1 ').trim()
}

function playerName(item) {
  const c = item.customer
  if (!c) return ''
  return `${c.first_name || ''} ${c.last_name || ''}`.trim()
}

function formatDate(v) {
  if (!v) return '—'
  return new Date(v).toLocaleString('tr-TR', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  })
}

// Havuzda ne kadar bekledigi, oncelik icin en ise yarar bilgi.
function waited(v) {
  if (!v) return ''
  const mins = Math.floor((now.value - new Date(v).getTime()) / 60000)
  if (mins < 1) return 'az önce'
  if (mins < 60) return `${mins} dk bekliyor`
  const h = Math.floor(mins / 60)
  return `${h} sa ${mins % 60} dk bekliyor`
}

const now = ref(Date.now())
let ticker = null

async function load() {
  loading.value = true
  try {
    const { data } = await api.get('/portal/transactions/pool')
    enabled.value = data.enabled
    canClaim.value = data.can_claim
    isSuperAdmin.value = Boolean(data.is_super_admin)
    limits.value = data.limits || { min: 0, max: null }
    items.value = data.data || []
    total.value = data.total || 0
    txnStore.poolCount = total.value
  } catch (e) {
    snack(e.response?.data?.message || 'Havuz yüklenemedi.', 'error')
  } finally {
    loading.value = false
  }
}

async function claim(item) {
  claiming.value = item.id
  try {
    await api.post(`/portal/transactions/${item.id}/claim`)
    snack('İşlem size atandı. Çekimler ekranından devam edebilirsiniz.')
    // Listeden hemen dus; sunucudan da tazele ki baskasinin aldiklari
    // da ayni anda temizlensin.
    items.value = items.value.filter(t => t.id !== item.id)
    total.value = Math.max(0, total.value - 1)
    await load()
  } catch (e) {
    const status = e.response?.status
    snack(
      e.response?.data?.message
        || (status === 409 ? 'İşlem başkası tarafından alınmış.' : 'İşlem alınamadı.'),
      status === 409 ? 'warning' : 'error',
    )
    // 409 = baskasi kapmis; liste zaten bayat, tazele.
    await load()
  } finally {
    claiming.value = null
  }
}

function snack(text, color = 'success') {
  snackText.value = text
  snackColor.value = color
  snackbar.value = true
}

// Havuza yeni cekim dustugunde ya da birini biri aldiginda liste
// kendiliginden tazelensin -- sayfa yenilemek gerekmesin.
watch(() => txnStore.poolUpdateTick, () => load())

onMounted(() => {
  load()
  ticker = setInterval(() => { now.value = Date.now() }, 30000)
})
onUnmounted(() => clearInterval(ticker))
</script>

<style scoped>
.pool-view { padding: 4px; }

.pool-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 6px;
}
.pool-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 18px;
  font-weight: 700;
  letter-spacing: -0.02em;
}
.pool-count {
  min-width: 26px;
  padding: 1px 8px;
  font-size: 12px;
  font-weight: 700;
  text-align: center;
  color: var(--sp-primary);
  background: rgba(102, 241, 189, 0.12);
  border: 1px solid rgba(102, 241, 189, 0.28);
}
.pool-sub { font-size: 12.5px; color: var(--sp-text-muted); }

.pool-limits {
  display: flex;
  align-items: center;
  margin: 10px 0 14px;
  padding: 8px 12px;
  font-size: 12px;
  color: var(--sp-text-muted);
  background: var(--sp-glass-bg);
  border: 1px solid var(--sp-border);
}

.pool-table { background: var(--sp-glass-bg); border: 1px solid var(--sp-border); }

.mono { font-family: 'JetBrains Mono', monospace; font-size: 12px; }
.muted { color: var(--sp-text-muted); font-size: 11px; }
.waited { font-size: 11px; color: var(--sp-text-muted); }
.amount { font-weight: 700; font-variant-numeric: tabular-nums; }
</style>

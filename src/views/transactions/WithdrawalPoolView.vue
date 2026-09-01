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
        :sort-by="[{ key: 'created_at', order: 'asc' }]"
        density="comfortable"
        class="pool-table"
        no-data-text="Havuzda bekleyen çekim yok."
      >
        <template #item.created_at="{ item }">
          <div class="waited-main" :class="waitClass(item.created_at)">{{ waited(item.created_at) }}</div>
          <div class="waited-at mono">{{ formatDate(item.created_at) }}</div>
        </template>

        <template #item.merchant="{ item }">
          {{ item.merchant?.name || '—' }}
        </template>

        <template #item.player="{ item }">
          <!-- Operatorde ad soyad maskeli gelir (sunucuda maskeleniyor);
               isi tanimak icin kullanici adi yeterli. -->
          <div class="mono">{{ item.customer?.external_id || '—' }}</div>
          <div class="muted">{{ item.player_account_holder || playerName(item) || '' }}</div>
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
          <div v-else-if="isSuperAdmin" class="row-actions">
            <v-btn size="small" color="primary" variant="flat" @click="openAssign(item)">
              Ata
            </v-btn>
            <v-btn
              size="small" variant="text" icon="mdi-open-in-new"
              :to="{ name: 'TxnDetail', params: { id: item.id } }"
              title="İşlem detayı"
            />
          </div>
        </template>
      </v-data-table>
    </template>

    <!-- Atama penceresi: super admin havuzdaki isi dogrudan buradan
         bir operatore veriyor; islem detayina gitmek gerekmiyor. -->
    <v-dialog v-model="assignDialog" max-width="520">
      <v-card>
        <v-card-title class="assign-head">
          <div>
            <div class="assign-title">Operatöre ata</div>
            <div class="assign-sub" v-if="assignTarget">
              {{ money(assignTarget.requested_amount) }} {{ assignTarget.currency }} ·
              {{ assignTarget.player_account_holder || '—' }}
            </div>
          </div>
        </v-card-title>

        <v-card-text>
          <v-alert
            v-if="assignTarget && !withinLimits(assignTarget)"
            type="info" variant="tonal" density="compact" class="mb-3"
          >
            Bu tutar alt grupların gördüğü aralığın dışında; havuzdan kimse alamaz.
            Atamayı sizin yapmanız gerekiyor.
          </v-alert>

          <div v-if="operatorsLoading" class="text-center py-6">
            <v-progress-circular indeterminate size="28" />
          </div>
          <v-alert v-else-if="!operators.length" type="warning" variant="tonal" density="compact">
            Aktif banka hesabı olan operatör yok. Önce operatöre banka hesabı tanımlayın.
          </v-alert>
          <v-radio-group v-else v-model="assignOperatorId" hide-details>
            <!-- Kasa bakiyesi bilgi amacli: cekimi odeyecek parayi
                 hangi operatorun tuttugunu gostermek atamayi
                 kolaylastiriyor. Engelleyici bir kosul degil. -->
            <v-radio v-for="op in operators" :key="op.id" :value="op.id">
              <template #label>
                <div class="op-row">
                  <span class="op-name">{{ op.name }}</span>
                  <span class="op-bal" :class="op.available_balance < 0 ? 'neg' : ''">
                    kasa: {{ money(op.available_balance) }} TRY
                  </span>
                </div>
              </template>
            </v-radio>
          </v-radio-group>
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="assignDialog = false">Vazgeç</v-btn>
          <v-btn
            color="primary" variant="flat"
            :disabled="!assignOperatorId" :loading="assigning"
            @click="confirmAssign"
          >
            Ata
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

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

// Atama (yalnizca super admin)
const assignDialog = ref(false)
const assignTarget = ref(null)
const assignOperatorId = ref(null)
const assigning = ref(false)
const operators = ref([])
const operatorsLoading = ref(false)

const snackbar = ref(false)
const snackText = ref('')
const snackColor = ref('success')

/*
 * Bayi adi yalnizca super admin'e gosteriliyor -- panelin genelinde
 * gecerli olan kural. Sunucu zaten iliskiyi non-SA icin hic yuklemiyor;
 * sutunu da gizliyoruz ki bos bir kolon kalmasin.
 */
const headers = computed(() => [
  // Siralanabilir tek sutun bilerek bu: havuzda onceligi belirleyen
  // sey bekleme suresi. created_at uzerinden siraliyoruz -- eski kayit
  // = uzun bekleyen, yani artan created_at dogrudan "en cok bekleyen
  // ustte" demek.
  { title: 'Bekleme', key: 'created_at', sortable: true, width: 175 },
  ...(isSuperAdmin.value ? [{ title: 'Bayi', key: 'merchant', sortable: false }] : []),
  { title: 'Oyuncu', key: 'player', sortable: false },
  // IBAN yalnizca super admin'de. Operator isi ustlenmeden IBAN
  // gorurse yanlislikla once odeme yapip karisiklik cikarabiliyor;
  // atamadan sonra islem ekranindan zaten gorunuyor. Sunucu da bu
  // alani non-SA yanitindan tamamen cikariyor.
  ...(isSuperAdmin.value ? [{ title: 'IBAN', key: 'player_iban', sortable: false }] : []),
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

// Uzun bekleyen is one ciksin: 30 dk ustu sari, 2 saat ustu kirmizi.
// Siralama zaten dogru sirayi veriyor, renk de bakisla fark ettiriyor.
function waitClass(v) {
  if (!v) return ''
  const mins = (now.value - new Date(v).getTime()) / 60000
  if (mins >= 120) return 'w-crit'
  if (mins >= 30) return 'w-warn'
  return ''
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

// Tutar, alt gruplarin gordugu aralikta mi? Yalnizca super adminin
// penceresinde bilgi amacli gosteriliyor.
function withinLimits(item) {
  const a = Number(item?.requested_amount || 0)
  const { min, max } = limits.value
  return a >= (min || 0) && (max == null || a <= max)
}

async function openAssign(item) {
  assignTarget.value = item
  assignOperatorId.value = null
  assignDialog.value = true

  operatorsLoading.value = true
  try {
    const { data } = await api.get('/portal/transactions/withdrawal-operators')
    operators.value = data || []
  } catch {
    operators.value = []
  } finally {
    operatorsLoading.value = false
  }
}

async function confirmAssign() {
  if (!assignTarget.value || !assignOperatorId.value) return
  assigning.value = true
  try {
    await api.post(`/portal/transactions/${assignTarget.value.id}/assign`, {
      operator_id: assignOperatorId.value,
    })
    snack('İşlem operatöre atandı.')
    assignDialog.value = false
    await load()
  } catch (e) {
    snack(e.response?.data?.message || 'Atama yapılamadı.', 'error')
  } finally {
    assigning.value = false
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
.waited-main { font-size: 12.5px; font-weight: 600; }
.waited-main.w-warn { color: #f0a35e; }
.waited-main.w-crit { color: #ff8e82; }
.waited-at { font-size: 10.5px; color: var(--sp-text-muted); }
.amount { font-weight: 700; font-variant-numeric: tabular-nums; }

.row-actions { display: flex; align-items: center; justify-content: flex-end; gap: 4px; }

.assign-head { padding: 16px 20px 8px; }
.assign-title { font-size: 15px; font-weight: 700; }
.assign-sub { font-size: 12px; color: var(--sp-text-muted); }
.op-row {
  display: flex;
  align-items: baseline;
  gap: 10px;
  width: 100%;
}
.op-name { font-weight: 600; }
.op-bal { font-size: 11.5px; color: var(--sp-text-muted); font-variant-numeric: tabular-nums; }
.op-bal.neg { color: #ff8e82; }
</style>

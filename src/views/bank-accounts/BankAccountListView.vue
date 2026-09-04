<template>
  <div class="bank-page">
    <!-- Sekme seridi. "Silinmis Hesaplar" ayri bir ekran degil cunku ayni
         veriye bakiyoruz; sadece yumusak silinmis kayitlar. Sekme yalnizca
         izni olana ciziliyor, izin yoksa serit hic basilmiyor ve ekran
         eskisi gibi tek listeden ibaret kaliyor. -->
    <div v-if="canViewDeleted" class="bank-tabs">
      <button
        type="button"
        class="bank-tab"
        :class="{ 'is-active': tab === 'accounts' }"
        @click="tab = 'accounts'"
      >
        <v-icon size="14" class="mr-2">mdi-bank</v-icon>Hesaplar
        <span class="tab-count">{{ accounts.length }}</span>
      </button>
      <button
        type="button"
        class="bank-tab"
        :class="{ 'is-active': tab === 'deleted' }"
        @click="openDeletedTab"
      >
        <v-icon size="14" class="mr-2">mdi-delete-clock-outline</v-icon>Silinmiş Hesaplar
        <span v-if="deletedLoaded" class="tab-count">{{ deletedAccounts.length }}</span>
      </button>
    </div>

    <!-- ══════════════ HESAPLAR ══════════════ -->
    <template v-if="tab === 'accounts'">
      <!-- Sade sayac. Eskiden burada yatirim/cekim/teslim/komisyon hacim
           kartlari vardi; sistem admini bu ekranda para verisi istemedi,
           yalnizca "kac IBAN aktif, kac pasif" bilgisini istedi. -->
      <div class="bank-counters mb-4">
        <div class="counter-cell">
          <div class="counter-label">Toplam IBAN</div>
          <div class="counter-value">{{ accounts.length }}</div>
        </div>
        <div class="counter-cell is-active">
          <div class="counter-label">Aktif</div>
          <div class="counter-value">{{ activeCount }}</div>
        </div>
        <div class="counter-cell is-passive">
          <div class="counter-label">Pasif</div>
          <div class="counter-value">{{ passiveCount }}</div>
        </div>
      </div>

      <div class="bank-table-card">
        <div class="bank-table-header">
          <div class="bank-table-title">
            <div class="bank-table-icon">
              <v-icon size="18" color="white">mdi-bank</v-icon>
            </div>
            <div>
              <div class="bank-table-heading">Banka Hesapları</div>
              <div class="bank-table-sub">{{ filteredAccounts.length }} / {{ accounts.length }} hesap</div>
            </div>
          </div>
          <v-btn
            v-if="auth.can('bank_accounts.create') || auth.isSuperAdmin"
            color="primary"
            variant="flat"
            class="bank-add-btn"
            prepend-icon="mdi-plus"
            @click="openCreate"
          >
            Hesap Ekle
          </v-btn>
        </div>

        <!-- Aktif/pasif filtresi. Backend zaten hepsini donduruyor, bu yuzden
             filtre istemci tarafinda; ekstra istek atmaya gerek yok. -->
        <div class="filter-shell">
          <button
            v-for="opt in statusOptions"
            :key="opt.value"
            type="button"
            class="filter-pill"
            :class="[opt.tone, { 'is-active': statusFilter === opt.value }]"
            @click="statusFilter = opt.value"
          >
            <v-icon size="13" class="mr-1">{{ opt.icon }}</v-icon>{{ opt.label }}
            <span class="pill-count">{{ opt.count }}</span>
          </button>
        </div>

        <v-data-table
          :headers="visibleHeaders"
          :items="filteredAccounts"
          :loading="loading"
          density="compact"
          no-data-text="Banka hesabı bulunamadı"
          loading-text="Yükleniyor..."
          class="bank-table"
        >
          <!-- GRUP. Sahip adi da buraya katlandi: ayri bir "Atama" sutunu
               istenen duzeni bozardi, ama yoneticinin IBAN'in hangi
               operatorde oldugunu gormesi gerekiyor. Nokta, operatorun
               mesaide olup olmadigini gosteriyor. -->
          <template v-slot:item.sub_group.name="{ item }">
            <div class="group-cell">
              <span v-if="item.sub_group" class="group-pill">{{ item.sub_group.name }}</span>
              <span v-else class="empty-dash">—</span>
              <v-tooltip
                v-if="item.owner"
                :text="item.owner_clocked_in ? 'Çevrimiçi (mesaide)' : 'Çevrimdışı'"
                location="top"
              >
                <template v-slot:activator="{ props }">
                  <span v-bind="props" class="owner-line" :class="item.owner_clocked_in ? 'is-online' : 'is-offline'">
                    <span class="presence-dot"></span>{{ item.owner.name }}
                  </span>
                </template>
              </v-tooltip>
            </div>
          </template>

          <!-- İSİM: hesap sahibi, altinda banka adi. -->
          <template v-slot:item.account_holder="{ item }">
            <div class="account-cell">
              <div class="account-holder">{{ item.account_holder }}</div>
              <div class="account-bank">{{ item.bank_name }}</div>
            </div>
          </template>

          <!-- İBAN -->
          <template v-slot:item.iban="{ item }">
            <span class="iban-text">{{ formatIban(item.iban) }}</span>
          </template>

          <!-- LİMİT: iki satir. Ustte tek islem araligi (min - max), altta
               bugunku kullanim / gunluk adet limiti. Gunluk hacim, "bugun"
               ibaresi ve hareket bilgisi bilerek yok; sistem admini yalnizca
               bu iki sayiyi istedi. -->
          <template v-slot:item.limits="{ item }">
            <div class="limit-cell">
              <div class="limit-row">
                <span class="limit-tag">LİMİT</span>
                <span class="limit-value">{{ formatLimitRange(item.min_deposit_amount, item.max_deposit_amount) }}</span>
              </div>
              <div class="limit-row">
                <span class="limit-tag tag-alt">İŞLEM</span>
                <span class="limit-value">{{ formatUsage(item.daily_used, item.daily_deposit_count_limit) }}</span>
              </div>
            </div>
          </template>

          <!-- DURUM -->
          <template v-slot:item.is_active="{ item }">
            <span class="status-pill" :class="item.is_active ? 'is-active' : 'is-inactive'">
              <span class="status-dot"></span>
              {{ item.is_active ? 'Aktif' : 'Pasif' }}
            </span>
          </template>

          <template v-slot:item.actions="{ item }">
            <div class="d-flex ga-1 justify-end">
              <v-btn
                v-if="auth.can('bank_accounts.edit') || auth.isSuperAdmin"
                size="x-small"
                variant="tonal"
                color="primary"
                icon
                @click="openEdit(item)"
                title="Düzenle"
              >
                <v-icon size="14">mdi-pencil</v-icon>
              </v-btn>
              <v-btn
                v-if="auth.can('bank_accounts.toggle') || auth.isSuperAdmin"
                size="x-small"
                variant="tonal"
                :color="item.is_active ? 'error' : 'success'"
                icon
                @click="toggleAccount(item.id)"
                :title="item.is_active ? 'Devre Dışı Bırak' : 'Etkinleştir'"
              >
                <v-icon size="14">{{ item.is_active ? 'mdi-power-off' : 'mdi-power' }}</v-icon>
              </v-btn>
              <!-- Islem gormus hesap da artik silinebiliyor: kayit yumusak
                   siliniyor, gecmis islemler ve operator kasasi bozulmuyor.
                   Sunucu 422 ile "pasife alin" demiyor. -->
              <v-btn
                v-if="auth.can('bank_accounts.delete') || auth.isSuperAdmin"
                size="x-small"
                variant="tonal"
                color="error"
                icon
                @click="askDelete(item)"
                title="Sil"
              >
                <v-icon size="14">mdi-trash-can-outline</v-icon>
              </v-btn>
            </div>
          </template>
        </v-data-table>
      </div>
    </template>

    <!-- ══════════════ SİLİNMİŞ HESAPLAR ══════════════ -->
    <!-- Salt okunur havuz. Geri alma yok: kaydi geri getirmek IBAN'i tekrar
         yonlendirmeye acardi, bu karar panelden verilmiyor. -->
    <div v-else class="bank-table-card">
      <div class="bank-table-header">
        <div class="bank-table-title">
          <div class="bank-table-icon is-muted">
            <v-icon size="18" color="white">mdi-delete-clock-outline</v-icon>
          </div>
          <div>
            <div class="bank-table-heading">Silinmiş Hesaplar</div>
            <div class="bank-table-sub">Salt okunur kayıt · geçmiş işlemler korunuyor</div>
          </div>
        </div>
        <v-btn
          variant="text"
          size="small"
          :loading="deletedLoading"
          prepend-icon="mdi-refresh"
          @click="loadDeleted"
        >
          Yenile
        </v-btn>
      </div>

      <v-alert v-if="deletedError" type="error" variant="tonal" density="compact" class="ma-4">
        {{ deletedError }}
      </v-alert>

      <v-data-table
        :headers="deletedHeaders"
        :items="deletedAccounts"
        :loading="deletedLoading"
        density="compact"
        no-data-text="Silinmiş hesap yok"
        loading-text="Yükleniyor..."
        class="bank-table"
      >
        <template v-slot:item.sub_group="{ item }">
          <span v-if="item.sub_group" class="group-pill">{{ item.sub_group }}</span>
          <span v-else class="empty-dash">—</span>
        </template>

        <template v-slot:item.owner="{ item }">
          <span v-if="item.owner" class="owner-line is-offline"><span class="presence-dot"></span>{{ item.owner }}</span>
          <span v-else class="empty-dash">—</span>
        </template>

        <template v-slot:item.account_holder="{ item }">
          <div class="account-cell">
            <div class="account-holder">{{ item.account_holder }}</div>
            <div class="account-bank">{{ item.bank_name }}</div>
          </div>
        </template>

        <template v-slot:item.iban="{ item }">
          <span class="iban-text">{{ formatIban(item.iban) }}</span>
          <span v-if="item.currency && item.currency !== 'TRY'" class="currency-tag">{{ item.currency }}</span>
        </template>

        <template v-slot:item.transaction_count="{ item }">
          <span class="txn-count" :class="{ 'has-history': item.transaction_count > 0 }">{{ item.transaction_count }}</span>
        </template>

        <template v-slot:item.deleted_at="{ item }">
          <span class="deleted-at">{{ formatDateTime(item.deleted_at) }}</span>
        </template>
      </v-data-table>
    </div>

    <!-- Oluştur / Düzenle Diyaloğu — hero modal stili
         (DepositListView'daki Onay/Reddet modallerinin form versiyonu). -->
    <v-dialog v-model="dialog" max-width="560">
      <v-card v-if="dialog" class="bank-card">
        <!-- Hero header: brand gradient, bank icon, uppercase title -->
        <div class="bank-hero">
          <div class="bank-hero-icon">
            <v-icon size="28" color="white">{{ editing ? 'mdi-pencil' : 'mdi-bank-plus' }}</v-icon>
          </div>
          <div class="bank-hero-text">
            <div class="bank-hero-title">{{ editing ? 'BANKA HESABINI DÜZENLE' : 'YENİ BANKA HESABI' }}</div>
            <div v-if="editing && form.bank_name" class="bank-hero-sub">{{ form.bank_name }}</div>
            <div v-else class="bank-hero-sub">IBAN ile bankayı otomatik tanımlayın</div>
          </div>
          <v-btn class="bank-hero-close" icon variant="text" size="small" @click="dialog = false">
            <v-icon color="white">mdi-close</v-icon>
          </v-btn>
        </div>

        <v-card-text class="pa-0">
          <div class="bank-body">
            <!-- ── Hesap Bilgileri ── -->
            <div class="section-label"><v-icon size="14" class="mr-1">mdi-account-cash</v-icon> Hesap Bilgileri</div>
            <v-text-field
              v-model="form.account_holder"
              label="Hesap Sahibi"
              variant="outlined"
              density="compact"
              hide-details="auto"
              class="mb-2"
              :rules="[v => !!v || 'Zorunlu']"
            />

            <!-- IBAN — drives bank_name resolution on blur. -->
            <v-text-field
              v-model="form.iban"
              label="IBAN"
              variant="outlined"
              density="compact"
              hide-details="auto"
              class="mb-2"
              placeholder="TR.."
              :rules="[v => !!v || 'Zorunlu']"
              :loading="ibanResolving"
              :error-messages="ibanError ? [ibanError] : []"
              @blur="resolveIban"
              @update:model-value="onIbanInput"
            >
              <template v-slot:append-inner>
                <v-icon v-if="ibanResolved && !ibanError" color="success" size="20">mdi-check-circle</v-icon>
                <v-icon v-else-if="ibanError" color="error" size="20">mdi-alert-circle</v-icon>
              </template>
            </v-text-field>

            <v-text-field
              :model-value="form.bank_name"
              label="Banka Adı"
              variant="outlined"
              density="compact"
              hide-details
              readonly
              persistent-placeholder
              placeholder="IBAN girildiğinde otomatik doldurulur"
              prepend-inner-icon="mdi-bank"
            />

            <!-- ── Günlük Limitler ── -->
            <div class="section-label mt-3"><v-icon size="14" class="mr-1">mdi-speedometer</v-icon> Günlük Limitler</div>
            <div class="section-hint">Bu hesaba günde atanacak toplam yatırım hacmi ve işlem sayısı.</div>
            <v-row dense>
              <v-col cols="6">
                <v-text-field
                  :model-value="formatAmountInput(form.daily_limit)"
                  @update:model-value="v => form.daily_limit = parseAmountInput(v)"
                  label="Günlük Hacim"
                  type="text"
                  inputmode="numeric"
                  variant="outlined"
                  density="compact"
                  hide-details
                  placeholder="Limitsiz"
                  suffix="TRY"
                  clearable
                />
              </v-col>
              <v-col cols="6">
                <v-text-field
                  v-model.number="form.daily_deposit_count_limit"
                  label="İşlem Adedi"
                  type="number"
                  min="1"
                  variant="outlined"
                  density="compact"
                  hide-details
                  placeholder="Limitsiz"
                  clearable
                />
              </v-col>
            </v-row>

            <!-- ── Tek İşlem Aralığı (per-deposit, NOT daily) ── -->
            <div class="section-label mt-3"><v-icon size="14" class="mr-1">mdi-cash-100</v-icon> Tek İşlem Aralığı</div>
            <div class="section-hint">Bir yatırım işleminin alabileceği min/max tutar. Günlük toplamı değil; her işleme ayrı uygulanır.</div>
            <v-row dense>
              <v-col cols="6">
                <v-text-field
                  :model-value="formatAmountInput(form.min_deposit_amount)"
                  @update:model-value="v => form.min_deposit_amount = parseAmountInput(v)"
                  label="Min İşlem"
                  type="text"
                  inputmode="numeric"
                  variant="outlined"
                  density="compact"
                  hide-details="auto"
                  :placeholder="platformMinDeposit > 0 ? `Platform: ${formatCurrency(platformMinDeposit)}` : 'Limitsiz'"
                  suffix="TRY"
                  clearable
                />
              </v-col>
              <v-col cols="6">
                <v-text-field
                  :model-value="formatAmountInput(form.max_deposit_amount)"
                  @update:model-value="v => form.max_deposit_amount = parseAmountInput(v)"
                  label="Max İşlem"
                  type="text"
                  inputmode="numeric"
                  variant="outlined"
                  density="compact"
                  hide-details="auto"
                  :placeholder="platformMaxDeposit > 0 ? `Platform: ${formatCurrency(platformMaxDeposit)}` : 'Limitsiz'"
                  suffix="TRY"
                  clearable
                />
              </v-col>
            </v-row>

            <!-- ── Alt Grup (sadece super yönetici) + Durum, paylaşılan satır ── -->
            <v-row dense class="mt-3 align-center">
              <v-col v-if="auth.isSuperAdmin" cols="7">
                <v-select
                  v-model="form.sub_group_id"
                  :items="subGroups"
                  item-title="name"
                  item-value="id"
                  label="Alt Grup"
                  variant="outlined"
                  density="compact"
                  hide-details
                  clearable
                />
              </v-col>
              <v-col :cols="auth.isSuperAdmin ? 5 : 12">
                <div class="switch-item">
                  <div class="switch-label">{{ form.is_active ? 'Aktif' : 'Pasif' }}</div>
                  <v-switch v-model="form.is_active" color="success" hide-details density="compact" inset />
                </div>
              </v-col>
            </v-row>
          </div>
        </v-card-text>

        <v-card-actions class="bank-actions">
          <v-btn variant="text" size="large" class="flex-grow-1" @click="dialog = false">Vazgeç</v-btn>
          <v-btn
            color="primary"
            variant="flat"
            size="large"
            class="flex-grow-1 bank-confirm-btn"
            :loading="saving"
            :prepend-icon="editing ? 'mdi-content-save' : 'mdi-check-bold'"
            @click="saveAccount"
          >
            {{ editing ? 'Güncelle' : 'Oluştur' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Silme onayi. Tek cumle; uzun aciklama (listeden kalkar, gecmis
         korunur vb.) istek uzerine kaldirildi. -->
    <v-dialog v-model="deleteDialog" max-width="420">
      <v-card>
        <v-card-title class="pa-4">Hesabı Sil</v-card-title>
        <v-card-text>Hesap silinecektir. Onaylıyor musunuz?</v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="deleteDialog = false">Vazgeç</v-btn>
          <v-btn color="error" variant="flat" :loading="deleting" @click="confirmDelete">Sil</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar" :color="snackbarColor" timeout="4000">
      {{ snackbarText }}
    </v-snackbar>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import api from '@/plugins/axios'

const auth = useAuthStore()
const accounts = ref([])
const subGroups = ref([])
const loading = ref(false)
const dialog = ref(false)
const saving = ref(false)
const editing = ref(false)
const editingId = ref(null)

// Platform-wide deposit floor + ceiling — surfaced in the form hints so the
// operator knows what kicks in when they leave their account's min/max blank.
const platformMinDeposit = ref(0)
const platformMaxDeposit = ref(0)

const snackbar = ref(false)
const snackbarText = ref('')
const snackbarColor = ref('success')

function showSnack(text, color = 'success') { snackbarText.value = text; snackbarColor.value = color; snackbar.value = true }

const form = reactive({
  account_holder: '',
  iban: '',
  bank_id: null,
  bank_name: '',
  daily_limit: null,
  daily_deposit_count_limit: null,
  min_deposit_amount: null,
  max_deposit_amount: null,
  is_active: true,
  sub_group_id: null,
})

// IBAN resolver state. `ibanResolved` flips to true on the last successful
// resolve and back to false the moment the user edits the IBAN, so the
// green checkmark accurately reflects the *current* input rather than the
// last-known-good value.
const ibanResolving = ref(false)
const ibanResolved = ref(false)
const ibanError = ref('')
const ibanWarning = ref('')

function onIbanInput() {
  // Reset derived state on every keystroke — the user is editing, so the
  // previously-resolved bank no longer applies to the current input.
  ibanResolved.value = false
  ibanError.value = ''
  ibanWarning.value = ''
  form.bank_id = null
  form.bank_name = ''
}

async function resolveIban() {
  const iban = (form.iban || '').replace(/\s+/g, '').toUpperCase()
  if (!iban) return

  ibanResolving.value = true
  ibanError.value = ''
  ibanWarning.value = ''
  try {
    const { data } = await api.post('/portal/bank-accounts/resolve-iban', { iban })
    form.iban = data.iban
    form.bank_id = data.bank_id
    form.bank_name = data.bank_name || ''
    ibanResolved.value = true
    if (data.warning) {
      ibanWarning.value = data.warning
    }
  } catch (e) {
    ibanResolved.value = false
    form.bank_id = null
    form.bank_name = ''
    ibanError.value = e.response?.data?.error
      || e.response?.data?.errors?.iban?.[0]
      || e.response?.data?.message
      || 'IBAN doğrulanamadı'
  } finally {
    ibanResolving.value = false
  }
}

// Pretty-print IBAN as 4-character groups (TR12 3456 7890 ...).
function formatIban(iban) {
  if (!iban) return ''
  return iban.replace(/\s+/g, '').replace(/(.{4})/g, '$1 ').trim()
}

function formatDateTime(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

/*
 * Sekmeler. Silinmis havuzu ayri bir izne bagli; super yonetici gate
 * bypass ile sunucuda zaten geciyor ama izin listesinde bu kayit
 * bulunmadigi icin `can` false donuyor, o yuzden ayrica kontrol ediliyor.
 */
const tab = ref('accounts')
const canViewDeleted = computed(() => auth.can('bank_accounts.view_deleted') || auth.isSuperAdmin)

/*
 * Sistem admini "kac IBAN aktif, kac pasif goreyim" dedi; sayaclar da
 * filtre pillerindeki adetler de bu tek kaynaktan besleniyor.
 */
const activeCount = computed(() => accounts.value.filter(a => a.is_active).length)
const passiveCount = computed(() => accounts.value.length - activeCount.value)

const statusFilter = ref('all')
const statusOptions = computed(() => [
  { value: 'all', label: 'Tümü', icon: 'mdi-format-list-bulleted', tone: 'pill-neutral', count: accounts.value.length },
  { value: 'active', label: 'Aktif', icon: 'mdi-check-circle-outline', tone: 'pill-success', count: activeCount.value },
  { value: 'inactive', label: 'Pasif', icon: 'mdi-pause-circle-outline', tone: 'pill-muted', count: passiveCount.value },
])

// Filtre istemci tarafinda: liste zaten tek istekte tam geliyor.
const filteredAccounts = computed(() => {
  if (statusFilter.value === 'active') return accounts.value.filter(a => a.is_active)
  if (statusFilter.value === 'inactive') return accounts.value.filter(a => !a.is_active)
  return accounts.value
})

/*
 * Sistem admininin istedigi duzen: GRUP | İSİM | İBAN | LİMİT | DURUM.
 * Komisyon sutunu da kaldirildi; para verisi bu ekranin isi degil.
 * Basliklar dogrudan buyuk harf yaziliyor: CSS text-transform "i" harfini
 * noktasiz "I" yapiyor, "İSİM" ancak boyle dogru cikiyor.
 */
const visibleHeaders = [
  { title: 'GRUP', key: 'sub_group.name', minWidth: '150px' },
  { title: 'İSİM', key: 'account_holder', minWidth: '190px' },
  { title: 'İBAN', key: 'iban', minWidth: '210px' },
  { title: 'LİMİT', key: 'limits', minWidth: '170px', sortable: false },
  { title: 'DURUM', key: 'is_active', minWidth: '90px', align: 'center' },
  { title: '', key: 'actions', minWidth: '110px', sortable: false, align: 'end' },
]

const deletedHeaders = [
  { title: 'Grup', key: 'sub_group', minWidth: '140px' },
  { title: 'Sahip', key: 'owner', minWidth: '140px' },
  { title: 'İsim', key: 'account_holder', minWidth: '190px' },
  { title: 'IBAN', key: 'iban', minWidth: '210px' },
  { title: 'İşlem', key: 'transaction_count', minWidth: '80px', align: 'end' },
  { title: 'Silinme', key: 'deleted_at', minWidth: '140px', align: 'end' },
]

function formatCurrency(amount) {
  return new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2 }).format(amount)
}

// Tablo LİMİT hucresi: ondaliksiz, tr-TR binlik ayracli. Bos taraf "—".
const limitFormatter = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 })

function formatLimitAmount(value) {
  const num = Number(value)
  if (value === null || value === undefined || value === '' || Number.isNaN(num) || num <= 0) return '—'
  return limitFormatter.format(num)
}

function formatLimitRange(min, max) {
  return `${formatLimitAmount(min)} - ${formatLimitAmount(max)}`
}

// "1/999": bugun kullanilan adet / gunluk adet limiti. Limit yoksa sonsuz.
function formatUsage(used, limit) {
  const usedNum = Number(used) || 0
  const limitNum = Number(limit)
  const limitText = limit && !Number.isNaN(limitNum) && limitNum > 0 ? limitFormatter.format(limitNum) : '∞'
  return `${usedNum}/${limitText}`
}

// Display helpers for amount inputs — show "100.000" while the form
// stores 100000. Integer-only (operators always enter whole TRY); a
// pasted decimal gets truncated, which is the intent.
const amountFormatter = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 })

function formatAmountInput(value) {
  if (value === null || value === undefined || value === '') return ''
  const num = Number(value)
  if (Number.isNaN(num)) return ''
  return amountFormatter.format(Math.trunc(num))
}

function parseAmountInput(value) {
  if (value == null || value === '') return null
  const digits = String(value).replace(/\D/g, '')
  return digits === '' ? null : parseInt(digits, 10)
}

function resetIbanState() {
  ibanResolved.value = false
  ibanError.value = ''
  ibanWarning.value = ''
}

function openCreate() {
  editing.value = false
  editingId.value = null
  Object.assign(form, {
    account_holder: '', iban: '', bank_id: null, bank_name: '',
    daily_limit: null, daily_deposit_count_limit: null,
    min_deposit_amount: null, max_deposit_amount: null,
    is_active: true,
    sub_group_id: null,
  })
  resetIbanState()
  dialog.value = true
}

function openEdit(account) {
  editing.value = true
  editingId.value = account.id
  Object.assign(form, {
    account_holder: account.account_holder,
    iban: account.iban,
    bank_id: account.bank_id,
    bank_name: account.bank_name,
    daily_limit: account.daily_limit,
    daily_deposit_count_limit: account.daily_deposit_count_limit,
    min_deposit_amount: account.min_deposit_amount,
    max_deposit_amount: account.max_deposit_amount,
    is_active: account.is_active,
    sub_group_id: account.sub_group_id,
  })
  // Existing accounts already have bank_name persisted, so treat them as
  // resolved without re-querying. The user can still edit the IBAN.
  resetIbanState()
  ibanResolved.value = !!account.bank_name
  dialog.value = true
}

async function saveAccount() {
  // Block submit if the IBAN hasn't resolved — server enforces this too,
  // but failing client-side gives a faster, clearer error.
  if (!ibanResolved.value || !form.bank_name) {
    ibanError.value = ibanError.value || 'Lütfen geçerli bir IBAN giriniz.'
    return
  }

  saving.value = true
  try {
    if (editing.value) {
      await api.put(`/portal/bank-accounts/${editingId.value}`, form)
      showSnack('Banka hesabı güncellendi')
    } else {
      await api.post('/portal/bank-accounts', form)
      showSnack('Banka hesabı oluşturuldu')
    }
    dialog.value = false
    await loadAccounts()
  } catch (e) {
    /*
     * Ayni IBAN ayni gruba/kullaniciya ikinci kez eklenince sunucu 422 ve
     * errors.iban donduruyor. Bu hata alanin altinda gorunmeli, yalnizca
     * snackbar'da kaybolmamali; uiMessage zaten alan hatalarini birlestirip
     * okunur tek cumle yapiyor.
     */
    if (e.response?.status === 422 && e.response?.data?.errors?.iban) {
      ibanError.value = e.uiMessage || e.response.data.errors.iban[0]
      return
    }
    showSnack(e.uiMessage || e.response?.data?.message || 'İşlem başarısız', 'error')
  } finally { saving.value = false }
}

const deleteDialog = ref(false)
const deleteTarget = ref(null)
const deleting = ref(false)

function askDelete(item) {
  deleteTarget.value = item
  deleteDialog.value = true
}

async function confirmDelete() {
  if (!deleteTarget.value) return
  deleting.value = true
  try {
    /*
     * Islem gormus hesap artik 422 ile geri cevrilmiyor; sunucu kaydi
     * yumusak silip kac islem/teslim etkilendigini yaziyor. Mesaji oldugu
     * gibi gosteriyoruz, cunku sonucu en dogru o anlatiyor.
     */
    const { data } = await api.delete(`/portal/bank-accounts/${deleteTarget.value.id}`)
    showSnack(data?.message || 'Hesap silindi')
    deleteDialog.value = false
    await loadAccounts()
    // Havuz daha once acildiysa taze tut, yoksa silinen kayit orada cikmaz.
    if (deletedLoaded.value) await loadDeleted()
  } catch (e) {
    showSnack(e.response?.data?.message || 'Hesap silinemedi', 'error')
  } finally {
    deleting.value = false
  }
}

async function toggleAccount(id) {
  try {
    await api.post(`/portal/bank-accounts/${id}/toggle`)
    showSnack('Hesap durumu değiştirildi')
    await loadAccounts()
  } catch (e) {
    showSnack(e.response?.data?.message || 'İşlem başarısız', 'error')
  }
}

async function loadAccounts() {
  loading.value = true
  try {
    const { data } = await api.get('/portal/bank-accounts')
    accounts.value = data
  } finally {
    loading.value = false
  }
}

// ── Silinmis hesap havuzu ──
const deletedAccounts = ref([])
const deletedLoading = ref(false)
const deletedLoaded = ref(false)
const deletedError = ref('')

// Havuz tembel yukleniyor: cogu oturumda hic acilmiyor, her sayfa acilisinda
// fazladan istek atmanin anlami yok.
function openDeletedTab() {
  tab.value = 'deleted'
  if (!deletedLoaded.value) loadDeleted()
}

async function loadDeleted() {
  deletedLoading.value = true
  deletedError.value = ''
  try {
    const { data } = await api.get('/portal/bank-accounts/deleted')
    deletedAccounts.value = Array.isArray(data) ? data : []
    deletedLoaded.value = true
  } catch (e) {
    deletedError.value = e.response?.data?.message || 'Silinmiş hesaplar yüklenemedi'
  } finally {
    deletedLoading.value = false
  }
}

onMounted(async () => {
  await loadAccounts()
  // Platform-wide deposit limits (small read-only config endpoint) — used
  // for the form hints. Silent on failure so a missing route or a 403
  // doesn't break the whole page.
  try {
    const { data } = await api.get('/portal/bank-accounts/platform-config')
    platformMinDeposit.value = Number(data?.min_deposit_amount || 0)
    platformMaxDeposit.value = Number(data?.max_deposit_amount || 0)
  } catch { /* keep defaults */ }
  if (auth.isSuperAdmin) {
    const { data } = await api.get('/portal/sub-groups')
    subGroups.value = data
  }
})
</script>

<style scoped>
/* ═══════════════════════════════════════════ */
/* SEKMELER                                    */
/* ═══════════════════════════════════════════ */
.bank-tabs {
  display: flex;
  gap: 1px;
  margin-bottom: 14px;
  background: var(--sp-glass-border);
  border: 1px solid var(--sp-glass-border);
}
.bank-tab {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 9px 16px;
  border: 0;
  border-radius: 0;
  cursor: pointer;
  background: var(--sp-card-bg);
  color: var(--sp-text-muted);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.9px;
  text-transform: uppercase;
  transition: background 0.18s ease, color 0.18s ease;
}
.bank-tab:hover { color: var(--sp-text); background: var(--sp-glass-hover); }
.bank-tab.is-active {
  background: var(--sp-accent-bg-active);
  color: var(--sp-primary);
  box-shadow: inset 0 -2px 0 var(--sp-primary);
}
.tab-count {
  margin-left: 8px;
  padding: 1px 6px;
  font-size: 10px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  background: rgba(255, 255, 255, 0.06);
  color: var(--sp-text-muted);
}
.bank-tab.is-active .tab-count {
  background: rgba(102, 241, 189, 0.16);
  color: var(--sp-primary);
}

/* ═══════════════════════════════════════════ */
/* SAYAÇ ŞERİDİ — 1px boşluklu üçlü grid       */
/* ═══════════════════════════════════════════ */
.bank-counters {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1px;
  background: var(--sp-glass-border);
  border: 1px solid var(--sp-glass-border);
}
.counter-cell {
  background: var(--sp-card-bg);
  padding: 14px 18px;
}
.counter-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 1.2px;
  text-transform: uppercase;
  color: var(--sp-text-muted);
}
.counter-value {
  margin-top: 6px;
  font-size: 24px;
  font-weight: 800;
  line-height: 1;
  letter-spacing: -0.5px;
  font-variant-numeric: tabular-nums;
  color: var(--sp-text);
}
.counter-cell.is-active .counter-value  { color: var(--sp-accent-success); }
.counter-cell.is-passive .counter-value { color: var(--sp-text-dimmer); }

@media (max-width: 600px) {
  .bank-counters { grid-template-columns: 1fr; }
}

/* ═══════════════════════════════════════════ */
/* TABLO KARTI                                 */
/* ═══════════════════════════════════════════ */
.bank-table-card {
  background: var(--sp-glass-bg);
  border: 1px solid var(--sp-glass-border);
  border-radius: 0;
  overflow: hidden;
}

.bank-table-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 18px;
  border-bottom: 1px solid var(--sp-divider, rgba(255,255,255,0.06));
}
.bank-table-title { display: flex; align-items: center; gap: 12px; }
.bank-table-icon {
  width: 36px; height: 36px;
  border-radius: 0;
  background: linear-gradient(135deg, var(--sp-primary), var(--sp-accent-purple));
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.bank-table-icon.is-muted {
  background: rgba(255, 255, 255, 0.07);
  border: 1px solid var(--sp-glass-border);
}
.bank-table-heading { font-size: 15px; font-weight: 700; color: var(--sp-text); line-height: 1.1; }
.bank-table-sub     { font-size: 11px; color: var(--sp-text-dim); margin-top: 2px; }
.bank-add-btn {
  font-weight: 700 !important;
  letter-spacing: 0.3px !important;
  box-shadow: 0 4px 14px rgba(102,241,189, 0.35) !important;
}
.bank-add-btn:hover {
  box-shadow: 0 6px 18px rgba(102,241,189, 0.5) !important;
}

/* ═══════════════════════════════════════════ */
/* AKTİF / PASİF FİLTRESİ                      */
/* ═══════════════════════════════════════════ */
.filter-shell {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  padding: 10px 16px;
  border-bottom: 1px solid var(--sp-divider, rgba(255,255,255,0.06));
  background: linear-gradient(180deg, rgba(102,241,189,0.04), transparent);
}
.filter-pill {
  display: inline-flex;
  align-items: center;
  padding: 5px 12px;
  border-radius: 0;
  font-size: 11.5px;
  font-weight: 700;
  letter-spacing: 0.3px;
  cursor: pointer;
  background: transparent;
  border: 1px solid var(--sp-glass-border);
  color: var(--sp-text-muted);
  transition: background 0.18s ease, border-color 0.18s ease, color 0.18s ease;
}
.filter-pill:hover { color: var(--sp-text); border-color: rgba(102,241,189,0.4); }
.filter-pill .pill-count {
  margin-left: 8px;
  font-size: 10px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  opacity: 0.7;
}
.filter-pill.pill-neutral.is-active {
  background: rgba(255,255,255,0.07);
  border-color: rgba(255,255,255,0.22);
  color: var(--sp-text);
}
.filter-pill.pill-success.is-active {
  background: rgba(102,241,189,0.16);
  border-color: rgba(102,241,189,0.55);
  color: var(--sp-accent-success);
}
.filter-pill.pill-muted.is-active {
  background: rgba(113,132,122,0.22);
  border-color: rgba(160,175,165,0.45);
  color: var(--sp-text);
}

/* ═══════════════════════════════════════════ */
/* HÜCRELER                                    */
/* ═══════════════════════════════════════════ */
.empty-dash { font-size: 11px; color: var(--sp-text-dim); }

.group-cell { display: flex; flex-direction: column; align-items: flex-start; gap: 4px; }
.group-pill {
  display: inline-flex; align-items: center;
  font-size: 11px; font-weight: 600;
  padding: 3px 8px;
  border-radius: 0;
  background: rgba(102,241,189,0.12);
  color: var(--sp-accent-purple);
  border: 1px solid rgba(102,241,189,0.22);
}
.owner-line {
  display: inline-flex; align-items: center;
  font-size: 10.5px; font-weight: 600;
  color: var(--sp-text-muted);
}
.owner-line .presence-dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  margin-right: 6px;
  flex-shrink: 0;
}
.owner-line.is-online .presence-dot {
  background: var(--sp-accent-success);
  box-shadow: 0 0 0 3px rgba(102,241,189,0.18);
  animation: presence-pulse 2s ease-in-out infinite;
}
.owner-line.is-offline .presence-dot {
  background: var(--sp-text-dim);
  opacity: 0.6;
}
@keyframes presence-pulse {
  0%, 100% { box-shadow: 0 0 0 3px rgba(102,241,189,0.18); }
  50%      { box-shadow: 0 0 0 5px rgba(102,241,189,0.05); }
}
@media (prefers-reduced-motion: reduce) {
  .owner-line.is-online .presence-dot { animation: none; }
}

.account-cell { line-height: 1.25; min-width: 0; }
.account-holder {
  font-size: 13px; font-weight: 700; color: var(--sp-text);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  max-width: 220px;
}
.account-bank { font-size: 10.5px; color: var(--sp-text-muted); }

.iban-text {
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 11.5px;
  color: var(--sp-text-secondary);
  letter-spacing: 0.2px;
  font-variant-numeric: tabular-nums;
}
.currency-tag {
  margin-left: 6px;
  font-size: 9px; font-weight: 700; letter-spacing: 0.5px;
  padding: 1px 5px;
  background: rgba(112,169,255,0.14);
  color: var(--sp-accent-blue);
  border: 1px solid rgba(112,169,255,0.24);
}

/* LİMİT hucresi: etiket + mono deger, iki satir. Etiket sabit genislikte
   ki iki satirdaki degerler alt alta hizalansin. */
.limit-cell { display: flex; flex-direction: column; gap: 3px; line-height: 1.15; }
.limit-row { display: flex; align-items: center; gap: 6px; font-variant-numeric: tabular-nums; }
.limit-tag {
  display: inline-block;
  min-width: 44px;
  text-align: center;
  font-size: 9px; font-weight: 700; letter-spacing: 0.5px;
  padding: 1px 6px; border-radius: 0;
  background: rgba(102,241,189,0.15);
  color: var(--sp-accent-success);
  border: 1px solid rgba(102,241,189,0.22);
}
.limit-tag.tag-alt {
  background: rgba(255,190,91,0.15);
  color: var(--sp-accent-amber);
  border-color: rgba(255,190,91,0.22);
}
.limit-value {
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 11.5px; font-weight: 600;
  color: var(--sp-text);
  letter-spacing: 0.2px;
}

.status-pill {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 10.5px; font-weight: 700; letter-spacing: 0.3px;
  text-transform: uppercase;
}
.status-pill .status-dot {
  width: 6px; height: 6px; border-radius: 50%;
  display: inline-block;
}
.status-pill.is-active {
  background: rgba(102,241,189,0.15);
  color: var(--sp-accent-success);
  border: 1px solid rgba(102,241,189,0.25);
}
.status-pill.is-active .status-dot {
  background: var(--sp-accent-success);
  box-shadow: 0 0 0 3px rgba(102,241,189,0.18);
}
.status-pill.is-inactive {
  background: rgba(113,132,122,0.12);
  color: var(--sp-text-dim);
  border: 1px solid rgba(113,132,122,0.2);
}
.status-pill.is-inactive .status-dot { background: var(--sp-text-dim); }

.txn-count {
  font-size: 11.5px; font-weight: 700;
  color: var(--sp-text-dim);
  font-variant-numeric: tabular-nums;
}
.txn-count.has-history { color: var(--sp-accent-amber); }
.deleted-at {
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 10.5px;
  color: var(--sp-text-muted);
  font-variant-numeric: tabular-nums;
}

/* ═══════════════════════════════════════════ */
/* TABLO İÇİ                                   */
/* ═══════════════════════════════════════════ */
.bank-table :deep(td) {
  font-size: 12px !important;
  padding-top: 10px !important;
  padding-bottom: 10px !important;
  padding-left: 10px !important;
  padding-right: 10px !important;
  border-color: var(--sp-divider, rgba(255,255,255,0.05)) !important;
}

.bank-table :deep(th) {
  font-size: 10px !important;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  font-weight: 700 !important;
  color: var(--sp-text-muted) !important;
  background: rgba(255,255,255,0.02);
  padding-left: 10px !important;
  padding-right: 10px !important;
}

.bank-table :deep(tbody tr:hover) {
  background: rgba(102,241,189,0.04) !important;
}

/* ── Hero modal — same shape as DepositListView's approve/reject confirm,
     adapted as a form (brand purple palette instead of green/red). ── */
.bank-card {
  border-radius: 0;
  overflow: hidden;
  border: 1px solid rgba(102,241,189, 0.25) !important;
  box-shadow: 0 12px 48px rgba(102,241,189, 0.18), 0 4px 16px rgba(0, 0, 0, 0.35) !important;
}
.bank-hero {
  background: linear-gradient(135deg, var(--sp-accent-purple) 0%, var(--sp-primary) 50%, var(--sp-accent-purple) 100%);
  padding: 14px 18px;
  display: flex;
  align-items: center;
  gap: 14px;
  position: relative;
  overflow: hidden;
}
.bank-hero::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 50% 0%, rgba(255,255,255,0.18), transparent 60%);
  pointer-events: none;
}
.bank-hero-icon {
  width: 48px; height: 48px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.18);
  display: flex; align-items: center; justify-content: center;
  border: 2px solid rgba(255, 255, 255, 0.35);
  animation: bank-icon-pop 0.4s ease-out;
  position: relative; z-index: 1;
  flex-shrink: 0;
}
@keyframes bank-icon-pop {
  from { transform: scale(0.6); opacity: 0; }
  to   { transform: scale(1);   opacity: 1; }
}
.bank-hero-text {
  flex: 1; min-width: 0;
  position: relative; z-index: 1;
}
.bank-hero-title {
  font-size: 15px;
  font-weight: 800;
  color: #FFFFFF;
  letter-spacing: 1px;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
}
.bank-hero-sub {
  font-size: 11px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.85);
  margin-top: 2px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.bank-hero-close {
  position: relative; z-index: 2;
  flex-shrink: 0;
}

.bank-body { padding: 16px 18px; }

/* Section labels inside the body */
.section-label {
  display: flex; align-items: center;
  font-size: 10px; font-weight: 700; letter-spacing: 0.8px;
  text-transform: uppercase; color: var(--sp-text-muted);
  margin-bottom: 4px;
}
.section-hint {
  font-size: 10.5px;
  color: var(--sp-text-dim);
  margin-bottom: 8px;
  line-height: 1.35;
}

.switch-item {
  display: flex; align-items: center; justify-content: space-between;
  padding: 6px 12px; border-radius: 0;
  background: var(--sp-accent-bg, rgba(102,241,189,0.05));
  border: 1px solid var(--sp-glass-border);
  min-height: 40px;
}
.switch-label { font-size: 13px; font-weight: 600; color: var(--sp-text); }

/* Footer actions — split, both large, primary button gets a brand glow */
.bank-actions {
  padding: 10px 18px 14px !important;
  gap: 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}
.bank-confirm-btn {
  font-weight: 800 !important;
  letter-spacing: 0.5px !important;
  box-shadow: 0 4px 14px rgba(102,241,189, 0.45) !important;
}
.bank-confirm-btn:hover {
  box-shadow: 0 6px 20px rgba(102,241,189, 0.6) !important;
  transform: translateY(-1px);
}

/* ── Responsive — fit-to-viewport, no forced horizontal scroll on desktop ── */
.bank-table :deep(table) { width: 100%; }
.bank-table :deep(td), .bank-table :deep(th) { white-space: nowrap; }

@media (max-width: 960px) {
  /* Dar ekranda tablo kaydiriliyor: 5 sutun + aksiyonlar 900px altina
     sigmiyor. Kaydirma yalnizca bu kirilimin altinda devreye giriyor. */
  .bank-table { overflow-x: auto; }
  .bank-table :deep(table) { min-width: 820px; }
}
</style>

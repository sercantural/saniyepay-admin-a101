<template>
  <div class="bank-page">
    <!-- ═══════════════════════════════════════════ -->
    <!-- OVERVIEW STATS — modern hero-card grid       -->
    <!-- ═══════════════════════════════════════════ -->
    <div v-if="!auth.isSuperAdmin && accounts.length" class="bank-stats mb-5">
      <div class="bank-stat-card stat-deposit">
        <div class="stat-icon-wrap">
          <v-icon size="22" color="white">mdi-arrow-down-bold</v-icon>
        </div>
        <div class="stat-content">
          <div class="stat-label">Toplam Yatırım</div>
          <div class="stat-value">{{ formatCurrency(totalStats.deposits) }}</div>
          <div class="stat-sub"><span class="stat-count">{{ totalStats.depositCount }}</span> işlem</div>
        </div>
      </div>

      <div class="bank-stat-card stat-withdrawal">
        <div class="stat-icon-wrap">
          <v-icon size="22" color="white">mdi-arrow-up-bold</v-icon>
        </div>
        <div class="stat-content">
          <div class="stat-label">Toplam Çekim</div>
          <div class="stat-value">{{ formatCurrency(totalStats.withdrawals) }}</div>
          <div class="stat-sub"><span class="stat-count">{{ totalStats.withdrawalCount }}</span> işlem</div>
        </div>
      </div>

      <div class="bank-stat-card stat-teslim">
        <div class="stat-icon-wrap">
          <v-icon size="22" color="white">mdi-handshake</v-icon>
        </div>
        <div class="stat-content">
          <div class="stat-label">Toplam Teslim</div>
          <div class="stat-value">{{ formatCurrency(totalStats.teslim) }}</div>
          <div class="stat-sub"><span class="stat-count">{{ totalStats.teslimCount }}</span> teslim</div>
        </div>
      </div>

      <div class="bank-stat-card stat-commission">
        <div class="stat-icon-wrap">
          <v-icon size="22" color="white">mdi-percent</v-icon>
        </div>
        <div class="stat-content">
          <div class="stat-label">Toplam Komisyon</div>
          <div class="stat-value">{{ formatCurrency(totalStats.commission) }}</div>
          <div class="stat-sub">Yatırım + Çekim + Teslim</div>
        </div>
      </div>
    </div>

    <!-- ═══════════════════════════════════════════ -->
    <!-- TABLE CARD — glassed, modern header          -->
    <!-- ═══════════════════════════════════════════ -->
    <div class="bank-table-card">
      <div class="bank-table-header">
        <div class="bank-table-title">
          <div class="bank-table-icon">
            <v-icon size="18" color="white">mdi-bank</v-icon>
          </div>
          <div>
            <div class="bank-table-heading">Banka Hesapları</div>
            <div class="bank-table-sub">{{ accounts.length }} hesap</div>
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

      <v-data-table
        :headers="visibleHeaders"
        :items="accounts"
        :loading="loading"
        density="compact"
        no-data-text="Banka hesabı bulunamadı"
        loading-text="Yükleniyor..."
        class="bank-table"
      >
        <!-- Hesap: avatar + holder + bank + IBAN (mono, smaller).
             IBAN is folded in here so we don't need a separate column. -->
        <template v-slot:item.account_holder="{ item }">
          <div class="account-cell">
            <div class="account-avatar"><v-icon size="14" color="white">mdi-bank</v-icon></div>
            <div class="account-text">
              <div class="account-holder">{{ item.account_holder }}</div>
              <div class="account-bank">{{ item.bank_name }}</div>
              <div class="account-iban">{{ formatIban(item.iban) }}</div>
            </div>
          </div>
        </template>

        <!-- Status — pill with status dot + label -->
        <template v-slot:item.is_active="{ item }">
          <span class="status-pill" :class="item.is_active ? 'is-active' : 'is-inactive'">
            <span class="status-dot"></span>
            {{ item.is_active ? 'Aktif' : 'Pasif' }}
          </span>
        </template>

        <!-- Bugün: daily volume + daily count usage stacked. Each row
             shows "used / limit" with red/amber/green threshold colour. -->
        <template v-slot:item.daily_used="{ item }">
          <div class="daily-cell">
            <div class="daily-row">
              <v-icon size="11" color="grey">mdi-cash</v-icon>
              <template v-if="item.daily_limit">
                <span :class="dailyLimitClass(item)" class="daily-used">{{ formatCurrency(item.stats?.today_deposits || 0) }}</span>
                <span class="daily-cap">/ {{ formatCurrency(item.daily_limit) }}</span>
              </template>
              <span v-else class="daily-unlimited">{{ formatCurrency(item.stats?.today_deposits || 0) }}</span>
            </div>
            <div class="daily-row">
              <v-icon size="11" color="grey">mdi-counter</v-icon>
              <template v-if="item.daily_deposit_count_limit">
                <span :class="dailyCountClass(item)" class="daily-used">{{ item.stats?.today_deposit_count || 0 }}</span>
                <span class="daily-cap">/ {{ item.daily_deposit_count_limit }}</span>
              </template>
              <span v-else class="daily-unlimited">{{ item.stats?.today_deposit_count || 0 }} işlem</span>
            </div>
          </div>
        </template>

        <!-- Per-deposit range -->
        <template v-slot:item.deposit_range="{ item }">
          <div v-if="item.min_deposit_amount || item.max_deposit_amount" class="range-cell">
            <div v-if="item.min_deposit_amount" class="range-row">
              <span class="range-tag tag-min">Min</span>
              <span class="range-value">{{ formatCurrency(item.min_deposit_amount) }}</span>
            </div>
            <div v-if="item.max_deposit_amount" class="range-row">
              <span class="range-tag tag-max">Max</span>
              <span class="range-value">{{ formatCurrency(item.max_deposit_amount) }}</span>
            </div>
          </div>
          <span v-else class="text-medium-emphasis" style="font-size: 11px">—</span>
        </template>

        <!-- Hareket: lifetime deposits + commission stacked.
             Withdrawals dropped — withdrawal routing isn't pinned to a
             single account anymore, so per-account Ç volume is no longer
             actionable on this page. -->
        <template v-slot:item.activity="{ item }">
          <div v-if="item.stats" class="activity-cell">
            <div class="activity-row act-dep">
              <span class="act-tag">Y</span>
              <span class="act-value">{{ formatCurrency(item.stats.total_deposits) }}</span>
              <span class="act-count">· {{ item.stats.deposit_count }}</span>
            </div>
            <div class="activity-row act-com">
              <span class="act-tag">K</span>
              <span class="act-value">{{ formatCurrency(item.stats.total_commission) }}</span>
              <v-tooltip v-if="item.stats.pending_count > 0" :text="`${item.stats.pending_count} bekleyen`" location="top">
                <template v-slot:activator="{ props }">
                  <v-icon v-bind="props" size="11" color="warning" class="ml-1">mdi-clock-outline</v-icon>
                </template>
              </v-tooltip>
            </div>
          </div>
          <span v-else class="text-medium-emphasis" style="font-size: 11px">—</span>
        </template>

        <!-- Atama: owner + sub-group stacked. The presence dot reflects
             whether the operator is currently clocked in — withdrawals
             route to clocked-in operators first, so this is the same
             "active" signal the backend uses. -->
        <template v-slot:item.assignment="{ item }">
          <div class="assignment-cell">
            <v-tooltip
              v-if="item.owner"
              :text="item.owner_clocked_in ? 'Çevrimiçi (giriş yapmış)' : 'Çevrimdışı'"
              location="top"
            >
              <template v-slot:activator="{ props }">
                <span v-bind="props" class="owner-pill" :class="item.owner_clocked_in ? 'is-online' : 'is-offline'">
                  <span class="presence-dot"></span>
                  <v-icon size="11" class="mr-1">mdi-account-circle</v-icon>{{ item.owner.name }}
                </span>
              </template>
            </v-tooltip>
            <span v-if="auth.isSuperAdmin && item.sub_group" class="group-pill">{{ item.sub_group.name }}</span>
            <span v-if="!item.owner && !item.sub_group" class="text-medium-emphasis" style="font-size: 11px">—</span>
          </div>
        </template>

        <!-- Actions -->
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
          </div>
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

    <v-snackbar v-model="snackbar" :color="snackbarColor" timeout="3000">
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

// Compact column set — merges related metrics into single cells so the
// whole table fits within the typical content width (~1100px) without
// horizontal scroll. IBAN moves into the account cell, daily limit +
// count merge into "Bugün", lifetime stats merge into "Hareket", and
// owner + sub-group merge into "Atama".
const allHeaders = [
  { title: 'Hesap', key: 'account_holder', minWidth: '260px' },
  { title: 'Durum', key: 'is_active', minWidth: '80px', align: 'center' },
  { title: 'Bugün', key: 'daily_used', minWidth: '140px', sortable: false },
  { title: 'İşlem Aralığı', key: 'deposit_range', minWidth: '120px', sortable: false },
  { title: 'Hareket', key: 'activity', minWidth: '140px', sortable: false },
  { title: 'Atama', key: 'assignment', minWidth: '130px', sortable: false },
  { title: '', key: 'actions', minWidth: '70px', sortable: false, align: 'end' },
]

const visibleHeaders = computed(() => allHeaders)

// Summary stats across all accounts. Teslim is per-OPERATOR — adding it
// once per account would multiply by N (operator with 3 accounts → 3×).
// We deduplicate by owner_id so each operator's teslim is only counted once.
// Withdrawals are aggregated for the overview widget only — the table
// itself no longer shows withdrawal volume per account since assignment
// isn't pinned to a single account anymore.
const totalStats = computed(() => {
  let deposits = 0, withdrawals = 0, depositCount = 0, withdrawalCount = 0
  let depositCommission = 0, withdrawalCommission = 0, teslimCommission = 0
  let teslim = 0, teslimCount = 0
  const seenOwners = new Set()
  accounts.value.forEach(a => {
    if (!a.stats) return
    deposits += a.stats.total_deposits
    withdrawals += a.stats.total_withdrawals
    depositCount += a.stats.deposit_count
    withdrawalCount += a.stats.withdrawal_count
    depositCommission += a.stats.deposit_commission || 0
    withdrawalCommission += a.stats.withdrawal_commission || 0
    if (a.owner_id && !seenOwners.has(a.owner_id)) {
      seenOwners.add(a.owner_id)
      teslim += a.stats.total_teslim || 0
      teslimCount += a.stats.teslim_count || 0
      teslimCommission += a.stats.teslim_commission || 0
    }
  })
  return {
    deposits,
    withdrawals,
    teslim,
    teslimCount,
    commission: Math.round((depositCommission + withdrawalCommission + teslimCommission) * 100) / 100,
    depositCount,
    withdrawalCount,
  }
})


// Color-codes today's deposit volume vs the daily_limit.
function dailyLimitClass(item) {
  if (!item.daily_limit) return 'text-medium-emphasis'
  const used = item.stats?.today_deposits || 0
  const ratio = used / Number(item.daily_limit)
  if (ratio >= 1) return 'text-error font-weight-bold'
  if (ratio >= 0.85) return 'font-weight-bold'
  return 'text-success font-weight-bold'
}

// Color-codes today's deposit count vs the daily_deposit_count_limit.
function dailyCountClass(item) {
  if (!item.daily_deposit_count_limit) return 'text-medium-emphasis'
  const used = item.stats?.today_deposit_count || 0
  const ratio = used / Number(item.daily_deposit_count_limit)
  if (ratio >= 1) return 'text-error font-weight-bold'
  if (ratio >= 0.85) return 'font-weight-bold'
  return 'text-success font-weight-bold'
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2 }).format(amount)
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
    showSnack(e.response?.data?.message || 'İşlem başarısız', 'error')
  } finally { saving.value = false }
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
  const { data } = await api.get('/portal/bank-accounts')
  accounts.value = data
  loading.value = false
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
/* OVERVIEW STATS — hero-card grid             */
/* ═══════════════════════════════════════════ */
.bank-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
}

.bank-stat-card {
  position: relative;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 18px;
  border-radius: 14px;
  background: var(--sp-glass-bg);
  border: 1px solid var(--sp-glass-border);
  overflow: hidden;
  transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
}
.bank-stat-card::before {
  content: '';
  position: absolute;
  inset: 0;
  opacity: 0.06;
  z-index: 0;
}
.bank-stat-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 28px rgba(0,0,0,0.18);
}

.stat-deposit::before    { background: linear-gradient(135deg, #43e97b, #38f9d7); }
.stat-deposit            { border-color: rgba(67,233,123,0.2); }
.stat-withdrawal::before { background: linear-gradient(135deg, #4facfe, #00f2fe); }
.stat-withdrawal         { border-color: rgba(79,172,254,0.2); }
.stat-teslim::before     { background: linear-gradient(135deg, #f6d365, #fda085); }
.stat-teslim             { border-color: rgba(246,211,101,0.2); }
.stat-commission::before { background: linear-gradient(135deg, #a18cd1, #fbc2eb); }
.stat-commission         { border-color: rgba(161,140,209,0.22); }

.stat-icon-wrap {
  width: 44px; height: 44px;
  border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
  position: relative; z-index: 1;
}
.stat-deposit .stat-icon-wrap    { background: linear-gradient(135deg, #43e97b, #38f9d7); }
.stat-withdrawal .stat-icon-wrap { background: linear-gradient(135deg, #4facfe, #00f2fe); }
.stat-teslim .stat-icon-wrap     { background: linear-gradient(135deg, #f6d365, #fda085); }
.stat-commission .stat-icon-wrap { background: linear-gradient(135deg, #a18cd1, #fbc2eb); }

.stat-content { position: relative; z-index: 1; min-width: 0; flex: 1; }
.stat-label {
  font-size: 10px; text-transform: uppercase; letter-spacing: 1px;
  color: var(--sp-text-muted); font-weight: 600;
  margin-bottom: 4px;
}
.stat-value {
  font-size: 19px; font-weight: 800; letter-spacing: -0.4px;
  color: var(--sp-text); line-height: 1.1;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.stat-sub  { font-size: 11px; color: var(--sp-text-dim); margin-top: 2px; }
.stat-count { font-weight: 700; color: var(--sp-text); }

@media (max-width: 1100px) {
  .bank-stats { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 600px) {
  .bank-stats { grid-template-columns: 1fr; }
}

/* ═══════════════════════════════════════════ */
/* TABLE CARD                                  */
/* ═══════════════════════════════════════════ */
.bank-table-card {
  background: var(--sp-glass-bg);
  border: 1px solid var(--sp-glass-border);
  border-radius: 16px;
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
  border-radius: 10px;
  background: linear-gradient(135deg, #7C3AED, #A78BFA);
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.bank-table-heading { font-size: 15px; font-weight: 700; color: var(--sp-text); line-height: 1.1; }
.bank-table-sub     { font-size: 11px; color: var(--sp-text-dim); margin-top: 2px; }
.bank-add-btn {
  font-weight: 700 !important;
  letter-spacing: 0.3px !important;
  box-shadow: 0 4px 14px rgba(124, 58, 237, 0.35) !important;
}
.bank-add-btn:hover {
  box-shadow: 0 6px 18px rgba(124, 58, 237, 0.5) !important;
}

/* ═══════════════════════════════════════════ */
/* ACCOUNT / IBAN / STATUS / PILL CELLS         */
/* ═══════════════════════════════════════════ */
.account-cell { display: flex; align-items: flex-start; gap: 10px; line-height: 1.25; }
.account-avatar {
  width: 28px; height: 28px;
  border-radius: 8px;
  background: linear-gradient(135deg, #7C3AED, #A78BFA);
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
  margin-top: 2px;
}
.account-text { min-width: 0; }
.account-holder {
  font-size: 13px; font-weight: 700; color: var(--sp-text);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  max-width: 220px;
}
.account-bank { font-size: 10.5px; color: var(--sp-text-muted); }
.account-iban {
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 10.5px;
  color: var(--sp-text-dim);
  letter-spacing: 0.2px;
  margin-top: 2px;
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
  background: rgba(110,196,122,0.15);
  color: #6EC47A;
  border: 1px solid rgba(110,196,122,0.25);
}
.status-pill.is-active .status-dot {
  background: #6EC47A;
  box-shadow: 0 0 0 3px rgba(110,196,122,0.18);
}
.status-pill.is-inactive {
  background: rgba(120,120,120,0.12);
  color: var(--sp-text-dim);
  border: 1px solid rgba(120,120,120,0.2);
}
.status-pill.is-inactive .status-dot { background: var(--sp-text-dim); }

.owner-pill, .group-pill {
  display: inline-flex; align-items: center;
  font-size: 11px; font-weight: 600;
  padding: 3px 8px;
  border-radius: 6px;
}
.owner-pill {
  background: rgba(228,163,79,0.12);
  color: #E4A34F;
  border: 1px solid rgba(228,163,79,0.2);
}
.group-pill {
  background: rgba(124,58,237,0.12);
  color: #A78BFA;
  border: 1px solid rgba(124,58,237,0.22);
}
.owner-pill .presence-dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  margin-right: 6px;
  flex-shrink: 0;
}
.owner-pill.is-online .presence-dot {
  background: #6EC47A;
  box-shadow: 0 0 0 3px rgba(110,196,122,0.18);
  animation: presence-pulse 2s ease-in-out infinite;
}
.owner-pill.is-offline .presence-dot {
  background: var(--sp-text-dim);
  opacity: 0.5;
}
@keyframes presence-pulse {
  0%, 100% { box-shadow: 0 0 0 3px rgba(110,196,122,0.18); }
  50%      { box-shadow: 0 0 0 5px rgba(110,196,122,0.05); }
}

/* ═══════════════════════════════════════════ */
/* TABLE INTERNALS                             */
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
  background: rgba(124,58,237,0.04) !important;
}

/* ── Hero modal — same shape as DepositListView's approve/reject confirm,
     adapted as a form (brand purple palette instead of green/red). ── */
.bank-card {
  border-radius: 18px !important;
  overflow: hidden;
  border: 1px solid rgba(124, 58, 237, 0.25) !important;
  box-shadow: 0 12px 48px rgba(124, 58, 237, 0.18), 0 4px 16px rgba(0, 0, 0, 0.35) !important;
}
.bank-hero {
  background: linear-gradient(135deg, #5B21B6 0%, #7C3AED 50%, #A78BFA 100%);
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

/* Per-deposit range cell in the data table */
.range-cell { display: flex; flex-direction: column; gap: 3px; line-height: 1.1; }
.range-row { display: flex; align-items: center; gap: 6px; }
.range-tag {
  display: inline-block;
  font-size: 9px; font-weight: 700; letter-spacing: 0.5px;
  padding: 1px 6px; border-radius: 4px;
}
.tag-min { background: rgba(228,163,79,0.15); color: #E4A34F; border: 1px solid rgba(228,163,79,0.22); }
.tag-max { background: rgba(110,196,122,0.15); color: #6EC47A; border: 1px solid rgba(110,196,122,0.22); }
.range-value { font-size: 11.5px; font-weight: 600; color: var(--sp-text); font-variant-numeric: tabular-nums; }

/* Bugün cell — daily volume + count usage stacked */
.daily-cell { display: flex; flex-direction: column; gap: 3px; line-height: 1.15; }
.daily-row { display: flex; align-items: center; gap: 5px; font-variant-numeric: tabular-nums; }
.daily-used { font-size: 11.5px; font-weight: 700; }
.daily-cap  { font-size: 10px; color: var(--sp-text-hint); }
.daily-unlimited { font-size: 11px; color: var(--sp-text-dim); }

/* Hareket cell — lifetime deposits + commission */
.activity-cell { display: flex; flex-direction: column; gap: 2px; line-height: 1.1; }
.activity-row {
  display: flex; align-items: center; gap: 6px;
  font-variant-numeric: tabular-nums;
}
.act-tag {
  display: inline-flex; align-items: center; justify-content: center;
  width: 16px; height: 16px;
  font-size: 9px; font-weight: 800;
  border-radius: 4px;
  flex-shrink: 0;
}
.act-dep .act-tag { background: rgba(110,196,122,0.18); color: #6EC47A; }
.act-com .act-tag { background: rgba(206,147,216,0.18); color: #CE93D8; }
.act-value { font-size: 11.5px; font-weight: 700; color: var(--sp-text); }
.act-count { font-size: 10px; color: var(--sp-text-hint); }

/* Atama cell — owner pill + group pill stacked */
.assignment-cell { display: flex; flex-direction: column; gap: 4px; align-items: flex-start; }

.switch-item {
  display: flex; align-items: center; justify-content: space-between;
  padding: 6px 12px; border-radius: 8px;
  background: var(--sp-surface-1, rgba(124,58,237,0.05));
  border: 1px solid var(--sp-border);
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
  box-shadow: 0 4px 14px rgba(124, 58, 237, 0.45) !important;
}
.bank-confirm-btn:hover {
  box-shadow: 0 6px 20px rgba(124, 58, 237, 0.6) !important;
  transform: translateY(-1px);
}

/* ── Responsive — fit-to-viewport, no forced horizontal scroll on desktop ── */
.bank-table :deep(table) { width: 100%; }
.bank-table :deep(td), .bank-table :deep(th) { white-space: nowrap; }
/* Allow the Hesap cell content to wrap so very long holder/IBAN don't blow the column */
.bank-table :deep(td:first-child) { white-space: normal; }

@media (max-width: 960px) {
  /* Below 960px (typical narrow tablet) we let the table scroll because
     6 information-dense columns can't all fit in <900px. The scroll only
     kicks in below this breakpoint. */
  .bank-table { overflow-x: auto; }
  .bank-table :deep(table) { min-width: 820px; }
}
</style>

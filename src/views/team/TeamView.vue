<template>
  <div>
    <v-card>
      <v-card-title class="d-flex align-center">
        <v-icon start color="primary">mdi-account-multiple-plus</v-icon>
        Ekibim
        <v-spacer />
        <v-btn
          v-if="canAddMember"
          color="primary"
          @click="openCreateDialog"
        >
          <v-icon start>mdi-plus</v-icon> Ekip Üyesi Ekle
        </v-btn>
      </v-card-title>

      <v-card-subtitle v-if="canAddMember" class="pb-3 text-medium-emphasis">
        Eklediğiniz ekip üyeleri size bağlanır ve sizin bir altınızdaki göreve atanır.
      </v-card-subtitle>

      <v-data-table
        :headers="headers"
        :items="teammates"
        :loading="loading"
        density="compact"
        no-data-text="Ekip üyesi bulunamadı"
        loading-text="Yükleniyor..."
      >
        <template v-slot:item.gorev="{ item }">
          <v-chip v-if="item.gorev" size="small">{{ item.gorev }}</v-chip>
          <span v-else class="text-medium-emphasis">—</span>
        </template>
        <template v-slot:item.durum="{ item }">
          <div class="d-flex align-center ga-2">
            <span class="team-dot" :class="item.is_clocked_in ? 'dot-online' : 'dot-offline'" />
            <span v-if="item.is_clocked_in" class="team-status-on">
              Mesaide &bull; {{ formatMinutes(item.today_minutes) }}
            </span>
            <span v-else class="team-status-off">Çevrimdışı</span>
            <!-- Pasif hesap mesai durumundan ayri bir bilgi: kisi bugun
                 mesaiye hic girmemis olabilir ama hesabi hala aciktir.
                 Bu yuzden noktanin yanina ayri bir rozet olarak konuyor. -->
            <v-chip v-if="!item.is_active" size="x-small" color="grey" variant="tonal">
              Pasif hesap
            </v-chip>
          </div>
        </template>
        <template v-slot:item.created_by="{ item }">
          <span v-if="item.created_by">{{ item.created_by }}</span>
          <span v-else class="text-medium-emphasis">—</span>
        </template>
      </v-data-table>
    </v-card>

    <!-- Add team member — same hero shape as the deposit approve/reject
         confirm modals, in a brand-purple palette so it visually slots
         into the same family of "decision" dialogs. -->
    <v-dialog v-model="dialog" max-width="520" persistent>
      <v-card v-if="dialog" class="team-card">
        <!-- Hero band: brand gradient, circular icon, uppercase prompt -->
        <div class="team-hero">
          <div class="team-hero-icon">
            <v-icon size="44" color="white">mdi-account-plus</v-icon>
          </div>
          <div class="team-hero-title">EKİP ÜYESİ EKLE</div>
          <div class="team-hero-sub">Size bağlı, bir alt rütbede yeni bir üye</div>
        </div>

        <!-- Gorev blogu: eskiden burada ekleyenin rolu "miras alinacak rol"
             olarak yaziyordu. Artik yeni uye ekleyenle ayni yetkileri
             almiyor, bir alt rutbeye ataniyor ve hangi rol oldugunu backend
             belirliyor; istemci rol gondermiyor. O yuzden sabit bir aciklama. -->
        <div class="team-role-block">
          <div class="team-role-icon"><v-icon size="22" color="white">mdi-shield-account-outline</v-icon></div>
          <div class="team-role-text">
            <div class="team-role-label">Atanacak Görev</div>
            <div class="team-role-value">Sizin bir altınızdaki görev</div>
            <div class="team-role-hint">Görevi sistem belirler, siz seçmezsiniz.</div>
          </div>
        </div>

        <v-card-text class="pa-0">
          <div class="team-body">
            <v-alert
              v-if="errorMsg"
              type="error"
              variant="tonal"
              density="compact"
              class="mb-3"
              closable
              @click:close="errorMsg = ''"
            >
              {{ errorMsg }}
            </v-alert>

            <v-text-field
              v-model="form.name"
              label="Ad Soyad"
              variant="outlined"
              density="compact"
              hide-details="auto"
              class="mb-2"
              prepend-inner-icon="mdi-account-outline"
              :error-messages="fieldErrors.name"
            />
            <v-text-field
              v-model="form.email"
              label="E-posta"
              type="email"
              autocomplete="off"
              variant="outlined"
              density="compact"
              hide-details="auto"
              class="mb-2"
              prepend-inner-icon="mdi-email-outline"
              :error-messages="fieldErrors.email"
            />
            <v-text-field
              v-model="form.password"
              label="Şifre"
              :type="showPw ? 'text' : 'password'"
              autocomplete="new-password"
              variant="outlined"
              density="compact"
              hide-details="auto"
              prepend-inner-icon="mdi-lock-outline"
              :append-inner-icon="showPw ? 'mdi-eye-off-outline' : 'mdi-eye-outline'"
              @click:append-inner="showPw = !showPw"
              :error-messages="fieldErrors.password"
              hint="En az 8 karakter"
              persistent-hint
            />
          </div>
        </v-card-text>

        <!-- Big split actions, primary glow on Oluştur -->
        <v-card-actions class="team-actions">
          <v-btn variant="text" size="large" class="flex-grow-1" :disabled="saving" @click="closeDialog">Vazgeç</v-btn>
          <v-btn
            color="primary"
            variant="flat"
            size="large"
            class="flex-grow-1 team-confirm-btn"
            :loading="saving"
            :disabled="!canSubmit"
            prepend-icon="mdi-check-bold"
            @click="saveMember"
          >
            Oluştur
          </v-btn>
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

const users = ref([])
const loading = ref(false)
const dialog = ref(false)
const saving = ref(false)
const showPw = ref(false)
const errorMsg = ref('')
const fieldErrors = reactive({ name: '', email: '', password: '' })

// Ekleyenin kendi rolu. Yeni uyenin rolunu artik backend seciyor, burada
// yalnizca "hic rolu olmayan biri ekip kuramaz" kontrolu icin duruyor.
const ownRole = computed(() => auth.user?.roles?.[0]?.name || '')

// Ekip uyesi ekleme artik ayri bir izin. Onceden yalnizca "super admin
// degilsin ve devralinacak bir rolun var" kosuluna bakiliyordu, yani
// izinden tamamen bagimsizdi.
const canAddMember = computed(
  () => (auth.isSuperAdmin || auth.can('team.create')) && !auth.isSuperAdmin && !!ownRole.value
)

// GET /portal/team artik duz bir dizi donuyor ve icinde Eloquent kullanici
// nesnesi (roles dizisi, last_login_at) yok. Super admin ayiklamasini da
// backend yapiyor; burada sadece kullanicinin kendisi listeden dusuruluyor.
const teammates = computed(() => users.value.filter((u) => u.id !== auth.user?.id))

const headers = [
  { title: 'İsim', key: 'name' },
  { title: 'E-posta', key: 'email' },
  { title: 'Görev', key: 'gorev' },
  { title: 'Durum', key: 'durum', sortable: false },
  { title: 'Ekleyen', key: 'created_by' },
]

// Mesai suresi dakika olarak geliyor; ClockTrackingView ile ayni bicim
// kullaniliyor ki iki ekranda ayni sure ayni sekilde okunsun.
function formatMinutes(mins) {
  const total = Number(mins) || 0
  if (total <= 0) return '0dk'
  const h = Math.floor(total / 60)
  const m = total % 60
  return h > 0 ? `${h}sa ${m}dk` : `${m}dk`
}

const form = reactive({
  name: '',
  email: '',
  password: '',
  is_active: true,
})

const canSubmit = computed(
  () =>
    form.name.trim().length > 1 &&
    /\S+@\S+\.\S+/.test(form.email) &&
    form.password.length >= 8
)

function resetForm() {
  form.name = ''
  form.email = ''
  form.password = ''
  form.is_active = true
  errorMsg.value = ''
  fieldErrors.name = ''
  fieldErrors.email = ''
  fieldErrors.password = ''
  showPw.value = false
}

function openCreateDialog() {
  resetForm()
  dialog.value = true
}

function closeDialog() {
  if (saving.value) return
  dialog.value = false
}

async function loadTeam() {
  loading.value = true
  try {
    const { data } = await api.get('/portal/team')
    users.value = Array.isArray(data) ? data : data.data || []
  } catch {
    users.value = []
  } finally {
    loading.value = false
  }
}

// Backend, ekleyenin altinda tanimli rol yoksa 422 ile
// { message, error: 'no_subordinate_role' } donuyor. Kod alani "error"
// olarak geliyor; "code" da kontrol ediliyor ki alan adi ileride
// degisirse ekran ham mesaja dusmesin.
function isNoSubordinateRole(res) {
  return res?.error === 'no_subordinate_role' || res?.code === 'no_subordinate_role'
}

async function saveMember() {
  saving.value = true
  errorMsg.value = ''
  fieldErrors.name = ''
  fieldErrors.email = ''
  fieldErrors.password = ''
  try {
    await api.post('/portal/team', {
      name: form.name,
      email: form.email,
      password: form.password,
    })
    dialog.value = false
    await loadTeam()
  } catch (e) {
    const res = e.response?.data
    if (res?.errors) {
      for (const key of Object.keys(fieldErrors)) {
        if (res.errors[key]) fieldErrors[key] = res.errors[key][0]
      }
    }
    // Backend, ekleyenin altinda tanimli bir gorev yoksa 422 +
    // no_subordinate_role donuyor. Ham kod kullaniciya hicbir sey
    // anlatmadigi icin burada acik bir cumleye cevriliyor.
    if (isNoSubordinateRole(res)) {
      errorMsg.value =
        'Sizin altınızda tanımlı bir görev bulunmuyor, bu yüzden ekip üyesi ekleyemezsiniz. ' +
        'Yöneticinizden alt görev tanımlanmasını isteyin.'
    } else {
      errorMsg.value = res?.message || 'Ekip üyesi oluşturulamadı. Lütfen tekrar deneyin.'
    }
  } finally {
    saving.value = false
  }
}

onMounted(loadTeam)
</script>

<style scoped>
/* ── Add team member modal — same hero shape as the deposit/withdrawal
     approve modals, brand-purple palette so it slots into the family of
     "decision" dialogs across the app. ── */
.team-card {
  border-radius: 0;
  overflow: hidden;
  border: 1px solid rgba(102,241,189, 0.25) !important;
  box-shadow: 0 12px 48px rgba(102,241,189, 0.18), 0 4px 16px rgba(0, 0, 0, 0.35) !important;
}
.team-hero {
  background: linear-gradient(135deg, var(--sp-accent-purple) 0%, var(--sp-primary) 50%, var(--sp-accent-purple) 100%);
  padding: 26px 24px 18px;
  text-align: center;
  position: relative;
  overflow: hidden;
}
.team-hero::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 50% 0%, rgba(255,255,255,0.18), transparent 60%);
  pointer-events: none;
}
.team-hero-icon {
  width: 76px; height: 76px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.18);
  display: flex; align-items: center; justify-content: center;
  margin: 0 auto 12px;
  border: 3px solid rgba(255, 255, 255, 0.35);
  animation: team-icon-pop 0.4s ease-out;
  position: relative; z-index: 1;
}
@keyframes team-icon-pop {
  from { transform: scale(0.6); opacity: 0; }
  to   { transform: scale(1);   opacity: 1; }
}
.team-hero-title {
  font-size: 20px;
  font-weight: 800;
  color: #FFFFFF;
  letter-spacing: 1.5px;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
  position: relative; z-index: 1;
}
.team-hero-sub {
  font-size: 13px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.85);
  margin-top: 4px;
  position: relative; z-index: 1;
}

/* Inherited-role block — eye magnet under the hero */
.team-role-block {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 22px;
  background: linear-gradient(180deg, rgba(102,241,189, 0.08) 0%, transparent 100%);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}
.team-role-icon {
  width: 44px; height: 44px;
  border-radius: 0;
  background: linear-gradient(135deg, var(--sp-primary), var(--sp-accent-purple));
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.team-role-text { line-height: 1.2; }
.team-role-label {
  font-size: 10px; font-weight: 700;
  letter-spacing: 0.8px; text-transform: uppercase;
  color: var(--sp-text-muted);
}
.team-role-value {
  font-size: 16px;
  font-weight: 800;
  color: var(--sp-text);
  letter-spacing: -0.2px;
}
.team-role-hint {
  font-size: 11px;
  font-weight: 500;
  color: var(--sp-text-dimmer);
  margin-top: 2px;
}

/* Durum sutunu — ClockTrackingView'daki canli mesai noktasiyla ayni
   gorunum, iki ekranda "mesaide" ayni sekilde okunsun diye. */
.team-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.team-dot.dot-online {
  background: var(--sp-accent-success);
  box-shadow: 0 0 6px rgba(102, 241, 189, 0.5);
  animation: team-blink 2s ease-in-out infinite;
}
.team-dot.dot-offline { background: var(--sp-text-ghost); }
@keyframes team-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
.team-status-on {
  color: var(--sp-accent-success);
  font-weight: 600;
  white-space: nowrap;
}
.team-status-off { color: var(--sp-text-faint); }

.team-body { padding: 18px 22px 6px; }

/* Footer actions — split, both large, primary button gets a brand glow */
.team-actions {
  padding: 14px 20px 20px !important;
  gap: 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}
.team-confirm-btn {
  font-weight: 800 !important;
  letter-spacing: 0.5px !important;
  box-shadow: 0 4px 14px rgba(102,241,189, 0.45) !important;
}
.team-confirm-btn:hover {
  box-shadow: 0 6px 20px rgba(102,241,189, 0.6) !important;
  transform: translateY(-1px);
}
</style>

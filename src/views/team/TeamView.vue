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
        Eklediğiniz ekip üyeleri sizinle aynı yöneticiye bağlanır.
      </v-card-subtitle>

      <v-data-table
        :headers="headers"
        :items="teammates"
        :loading="loading"
        density="compact"
        no-data-text="Ekip üyesi bulunamadı"
        loading-text="Yükleniyor..."
      >
        <template v-slot:item.roles="{ item }">
          <v-chip
            v-for="role in item.roles"
            :key="role.id"
            size="small"
            class="mr-1"
          >
            {{ roleName(role.name) }}
          </v-chip>
        </template>
        <template v-slot:item.is_active="{ item }">
          <v-chip :color="item.is_active ? 'success' : 'grey'" size="small">
            {{ item.is_active ? 'Aktif' : 'Pasif' }}
          </v-chip>
        </template>
        <template v-slot:item.last_login_at="{ item }">
          {{ item.last_login_at
            ? new Date(item.last_login_at).toLocaleString('tr-TR')
            : 'Hiç giriş yapmadı' }}
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
          <div class="team-hero-sub">Sizinle aynı yetkilere sahip yeni bir üye</div>
        </div>

        <!-- Inherited-role pill (the eye magnet — operator sees what
             permissions the new user will get before filling the form) -->
        <div class="team-role-block">
          <div class="team-role-icon"><v-icon size="22" color="white">mdi-shield-account-outline</v-icon></div>
          <div class="team-role-text">
            <div class="team-role-label">Atanacak Görev</div>
            <div class="team-role-value">{{ inheritedRoleLabel }}</div>
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

const roleLabels = {
  super_admin: 'Süper Yönetici',
  grup_yoneticisi: 'Grup Yöneticisi',
  islem_sorumlusu: 'İşlem Sorumlusu',
  yatirim_sorumlusu: 'Yatırım Sorumlusu',
  cekim_sorumlusu: 'Çekim Sorumlusu',
  muhasebe: 'Muhasebe',
  izleyici: 'İzleyici',
  sub_group_manager: 'Grup Yöneticisi',
  deposit_operator: 'Yatırım Operatörü',
  withdrawal_operator: 'Çekim Operatörü',
  bank_checker: 'Banka Kontrol',
  viewer: 'İzleyici',
}

function roleName(role) {
  return roleLabels[role] || role
}

const inheritedRole = computed(() => auth.user?.roles?.[0]?.name || '')
const inheritedRoleLabel = computed(() => roleName(inheritedRole.value) || '—')

const canAddMember = computed(
  () => !auth.isSuperAdmin && !!inheritedRole.value
)

const teammates = computed(() =>
  users.value.filter((u) => {
    if (u.id === auth.user?.id) return false
    if (u.roles?.some((r) => r.name === 'super_admin')) return false
    return true
  })
)

const headers = [
  { title: 'Ad Soyad', key: 'name' },
  { title: 'E-posta', key: 'email' },
  { title: 'Görev', key: 'roles' },
  { title: 'Durum', key: 'is_active' },
  { title: 'Son Giriş', key: 'last_login_at' },
]

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
    form.password.length >= 8 &&
    !!inheritedRole.value
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
    errorMsg.value = res?.message || 'Ekip üyesi oluşturulamadı. Lütfen tekrar deneyin.'
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

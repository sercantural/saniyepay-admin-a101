<template>
  <div>
    <v-card>
      <v-card-title class="d-flex align-center">
        <v-icon start color="primary">mdi-account-group</v-icon>
        Kullanıcılar
        <v-spacer />
        <v-btn color="primary" @click="openCreateDialog" v-if="auth.can('users.create') || auth.isSuperAdmin">
          <v-icon start>mdi-plus</v-icon> Kullanıcı Ekle
        </v-btn>
      </v-card-title>

      <v-data-table :headers="headers" :items="users" :loading="loading" density="compact" no-data-text="Kullanıcı bulunamadı" loading-text="Yükleniyor...">
        <template v-slot:item.roles="{ item }">
          <v-chip v-for="role in item.roles" :key="role.id" size="small" class="mr-1">
            {{ roleName(role.name) }}
          </v-chip>
        </template>
        <template v-slot:item.is_active="{ item }">
          <v-chip :color="item.is_active ? 'success' : 'grey'" size="small">
            {{ item.is_active ? 'Aktif' : 'Pasif' }}
          </v-chip>
        </template>
        <template v-slot:item.sub_group="{ item }">
          {{ item.sub_group?.name || '-' }}
        </template>
        <template v-slot:item.last_login_at="{ item }">
          {{ item.last_login_at ? new Date(item.last_login_at).toLocaleString('tr-TR') : 'Hiç giriş yapmadı' }}
        </template>
        <template v-slot:item.two_factor="{ item }">
          <v-chip v-if="item.two_factor_confirmed_at" size="small" color="success">
            <v-icon start size="small">mdi-shield-check</v-icon> Aktif
          </v-chip>
          <v-chip v-else size="small" color="grey">Pasif</v-chip>
        </template>
        <template v-slot:item.actions="{ item }">
          <v-btn
            v-if="can('users.edit') && (!item.roles?.some(r => r.name === 'super_admin') || auth.isSuperAdmin)"
            size="small"
            variant="text"
            color="primary"
            @click="editUser(item)"
          >
            <v-icon>mdi-pencil</v-icon>
          </v-btn>
          <v-btn
            v-if="can('users.reset_2fa') && item.two_factor_confirmed_at"
            size="small"
            variant="text"
            color="warning"
            @click="disableUserTwoFactor(item)"
          >
            <v-icon>mdi-shield-off</v-icon>
          </v-btn>
        </template>
      </v-data-table>
    </v-card>

    <!-- Oluştur/Düzenle Diyaloğu -->
    <v-dialog v-model="dialog" max-width="650">
      <v-card>
        <v-card-title>{{ editing ? 'Kullanıcıyı Düzenle' : 'Kullanıcı Oluştur' }}</v-card-title>
        <v-card-text>
          <v-text-field v-model="form.name" label="Ad Soyad" variant="outlined" density="compact" class="mb-2" />
          <v-text-field v-model="form.email" label="E-posta" variant="outlined" density="compact" class="mb-2" />
          <v-text-field v-model="form.password" :label="editing ? 'Yeni Şifre (değiştirmemek için boş bırakın)' : 'Şifre'" type="password" variant="outlined" density="compact" class="mb-2" />
          <v-select
            v-model="form.role"
            :items="availableRoleOptions"
            item-title="text"
            item-value="value"
            label="Rol"
            variant="outlined"
            density="compact"
            class="mb-2"
          />
          <v-select
            v-if="auth.isSuperAdmin"
            v-model="form.sub_group_id"
            :items="subGroups"
            item-title="name"
            item-value="id"
            label="Alt Grup"
            variant="outlined"
            density="compact"
            clearable
          />
          <v-switch v-if="editing" v-model="form.is_active" label="Aktif" color="success" />

          <!-- Yetkiler -->
          <v-divider class="my-3" />
          <div class="text-subtitle-2 font-weight-bold mb-2">
            <v-icon start size="18">mdi-shield-key</v-icon> Yetkiler
          </div>
          <div class="d-flex ga-2 mb-3">
            <v-chip size="x-small" color="grey" variant="flat">
              <v-icon start size="12">mdi-lock</v-icon> Rol tarafından sağlanır
            </v-chip>
            <v-chip size="x-small" color="primary" variant="flat">
              <v-icon start size="12">mdi-plus-circle</v-icon> Ek yetki (seçilebilir)
            </v-chip>
          </div>

          <div class="text-caption font-weight-bold mb-1 text-medium-emphasis">İşlem Yetkileri</div>
          <v-row dense>
            <v-col cols="12" sm="6" v-for="p in txnPermissions" :key="p.value">
              <v-checkbox
                :model-value="isPermChecked(p.value)"
                @update:model-value="toggleDirectPerm(p.value, $event)"
                :label="p.label"
                :color="isFromRole(p.value) ? 'grey' : p.color"
                :disabled="isFromRole(p.value)"
                density="compact"
                hide-details
              >
                <template v-slot:label>
                  <span :class="isFromRole(p.value) ? 'text-medium-emphasis' : ''">
                    {{ p.label }}
                    <v-icon v-if="isFromRole(p.value)" size="12" class="ml-1" color="grey">mdi-lock</v-icon>
                  </span>
                </template>
              </v-checkbox>
            </v-col>
          </v-row>

          <div class="text-caption font-weight-bold mt-3 mb-1 text-medium-emphasis">Banka Hesap Yetkileri</div>
          <v-row dense>
            <v-col cols="12" sm="6" v-for="p in bankPermissions" :key="p.value">
              <v-checkbox
                :model-value="isPermChecked(p.value)"
                @update:model-value="toggleDirectPerm(p.value, $event)"
                :label="p.label"
                :color="isFromRole(p.value) ? 'grey' : 'primary'"
                :disabled="isFromRole(p.value)"
                density="compact"
                hide-details
              >
                <template v-slot:label>
                  <span :class="isFromRole(p.value) ? 'text-medium-emphasis' : ''">
                    {{ p.label }}
                    <v-icon v-if="isFromRole(p.value)" size="12" class="ml-1" color="grey">mdi-lock</v-icon>
                  </span>
                </template>
              </v-checkbox>
            </v-col>
          </v-row>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="dialog = false">İptal</v-btn>
          <v-btn color="primary" variant="elevated" @click="saveUser" :loading="saving">
            {{ editing ? 'Güncelle' : 'Oluştur' }}
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
// Ekran ici eylemler de izne bagli.
const can = (p) => auth.can(p) || auth.isSuperAdmin
const users = ref([])
const subGroups = ref([])
const loading = ref(false)
const dialog = ref(false)
const saving = ref(false)
const editing = ref(false)
const editingId = ref(null)

// All role display names
const allRoleLabels = {
  super_admin: 'Süper Yönetici',
  grup_yoneticisi: 'Grup Yöneticisi',
  islem_sorumlusu: 'İşlem Sorumlusu',
  yatirim_sorumlusu: 'Yatırım Sorumlusu',
  cekim_sorumlusu: 'Çekim Sorumlusu',
  muhasebe: 'Muhasebe',
  izleyici: 'İzleyici',
  // Legacy (for existing users not yet migrated)
  sub_group_manager: 'Grup Yöneticisi (Eski)',
  deposit_operator: 'Yatırım Operatörü (Eski)',
  withdrawal_operator: 'Çekim Operatörü (Eski)',
  bank_checker: 'Banka Kontrol (Eski)',
  viewer: 'İzleyici (Eski)',
}

// Dynamic role options based on what the backend says this user can assign
const availableRoleOptions = computed(() => {
  return (auth.assignableRoles || []).map(role => ({
    text: allRoleLabels[role] || role,
    value: role,
  }))
})

function roleName(role) {
  return allRoleLabels[role] || role
}

const form = reactive({ name: '', email: '', password: '', role: '', sub_group_id: null, is_active: true, direct_permissions: [] })

// Permissions each role provides (mirrors backend seeder)
const rolePermissions = {
  super_admin: [], // super admin bypasses all checks — has everything
  grup_yoneticisi: [
    'transactions.view.deposit', 'transactions.view.withdrawal',
    'transactions.approve.deposit', 'transactions.approve.withdrawal',
    'transactions.reject.deposit', 'transactions.reject.withdrawal',
    'transactions.lock', 'transactions.add_note',
    'bank_accounts.view', 'bank_accounts.create', 'bank_accounts.edit', 'bank_accounts.toggle',
    'users.view', 'users.create', 'users.edit', 'reports.view',
  ],
  islem_sorumlusu: [
    'transactions.view.deposit', 'transactions.view.withdrawal',
    'transactions.approve.deposit', 'transactions.approve.withdrawal',
    'transactions.reject.deposit', 'transactions.reject.withdrawal',
    'transactions.lock', 'transactions.add_note',
    'bank_accounts.view',
  ],
  yatirim_sorumlusu: [
    'transactions.view.deposit',
    'transactions.approve.deposit', 'transactions.reject.deposit',
    'transactions.lock', 'transactions.add_note',
    'bank_accounts.view',
  ],
  cekim_sorumlusu: [
    'transactions.view.withdrawal',
    'transactions.approve.withdrawal', 'transactions.reject.withdrawal',
    'transactions.lock', 'transactions.add_note',
    'bank_accounts.view',
  ],
  muhasebe: [
    'transactions.view.deposit', 'transactions.view.withdrawal',
    'transactions.add_note',
    'bank_accounts.view',
    'reports.view',
  ],
  izleyici: [
    'transactions.view.deposit', 'transactions.view.withdrawal',
    'bank_accounts.view', 'reports.view',
  ],
  // Legacy mappings (for users not yet migrated)
  sub_group_manager: [
    'transactions.view.deposit', 'transactions.view.withdrawal',
    'transactions.approve.deposit', 'transactions.approve.withdrawal',
    'transactions.reject.deposit', 'transactions.reject.withdrawal',
    'transactions.lock', 'transactions.add_note',
    'bank_accounts.view', 'bank_accounts.create', 'bank_accounts.edit', 'bank_accounts.toggle',
    'users.view', 'users.create', 'users.edit', 'reports.view',
  ],
  deposit_operator: [
    'transactions.view.deposit', 'transactions.approve.deposit', 'transactions.reject.deposit',
    'transactions.lock', 'transactions.add_note', 'bank_accounts.view',
  ],
  withdrawal_operator: [
    'transactions.view.withdrawal', 'transactions.approve.withdrawal', 'transactions.reject.withdrawal',
    'transactions.lock', 'transactions.add_note', 'bank_accounts.view',
  ],
  bank_checker: [
    'transactions.view.deposit', 'transactions.add_note', 'bank_accounts.view',
  ],
  viewer: [
    'transactions.view.deposit', 'transactions.view.withdrawal', 'bank_accounts.view', 'reports.view',
  ],
}

const txnPermissions = [
  { value: 'transactions.view.deposit', label: 'Yatırımları Görebilir', color: 'primary' },
  { value: 'transactions.view.withdrawal', label: 'Çekimleri Görebilir', color: 'primary' },
  { value: 'transactions.approve.deposit', label: 'Yatırım Onaylayabilir', color: 'success' },
  { value: 'transactions.approve.withdrawal', label: 'Çekim Onaylayabilir', color: 'success' },
  { value: 'transactions.reject.deposit', label: 'Yatırım Reddedebilir', color: 'error' },
  { value: 'transactions.reject.withdrawal', label: 'Çekim Reddedebilir', color: 'error' },
  { value: 'transactions.lock', label: 'İşleme Alabilir', color: 'warning' },
]

const bankPermissions = [
  { value: 'bank_accounts.view', label: 'Hesapları Görebilir' },
  { value: 'bank_accounts.create', label: 'Hesap Ekleyebilir' },
  { value: 'bank_accounts.edit', label: 'Hesap Düzenleyebilir' },
  { value: 'bank_accounts.toggle', label: 'Hesap Açıp Kapatabilir' },
]

// Check if a permission comes from the selected role
function isFromRole(perm) {
  const role = form.role
  if (role === 'super_admin') return true // super admin has everything
  return (rolePermissions[role] || []).includes(perm)
}

// Check if permission is active (from role OR direct)
function isPermChecked(perm) {
  if (isFromRole(perm)) return true
  return form.direct_permissions.includes(perm)
}

// Toggle direct permission (only for non-role permissions)
function toggleDirectPerm(perm, checked) {
  if (isFromRole(perm)) return // can't toggle role permissions
  if (checked && !form.direct_permissions.includes(perm)) {
    form.direct_permissions.push(perm)
  } else if (!checked) {
    form.direct_permissions = form.direct_permissions.filter(p => p !== perm)
  }
}

const headers = [
  { title: 'Ad Soyad', key: 'name' },
  { title: 'E-posta', key: 'email' },
  { title: 'Rol', key: 'roles' },
  { title: 'Alt Grup', key: 'sub_group' },
  { title: '2FA', key: 'two_factor' },
  { title: 'Durum', key: 'is_active' },
  { title: 'Son Giriş', key: 'last_login_at' },
  { title: '', key: 'actions', sortable: false },
]

function openCreateDialog() {
  editing.value = false
  Object.assign(form, { name: '', email: '', password: '', role: '', sub_group_id: null, is_active: true, direct_permissions: [] })
  dialog.value = true
}

function editUser(user) {
  editing.value = true
  editingId.value = user.id
  Object.assign(form, {
    name: user.name,
    email: user.email,
    password: '',
    role: user.roles?.[0]?.name || '',
    sub_group_id: user.sub_group_id,
    is_active: user.is_active,
    direct_permissions: user.direct_permissions || [],
  })
  dialog.value = true
}

async function saveUser() {
  saving.value = true
  try {
    if (editing.value) { const data = { ...form }; if (!data.password) delete data.password; await api.put(`/portal/users/${editingId.value}`, data) }
    else { await api.post('/portal/users', form) }
    dialog.value = false; await loadUsers()
  } finally { saving.value = false }
}

async function disableUserTwoFactor(user) {
  if (!confirm(`${user.name} kullanıcısının 2FA'sını devre dışı bırakmak istediğinize emin misiniz?`)) return
  try {
    await api.delete(`/portal/users/${user.id}/two-factor`)
    await loadUsers()
  } catch (e) {
    alert(e.response?.data?.message || 'İşlem başarısız')
  }
}

async function loadUsers() { loading.value = true; const { data } = await api.get('/portal/users'); users.value = data; loading.value = false }

onMounted(async () => {
  await loadUsers()
  if (auth.isSuperAdmin) { const { data } = await api.get('/portal/sub-groups'); subGroups.value = data }
})
</script>

<style scoped>
/* ── Responsive ── */
@media (max-width: 960px) {
  :deep(.v-data-table) {
    overflow-x: auto;
  }
  :deep(.v-data-table table) {
    min-width: 700px;
  }
}
</style>

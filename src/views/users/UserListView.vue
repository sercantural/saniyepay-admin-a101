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
            {{ role.display_name || role.name }}
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
            :hint="selectedRoleHint"
            persistent-hint
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

          <div v-if="loadingPerms" class="text-center py-4">
            <v-progress-circular indeterminate size="22" />
          </div>

          <div v-else v-for="group in permissionGroups" :key="group.key" class="perm-group">
            <div class="perm-group-head">
              <v-icon v-if="group.icon" size="14" class="mr-1">{{ group.icon }}</v-icon>
              {{ group.label }}
              <span class="perm-group-count">{{ selectedIn(group) }}/{{ group.permissions.length }}</span>
            </div>
            <label
              v-for="p in group.permissions"
              :key="p.name"
              class="perm-item"
              :class="{ locked: isFromRole(p.name) }"
            >
              <input
                type="checkbox"
                :checked="isPermChecked(p.name)"
                :disabled="isFromRole(p.name)"
                @change="toggleDirectPerm(p.name, $event.target.checked)"
              />
              <span>
                <span class="perm-title">
                  <b>{{ p.label }}</b>
                  <v-icon v-if="isFromRole(p.name)" size="11" color="grey">mdi-lock</v-icon>
                  <em class="perm-level" :class="'lv-' + p.level">{{ levels[p.level] || p.level }}</em>
                </span>
                <span class="perm-desc">{{ p.description }}</span>
              </span>
            </label>
          </div>

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

/*
 * Rol listesi ve her rolun tasidigi izinler sunucudan geliyor
 * (/portal/me -> assignable_roles). Burada eskiden elle tutulan bir
 * kopya vardi: seeder degistiginde bu ekran sessizce yanlis bilgi
 * gosteriyordu ve panelden olusturulan yeni roller hic gorunmuyordu.
 */
const availableRoleOptions = computed(() =>
  (auth.assignableRoles || []).map(r => ({
    text: r.display_name || r.name,
    value: r.name,
  }))
)

const selectedRole = computed(() =>
  (auth.assignableRoles || []).find(r => r.name === form.role) || null
)

const selectedRoleHint = computed(() => {
  if (!selectedRole.value) return ''
  if (selectedRole.value.locked) return 'Tüm izinlere sahiptir.'
  const n = (selectedRole.value.permissions || []).length
  return n ? `Bu rol ${n} izin taşıyor — aşağıda kilitli görünüyorlar.` : 'Bu role henüz izin atanmamış.'
})

const form = reactive({ name: '', email: '', password: '', role: '', sub_group_id: null, is_active: true, direct_permissions: [] })

// Izin katalogu — rol ekraniyla ayni kaynak.
const permissionGroups = ref([])
const levels = ref({})
const loadingPerms = ref(false)

async function loadPermissionCatalog() {
  loadingPerms.value = true
  try {
    const { data } = await api.get('/portal/permissions')
    permissionGroups.value = data.groups || []
    levels.value = data.levels || {}
  } catch {
    permissionGroups.value = []
  } finally {
    loadingPerms.value = false
  }
}

function selectedIn(group) {
  return group.permissions.filter(p => isPermChecked(p.name)).length
}

// Check if a permission comes from the selected role
function isFromRole(perm) {
  const role = selectedRole.value
  if (!role) return false
  // Kilitli rol (super_admin) Gate::before ile her izni geciyor.
  if (role.locked) return true
  return (role.permissions || []).includes(perm)
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
  await Promise.all([loadUsers(), loadPermissionCatalog()])
  if (auth.isSuperAdmin) { const { data } = await api.get('/portal/sub-groups'); subGroups.value = data }
})
</script>

<style scoped>
/* ── Izin katalogu ── */
.perm-group { margin-bottom: 10px; }
.perm-group-head {
  display: flex;
  align-items: center;
  font-size: 10.5px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgb(var(--v-theme-primary));
  padding: 6px 0 4px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
}
.perm-group-count {
  margin-left: auto;
  font-variant-numeric: tabular-nums;
  color: rgba(255, 255, 255, 0.42);
}
.perm-item {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  padding: 7px 4px;
  cursor: pointer;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
}
.perm-item:hover { background: rgba(255, 255, 255, 0.03); }
/* Rolden gelen izin: kapatilamaz, o yuzden tiklanabilir gorunmesin. */
.perm-item.locked { cursor: default; opacity: 0.62; }
.perm-item input { margin-top: 3px; accent-color: rgb(var(--v-theme-primary)); }
.perm-title { display: flex; align-items: center; gap: 6px; }
.perm-item b { font-size: 12.5px; font-weight: 600; }
.perm-level {
  font-style: normal;
  font-size: 9.5px;
  letter-spacing: 0.04em;
  padding: 1px 5px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  color: rgba(255, 255, 255, 0.5);
  white-space: nowrap;
}
.perm-level.lv-admin { color: #ff9c88; border-color: rgba(255, 156, 136, 0.35); }
.perm-level.lv-manager { color: #f0a35e; border-color: rgba(240, 163, 94, 0.35); }
.perm-level.lv-operator { color: rgb(var(--v-theme-primary)); border-color: rgba(102, 241, 189, 0.3); }
.perm-desc {
  display: block;
  margin-top: 3px;
  font-size: 11px;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.5);
}

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

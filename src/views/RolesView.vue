<template>
  <div class="roles-view">
    <div class="roles-head">
      <div>
        <div class="roles-title">Roller ve İzinler</div>
        <div class="roles-sub">
          Rol oluşturup her menü ve menü içindeki her eylem için ayrı izin verebilirsiniz.
          Süper yönetici tüm izinlere sahiptir ve bu listeden yönetilmez.
        </div>
      </div>
      <v-btn
        v-if="canCreate"
        color="primary" variant="flat" prepend-icon="mdi-plus"
        @click="openCreate"
      >
        Yeni rol
      </v-btn>
    </div>

    <div v-if="loading" class="text-center py-10">
      <v-progress-circular indeterminate size="32" />
    </div>

    <div v-else class="roles-grid">
      <div v-for="role in roles" :key="role.id" class="role-card" :class="{ locked: role.locked }">
        <div class="role-card-head">
          <div>
            <div class="role-name">{{ role.name }}</div>
            <div class="role-meta">
              {{ role.users_count }} kullanıcı ·
              <span v-if="role.locked">tüm izinler</span>
              <span v-else>{{ role.permissions.length }} / {{ totalPermissions }} izin</span>
            </div>
          </div>
          <v-chip v-if="role.locked" size="x-small" color="primary" variant="tonal">kilitli</v-chip>
        </div>

        <!-- Hangi menulere dokunabildigini bir bakista gostermek, izin
             adlarini tek tek okumaktan daha hizli anlasiliyor. -->
        <div class="role-groups">
          <span
            v-for="g in groupSummary(role)"
            :key="g.key"
            class="role-group-pill"
            :class="{ full: g.count === g.total }"
          >
            {{ g.label }} <b>{{ g.count }}/{{ g.total }}</b>
          </span>
          <span v-if="!role.locked && !groupSummary(role).length" class="role-empty">izin atanmamış</span>
        </div>

        <div class="role-actions">
          <v-btn
            v-if="canEdit && !role.locked"
            size="small" variant="tonal" color="primary"
            @click="openEdit(role)"
          >
            İzinleri düzenle
          </v-btn>
          <v-btn
            v-if="canDelete && !role.locked"
            size="small" variant="text" color="error"
            @click="askDelete(role)"
          >
            Sil
          </v-btn>
        </div>
      </div>
    </div>

    <!-- ── Rol düzenleme / oluşturma ── -->
    <v-dialog v-model="dialog" max-width="920" scrollable>
      <v-card>
        <v-card-title class="dlg-head">
          <div>
            <div class="dlg-title">{{ editing ? 'İzinleri düzenle' : 'Yeni rol' }}</div>
            <div class="dlg-sub" v-if="editing">{{ form.name }}</div>
          </div>
          <div class="dlg-count">{{ form.permissions.length }} izin seçili</div>
        </v-card-title>

        <v-card-text>
          <v-text-field
            v-if="!editing"
            v-model="form.name"
            label="Rol adı"
            hint="Küçük harf, rakam ve alt çizgi. Örn: destek_ekibi"
            persistent-hint
            variant="outlined" density="compact"
            class="mb-4"
            :error-messages="nameError"
          />

          <div class="bulk-row">
            <v-text-field
              v-model="search" label="İzin ara" density="compact" variant="outlined"
              hide-details clearable prepend-inner-icon="mdi-magnify" style="max-width: 300px"
            />
            <v-btn size="small" variant="text" @click="selectAll(true)">Tümünü seç</v-btn>
            <v-btn size="small" variant="text" @click="selectAll(false)">Temizle</v-btn>
          </div>

          <div v-for="group in visibleGroups" :key="group.key" class="perm-group">
            <div class="perm-group-head">
              <v-icon v-if="group.icon" size="16" class="mr-2">{{ group.icon }}</v-icon>
              <span class="perm-group-label">{{ group.label }}</span>
              <span class="perm-group-count">{{ selectedIn(group) }}/{{ group.permissions.length }}</span>
              <v-spacer />
              <v-btn size="x-small" variant="text" @click="toggleGroup(group)">
                {{ selectedIn(group) === group.permissions.length ? 'kaldır' : 'hepsi' }}
              </v-btn>
            </div>
            <div class="perm-items">
              <label v-for="p in group.permissions" :key="p.name" class="perm-item">
                <input
                  type="checkbox"
                  :checked="form.permissions.includes(p.name)"
                  @change="togglePerm(p.name, $event.target.checked)"
                />
                <span>
                  <b>{{ p.label }}</b>
                  <small>{{ p.name }}</small>
                </span>
              </label>
            </div>
          </div>

          <div v-if="!visibleGroups.length" class="text-center py-6 text-medium-emphasis">
            Aramayla eşleşen izin yok.
          </div>
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="dialog = false">Vazgeç</v-btn>
          <v-btn color="primary" variant="flat" :loading="saving" @click="save">Kaydet</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- ── Silme onayı ── -->
    <v-dialog v-model="deleteDialog" max-width="440">
      <v-card>
        <v-card-title class="pa-4">Rolü sil</v-card-title>
        <v-card-text>
          <strong>{{ deleteTarget?.name }}</strong> rolü silinecek.
          <v-alert type="warning" variant="tonal" density="compact" class="mt-3">
            Bu işlem geri alınamaz. Role atanmış kullanıcı varsa silinemez;
            önce onları başka bir role taşıyın.
          </v-alert>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="deleteDialog = false">Vazgeç</v-btn>
          <v-btn color="error" variant="flat" :loading="deleting" @click="confirmDelete">Sil</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar" :color="snackColor" timeout="3500">{{ snackText }}</v-snackbar>
  </div>
</template>

<script setup>
/**
 * Roller ve izinler.
 *
 * Amac: yeni bir gorev tanimi icin kod degistirmek gerekmesin. Izin
 * katalogu sunucudan geliyor (config/permissions.php), yani buraya
 * gomulu bir izin listesi YOK -- yeni izin eklendiginde ekran
 * kendiliginden gosteriyor.
 */
import { ref, computed, onMounted } from 'vue'
import api from '@/plugins/axios'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()

const roles = ref([])
const groups = ref([])
const loading = ref(true)
const saving = ref(false)
const deleting = ref(false)
const search = ref('')

const dialog = ref(false)
const editing = ref(false)
const editingId = ref(null)
const form = ref({ name: '', permissions: [] })
const nameError = ref('')

const deleteDialog = ref(false)
const deleteTarget = ref(null)

const snackbar = ref(false)
const snackText = ref('')
const snackColor = ref('success')

const canCreate = computed(() => auth.isSuperAdmin || auth.can('roles.create'))
const canEdit = computed(() => auth.isSuperAdmin || auth.can('roles.edit'))
const canDelete = computed(() => auth.isSuperAdmin || auth.can('roles.delete'))

const totalPermissions = computed(() =>
  groups.value.reduce((n, g) => n + g.permissions.length, 0)
)

const visibleGroups = computed(() => {
  const q = (search.value || '').toLowerCase().trim()
  if (!q) return groups.value
  return groups.value
    .map(g => ({
      ...g,
      permissions: g.permissions.filter(
        p => p.label.toLowerCase().includes(q) || p.name.toLowerCase().includes(q)
      ),
    }))
    .filter(g => g.permissions.length)
})

// Rolun hangi menude kac izni oldugu — kart uzerindeki ozet.
function groupSummary(role) {
  if (role.locked) return []
  return groups.value
    .map(g => ({
      key: g.key,
      label: g.label,
      total: g.permissions.length,
      count: g.permissions.filter(p => role.permissions.includes(p.name)).length,
    }))
    .filter(g => g.count > 0)
}

function selectedIn(group) {
  return group.permissions.filter(p => form.value.permissions.includes(p.name)).length
}

function togglePerm(name, checked) {
  const set = new Set(form.value.permissions)
  checked ? set.add(name) : set.delete(name)
  form.value.permissions = [...set]
}

function toggleGroup(group) {
  const all = selectedIn(group) === group.permissions.length
  const set = new Set(form.value.permissions)
  group.permissions.forEach(p => (all ? set.delete(p.name) : set.add(p.name)))
  form.value.permissions = [...set]
}

function selectAll(on) {
  if (!on) {
    form.value.permissions = []
    return
  }
  form.value.permissions = groups.value.flatMap(g => g.permissions.map(p => p.name))
}

function openCreate() {
  editing.value = false
  editingId.value = null
  nameError.value = ''
  search.value = ''
  form.value = { name: '', permissions: [] }
  dialog.value = true
}

function openEdit(role) {
  editing.value = true
  editingId.value = role.id
  nameError.value = ''
  search.value = ''
  form.value = { name: role.name, permissions: [...role.permissions] }
  dialog.value = true
}

async function save() {
  nameError.value = ''
  if (!editing.value && !/^[a-z][a-z0-9_]*$/.test(form.value.name || '')) {
    nameError.value = 'Küçük harfle başlamalı; yalnızca küçük harf, rakam ve alt çizgi.'
    return
  }
  saving.value = true
  try {
    if (editing.value) {
      await api.put(`/portal/roles/${editingId.value}`, { permissions: form.value.permissions })
    } else {
      await api.post('/portal/roles', { name: form.value.name, permissions: form.value.permissions })
    }
    snack(editing.value ? 'İzinler güncellendi.' : 'Rol oluşturuldu.')
    dialog.value = false
    await load()
  } catch (e) {
    const errs = e.response?.data?.errors
    if (errs?.name) nameError.value = errs.name[0]
    snack(e.response?.data?.message || 'Kaydedilemedi.', 'error')
  } finally {
    saving.value = false
  }
}

function askDelete(role) {
  deleteTarget.value = role
  deleteDialog.value = true
}

async function confirmDelete() {
  deleting.value = true
  try {
    await api.delete(`/portal/roles/${deleteTarget.value.id}`)
    snack('Rol silindi.')
    deleteDialog.value = false
    await load()
  } catch (e) {
    snack(e.response?.data?.message || 'Rol silinemedi.', 'error')
  } finally {
    deleting.value = false
  }
}

function snack(text, color = 'success') {
  snackText.value = text
  snackColor.value = color
  snackbar.value = true
}

async function load() {
  loading.value = true
  try {
    const [r, p] = await Promise.all([
      api.get('/portal/roles'),
      api.get('/portal/permissions'),
    ])
    roles.value = r.data
    groups.value = p.data
  } catch (e) {
    snack(e.response?.data?.message || 'Yüklenemedi.', 'error')
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.roles-view { padding: 4px; }

.roles-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}
.roles-title { font-size: 18px; font-weight: 700; letter-spacing: -0.02em; }
.roles-sub { font-size: 12.5px; color: var(--sp-text-muted); max-width: 640px; }

.roles-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 12px;
}

.role-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px;
  background: var(--sp-glass-bg);
  border: 1px solid var(--sp-border);
  border-top: 2px solid var(--sp-border);
}
.role-card.locked { border-top-color: var(--sp-primary); }

.role-card-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }
.role-name { font-weight: 700; font-size: 14px; }
.role-meta { font-size: 11.5px; color: var(--sp-text-muted); }

.role-groups { display: flex; flex-wrap: wrap; gap: 5px; min-height: 22px; }
.role-group-pill {
  padding: 2px 7px;
  font-size: 10.5px;
  color: var(--sp-text-muted);
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--sp-border);
}
.role-group-pill.full { color: var(--sp-primary); border-color: rgba(102, 241, 189, 0.3); }
.role-group-pill b { font-variant-numeric: tabular-nums; }
.role-empty { font-size: 11px; color: var(--sp-text-muted); font-style: italic; }

.role-actions { display: flex; gap: 6px; margin-top: auto; }

.dlg-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px 10px;
}
.dlg-title { font-size: 15px; font-weight: 700; }
.dlg-sub { font-size: 12px; color: var(--sp-text-muted); font-family: 'JetBrains Mono', monospace; }
.dlg-count { font-size: 12px; color: var(--sp-primary); font-weight: 600; }

.bulk-row { display: flex; align-items: center; gap: 8px; margin-bottom: 14px; }

.perm-group { margin-bottom: 16px; border: 1px solid var(--sp-border); }
.perm-group-head {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.03);
  border-bottom: 1px solid var(--sp-border);
}
.perm-group-label { font-weight: 700; font-size: 12.5px; }
.perm-group-count {
  font-size: 11px;
  color: var(--sp-text-muted);
  font-variant-numeric: tabular-nums;
}

.perm-items {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 2px;
  padding: 8px;
}
.perm-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 6px 8px;
  cursor: pointer;
}
.perm-item:hover { background: rgba(255, 255, 255, 0.03); }
.perm-item input { margin-top: 3px; accent-color: var(--sp-primary); cursor: pointer; }
.perm-item b { display: block; font-size: 12.5px; font-weight: 500; }
.perm-item small {
  display: block;
  font-size: 10px;
  color: var(--sp-text-muted);
  font-family: 'JetBrains Mono', monospace;
}
</style>

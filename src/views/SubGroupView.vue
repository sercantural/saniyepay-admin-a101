<template>
  <div>
    <v-card>
      <v-card-title class="d-flex align-center">
        <v-icon start color="primary">mdi-folder-account</v-icon>
        Alt Gruplar
        <v-spacer />
        <v-btn color="primary" @click="openCreate" v-if="auth.isSuperAdmin">
          <v-icon start>mdi-plus</v-icon> Grup Ekle
        </v-btn>
      </v-card-title>

      <v-data-table :headers="headers" :items="groups" :loading="loading" density="compact" no-data-text="Alt grup bulunamadı" loading-text="Yükleniyor...">
        <template v-slot:item.is_active="{ item }">
          <v-chip :color="item.is_active ? 'success' : 'grey'" size="small">
            {{ item.is_active ? 'Aktif' : 'Pasif' }}
          </v-chip>
        </template>
        <template v-slot:item.two_step_deposit="{ item }">
          <v-icon :color="item.two_step_deposit ? 'success' : 'grey'">
            {{ item.two_step_deposit ? 'mdi-check' : 'mdi-close' }}
          </v-icon>
        </template>
        <template v-slot:item.actions="{ item }">
          <v-btn v-if="auth.isSuperAdmin" size="small" variant="text" color="primary" @click="editGroup(item)">
            <v-icon>mdi-pencil</v-icon>
          </v-btn>
        </template>
      </v-data-table>
    </v-card>

    <v-dialog v-model="dialog" max-width="500">
      <v-card>
        <v-card-title>{{ editing ? 'Alt Grubu Düzenle' : 'Alt Grup Oluştur' }}</v-card-title>
        <v-card-text>
          <v-text-field v-model="form.name" label="Grup Adı" variant="outlined" density="compact" class="mb-2" />
          <v-text-field v-model="form.description" label="Açıklama" variant="outlined" density="compact" class="mb-2" />

          <!-- Komisyon Oranları (sadece süper yönetici) -->
          <v-divider class="my-3" />
          <div class="text-subtitle-2 font-weight-bold mb-2">
            <v-icon start size="18" color="warning">mdi-percent</v-icon> Komisyon Payı
          </div>
          <v-alert type="info" variant="tonal" density="compact" class="mb-3">
            Bu gruba verilecek komisyon oranı. Bayi komisyonundan bu oran düşülür, kalan sahibe kalır.
          </v-alert>
          <v-row dense>
            <v-col cols="12" sm="4">
              <v-text-field
                v-model.number="form.deposit_fee_percent"
                label="Yatırım Komisyon Payı (%)"
                type="number"
                step="0.01"
                min="0"
                max="100"
                variant="outlined"
                density="compact"
                class="mb-2"
              />
            </v-col>
            <v-col cols="12" sm="4">
              <v-text-field
                v-model.number="form.withdrawal_fee_percent"
                label="Çekim Komisyon Payı (%)"
                type="number"
                step="0.01"
                min="0"
                max="100"
                variant="outlined"
                density="compact"
                class="mb-2"
              />
            </v-col>
            <v-col cols="12" sm="4">
              <v-text-field
                v-model.number="form.teslim_fee_percent"
                label="Teslim Komisyon Payı (%)"
                type="number"
                step="0.01"
                min="0"
                max="100"
                variant="outlined"
                density="compact"
                class="mb-2"
              />
            </v-col>
          </v-row>

          <v-switch v-model="form.two_step_deposit" label="İki Aşamalı Yatırım" color="primary" />
          <v-switch v-if="editing" v-model="form.is_active" label="Aktif" color="success" />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="dialog = false">İptal</v-btn>
          <v-btn color="primary" variant="elevated" @click="save" :loading="saving">Kaydet</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import api from '@/plugins/axios'

const auth = useAuthStore()
const groups = ref([])
const loading = ref(false)
const dialog = ref(false)
const saving = ref(false)
const editing = ref(false)
const editingId = ref(null)
const form = reactive({ name: '', description: '', two_step_deposit: false, is_active: true, deposit_fee_percent: 0, withdrawal_fee_percent: 0, teslim_fee_percent: 0 })

const headers = [
  { title: 'Grup Adı', key: 'name' },
  { title: 'Açıklama', key: 'description' },
  ...(auth.isSuperAdmin ? [
    { title: 'Yatırım %', key: 'deposit_fee_percent' },
    { title: 'Çekim %', key: 'withdrawal_fee_percent' },
    { title: 'Teslim %', key: 'teslim_fee_percent' },
  ] : []),
  { title: 'İki Aşamalı', key: 'two_step_deposit' },
  { title: 'Kullanıcılar', key: 'users_count' },
  { title: 'Hesaplar', key: 'bank_accounts_count' },
  { title: 'Durum', key: 'is_active' },
  { title: '', key: 'actions', sortable: false },
]

function openCreate() {
  editing.value = false
  Object.assign(form, { name: '', description: '', two_step_deposit: false, is_active: true, deposit_fee_percent: 0, withdrawal_fee_percent: 0, teslim_fee_percent: 0 })
  dialog.value = true
}

function editGroup(g) {
  editing.value = true
  editingId.value = g.id
  Object.assign(form, {
    name: g.name, description: g.description,
    two_step_deposit: g.two_step_deposit, is_active: g.is_active,
    deposit_fee_percent: g.deposit_fee_percent || 0,
    withdrawal_fee_percent: g.withdrawal_fee_percent || 0,
    teslim_fee_percent: g.teslim_fee_percent || 0,
  })
  dialog.value = true
}

async function save() {
  saving.value = true
  try { if (editing.value) await api.put(`/portal/sub-groups/${editingId.value}`, form); else await api.post('/portal/sub-groups', form); dialog.value = false; await loadGroups() }
  finally { saving.value = false }
}

async function loadGroups() { loading.value = true; const { data } = await api.get('/portal/sub-groups'); groups.value = data; loading.value = false }
onMounted(() => loadGroups())
</script>

<style scoped>
/* ── Responsive ── */
@media (max-width: 960px) {
  :deep(.v-data-table) {
    overflow-x: auto;
  }
  :deep(.v-data-table table) {
    min-width: 650px;
  }
}
</style>

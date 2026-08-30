<template>
  <div>
    <v-card>
      <v-card-title class="d-flex align-center flex-wrap ga-2">
        <v-icon start color="deep-purple">mdi-file-document-outline</v-icon>
        Teklifler
        <v-spacer />
        <v-select
          v-model="statusFilter"
          :items="statusOptions"
          item-title="text"
          item-value="value"
          label="Durum"
          variant="outlined"
          density="compact"
          clearable
          hide-details
          style="max-width: 160px"
          @update:model-value="loadData"
        />
        <v-btn color="primary" variant="elevated" :to="{ name: 'ProposalCreate' }">
          <v-icon start>mdi-plus</v-icon> Yeni Teklif
        </v-btn>
      </v-card-title>

      <v-data-table
        :headers="headers"
        :items="items"
        :loading="loading"
        items-per-page="20"
        density="compact"
        class="clickable-table"
        @click:row="(e, { item }) => router.push({ name: 'ProposalDetail', params: { id: item.id } })"
        no-data-text="Henüz teklif oluşturulmadı"
      >
        <template #item.merchant_name="{ item }">
          <div style="line-height: 1.4">
            <div class="font-weight-bold" style="color: var(--sp-text)">{{ item.merchant_name }}</div>
            <div v-if="item.contact_name" class="text-caption" style="color: var(--sp-text-hint)">{{ item.contact_name }}</div>
          </div>
        </template>

        <template #item.fees="{ item }">
          <div class="text-caption" style="line-height: 1.6">
            <span style="color: #66BB6A">Y %{{ item.deposit_fee_percent }}</span>
            <span style="color: var(--sp-text-dim)"> · </span>
            <span style="color: #4FC3F7">Ç %{{ item.withdrawal_fee_percent }}</span>
            <span style="color: var(--sp-text-dim)"> · </span>
            <span style="color: #CE93D8">M %{{ item.settlement_fee_percent }}</span>
          </div>
        </template>

        <template #item.status="{ item }">
          <v-chip :color="statusColor(item.status)" variant="flat" size="small" label class="font-weight-bold">
            <v-icon start size="14">{{ statusIcon(item.status) }}</v-icon>
            {{ statusLabel(item.status) }}
          </v-chip>
        </template>

        <template #item.valid_until="{ item }">
          <span v-if="item.valid_until" class="text-caption">{{ new Date(item.valid_until).toLocaleDateString('tr-TR') }}</span>
          <span v-else style="color: var(--sp-text-dim)">--</span>
        </template>

        <template #item.created_at="{ item }">
          <span class="text-caption">{{ new Date(item.created_at).toLocaleDateString('tr-TR') }}</span>
        </template>

        <template #item.actions="{ item }">
          <div class="d-flex ga-1">
            <v-btn size="x-small" variant="tonal" color="primary" :to="{ name: 'ProposalDetail', params: { id: item.id } }" @click.stop>
              <v-icon size="14">mdi-eye</v-icon>
            </v-btn>
            <v-btn v-if="item.status === 'draft'" size="x-small" variant="tonal" :to="{ name: 'ProposalEdit', params: { id: item.id } }" @click.stop>
              <v-icon size="14">mdi-pencil</v-icon>
            </v-btn>
            <v-btn size="x-small" variant="tonal" color="error" @click.stop="deleteProposal(item.id)">
              <v-icon size="14">mdi-trash-can-outline</v-icon>
            </v-btn>
          </div>
        </template>
      </v-data-table>
    </v-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/plugins/axios'

const router = useRouter()
const items = ref([])
const loading = ref(false)
const statusFilter = ref(null)

const statusOptions = [
  { text: 'Taslak', value: 'draft' },
  { text: 'Gönderildi', value: 'sent' },
  { text: 'Kabul Edildi', value: 'accepted' },
  { text: 'Reddedildi', value: 'rejected' },
]

const headers = [
  { title: 'Bayi', key: 'merchant_name' },
  { title: 'Komisyonlar', key: 'fees', sortable: false },
  { title: 'Durum', key: 'status', width: '130px' },
  { title: 'Geçerlilik', key: 'valid_until', width: '110px' },
  { title: 'Tarih', key: 'created_at', width: '100px' },
  { title: '', key: 'actions', width: '120px', sortable: false },
]

function statusColor(s) {
  return { draft: 'blue-grey', sent: 'info', accepted: 'success', rejected: 'error' }[s] || 'grey'
}
function statusIcon(s) {
  return { draft: 'mdi-file-edit-outline', sent: 'mdi-send', accepted: 'mdi-check-circle', rejected: 'mdi-close-circle' }[s] || 'mdi-help'
}
function statusLabel(s) {
  return { draft: 'Taslak', sent: 'Gönderildi', accepted: 'Kabul Edildi', rejected: 'Reddedildi' }[s] || s
}

async function loadData() {
  loading.value = true
  try {
    const params = {}
    if (statusFilter.value) params.status = statusFilter.value
    const { data } = await api.get('/portal/proposals', { params })
    items.value = data.data || data
  } finally { loading.value = false }
}

async function deleteProposal(id) {
  if (!confirm('Bu teklifi silmek istediğinize emin misiniz?')) return
  await api.delete(`/portal/proposals/${id}`)
  loadData()
}

onMounted(() => loadData())
</script>

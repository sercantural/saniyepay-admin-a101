<template>
  <div class="platform-settings">
    <v-card class="settings-card">
      <v-card-title class="d-flex align-center pa-4" style="border-bottom: 1px solid var(--sp-border)">
        <div class="settings-icon">
          <v-icon size="20" color="white">mdi-cog</v-icon>
        </div>
        <div class="ml-3">
          <div class="settings-title">Platform Ayarları</div>
          <div class="settings-sub">Süper yönetici tarafından yapılandırılan platform geneli eşikler.</div>
        </div>
      </v-card-title>

      <v-card-text class="pa-5">
        <!-- Çekim Dekont Eşiği -->
        <div class="setting-block">
          <div class="setting-head">
            <v-icon size="16" color="purple-lighten-2" class="mr-2">mdi-receipt-text-check</v-icon>
            <span class="setting-name">Çekim Dekont Eşiği</span>
          </div>
          <div class="setting-desc">
            Bu tutar ve üzerindeki çekimler için operatörün dekont yüklemesi ve süper yönetici onayı gerekir.
            Bu tutarın altındaki çekimler operatör tarafından doğrudan onaylanabilir.
          </div>
          <div class="setting-input">
            <v-text-field
              :model-value="formatAmountInput(form.dekontThreshold)"
              @update:model-value="v => form.dekontThreshold = parseAmountInput(v)"
              label="Eşik Tutar"
              type="text"
              inputmode="numeric"
              variant="outlined"
              density="compact"
              hide-details
              suffix="TRY"
              placeholder="örn: 5.000"
            />
            <v-btn
              color="primary"
              variant="flat"
              :loading="saving === 'withdrawal.dekont_threshold'"
              :disabled="!isDirty('withdrawal.dekont_threshold')"
              @click="save('withdrawal.dekont_threshold', form.dekontThreshold)"
              prepend-icon="mdi-content-save"
            >
              Kaydet
            </v-btn>
          </div>
          <div v-if="lastSavedAt['withdrawal.dekont_threshold']" class="setting-saved">
            <v-icon size="12" color="success">mdi-check-circle</v-icon>
            Kaydedildi · {{ lastSavedAt['withdrawal.dekont_threshold'] }}
          </div>
        </div>
      </v-card-text>
    </v-card>

    <v-snackbar v-model="snackbar" :color="snackbarColor" timeout="3000">{{ snackbarText }}</v-snackbar>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import api from '@/plugins/axios'

const original = reactive({})
const form = reactive({
  dekontThreshold: 5000,
})
const saving = ref(null)
const lastSavedAt = reactive({})

const snackbar = ref(false)
const snackbarText = ref('')
const snackbarColor = ref('success')

function showSnack(text, color = 'success') {
  snackbarText.value = text
  snackbarColor.value = color
  snackbar.value = true
}

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

function isDirty(key) {
  // Map server key to local form field. Currently only one key in the form.
  const field = key === 'withdrawal.dekont_threshold' ? 'dekontThreshold' : null
  if (!field) return false
  return Number(form[field] || 0) !== Number(original[key] || 0)
}

async function load() {
  const { data } = await api.get('/portal/settings')
  Object.assign(original, data)
  form.dekontThreshold = Number(data['withdrawal.dekont_threshold'] || 0)
}

async function save(key, value) {
  saving.value = key
  try {
    const { data } = await api.put(`/portal/settings/${encodeURIComponent(key)}`, { value })
    original[key] = data.value
    lastSavedAt[key] = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
    showSnack('Ayar güncellendi.')
  } catch (e) {
    showSnack(e.response?.data?.message || 'Kaydedilemedi.', 'error')
  } finally {
    saving.value = null
  }
}

onMounted(load)
</script>

<style scoped>
.platform-settings { max-width: 760px; }

.settings-card {
  border-radius: 14px;
  background: var(--sp-glass-bg);
  border: 1px solid var(--sp-glass-border);
  overflow: hidden;
}
.settings-icon {
  width: 38px; height: 38px;
  border-radius: 10px;
  background: linear-gradient(135deg, #7C3AED, #A78BFA);
  display: flex; align-items: center; justify-content: center;
}
.settings-title { font-size: 15px; font-weight: 700; color: var(--sp-text); }
.settings-sub   { font-size: 11px; color: var(--sp-text-dim); }

.setting-block {
  padding: 16px;
  border-radius: 10px;
  background: var(--sp-surface-1, rgba(124,58,237,0.04));
  border: 1px solid var(--sp-border);
}
.setting-head { display: flex; align-items: center; margin-bottom: 6px; }
.setting-name { font-size: 13px; font-weight: 700; color: var(--sp-text); }
.setting-desc { font-size: 12px; color: var(--sp-text-dim); margin-bottom: 10px; line-height: 1.4; }
.setting-input {
  display: flex; gap: 10px; align-items: stretch;
}
.setting-input :deep(.v-input) { flex: 1; }
.setting-saved {
  margin-top: 8px;
  display: flex; align-items: center; gap: 4px;
  font-size: 11px; color: var(--sp-text-dim);
}
</style>

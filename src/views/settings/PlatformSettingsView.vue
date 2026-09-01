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
            <v-icon size="16" color="secondary" class="mr-2">mdi-receipt-text-check</v-icon>
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
              :disabled="!canManage || !isDirty('withdrawal.dekont_threshold')"
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

        <!-- Çekim Havuzu -->
        <div class="setting-block">
          <div class="setting-head">
            <v-icon size="16" color="secondary" class="mr-2">mdi-tray-full</v-icon>
            <span class="setting-name">Çekim Havuzu</span>
          </div>
          <div class="setting-desc">
            Çekimler hiçbir durumda operatöre otomatik atanmaz; her zaman havuzda bekler.
            Bu anahtar <strong>operatörlerin havuzdan iş alıp alamayacağını</strong> belirler:
            açıkken operatörler tutar aralığındaki çekimleri görüp kendilerine alır,
            kapalıyken listeyi yalnızca süper yönetici görür ve elle atar.
          </div>
          <div class="setting-input">
            <v-switch
              v-model="form.poolEnabled"
              color="primary"
              density="compact"
              hide-details
              :label="form.poolEnabled ? 'Havuz açık' : 'Havuz kapalı'"
            />
            <v-btn
              color="primary"
              variant="flat"
              :loading="saving === 'withdrawal.pool_enabled'"
              :disabled="!canManage || !isDirty('withdrawal.pool_enabled')"
              @click="save('withdrawal.pool_enabled', form.poolEnabled)"
              prepend-icon="mdi-content-save"
            >
              Kaydet
            </v-btn>
          </div>
          <div v-if="lastSavedAt['withdrawal.pool_enabled']" class="setting-saved">
            <v-icon size="12" color="success">mdi-check-circle</v-icon>
            Kaydedildi · {{ lastSavedAt['withdrawal.pool_enabled'] }}
          </div>
        </div>

        <!-- Havuz görünürlük aralığı -->
        <div class="setting-block">
          <div class="setting-head">
            <v-icon size="16" color="secondary" class="mr-2">mdi-arrow-expand-vertical</v-icon>
            <span class="setting-name">Havuz Tutar Aralığı</span>
          </div>
          <div class="setting-desc">
            Alt gruptaki kullanıcılar havuzda yalnızca bu aralıktaki çekimleri görür ve alabilir.
            Aralık dışında kalanları yalnızca süper yönetici görür ve elle atar.
            Üst limit <strong>0</strong> girilirse sınır uygulanmaz.
          </div>
          <div class="setting-input">
            <v-text-field
              :model-value="formatAmountInput(form.poolMin)"
              @update:model-value="v => form.poolMin = parseAmountInput(v)"
              label="Alt Limit"
              type="text" inputmode="numeric" variant="outlined" density="compact"
              hide-details suffix="TRY" placeholder="örn: 100"
            />
            <v-text-field
              :model-value="formatAmountInput(form.poolMax)"
              @update:model-value="v => form.poolMax = parseAmountInput(v)"
              label="Üst Limit"
              type="text" inputmode="numeric" variant="outlined" density="compact"
              hide-details suffix="TRY" placeholder="örn: 50.000"
            />
          </div>
          <div class="setting-input mt-3">
            <v-btn
              color="primary" variant="flat"
              :loading="saving === 'withdrawal.pool_min_amount'"
              :disabled="!canManage || !isDirty('withdrawal.pool_min_amount')"
              @click="save('withdrawal.pool_min_amount', form.poolMin || 0)"
              prepend-icon="mdi-content-save"
            >Alt limiti kaydet</v-btn>
            <v-btn
              color="primary" variant="flat"
              :loading="saving === 'withdrawal.pool_max_amount'"
              :disabled="!canManage || !isDirty('withdrawal.pool_max_amount')"
              @click="save('withdrawal.pool_max_amount', form.poolMax || 0)"
              prepend-icon="mdi-content-save"
            >Üst limiti kaydet</v-btn>
          </div>
          <div v-if="lastSavedAt['withdrawal.pool_min_amount'] || lastSavedAt['withdrawal.pool_max_amount']" class="setting-saved">
            <v-icon size="12" color="success">mdi-check-circle</v-icon>
            Kaydedildi · {{ lastSavedAt['withdrawal.pool_max_amount'] || lastSavedAt['withdrawal.pool_min_amount'] }}
          </div>
        </div>
      </v-card-text>
    </v-card>

    <v-snackbar v-model="snackbar" :color="snackbarColor" timeout="3000">{{ snackbarText }}</v-snackbar>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import api from '@/plugins/axios'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
// Ayarlari GORMEK ile DEGISTIRMEK ayri izinler.
const canManage = computed(() => auth.isSuperAdmin || auth.can('settings.manage'))

const original = reactive({})
const form = reactive({
  dekontThreshold: 5000,
  poolEnabled: false,
  poolMin: 0,
  poolMax: 0,
})

// Sunucu anahtari -> formdaki alan. isDirty ve load bunun uzerinden
// calisiyor; yeni ayar eklerken tek yeri guncellemek yetiyor.
const FIELD_BY_KEY = {
  'withdrawal.dekont_threshold': 'dekontThreshold',
  'withdrawal.pool_enabled': 'poolEnabled',
  'withdrawal.pool_min_amount': 'poolMin',
  'withdrawal.pool_max_amount': 'poolMax',
}
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
  const field = FIELD_BY_KEY[key]
  if (!field) return false
  // Anahtar/kapali ayarlar sayiya cevrilirse false === 0 olur ve
  // "degisti mi" karsilastirmasi dogru calisir; ayni karsilastirmayi
  // tutar alanlari icin de kullaniyoruz.
  if (typeof form[field] === 'boolean') {
    return Boolean(form[field]) !== Boolean(original[key])
  }
  return Number(form[field] || 0) !== Number(original[key] || 0)
}

async function load() {
  const { data } = await api.get('/portal/settings')
  Object.assign(original, data)
  form.dekontThreshold = Number(data['withdrawal.dekont_threshold'] || 0)
  form.poolEnabled = Boolean(data['withdrawal.pool_enabled'])
  form.poolMin = Number(data['withdrawal.pool_min_amount'] || 0)
  form.poolMax = Number(data['withdrawal.pool_max_amount'] || 0)
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
  border-radius: 0;
  background: var(--sp-glass-bg);
  border: 1px solid var(--sp-glass-border);
  overflow: hidden;
}
.settings-icon {
  width: 38px; height: 38px;
  border-radius: 0;
  background: linear-gradient(135deg, var(--sp-primary), var(--sp-accent-purple));
  display: flex; align-items: center; justify-content: center;
}
.settings-title { font-size: 15px; font-weight: 700; color: var(--sp-text); }
.settings-sub   { font-size: 11px; color: var(--sp-text-dim); }

.setting-block {
  padding: 16px;
  border-radius: 0;
  background: var(--sp-surface-1, rgba(102,241,189,0.04));
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

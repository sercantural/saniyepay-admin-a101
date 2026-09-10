<template>
  <div>
    <v-row>
      <!-- Şifre Değiştir -->
      <v-col cols="12" md="6">
        <v-card>
          <v-card-title>
            <v-icon start>mdi-lock-reset</v-icon> Şifre Değiştir
          </v-card-title>
          <v-card-text>
            <v-form @submit.prevent="changePassword" ref="passwordForm">
              <v-text-field
                v-model="passwordData.current_password"
                label="Mevcut Şifre"
                type="password"
                variant="outlined"
                density="compact"
                :rules="[v => !!v || 'Mevcut şifre gereklidir']"
                class="mb-2"
              />
              <v-text-field
                v-model="passwordData.password"
                label="Yeni Şifre"
                type="password"
                variant="outlined"
                density="compact"
                :rules="[v => !!v || 'Yeni şifre gereklidir', v => v?.length >= 8 || 'En az 8 karakter']"
                class="mb-2"
              />
              <v-text-field
                v-model="passwordData.password_confirmation"
                label="Yeni Şifre (Tekrar)"
                type="password"
                variant="outlined"
                density="compact"
                :rules="[v => v === passwordData.password || 'Şifreler eşleşmiyor']"
                class="mb-4"
              />
              <v-btn type="submit" color="primary" variant="elevated" :loading="passwordLoading" block>
                Şifreyi Güncelle
              </v-btn>
            </v-form>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- İki Faktörlü Doğrulama -->
      <v-col cols="12" md="6">
        <v-card>
          <v-card-title>
            <v-icon start>mdi-shield-lock</v-icon> İki Faktörlü Doğrulama (2FA)
          </v-card-title>
          <v-card-text>
            <!-- 2FA Aktif -->
            <div v-if="twoFactorEnabled">
              <v-alert type="success" variant="tonal" class="mb-4">
                <v-icon start>mdi-check-circle</v-icon>
                İki faktörlü doğrulama aktif.
              </v-alert>
              <v-alert type="info" variant="tonal" density="compact">
                2FA yalnızca süper yönetici tarafından devre dışı bırakılabilir.
              </v-alert>
            </div>

            <!-- 2FA Kurulum Başlatılmamış -->
            <div v-else-if="!setupStarted">
              <v-alert type="info" variant="tonal" class="mb-4">
                İki faktörlü doğrulama hesabınıza ekstra güvenlik katmanı ekler.
              </v-alert>
              <v-btn color="primary" variant="elevated" @click="startSetup" :loading="twoFactorLoading" block>
                <v-icon start>mdi-qrcode</v-icon> 2FA Kurulumunu Başlat
              </v-btn>
            </div>

            <!-- 2FA Kurulum QR Kodu -->
            <div v-else-if="!setupConfirmed">
              <v-alert type="warning" variant="tonal" class="mb-4">
                Google Authenticator veya benzeri bir uygulama ile aşağıdaki QR kodunu tarayın.
              </v-alert>

              <div class="text-center mb-4">
                <img :src="qrCodeDataUrl" alt="QR Code" style="max-width: 200px" v-if="qrCodeDataUrl" />
                <v-progress-circular v-else indeterminate color="primary" />
              </div>

              <v-alert type="info" variant="tonal" density="compact" class="mb-4">
                <div class="text-caption">Manuel giriş anahtarı:</div>
                <code class="text-body-2">{{ setupSecret }}</code>
              </v-alert>

              <v-form @submit.prevent="confirmSetup">
                <v-text-field
                  v-model="confirmCode"
                  label="Uygulamadaki 6 haneli kodu girin"
                  variant="outlined"
                  maxlength="6"
                  :rules="[v => !!v || 'Kod gereklidir', v => v?.length === 6 || '6 haneli kod girin']"
                  class="mb-2"
                />
                <v-btn type="submit" color="success" variant="elevated" :loading="twoFactorLoading" block>
                  Doğrula ve Etkinleştir
                </v-btn>
              </v-form>
            </div>

            <!-- Kurtarma Kodları -->
            <div v-else>
              <v-alert type="success" variant="tonal" class="mb-4">
                <strong>2FA başarıyla etkinleştirildi!</strong>
              </v-alert>
              <v-alert type="warning" variant="tonal" class="mb-4">
                <strong>Kurtarma kodlarınızı güvenli bir yere kaydedin.</strong>
                Bu kodlar yalnızca bir kez gösterilecektir. Doğrulama uygulamanıza erişemezseniz bu kodları kullanabilirsiniz.
              </v-alert>
              <v-card variant="outlined" class="mb-4 pa-4">
                <div class="d-flex flex-wrap ga-2">
                  <v-chip v-for="code in recoveryCodes" :key="code" size="small" variant="tonal" color="primary">
                    {{ code }}
                  </v-chip>
                </div>
              </v-card>
              <v-btn color="primary" variant="text" @click="copyRecoveryCodes" block>
                <v-icon start>mdi-content-copy</v-icon> Kodları Kopyala
              </v-btn>
              <v-btn color="primary" variant="elevated" @click="finishSetup" class="mt-2" block>
                Tamam
              </v-btn>
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Bildirim Tercihleri -->
      <v-col cols="12" md="6">
        <v-card>
          <v-card-title>
            <v-icon start>mdi-bell-cog</v-icon> Bildirim Tercihleri
          </v-card-title>
          <v-card-text>
            <v-alert type="info" variant="tonal" density="compact" class="mb-4">
              Bildirimler kapatılsa bile zil simgesindeki listeye düşmeye devam eder.
              Kapattığınız yalnızca sesli uyarı ve ekrandaki karttır.
            </v-alert>

            <v-switch
              v-model="notificationPrefs.sound"
              color="primary"
              density="compact"
              hide-details
              :disabled="notificationLoading"
              label="Bildirim sesi"
              @update:model-value="saveNotificationPrefs"
            />
            <div class="text-caption text-medium-emphasis mb-3 ml-1">
              Yeni işlem geldiğinde sesli uyarı çalar.
            </div>

            <v-switch
              v-model="notificationPrefs.toast"
              color="primary"
              density="compact"
              hide-details
              :disabled="notificationLoading"
              label="Ekranda bildirim kartı"
              @update:model-value="saveNotificationPrefs"
            />
            <div class="text-caption text-medium-emphasis ml-1">
              Yeni işlem geldiğinde ekranın köşesinde kart belirir.
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Telegram: sohbeti panel hesabina baglama ve bildirim anahtari.
           Bag tek kullanimlik kodla kuruluyor; kod burada uretilir,
           Telegram'da tuketilir. -->
      <v-col cols="12" md="6">
        <v-card>
          <v-card-title>
            <v-icon start>mdi-send</v-icon> Telegram
          </v-card-title>
          <v-card-text>
            <v-alert v-if="tg.loaded && !tg.enabled" type="info" variant="tonal" density="compact">
              Telegram botu henüz kurulmadı. Kurulunca bu alandan hesabınızı bağlayabileceksiniz.
            </v-alert>

            <template v-else-if="tg.loaded">
              <div v-if="tg.linked" class="d-flex align-center ga-2 mb-3">
                <v-icon color="success" size="20">mdi-check-circle</v-icon>
                <div>
                  <div class="font-weight-bold">Bağlı<span v-if="tg.telegram_username"> — @{{ tg.telegram_username }}</span></div>
                  <div class="text-caption text-medium-emphasis">Yeni yatırım ve çekim bildirimleri Telegram'a gidiyor; yatırımı oradan onaylayıp reddedebilirsiniz.</div>
                </div>
              </div>
              <div v-else class="text-body-2 mb-3">
                Telegram bağlı değil. Bağlayınca yeni yatırım ve çekimler anında telefonunuza düşer.
              </div>

              <div v-if="tg.linkUrl" class="tg-link-box mb-3">
                <div class="text-caption text-medium-emphasis mb-1">Telegram'da botu açıp Başlat'a basın (bağlantı 10 dakika geçerli):</div>
                <a :href="tg.linkUrl" target="_blank" rel="noopener" class="tg-link">{{ tg.linkUrl }}</a>
              </div>

              <div class="d-flex ga-2 flex-wrap">
                <v-btn v-if="!tg.linked" color="primary" variant="flat" :loading="tg.busy" prepend-icon="mdi-link-variant" @click="telegramBagla">
                  Telegram'ı bağla
                </v-btn>
                <v-btn v-else color="error" variant="outlined" :loading="tg.busy" prepend-icon="mdi-link-variant-off" @click="telegramKopar">
                  Bağlantıyı kes
                </v-btn>
              </div>

              <v-switch
                v-if="tg.linked"
                v-model="notificationPrefs.telegram"
                color="primary"
                density="compact"
                hide-details
                class="mt-3"
                :disabled="notificationLoading"
                label="Telegram bildirimi"
                @update:model-value="saveNotificationPrefs"
              />
            </template>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-snackbar v-model="snackbar" :color="snackbarColor" timeout="3000">
      {{ snackbarText }}
    </v-snackbar>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import api from '@/plugins/axios'

const auth = useAuthStore()

// Password change
const passwordData = ref({ current_password: '', password: '', password_confirmation: '' })
const passwordLoading = ref(false)

// 2FA
const twoFactorEnabled = ref(false)
const twoFactorLoading = ref(false)
const setupStarted = ref(false)
const setupConfirmed = ref(false)
const setupSecret = ref('')
const qrCodeDataUrl = ref('')
const confirmCode = ref('')
const recoveryCodes = ref([])

// Bildirim tercihleri. Store'daki nesneyi dogrudan v-model'e baglamiyoruz;
// yerel kopya uzerinden gidiyoruz ki istek basarisiz olursa anahtari eski
// haline geri alabilelim -- yoksa kullanici kapali sandigi bildirimin
// calmaya devam ettigini fark etmezdi.
const notificationPrefs = ref({ ...auth.notificationPreferences })
const notificationLoading = ref(false)

// Store disaridan degisebilir (login, fetchMe) -- ekran acikken tazelenirse
// anahtarlar da guncel kalsin.
watch(() => auth.notificationPreferences, (prefs) => {
  if (!notificationLoading.value) notificationPrefs.value = { ...prefs }
}, { deep: true })

async function saveNotificationPrefs() {
  // Sunucu iki alani da bekliyor; tek anahtar degisse bile ikisini
  // birden gonderiyoruz.
  const payload = {
    sound: !!notificationPrefs.value.sound,
    toast: !!notificationPrefs.value.toast,
    telegram: notificationPrefs.value.telegram !== false,
  }
  const previous = { ...auth.notificationPreferences }
  notificationLoading.value = true
  try {
    const { data } = await api.put('/portal/profile/notifications', payload)
    auth.setNotificationPreferences(data?.notification_preferences ?? payload)
    notificationPrefs.value = { ...auth.notificationPreferences }
    showSnack(data?.message || 'Bildirim tercihleri kaydedildi')
  } catch (e) {
    // Geri al: ekrandaki anahtar her zaman gercek durumu gostermeli.
    notificationPrefs.value = { ...previous }
    showSnack(e.response?.data?.message || 'Bildirim tercihleri kaydedilemedi', 'error')
  } finally {
    notificationLoading.value = false
  }
}

// Telegram baglantisi
const tg = ref({ loaded: false, enabled: false, linked: false, telegram_username: null, linkUrl: null, busy: false })

async function telegramDurum() {
  try {
    const { data } = await api.get('/portal/profile/telegram')
    tg.value = { ...tg.value, ...data, loaded: true }
  } catch {
    tg.value.loaded = true
  }
}

async function telegramBagla() {
  tg.value.busy = true
  try {
    const { data } = await api.post('/portal/profile/telegram/link-code')
    tg.value.linkUrl = data.url
    // Kullanici Telegram'da Baslat'a basinca bag kurulur; birkac saniyede
    // bir durumu yoklayip baglaninca baglantiyi kaldiriyoruz.
    const basla = Date.now()
    const yokla = async () => {
      await telegramDurum()
      if (tg.value.linked) { tg.value.linkUrl = null; showSnack('Telegram bağlandı'); return }
      if (Date.now() - basla < 10 * 60 * 1000) setTimeout(yokla, 4000)
    }
    setTimeout(yokla, 4000)
  } catch (e) {
    showSnack(e.uiMessage || 'Bağlantı kodu alınamadı', 'error')
  } finally {
    tg.value.busy = false
  }
}

async function telegramKopar() {
  tg.value.busy = true
  try {
    await api.delete('/portal/profile/telegram')
    tg.value.linked = false
    tg.value.telegram_username = null
    showSnack('Telegram bağlantısı kaldırıldı')
  } catch (e) {
    showSnack(e.uiMessage || 'Bağlantı kaldırılamadı', 'error')
  } finally {
    tg.value.busy = false
  }
}

// Snackbar
const snackbar = ref(false)
const snackbarText = ref('')
const snackbarColor = ref('success')

function showSnack(text, color = 'success') {
  snackbarText.value = text
  snackbarColor.value = color
  snackbar.value = true
}

async function changePassword() {
  passwordLoading.value = true
  try {
    await api.put('/portal/profile/password', passwordData.value)
    showSnack('Şifre başarıyla güncellendi')
    passwordData.value = { current_password: '', password: '', password_confirmation: '' }
  } catch (e) {
    const msg = e.response?.data?.errors?.current_password?.[0] || e.response?.data?.message || 'Şifre güncelleme başarısız'
    showSnack(msg, 'error')
  } finally {
    passwordLoading.value = false
  }
}

async function loadTwoFactorStatus() {
  const { data } = await api.get('/portal/profile/two-factor/status')
  twoFactorEnabled.value = data.enabled
}

async function startSetup() {
  twoFactorLoading.value = true
  try {
    const { data } = await api.post('/portal/profile/two-factor/enable')
    setupSecret.value = data.secret
    // Generate QR code using the URL
    generateQrCode(data.qr_code_url)
    setupStarted.value = true
  } catch (e) {
    showSnack(e.response?.data?.message || 'Kurulum başlatılamadı', 'error')
  } finally {
    twoFactorLoading.value = false
  }
}

function generateQrCode(url) {
  // Use a simple QR code API to render the URL
  qrCodeDataUrl.value = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`
}

async function confirmSetup() {
  twoFactorLoading.value = true
  try {
    const { data } = await api.post('/portal/profile/two-factor/confirm', { code: confirmCode.value })
    recoveryCodes.value = data.recovery_codes
    setupConfirmed.value = true
    twoFactorEnabled.value = true
  } catch (e) {
    showSnack(e.response?.data?.message || 'Doğrulama başarısız', 'error')
  } finally {
    twoFactorLoading.value = false
  }
}

function copyRecoveryCodes() {
  navigator.clipboard.writeText(recoveryCodes.value.join('\n'))
  showSnack('Kodlar panoya kopyalandı')
}

function finishSetup() {
  setupStarted.value = false
  setupConfirmed.value = false
  confirmCode.value = ''
  auth.fetchMe()
}

onMounted(() => { loadTwoFactorStatus(); telegramDurum() })
</script>

<style scoped>
.tg-link-box { padding: 10px 12px; border: 1px solid var(--sp-card-border); background: var(--sp-surface); }
.tg-link { font-family: 'JetBrains Mono', monospace; font-size: 12px; word-break: break-all; color: var(--sp-primary); }
</style>

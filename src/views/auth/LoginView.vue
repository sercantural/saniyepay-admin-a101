<template>
  <div class="al-page">
    <!-- Zemin: mint izgara ve tek sicak nokta. Ikisi de
         pointer-events:none, form etkilesimini engellemiyor. -->
    <div class="al-grid" aria-hidden="true"></div>
    <div class="al-glow" aria-hidden="true"></div>

    <main class="al-card">
      <span class="al-kicker">GÜVENLİ ERİŞİM</span>
      <h1>Giriş.</h1>

      <form @submit.prevent="handleLogin" novalidate>
        <label for="al-email">E-posta</label>
        <div class="al-input">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="square" aria-hidden="true">
            <rect x="3" y="5" width="18" height="14" /><path d="m3 7 9 6 9-6" />
          </svg>
          <input
            id="al-email"
            ref="emailInput"
            v-model="email"
            type="email"
            inputmode="email"
            autocomplete="username"
            spellcheck="false"
            required
          />
        </div>

        <label for="al-password">Şifre</label>
        <div class="al-input">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="square" aria-hidden="true">
            <circle cx="8" cy="12" r="3.6" /><path d="M11.6 12H21M17 12v3.4M20.2 12v2.4" />
          </svg>
          <input
            id="al-password"
            v-model="password"
            :type="showPw ? 'text' : 'password'"
            autocomplete="current-password"
            required
          />
          <button type="button" @click="showPw = !showPw" :aria-label="showPw ? 'Şifreyi gizle' : 'Şifreyi göster'">
            <svg v-if="!showPw" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="square" aria-hidden="true">
              <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" />
            </svg>
            <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="square" aria-hidden="true">
              <path d="M2 12s3.6-7 10-7c2 0 3.8.7 5.2 1.6M22 12s-3.6 7-10 7c-2 0-3.8-.7-5.2-1.6" /><path d="m3 3 18 18" />
            </svg>
          </button>
        </div>

        <p v-if="error" class="al-error" role="alert">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="square" aria-hidden="true">
            <circle cx="12" cy="12" r="9" /><path d="M12 7v6M12 16.5v.5" />
          </svg>
          {{ error }}
        </p>

        <button class="al-submit" type="submit" :disabled="loading">
          <template v-if="!loading">
            Giriş yap
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="square" aria-hidden="true">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </template>
          <span v-else class="al-spin" aria-label="Giriş yapılıyor"></span>
        </button>
      </form>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()

const email = ref('')
const password = ref('')
const showPw = ref(false)
const loading = ref(false)
const error = ref('')
const emailInput = ref(null)

async function handleLogin() {
  loading.value = true
  error.value = ''
  try {
    const result = await auth.login(email.value, password.value)
    router.push(result?.twoFactor ? '/two-factor-challenge' : '/')
  } catch (e) {
    error.value = loginErrorMessage(e)
  } finally {
    loading.value = false
  }
}

/**
 * Giris hatasini ayristir.
 *
 * 401 tek istisna: backend gecersiz sifre ile pasif hesap icin bilerek
 * ayni yaniti donuyor, arayuz de hangi hesaplarin var oldugunu ele
 * vermemek icin tek mesajda birlestiriyor. Sunucuya hic ulasilamamasi
 * ile yanlis sifre ayni mesaji almamali -- kullanici bosuna denemesin.
 */
function loginErrorMessage(e) {
  if (!e?.response) return 'Sunucuya ulaşılamadı. Bağlantınızı kontrol edip tekrar deneyin.'
  const { status, data } = e.response
  if (status === 429) {
    const wait = Number(e.response.headers?.['retry-after'])
    return Number.isFinite(wait) && wait > 0
      ? `Çok fazla deneme yapıldı. ${wait} saniye sonra tekrar deneyin.`
      : 'Çok fazla deneme yapıldı. Bir süre sonra tekrar deneyin.'
  }
  if (status === 422) return data?.message || 'Girilen bilgiler doğrulanamadı.'
  if (status >= 500) return 'Sunucu şu anda yanıt veremiyor. Lütfen birazdan tekrar deneyin.'
  return 'Giriş bilgileri hatalı. Lütfen tekrar deneyin.'
}

onMounted(() => emailInput.value?.focus())
</script>

<style scoped>
/* ============================================================
   Yonetim paneli girisi — "Signal"
   ------------------------------------------------------------
   Bilerek markasiz: logo, tanitim metni ve urun adi yok. Panel
   herkese acik olmayan bir adreste duruyor; giris ekraninin
   burasinin ne oldugunu soylemesi icin bir sebep yok.
   ============================================================ */
.al-page {
  --ink: #070B09;
  --panel: #0C1210;
  --mint: #66F1BD;
  --fg: #EEF7F1;
  --line: #27342D;

  position: relative;
  display: grid;
  place-items: center;
  min-height: 100svh;
  padding: 24px;
  background: var(--ink);
  color: var(--fg);
  font-family: Manrope, 'Helvetica Neue', Arial, sans-serif;
  overflow: hidden;
}

.al-grid {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image:
    linear-gradient(rgba(102, 241, 189, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(102, 241, 189, 0.03) 1px, transparent 1px);
  background-size: 52px 52px;
  -webkit-mask-image: radial-gradient(circle at 50% 45%, #000 0, transparent 72%);
  mask-image: radial-gradient(circle at 50% 45%, #000 0, transparent 72%);
}
.al-glow {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 620px;
  height: 620px;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  background: #07583D;
  filter: blur(190px);
  opacity: 0.18;
  pointer-events: none;
}

.al-card {
  position: relative;
  z-index: 1;
  width: min(400px, 100%);
  padding: 40px 38px 38px;
  background: var(--panel);
  border: 1px solid var(--line);
  box-shadow: 0 40px 100px rgba(0, 0, 0, 0.45);
}
/* Ust kenarda ince mint sinyal cizgisi */
.al-card::before {
  content: '';
  position: absolute;
  top: -1px;
  left: 16%;
  right: 16%;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--mint), transparent);
}

.al-kicker {
  display: block;
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 1.6px;
  color: #61E9B5;
}
.al-card h1 {
  font-family: Archivo, 'Arial Narrow', sans-serif;
  font-weight: 800;
  font-size: 38px;
  letter-spacing: -0.04em;
  line-height: 1;
  margin: 15px 0 30px;
}

.al-card label {
  display: block;
  margin: 0 0 9px;
  font-size: 11px;
  font-weight: 700;
  color: #9BACA2;
}
.al-input {
  display: flex;
  align-items: center;
  gap: 12px;
  height: 52px;
  padding: 0 15px;
  margin-bottom: 20px;
  background: #080D0B;
  border: 1px solid #2B3831;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.al-input:focus-within {
  border-color: #56D9A7;
  box-shadow: 0 0 0 3px rgba(102, 241, 189, 0.07);
}
.al-input > svg { color: #5F7267; flex: none; }
.al-input input {
  flex: 1;
  min-width: 0;
  font-family: inherit;
  font-size: 13px;
  color: #EDF6F0;
  background: none;
  border: 0;
  outline: 0;
}
.al-input button {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  color: #617269;
  background: none;
  border: 0;
  cursor: pointer;
}
.al-input button:hover { color: var(--mint); }

.al-error {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 16px;
  padding: 11px 13px;
  font-size: 11.5px;
  line-height: 1.5;
  color: #FF9C88;
  background: rgba(255, 129, 106, 0.07);
  border: 1px solid rgba(255, 129, 106, 0.22);
}
.al-error svg { flex: none; }

.al-submit {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  min-height: 52px;
  margin-top: 4px;
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 800;
  color: #06110C;
  background: var(--mint);
  border: 0;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s, opacity 0.2s;
}
.al-submit:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 12px 30px rgba(102, 241, 189, 0.15);
}
.al-submit:disabled { opacity: 0.75; cursor: default; }

.al-spin {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(6, 17, 12, 0.28);
  border-top-color: #06110C;
  border-radius: 50%;
  animation: al-spin 0.7s linear infinite;
}
@keyframes al-spin { to { transform: rotate(360deg); } }

@media (prefers-reduced-motion: reduce) {
  .al-submit, .al-input { transition: none; }
  .al-spin { animation-duration: 2s; }
}

@media (max-width: 480px) {
  .al-card { padding: 32px 24px 30px; }
  .al-card h1 { font-size: 32px; }
}
</style>

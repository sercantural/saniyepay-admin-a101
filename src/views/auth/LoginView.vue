<template>
  <div class="al-page">
    <!-- Zemin: mint izgara ve tek sicak nokta. Ikisi de
         pointer-events:none, form etkilesimini engellemiyor. -->
    <div class="al-grid" aria-hidden="true"></div>
    <div class="al-glow" aria-hidden="true"></div>

    <button type="button" class="al-theme" :aria-label="themeStore.isDark ? 'Açık temaya geç' : 'Koyu temaya geç'" @click="toggleTheme">
      <svg v-if="themeStore.isDark" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" aria-hidden="true">
        <circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>
      <svg v-else width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" aria-hidden="true">
        <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
      </svg>
      {{ themeStore.isDark ? 'AÇIK' : 'KOYU' }}
    </button>

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
import { useTheme } from 'vuetify'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'

const auth = useAuthStore()
const themeStore = useThemeStore()
const vuetifyTheme = useTheme()

function toggleTheme() {
  const yeni = themeStore.isDark ? themeStore.LIGHT : themeStore.DARK
  vuetifyTheme.change(yeni)
  themeStore.setTheme(yeni)
}
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
  /* Koyu (varsayilan). Acik karsiliklari asagida :root.theme-light altinda.
   * Giris ekrani kabugun disinda oldugu icin --sp-* token'larini degil kendi
   * paletini kullaniyor; iki tema da bu degiskenlerden okur. */
  --ink: #070B09;
  --panel: #0C1210;
  --mint: #66F1BD;         /* metin ve cizgi icin sinyal rengi */
  --mint-fill: #66F1BD;    /* dolu dugme zemini; iki temada da parlak mint, ustunde koyu yazi */
  --fg: #EEF7F1;
  --line: #27342D;
  --label: #9BACA2;
  --icon: #5F7267;
  --input-bg: #080D0B;
  --input-line: #2B3831;
  --focus-ring: rgba(102, 241, 189, 0.07);
  --err: #FF9C88;
  --err-bg: rgba(255, 129, 106, 0.07);
  --err-line: rgba(255, 129, 106, 0.22);
  --glow: #07583D;
  --glow-opacity: 0.18;
  --shadow: rgba(0, 0, 0, 0.45);
  --grid: rgba(102, 241, 189, 0.03);
  --submit-shadow: rgba(102, 241, 189, 0.15);

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

/* Acik tema: ayni dil, ters zemin. <html class="theme-light"> ile geliyor
 * (stores/theme.js). Mint beyaz ustunde okunmaz, metin ve cizgi icin
 * koyulastirildi; dolu dugme (--mint-fill) parlak mint kaliyor cunku
 * ustundeki yazi koyu. */
:root.theme-light .al-page {
  --ink: #F4F8F6;
  --panel: #FFFFFF;
  --mint: #0E8F63;
  --fg: #000000;
  --line: #D5DFDA;
  --label: rgba(0, 0, 0, 0.72);
  --icon: rgba(0, 0, 0, 0.55);
  --input-bg: #F4F8F6;
  --input-line: #C7D3CD;
  --focus-ring: rgba(14, 143, 99, 0.14);
  --err: #C8483A;
  --err-bg: rgba(200, 72, 58, 0.07);
  --err-line: rgba(200, 72, 58, 0.28);
  --glow: #66F1BD;
  --glow-opacity: 0.35;
  --shadow: rgba(11, 20, 16, 0.14);
  --grid: rgba(14, 143, 99, 0.06);
  --submit-shadow: rgba(14, 143, 99, 0.2);
}

/* Tema dugmesi: sag ustte, kabuktaki dugmenin karsiligi. */
.al-theme {
  position: absolute;
  top: 18px;
  right: 18px;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 7px;
  height: 32px;
  padding: 0 11px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 1px;
  color: var(--label);
  background: var(--panel);
  border: 1px solid var(--line);
  cursor: pointer;
  transition: color 0.2s, border-color 0.2s;
}
.al-theme:hover { color: var(--mint); border-color: var(--mint); }
.al-theme svg { flex: none; }

.al-grid {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image:
    linear-gradient(var(--grid) 1px, transparent 1px),
    linear-gradient(90deg, var(--grid) 1px, transparent 1px);
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
  background: var(--glow);
  filter: blur(190px);
  opacity: var(--glow-opacity);
  pointer-events: none;
}

.al-card {
  position: relative;
  z-index: 1;
  width: min(400px, 100%);
  padding: 40px 38px 38px;
  background: var(--panel);
  border: 1px solid var(--line);
  box-shadow: 0 40px 100px var(--shadow);
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
  color: var(--mint);
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
  color: var(--label);
}
.al-input {
  display: flex;
  align-items: center;
  gap: 12px;
  height: 52px;
  padding: 0 15px;
  margin-bottom: 20px;
  background: var(--input-bg);
  border: 1px solid var(--input-line);
  transition: border-color 0.2s, box-shadow 0.2s;
}
.al-input:focus-within {
  border-color: var(--mint);
  box-shadow: 0 0 0 3px var(--focus-ring);
}
.al-input > svg { color: var(--icon); flex: none; }
.al-input input {
  flex: 1;
  min-width: 0;
  font-family: inherit;
  font-size: 13px;
  color: var(--fg);
  background: none;
  border: 0;
  outline: 0;
}
.al-input button {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  color: var(--icon);
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
  color: var(--err);
  background: var(--err-bg);
  border: 1px solid var(--err-line);
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
  background: var(--mint-fill);
  border: 0;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s, opacity 0.2s;
}
.al-submit:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 12px 30px var(--submit-shadow);
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

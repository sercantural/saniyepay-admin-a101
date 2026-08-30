<template>
  <div class="lp">
    <!-- Background layers -->
    <div class="bg-base"></div>
    <div class="bg-aurora"></div>
    <div class="bg-stars"></div>
    <div class="bg-stars bg-stars-2"></div>
    <div class="bg-grid"></div>
    <div class="bg-orb bg-orb-1"></div>
    <div class="bg-orb bg-orb-2"></div>
    <div class="bg-shooting-star"></div>
    <div class="bg-shooting-star bg-shooting-star-2"></div>
    <div class="bg-shooting-star bg-shooting-star-3"></div>

    <!-- Glass card -->
    <div class="glass-card">
      <div class="glass-inner">
        <!-- Logo -->
        <div class="logo-area">
          <h1 class="text-logo">
            <span class="text-logo-main">avenger</span><span class="text-logo-sep">/</span><span class="text-logo-num">101</span>
            <span class="text-logo-dot" aria-hidden="true"></span>
          </h1>
        </div>

        <!-- Error -->
        <div v-if="error" class="err-box">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <span>{{ error }}</span>
          <button class="err-close" @click="error = ''">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>

        <!-- Form -->
        <form @submit.prevent="handleLogin">
          <div class="field">
            <div class="input-wrap">
              <svg class="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
              <input v-model="email" type="email" placeholder="E-posta adresi" required autocomplete="email" />
            </div>
          </div>

          <div class="field">
            <div class="input-wrap">
              <svg class="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              <input v-model="password" :type="showPw ? 'text' : 'password'" placeholder="Şifre" required autocomplete="current-password" />
              <button type="button" class="pw-toggle" @click="showPw = !showPw" tabindex="-1">
                <svg v-if="!showPw" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>
                <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="m2 2 20 20"/><path d="M6.7 6.7A10.1 10.1 0 0 0 1 12s4 8 11 8c2.1 0 4-.6 5.3-1.7"/><path d="M11 5a10.3 10.3 0 0 1 1-.1c7 0 11 8 11 8a18.5 18.5 0 0 1-3.6 4.9"/><path d="M14.1 14.1a3 3 0 0 1-4.2-4.2"/></svg>
              </button>
            </div>
          </div>

          <button type="submit" class="submit-btn" :disabled="loading">
            <span v-if="!loading" class="btn-text">Giriş Yap</span>
            <span v-else class="spinner"></span>
            <div class="btn-shine"></div>
          </button>
        </form>

        <!-- Disclaimer footer -->
        <div class="disclaimer">
          <div class="disclaimer-divider"></div>
          <p class="disclaimer-text">
            Avenger-101 &copy; {{ new Date().getFullYear() }} &mdash; Internal Use Only
          </p>
          <p class="disclaimer-sub">
            This system is for authorized personnel only. Avenger-101 is an internal
            platform and is not affiliated with any external brand or retailer.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()
const email = ref('')
const password = ref('')
const showPw = ref(false)
const loading = ref(false)
const error = ref('')

async function handleLogin() {
  loading.value = true
  error.value = ''
  try {
    const result = await auth.login(email.value, password.value)
    if (result?.twoFactor) {
      router.push('/two-factor-challenge')
    } else {
      router.push('/')
    }
  } catch (e) {
    error.value = 'Giriş bilgileri hatalı. Lütfen tekrar deneyin.'
  } finally { loading.value = false }
}
</script>

<style scoped>
.lp {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  background: #050510;
}

/* ── Base dark gradient ── */
.bg-base {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, #030014 0%, #0a0a2e 30%, #0d0d35 50%, #050520 100%);
}

/* ── Aurora / northern lights effect ── */
.bg-aurora {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse 80% 50% at 20% 40%, rgba(6, 182, 212, 0.12) 0%, transparent 60%),
    radial-gradient(ellipse 60% 40% at 75% 30%, rgba(124, 58, 237, 0.1) 0%, transparent 55%),
    radial-gradient(ellipse 70% 50% at 50% 80%, rgba(59, 130, 246, 0.08) 0%, transparent 50%);
  animation: aurora-shift 12s ease-in-out infinite alternate;
  will-change: opacity;
}
@keyframes aurora-shift {
  0% { opacity: 0.6; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.05); }
  100% { opacity: 0.7; transform: scale(0.98); }
}

/* ── Star field (CSS-only dots) ── */
.bg-stars {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image:
    radial-gradient(1px 1px at 10% 20%, rgba(255,255,255,0.6) 50%, transparent 100%),
    radial-gradient(1px 1px at 25% 50%, rgba(255,255,255,0.4) 50%, transparent 100%),
    radial-gradient(1px 1px at 40% 15%, rgba(255,255,255,0.5) 50%, transparent 100%),
    radial-gradient(1px 1px at 55% 70%, rgba(255,255,255,0.3) 50%, transparent 100%),
    radial-gradient(1px 1px at 70% 35%, rgba(255,255,255,0.5) 50%, transparent 100%),
    radial-gradient(1px 1px at 85% 60%, rgba(255,255,255,0.4) 50%, transparent 100%),
    radial-gradient(1px 1px at 15% 80%, rgba(255,255,255,0.3) 50%, transparent 100%),
    radial-gradient(1px 1px at 90% 10%, rgba(255,255,255,0.5) 50%, transparent 100%),
    radial-gradient(1px 1px at 45% 90%, rgba(255,255,255,0.4) 50%, transparent 100%),
    radial-gradient(1.5px 1.5px at 60% 45%, rgba(255,255,255,0.6) 50%, transparent 100%),
    radial-gradient(1px 1px at 30% 65%, rgba(255,255,255,0.3) 50%, transparent 100%),
    radial-gradient(1.5px 1.5px at 80% 85%, rgba(255,255,255,0.5) 50%, transparent 100%);
  animation: stars-twinkle 4s ease-in-out infinite alternate;
  will-change: opacity;
}
.bg-stars-2 {
  background-image:
    radial-gradient(1px 1px at 5% 45%, rgba(255,255,255,0.5) 50%, transparent 100%),
    radial-gradient(1px 1px at 20% 10%, rgba(255,255,255,0.3) 50%, transparent 100%),
    radial-gradient(1.5px 1.5px at 35% 75%, rgba(255,255,255,0.4) 50%, transparent 100%),
    radial-gradient(1px 1px at 50% 30%, rgba(255,255,255,0.6) 50%, transparent 100%),
    radial-gradient(1px 1px at 65% 55%, rgba(255,255,255,0.3) 50%, transparent 100%),
    radial-gradient(1px 1px at 75% 15%, rgba(255,255,255,0.5) 50%, transparent 100%),
    radial-gradient(1.5px 1.5px at 92% 42%, rgba(255,255,255,0.4) 50%, transparent 100%),
    radial-gradient(1px 1px at 48% 58%, rgba(255,255,255,0.3) 50%, transparent 100%);
  animation: stars-twinkle 5s ease-in-out infinite alternate-reverse;
}
@keyframes stars-twinkle {
  0% { opacity: 0.5; }
  100% { opacity: 1; }
}

/* ── Grid overlay ── */
.bg-grid {
  position: absolute;
  inset: 0;
  opacity: 0.025;
  background-image:
    linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px);
  background-size: 60px 60px;
  pointer-events: none;
  animation: grid-fade 8s ease-in-out infinite alternate;
  will-change: opacity;
}
@keyframes grid-fade {
  0% { opacity: 0.015; }
  100% { opacity: 0.035; }
}

/* ── Floating orbs (only 2 for perf) ── */
.bg-orb {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
  will-change: transform;
}
.bg-orb-1 {
  width: 400px; height: 400px;
  top: -10%; left: -8%;
  background: radial-gradient(circle, rgba(6, 182, 212, 0.15) 0%, transparent 70%);
  filter: blur(60px);
  animation: orb-drift 20s ease-in-out infinite;
}
.bg-orb-2 {
  width: 350px; height: 350px;
  bottom: -8%; right: -5%;
  background: radial-gradient(circle, rgba(124, 58, 237, 0.12) 0%, transparent 70%);
  filter: blur(60px);
  animation: orb-drift 24s ease-in-out infinite reverse;
}
@keyframes orb-drift {
  0%, 100% { transform: translate(0, 0); }
  33% { transform: translate(30px, -20px); }
  66% { transform: translate(-15px, 25px); }
}

/* ── Shooting stars ── */
.bg-shooting-star {
  position: absolute;
  width: 80px;
  height: 1px;
  background: linear-gradient(90deg, rgba(255,255,255,0.6), transparent);
  border-radius: 1px;
  top: 15%;
  left: -10%;
  opacity: 0;
  transform: rotate(-35deg);
  animation: shoot 6s ease-in-out infinite 2s;
  pointer-events: none;
  will-change: transform, opacity;
}
.bg-shooting-star-2 {
  width: 60px;
  top: 35%;
  animation-delay: 5s;
  animation-duration: 7s;
  transform: rotate(-30deg);
}
.bg-shooting-star-3 {
  width: 50px;
  top: 60%;
  animation-delay: 9s;
  animation-duration: 8s;
  transform: rotate(-40deg);
}
@keyframes shoot {
  0% { opacity: 0; transform: rotate(-35deg) translateX(0); }
  5% { opacity: 1; }
  15% { opacity: 0; transform: rotate(-35deg) translateX(120vw); }
  100% { opacity: 0; transform: rotate(-35deg) translateX(120vw); }
}

/* ── Glass card ── */
.glass-card {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 400px;
  margin: 20px;
  padding: 2px;
  border-radius: 24px;
  background: linear-gradient(135deg,
    rgba(255,255,255,0.15) 0%,
    rgba(255,255,255,0.05) 40%,
    rgba(124,58,237,0.1) 100%
  );
  animation: card-in 0.6s ease-out;
}
@keyframes card-in {
  from { opacity: 0; transform: translateY(20px) scale(0.97); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.glass-inner {
  background: rgba(10, 10, 30, 0.75);
  backdrop-filter: blur(40px) saturate(1.5);
  border-radius: 22px;
  padding: 44px 36px 36px;
}

/* ── Logo: minimal futuristic wordmark ── */
.logo-area {
  text-align: center;
  margin-bottom: clamp(28px, 5vw, 40px);
}
.text-logo {
  margin: 0;
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: clamp(4px, 0.8vw, 8px);
  font-family: 'SF Pro Display', 'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif;
  font-size: clamp(30px, 8vw, 48px);
  font-weight: 300;
  letter-spacing: clamp(-0.5px, -0.05vw, 0px);
  line-height: 1;
  user-select: none;
}
.text-logo-main {
  color: #FFFFFF;
  font-weight: 200;
  letter-spacing: -0.02em;
}
.text-logo-sep {
  color: rgba(34, 211, 238, 0.8);
  font-weight: 200;
  font-size: 0.8em;
  transform: translateY(-0.02em);
  margin: 0 clamp(1px, 0.2vw, 3px);
}
.text-logo-num {
  font-weight: 600;
  background: linear-gradient(90deg, #22D3EE 0%, #A5F3FC 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  color: transparent;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.01em;
}
.text-logo-dot {
  width: clamp(5px, 1vw, 7px);
  height: clamp(5px, 1vw, 7px);
  border-radius: 50%;
  background: #22D3EE;
  box-shadow:
    0 0 0 3px rgba(34, 211, 238, 0.15),
    0 0 16px rgba(34, 211, 238, 0.8);
  margin-left: clamp(2px, 0.4vw, 4px);
  align-self: flex-end;
  margin-bottom: 0.25em;
  animation: logo-dot-pulse 2.4s ease-in-out infinite;
}
@keyframes logo-dot-pulse {
  0%, 100% {
    box-shadow: 0 0 0 3px rgba(34, 211, 238, 0.15), 0 0 12px rgba(34, 211, 238, 0.6);
    opacity: 0.9;
  }
  50% {
    box-shadow: 0 0 0 5px rgba(34, 211, 238, 0.08), 0 0 22px rgba(34, 211, 238, 1);
    opacity: 1;
  }
}

/* ── Fields ── */
.field {
  margin-bottom: 16px;
}

.input-wrap {
  position: relative;
  display: flex;
  align-items: center;
}
.input-icon {
  position: absolute;
  left: 16px;
  color: rgba(255,255,255,0.25);
  pointer-events: none;
  transition: color 0.25s;
}
.input-wrap:focus-within .input-icon {
  color: #22D3EE;
}

.input-wrap input {
  width: 100%;
  padding: 16px 48px 16px 48px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  color: #FFFFFF;
  font-size: 15px;
  font-family: inherit;
  outline: none;
  transition: all 0.25s;
}
.input-wrap input::placeholder {
  color: rgba(255, 255, 255, 0.25);
}
.input-wrap input:focus {
  background: rgba(6, 182, 212, 0.06);
  border-color: rgba(6, 182, 212, 0.4);
  box-shadow: 0 0 0 4px rgba(6, 182, 212, 0.1), 0 0 20px rgba(6, 182, 212, 0.05);
}

.pw-toggle {
  position: absolute;
  right: 14px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  color: rgba(255,255,255,0.2);
  display: flex;
  transition: color 0.2s;
}
.pw-toggle:hover { color: rgba(255,255,255,0.5); }

/* ── Submit button ── */
.submit-btn {
  width: 100%;
  padding: 16px;
  margin-top: 8px;
  background: linear-gradient(135deg, #06B6D4, #0EA5E9, #0284C7);
  background-size: 200% 200%;
  animation: btn-gradient 4s ease infinite;
  border: none;
  border-radius: 14px;
  cursor: pointer;
  font-family: inherit;
  font-size: 15px;
  font-weight: 700;
  color: #FFFFFF;
  transition: all 0.3s;
  position: relative;
  overflow: hidden;
}
@keyframes btn-gradient {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}
.submit-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow:
    0 8px 32px rgba(6, 182, 212, 0.4),
    0 0 60px rgba(6, 182, 212, 0.15);
}
.submit-btn:active:not(:disabled) {
  transform: translateY(0);
}
.submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-text {
  position: relative;
  z-index: 1;
  letter-spacing: 0.5px;
}

.btn-shine {
  position: absolute;
  top: 0; left: -100%;
  width: 100%; height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent);
  animation: shine 3s ease-in-out infinite;
}
@keyframes shine {
  0% { left: -100%; }
  50% { left: 100%; }
  100% { left: 100%; }
}

.spinner {
  width: 20px; height: 20px;
  border: 2px solid rgba(255,255,255,0.2);
  border-top-color: #FFFFFF;
  border-radius: 50%;
  animation: spin 0.5s linear infinite;
  display: inline-block;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ── Error ── */
.err-box {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  margin-bottom: 20px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: 12px;
  font-size: 13px;
  font-weight: 500;
  color: #FCA5A5;
  animation: err-in 0.3s ease;
}
.err-box svg { flex-shrink: 0; color: #EF4444; }
.err-close {
  margin-left: auto; flex-shrink: 0;
  background: none; border: none; cursor: pointer;
  color: rgba(252, 165, 165, 0.4); padding: 2px; display: flex;
  transition: color 0.2s;
}
.err-close:hover { color: #FCA5A5; }
@keyframes err-in {
  from { opacity: 0; transform: translateY(-6px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ── Disclaimer footer ── */
.disclaimer {
  margin-top: 28px;
  text-align: center;
}
.disclaimer-divider {
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent);
  margin-bottom: 16px;
}
.disclaimer-text {
  margin: 0 0 6px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.4px;
  color: rgba(255, 255, 255, 0.55);
}
.disclaimer-sub {
  margin: 0;
  font-size: 11px;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.32);
}

/* ── Tablet ── */
@media (max-width: 768px) {
  .bg-orb-1 { width: 250px; height: 250px; filter: blur(40px); }
  .bg-orb-2 { width: 200px; height: 200px; filter: blur(40px); }
  .bg-shooting-star, .bg-shooting-star-2, .bg-shooting-star-3 { display: none; }
  .bg-stars-2 { display: none; }
}

/* ── Mobile ── */
@media (max-width: 480px) {
  .glass-card { margin: 12px; }
  .glass-inner { padding: 32px 24px 28px; }
  .disclaimer-sub { font-size: 10.5px; }
  .input-wrap input { padding: 14px 44px 14px 44px; font-size: 14px; }
  .submit-btn { padding: 14px; }
  /* Perf: simplify animations on mobile */
  .bg-aurora { animation: none; opacity: 0.8; }
  .bg-grid { animation: none; opacity: 0.02; }
  .bg-orb-1, .bg-orb-2 { animation-duration: 30s; }
}

/* ── Reduce motion preference ── */
@media (prefers-reduced-motion: reduce) {
  .bg-aurora, .bg-stars, .bg-stars-2, .bg-grid, .bg-orb-1, .bg-orb-2 { animation: none !important; }
  .bg-shooting-star, .bg-shooting-star-2, .bg-shooting-star-3 { display: none; }
  .btn-shine { animation: none; }
}
</style>

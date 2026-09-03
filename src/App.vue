<template>
  <v-app>
    <router-view />
    <ApiErrorSnackbar />
  </v-app>
</template>

<script setup>
import ApiErrorSnackbar from '@/components/ApiErrorSnackbar.vue'

// Panel karanlik-tek; secilecek baska tema yok.
</script>

<style>
/* ── Theme-aware CSS custom properties ── */
/* Dark theme */
/* Token'lar :root'ta.
 *
 * Onceden yalnizca .v-theme--darkComfort uzerinde tanimliydi. Bildirim
 * karti gibi <teleport to="body"> ile body'ye tasinan icerikler o
 * sinifin disinda kaldigi icin butun var(--sp-*) degerleri cozulmuyor,
 * kart renksiz/saydam gorunuyordu. Panel karanlik-tek oldugu icin
 * token'larin kokte durmasi hem dogru hem de her isinlanan icerigi
 * kendiliginden koruyor. */
:root {
  /* ── "Signal" paleti ──────────────────────────────────────
   * Tanitim sitesi, giris ekrani ve bayi paneliyle ayni dil:
   * neredeyse siyah zemin, tek mint sinyal rengi, 1px hatlar.
   * Degisken adlari korundu; 729 kullanim yerinde calismaya
   * devam ediyor.
   * -------------------------------------------------------- */
  --sp-bg: #070B09;
  --sp-surface: #0D1310;
  --sp-surface-bright: #101815;
  --sp-surface-variant: #16211C;
  --sp-sidebar: #090E0C;

  --sp-text: #EDF7F1;
  --sp-text-secondary: rgba(237, 247, 241, 0.72);
  --sp-text-muted: rgba(237, 247, 241, 0.52);
  --sp-text-hint: rgba(237, 247, 241, 0.38);
  --sp-text-faint: rgba(237, 247, 241, 0.26);
  --sp-text-ghost: rgba(237, 247, 241, 0.2);
  --sp-text-dim: rgba(237, 247, 241, 0.32);
  --sp-text-dimmer: rgba(237, 247, 241, 0.44);

  --sp-primary: #66F1BD;
  --sp-primary-rgb: 102, 241, 189;
  --sp-accent-bg: rgba(102, 241, 189, 0.055);
  --sp-accent-bg-hover: rgba(102, 241, 189, 0.08);
  --sp-accent-bg-active: rgba(102, 241, 189, 0.12);
  --sp-accent-bg-subtle: rgba(102, 241, 189, 0.035);
  --sp-accent-border: rgba(102, 241, 189, 0.1);
  --sp-accent-border-strong: rgba(102, 241, 189, 0.16);
  --sp-accent-border-vivid: rgba(102, 241, 189, 0.28);

  --sp-glass-bg: rgba(255, 255, 255, 0.025);
  --sp-glass-border: #25322B;
  --sp-glass-hover: rgba(255, 255, 255, 0.045);

  --sp-card-bg: #0D1310;
  --sp-card-border: #25322B;
  --sp-overlay: rgba(7, 11, 9, 0.94);
  --sp-modal-bg: #0D1310;
  --sp-dropdown-bg: #0C1310;
  --sp-shadow: rgba(0, 0, 0, 0.5);
  --sp-shadow-strong: rgba(0, 0, 0, 0.62);
  --sp-scrollbar: rgba(102, 241, 189, 0.14);
  --sp-scrollbar-hover: rgba(102, 241, 189, 0.26);
  --sp-divider: #1B2721;
  --sp-badge-bg: rgba(102, 241, 189, 0.1);
  --sp-input-border: #2A3931;

  --sp-success-bg: rgba(102, 241, 189, 0.075);
  --sp-success-border: rgba(102, 241, 189, 0.18);
  --sp-warning-bg: rgba(255, 190, 91, 0.075);
  --sp-warning-border: rgba(255, 190, 91, 0.2);
  --sp-error-bg: rgba(255, 129, 106, 0.075);
  --sp-error-border: rgba(255, 129, 106, 0.22);
  --sp-user-avatar: linear-gradient(135deg, rgba(102, 241, 189, 0.32), rgba(112, 169, 255, 0.28));

  /* Gosterge renkleri. Signal'de mint tek sinyal rengi; anlamsal
   * ayrim (iyi / uyari / kritik) ondan bagimsiz tutuluyor. */
  --sp-accent-success: #66F1BD;
  --sp-accent-success-bright: #7BE1BA;
  --sp-accent-cyan: #5FD6C2;
  --sp-accent-blue: #70A9FF;
  --sp-accent-info: #70A9FF;
  --sp-accent-indigo: #81AFF9;
  --sp-accent-purple: #A8B6FF;
  --sp-accent-violet: #9DB4FF;
  --sp-accent-amber: #FFBE5B;
  --sp-accent-orange: #FFAE5B;
  --sp-accent-orange-bright: #FFD08A;
  --sp-accent-peach: #F3AA8B;
  --sp-accent-rose: #FF9C88;
  --sp-accent-error: #FF8E82;
  --sp-accent-error-bg: rgba(255, 129, 106, 0.1);
  --sp-accent-success-bg: rgba(102, 241, 189, 0.1);
  --sp-accent-amber-bg: rgba(255, 190, 91, 0.1);
}

/* ── Signal: tipografi ve sifir kose yaricapi ───────────────
 * Panel Vuetify uzerine kurulu; kose yaricapini bilesen bilesen
 * sokmek yerine tek yerden sifirliyoruz. Yuvarlak kalmasi gereken
 * tek sey avatar ve durum noktalari, onlari disarida birakiyoruz.
 * ---------------------------------------------------------- */
.v-application,
.v-application .v-btn,
.v-application .v-field,
.v-application .v-card,
.v-application .v-chip,
.v-application .v-list-item,
.v-application .v-sheet,
.v-application .v-menu > .v-overlay__content,
.v-application .v-overlay__content > .v-card,
.v-application .v-tooltip > .v-overlay__content,
.v-application .v-alert,
.v-application .v-table {
  border-radius: 0;
}

.v-application .v-avatar,
.v-application .v-progress-circular,
.v-application .rounded-circle {
  border-radius: 50% !important;
}

.v-theme--darkComfort,
.v-theme--lightComfort {
  font-family: Manrope, 'Helvetica Neue', Arial, sans-serif;
}
.v-theme--darkComfort h1,
.v-theme--darkComfort h2,
.v-theme--darkComfort h3,
.v-theme--darkComfort .text-h4,
.v-theme--darkComfort .text-h5,
.v-theme--darkComfort .text-h6,
.v-theme--lightComfort h1,
.v-theme--lightComfort h2,
.v-theme--lightComfort h3,
.v-theme--lightComfort .text-h4,
.v-theme--lightComfort .text-h5,
.v-theme--lightComfort .text-h6 {
  font-family: Archivo, 'Arial Narrow', sans-serif;
  letter-spacing: -0.02em;
}

/* ── Acik tema token'lari ────────────────────────────────────
 * <html class="theme-light"> ile devreye giriyor (stores/theme.js).
 * :root'taki her token burada acik karsiligini aliyor; bir tanesini
 * eksik birakmak o parcanin karanlikta kalmasi demek. Mint, beyaz
 * zeminde okunmasi icin koyulastirildi; alfa arka planlar ayni oranla
 * ama koyu mint uzerinden turetildi.
 * ------------------------------------------------------------ */
:root.theme-light {
  --sp-bg: #F4F8F6;
  --sp-surface: #FFFFFF;
  --sp-surface-bright: #FFFFFF;
  --sp-surface-variant: #E9F0EC;
  --sp-sidebar: #EEF3F0;

  --sp-text: #0B1410;
  --sp-text-secondary: rgba(11, 20, 16, 0.76);
  --sp-text-muted: rgba(11, 20, 16, 0.58);
  --sp-text-hint: rgba(11, 20, 16, 0.44);
  --sp-text-faint: rgba(11, 20, 16, 0.32);
  --sp-text-ghost: rgba(11, 20, 16, 0.24);
  --sp-text-dim: rgba(11, 20, 16, 0.38);
  --sp-text-dimmer: rgba(11, 20, 16, 0.5);

  --sp-primary: #0E8F63;
  --sp-primary-rgb: 14, 143, 99;
  --sp-accent-bg: rgba(14, 143, 99, 0.07);
  --sp-accent-bg-hover: rgba(14, 143, 99, 0.11);
  --sp-accent-bg-active: rgba(14, 143, 99, 0.16);
  --sp-accent-bg-subtle: rgba(14, 143, 99, 0.045);
  --sp-accent-border: rgba(14, 143, 99, 0.18);
  --sp-accent-border-strong: rgba(14, 143, 99, 0.28);
  --sp-accent-border-vivid: rgba(14, 143, 99, 0.45);

  --sp-glass-bg: rgba(11, 20, 16, 0.025);
  --sp-glass-border: #D5DFDA;
  --sp-glass-hover: rgba(11, 20, 16, 0.045);

  --sp-card-bg: #FFFFFF;
  --sp-card-border: #D5DFDA;
  --sp-overlay: rgba(244, 248, 246, 0.94);
  --sp-modal-bg: #FFFFFF;
  --sp-dropdown-bg: #FFFFFF;
  --sp-shadow: rgba(11, 20, 16, 0.12);
  --sp-shadow-strong: rgba(11, 20, 16, 0.2);
  --sp-scrollbar: rgba(14, 143, 99, 0.25);
  --sp-scrollbar-hover: rgba(14, 143, 99, 0.4);
  --sp-divider: #E1E9E5;
  --sp-badge-bg: rgba(14, 143, 99, 0.12);
  --sp-input-border: #C7D3CD;

  --sp-success-bg: rgba(14, 143, 99, 0.08);
  --sp-success-border: rgba(14, 143, 99, 0.25);
  --sp-warning-bg: rgba(184, 110, 0, 0.08);
  --sp-warning-border: rgba(184, 110, 0, 0.28);
  --sp-error-bg: rgba(200, 72, 58, 0.08);
  --sp-error-border: rgba(200, 72, 58, 0.28);
  --sp-user-avatar: linear-gradient(135deg, rgba(14, 143, 99, 0.28), rgba(47, 111, 214, 0.24));

  --sp-accent-success: #0E8F63;
  --sp-accent-success-bright: #0B7350;
  --sp-accent-cyan: #0F8F84;
  --sp-accent-blue: #2F6FD6;
  --sp-accent-info: #2F6FD6;
  --sp-accent-indigo: #3B63C9;
  --sp-accent-purple: #5C5FC4;
  --sp-accent-violet: #4E5FC9;
  --sp-accent-amber: #B86E00;
  --sp-accent-orange: #B85F00;
  --sp-accent-orange-bright: #9A5A00;
  --sp-accent-peach: #B5573A;
  --sp-accent-rose: #C9564A;
  --sp-accent-error: #C8483A;
  --sp-accent-error-bg: rgba(200, 72, 58, 0.1);
  --sp-accent-success-bg: rgba(14, 143, 99, 0.12);
  --sp-accent-amber-bg: rgba(184, 110, 0, 0.12);
}

/* Smooth thin scrollbars */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: var(--sp-scrollbar, rgba(102,241,189, 0.12));
  border-radius: 0;
}
::-webkit-scrollbar-thumb:hover {
  background: var(--sp-scrollbar-hover, rgba(102,241,189, 0.2));
}

/* Remove Vuetify harsh outlines on focus */
.v-field--focused .v-field__outline {
  --v-field-border-opacity: 0.25 !important;
}

/* Softer selection highlight */
::selection {
  background: rgba(var(--sp-primary-rgb, 124, 143, 228), 0.25);
  color: inherit;
}

/* Smooth transitions globally */
*, *::before, *::after {
  transition-property: background-color, border-color, color, box-shadow;
  transition-duration: 0.15s;
  transition-timing-function: ease;
}

/* Override aggressive transitions on animated elements */
.v-btn, .v-chip, .v-icon, .v-badge, input, textarea {
  transition-property: all;
}

/* Typography — Inter for UI, JetBrains Mono for code */
body,
.v-application {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  font-feature-settings: 'cv02', 'cv03', 'cv04', 'cv11'; /* Inter stylistic alternates */
  letter-spacing: -0.01em;
}

/* Override Vuetify's Roboto default */
.v-application .text-h1,
.v-application .text-h2,
.v-application .text-h3,
.v-application .text-h4,
.v-application .text-h5,
.v-application .text-h6,
.v-application .text-subtitle-1,
.v-application .text-subtitle-2,
.v-application .text-body-1,
.v-application .text-body-2,
.v-application .text-caption,
.v-application .text-overline {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
}

/* Monospace for code, IBAN, reference codes */
code, pre, kbd, samp,
.font-mono {
  font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Consolas', monospace !important;
  font-size: 0.9em;
}

/* Vuetify inputs inherit Inter */
.v-field input,
.v-field textarea,
.v-field .v-field__input,
.v-select .v-select__selection-text,
.v-list-item-title,
.v-list-item-subtitle,
.v-card-title,
.v-card-subtitle,
.v-card-text,
.v-btn,
.v-chip,
.v-tab,
.v-alert {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
}

/* Data table cells */
.v-data-table th,
.v-data-table td {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
  font-size: 13px !important;
}
</style>

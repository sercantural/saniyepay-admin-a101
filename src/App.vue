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

.v-theme--darkComfort {
  font-family: Manrope, 'Helvetica Neue', Arial, sans-serif;
}
.v-theme--darkComfort h1,
.v-theme--darkComfort h2,
.v-theme--darkComfort h3,
.v-theme--darkComfort .text-h4,
.v-theme--darkComfort .text-h5,
.v-theme--darkComfort .text-h6 {
  font-family: Archivo, 'Arial Narrow', sans-serif;
  letter-spacing: -0.02em;
}

/* Light theme — clean, solid, professional */
/* Panel karanlik-tek: "Signal" acik varyanti yok. Onceki
 * lightComfort temasi ve ona ait kurallar kaldirildi. */

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

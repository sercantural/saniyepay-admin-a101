<template>
  <v-app>
    <router-view />
  </v-app>
</template>

<script setup>
import { useTheme } from 'vuetify'

// Apply saved theme immediately at app startup (covers login page too)
const theme = useTheme()
const saved = localStorage.getItem('sp-theme')
if (saved === 'lightComfort') {
  theme.change('lightComfort')
}
</script>

<style>
/* ── Theme-aware CSS custom properties ── */
/* Dark theme */
.v-theme--darkComfort {
  --sp-bg: #0F1117;
  --sp-surface: #171921;
  --sp-surface-bright: #1E2030;
  --sp-surface-variant: #252736;
  --sp-sidebar: #13141D;
  --sp-text: rgba(200, 204, 216, 0.95);
  --sp-text-secondary: rgba(200, 204, 216, 0.7);
  --sp-text-muted: rgba(200, 204, 216, 0.5);
  --sp-text-hint: rgba(200, 204, 216, 0.35);
  --sp-text-faint: rgba(200, 204, 216, 0.25);
  --sp-text-ghost: rgba(200, 204, 216, 0.2);
  --sp-text-dim: rgba(200, 204, 216, 0.3);
  --sp-text-dimmer: rgba(200, 204, 216, 0.4);
  --sp-primary: #7C8FE4;
  --sp-primary-rgb: 124, 143, 228;
  --sp-accent-bg: rgba(124, 143, 228, 0.06);
  --sp-accent-bg-hover: rgba(124, 143, 228, 0.08);
  --sp-accent-bg-active: rgba(124, 143, 228, 0.12);
  --sp-accent-bg-subtle: rgba(124, 143, 228, 0.04);
  --sp-accent-border: rgba(124, 143, 228, 0.06);
  --sp-accent-border-strong: rgba(124, 143, 228, 0.1);
  --sp-accent-border-vivid: rgba(124, 143, 228, 0.15);
  --sp-glass-bg: rgba(255, 255, 255, 0.03);
  --sp-glass-border: rgba(255, 255, 255, 0.06);
  --sp-glass-hover: rgba(255, 255, 255, 0.05);
  --sp-card-bg: #171921;
  --sp-card-border: rgba(124, 143, 228, 0.06);
  --sp-overlay: rgba(15, 17, 23, 0.95);
  --sp-modal-bg: #1E2030;
  --sp-dropdown-bg: #181825;
  --sp-shadow: rgba(0, 0, 0, 0.5);
  --sp-shadow-strong: rgba(0, 0, 0, 0.6);
  --sp-scrollbar: rgba(124, 143, 228, 0.12);
  --sp-scrollbar-hover: rgba(124, 143, 228, 0.2);
  --sp-divider: rgba(124, 143, 228, 0.06);
  --sp-badge-bg: rgba(124, 143, 228, 0.1);
  --sp-input-border: rgba(124, 143, 228, 0.15);
  --sp-success-bg: rgba(76, 175, 80, 0.08);
  --sp-success-border: rgba(76, 175, 80, 0.15);
  --sp-warning-bg: rgba(228, 163, 79, 0.08);
  --sp-warning-border: rgba(228, 163, 79, 0.2);
  --sp-error-bg: rgba(224, 108, 108, 0.08);
  --sp-error-border: rgba(224, 108, 108, 0.2);
  --sp-user-avatar: linear-gradient(135deg, rgba(124, 143, 228, 0.3), rgba(167, 139, 250, 0.3));

  /* Accent colors used by dashboard widgets and lists. Dark-mode values are
   * the original lighter hexes for contrast on dark backgrounds. Light-mode
   * overrides (below) use deeper saturated shades so text stays readable on
   * white. Use var(--sp-accent-*) instead of literal hex in inline styles. */
  --sp-accent-success: #6EC47A;
  --sp-accent-success-bright: #66BB6A;
  --sp-accent-cyan: #5EAFC7;
  --sp-accent-blue: #4FC3F7;
  --sp-accent-info: #42A5F5;
  --sp-accent-indigo: #89B4FA;
  --sp-accent-purple: #CE93D8;
  --sp-accent-violet: #B388FF;
  --sp-accent-amber: #E4A34F;
  --sp-accent-orange: #FFA726;
  --sp-accent-orange-bright: #FFB74D;
  --sp-accent-peach: #FAB387;
  --sp-accent-rose: #E57373;
  --sp-accent-error: #EF5350;
  --sp-accent-error-bg: rgba(229, 115, 115, 0.10);
  --sp-accent-success-bg: rgba(110, 196, 122, 0.10);
  --sp-accent-amber-bg: rgba(228, 163, 79, 0.10);
}

/* Light theme — clean, solid, professional */
.v-theme--lightComfort {
  --sp-bg: #ECEEF6;
  --sp-surface: #FFFFFF;
  --sp-surface-bright: #FFFFFF;
  --sp-surface-variant: #E8EAF2;
  --sp-sidebar: #FFFFFF;
  --sp-text: #1A1D2E;
  --sp-text-secondary: #3B3E52;
  --sp-text-muted: #5C5F74;
  --sp-text-hint: #7D8095;
  --sp-text-faint: #A0A3B5;
  --sp-text-ghost: #C0C2CE;
  --sp-text-dim: #9093A5;
  --sp-text-dimmer: #6C6F84;
  --sp-primary: #4F63B8;
  --sp-primary-rgb: 79, 99, 184;
  --sp-accent-bg: #F0F1FA;
  --sp-accent-bg-hover: #E8EAFA;
  --sp-accent-bg-active: #DDE0F5;
  --sp-accent-bg-subtle: #F5F6FB;
  --sp-accent-border: #E2E4EF;
  --sp-accent-border-strong: #D0D3E4;
  --sp-accent-border-vivid: #B8BDD6;
  --sp-glass-bg: #FFFFFF;
  --sp-glass-border: #E3E5EE;
  --sp-glass-hover: #F7F8FB;
  --sp-card-bg: #FFFFFF;
  --sp-card-border: #E3E5EE;
  --sp-overlay: rgba(241, 243, 249, 0.97);
  --sp-modal-bg: #FFFFFF;
  --sp-dropdown-bg: #FFFFFF;
  --sp-shadow: rgba(30, 32, 48, 0.06);
  --sp-shadow-strong: rgba(30, 32, 48, 0.1);
  --sp-scrollbar: #D0D2DE;
  --sp-scrollbar-hover: #B8BAC8;
  --sp-divider: #E3E5EE;
  --sp-badge-bg: #EAECF6;
  --sp-input-border: #D0D3E0;
  --sp-success-bg: #EDF7EE;
  --sp-success-border: #C8E6C9;
  --sp-warning-bg: #FFF8E1;
  --sp-warning-border: #FFE0B2;
  --sp-error-bg: #FEECEC;
  --sp-error-border: #F5C6C6;
  --sp-user-avatar: linear-gradient(135deg, #D8DDEF, #E0D4F0);

  /* Light-theme overrides for dashboard accent colors — deeper, saturated
   * shades that stay readable on white backgrounds. */
  --sp-accent-success: #2E7D32;
  --sp-accent-success-bright: #1B5E20;
  --sp-accent-cyan: #00838F;
  --sp-accent-blue: #0277BD;
  --sp-accent-info: #1565C0;
  --sp-accent-indigo: #283593;
  --sp-accent-purple: #6A1B9A;
  --sp-accent-violet: #4527A0;
  --sp-accent-amber: #B26C00;
  --sp-accent-orange: #E65100;
  --sp-accent-orange-bright: #EF6C00;
  --sp-accent-peach: #C2410C;
  --sp-accent-rose: #C62828;
  --sp-accent-error: #B71C1C;
  --sp-accent-error-bg: rgba(183, 28, 28, 0.08);
  --sp-accent-success-bg: rgba(46, 125, 50, 0.10);
  --sp-accent-amber-bg: rgba(178, 108, 0, 0.10);
}

/* ── Light mode global overrides ── */
/* Kill all glass/frosted effects in light mode */
.v-theme--lightComfort * {
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}

/* Cards get clean shadows */
.v-theme--lightComfort .v-card,
.v-theme--lightComfort .v-navigation-drawer {
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04) !important;
}

.v-theme--lightComfort .v-app-bar {
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05) !important;
}

/* Vuetify dialogs & menus */
.v-theme--lightComfort .v-overlay__content .v-card {
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1), 0 2px 8px rgba(0, 0, 0, 0.05) !important;
}

.v-theme--lightComfort .v-menu > .v-overlay__content {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1) !important;
  border-radius: 12px;
}

/* Vuetify input fields — solid borders */
.v-theme--lightComfort .v-field {
  border-color: #D0D3E0 !important;
}
.v-theme--lightComfort .v-field--focused {
  border-color: #4F63B8 !important;
}

/* Data table rows */
.v-theme--lightComfort .v-data-table tbody tr:hover td {
  background: #F0F1FA !important;
}

/* Chips */
.v-theme--lightComfort .v-chip {
  border: 1px solid #E3E5EE;
}

/* ── Tooltips ──
   Vuetify's default tooltip background is `rgba(--v-theme-surface-variant)`,
   which on our dark theme renders nearly the same color as the page itself,
   making the popup invisible. Force a high-contrast pill on every theme. */
.v-tooltip > .v-overlay__content {
  background: rgba(15, 17, 23, 0.96) !important;
  color: #F1F3F8 !important;
  font-size: 12px !important;
  font-weight: 500 !important;
  letter-spacing: 0.2px !important;
  padding: 6px 10px !important;
  border-radius: 6px !important;
  border: 1px solid rgba(255, 255, 255, 0.08) !important;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.45), 0 2px 6px rgba(0, 0, 0, 0.3) !important;
  max-width: 320px;
  line-height: 1.4 !important;
}
.v-theme--lightComfort .v-tooltip > .v-overlay__content {
  background: rgba(34, 38, 56, 0.96) !important;
  color: #FFFFFF !important;
  border: 1px solid rgba(0, 0, 0, 0.06) !important;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.18), 0 2px 6px rgba(0, 0, 0, 0.10) !important;
}

/* ── Global eye-comfort styles ── */

/* Smooth thin scrollbars */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: var(--sp-scrollbar, rgba(124, 143, 228, 0.12));
  border-radius: 3px;
}
::-webkit-scrollbar-thumb:hover {
  background: var(--sp-scrollbar-hover, rgba(124, 143, 228, 0.2));
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

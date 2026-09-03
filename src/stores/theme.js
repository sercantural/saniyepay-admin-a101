import { defineStore } from 'pinia'
import { ref } from 'vue'

const STORAGE_KEY = 'sp-theme'
const DARK = 'darkComfort'
const LIGHT = 'lightComfort'

/*
 * Tema secimi.
 *
 * Panel bir donem karanlik-tek olmustu ve bu dugme kaldirilmisti;
 * istek uzerine geri geldi. Iki tema da "Signal" dilinde, biri ters
 * zeminli.
 *
 * Secim iki yere yaziliyor:
 *   - Vuetify temasi (bilesenlerin renkleri)  -> AppLayout theme.change()
 *   - <html class="theme-light">              -> App.vue'daki --sp-* token'lari
 * Ikincisi gerekli cunku ozel CSS'in tamami var(--sp-*) uzerinden
 * calisiyor ve o token'lar :root'ta tanimli. Sadece Vuetify degisseydi
 * bilesenler acik, kartlar ve kenarlar karanlik kalirdi.
 */
export const useThemeStore = defineStore('theme', () => {
  const isDark = ref(true)

  function getStoredTheme() {
    try {
      const v = localStorage.getItem(STORAGE_KEY)
      return v === LIGHT ? LIGHT : DARK
    } catch {
      return DARK
    }
  }

  function applyHtmlClass(name) {
    document.documentElement.classList.toggle('theme-light', name === LIGHT)
  }

  function setTheme(name) {
    const secim = name === LIGHT ? LIGHT : DARK
    isDark.value = secim === DARK
    applyHtmlClass(secim)
    try { localStorage.setItem(STORAGE_KEY, secim) } catch { /* ozel pencere */ }
  }

  // Ilk yukleme: kayitli secimi hem state'e hem html sinifina yaz.
  const stored = getStoredTheme()
  isDark.value = stored === DARK
  applyHtmlClass(stored)

  return { isDark, getStoredTheme, setTheme, DARK, LIGHT }
})

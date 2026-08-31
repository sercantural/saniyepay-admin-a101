import { defineStore } from 'pinia'
import { ref } from 'vue'

/**
 * Panel karanlik-tek.
 *
 * "Signal" tasarimin acik varyanti yok; onceki lightComfort temasi
 * kaldirildi. Store, arayuzdeki `themeStore.isDark` kontrollerinin
 * calismaya devam etmesi icin duruyor ve her zaman karanlik bildiriyor.
 */
export const useThemeStore = defineStore('theme', () => {
  const isDark = ref(true)

  function getStoredTheme() {
    return 'darkComfort'
  }

  function setTheme() {
    isDark.value = true
  }

  return { isDark, getStoredTheme, setTheme }
})

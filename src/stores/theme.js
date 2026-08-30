import { defineStore } from 'pinia'
import { ref } from 'vue'

const STORAGE_KEY = 'sp-theme'

export const useThemeStore = defineStore('theme', () => {
  const isDark = ref(true)

  function getStoredTheme() {
    return localStorage.getItem(STORAGE_KEY) || 'darkComfort'
  }

  function setTheme(name) {
    isDark.value = name === 'darkComfort'
    localStorage.setItem(STORAGE_KEY, name)
  }

  // Initialize from localStorage (state only, no Vuetify call)
  const stored = getStoredTheme()
  isDark.value = stored !== 'lightComfort'

  return { isDark, getStoredTheme, setTheme }
})

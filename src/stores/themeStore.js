import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export const useThemeStore = defineStore('theme', () => {
  const isDark = ref(true)

  // Load theme from localStorage on init
  const loadTheme = () => {
    const saved = localStorage.getItem('theme-mode')
    if (saved) {
      isDark.value = saved === 'dark'
    } else {
      // Check system preference
      isDark.value = window.matchMedia('(prefers-color-scheme: dark)').matches
    }
    applyTheme()
  }

  // Apply theme to document
  const applyTheme = () => {
    const html = document.documentElement
    if (isDark.value) {
      html.setAttribute('data-theme', 'dark')
      html.classList.add('dark-mode')
      html.classList.remove('light-mode')
    } else {
      html.setAttribute('data-theme', 'light')
      html.classList.add('light-mode')
      html.classList.remove('dark-mode')
    }
    localStorage.setItem('theme-mode', isDark.value ? 'dark' : 'light')
  }

  // Toggle theme
  const toggleTheme = () => {
    isDark.value = !isDark.value
    applyTheme()
  }

  // Watch for changes
  watch(isDark, applyTheme)

  return {
    isDark,
    loadTheme,
    toggleTheme,
  }
})

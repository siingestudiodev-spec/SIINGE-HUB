import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router/index.js'
import { useThemeStore } from './stores/themeStore.js'
import './style.css'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

// Initialize theme immediately
const themeStore = useThemeStore(pinia)
themeStore.loadTheme()

app.mount('#app')

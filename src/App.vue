<template>
  <div class="app-container" v-if="session || isPublicRoute">
    
    <header class="top-navbar" v-if="!route.meta.hideNavbar">
      <div class="navbar-left">
        <div class="logo-section">
          <img :src="logo" alt="SIINGE" class="logo" />
          <div class="brand-name">SIINGE Hub</div>
        </div>
      </div>

      <nav class="navbar-menu">
        <router-link to="/manufacturers" class="nav-item" :class="{ active: isActive('/manufacturers') }">
          <Factory :size="14" :stroke-width="1.5" /><span>Manufacturers</span>
        </router-link>
        <router-link to="/projects" class="nav-item" :class="{ active: isActive('/projects') }">
          <ClipboardList :size="14" :stroke-width="1.5" /><span>Projects</span>
        </router-link>
        <router-link to="/sourcing" class="nav-item" :class="{ active: isActive('/sourcing') }">
          <Search :size="14" :stroke-width="1.5" /><span>Sourcing</span>
        </router-link>
        <router-link to="/templates" class="nav-item" :class="{ active: isActive('/templates') }">
          <Mail :size="14" :stroke-width="1.5" /><span>Templates</span>
        </router-link>
        <router-link to="/calendar" class="nav-item" :class="{ active: isActive('/calendar') }">
          <Calendar :size="14" :stroke-width="1.5" /><span>Calendar</span>
        </router-link>
        <router-link to="/events" class="nav-item" :class="{ active: isActive('/events') }">
          <PartyPopper :size="14" :stroke-width="1.5" /><span>Events</span>
        </router-link>
        <router-link to="/followups" class="nav-item" :class="{ active: isActive('/followups') }">
          <Phone :size="14" :stroke-width="1.5" /><span>Follow-ups</span>
        </router-link>
        <router-link to="/logs" class="nav-item" :class="{ active: isActive('/logs') }">
          <ScrollText :size="14" :stroke-width="1.5" /><span>Logs</span>
        </router-link>
      </nav>

      <div class="navbar-right">
        <div class="notifications-wrapper" v-click-outside="closeNotifs">
          <button @click="showNotifs = !showNotifs" class="btn-notif">
            <Bell :size="16" :stroke-width="1.5" />
            <span v-if="unreadCount > 0" class="badge">{{ unreadCount }}</span>
          </button>
          <div v-if="showNotifs" class="notifs-dropdown">
            <div class="notifs-header">
              <h4>Notifications</h4>
              <button v-if="unreadCount > 0" @click="markAllRead" class="btn-clear">Clear</button>
            </div>
            <div class="notifs-body">
              <div v-if="notifications.length === 0" class="empty-notifs">All caught up</div>
              <div v-for="n in notifications" :key="n.id" 
                   class="notif-item" 
                   :class="{ 'unread': !n.is_read }"
                   @click="goToNotification(n)">
                <div class="notif-text">{{ n.message }}</div>
                <div class="notif-time">{{ formatDate(n.created_at) }}</div>
              </div>
            </div>
          </div>
        </div>
        <button @click="toggleTheme" class="btn-theme">
          <Sun v-if="isDark" :size="14" :stroke-width="1.5" />
          <Moon v-else :size="14" :stroke-width="1.5" />
        </button>
        <button @click="logout" class="btn-logout">
          <LogOut :size="16" :stroke-width="1.5" />
        </button>
      </div>
    </header>

    <main class="content-area">
      <router-view />
    </main>
  </div>
  
  <div v-else-if="!session && !isPublicRoute">
    <router-view />
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useThemeStore } from './stores/themeStore'
import { supabase } from './lib/supabase'
import { Factory, ClipboardList, Search, Mail, Calendar, PartyPopper, Phone, Bell, Sun, Moon, LogOut, ScrollText } from 'lucide-vue-next'
import logo from './assets/siinge-mark.png'

const router = useRouter()
const route = useRoute()
const themeStore = useThemeStore()
const session = ref(null)
const isDark = computed(() => themeStore.isDark)

const notifications = ref([])
const showNotifs = ref(false)
const unreadCount = computed(() => notifications.value.filter(n => !n.is_read).length)

// Computado para saber si la ruta actual es pública (no requiere navbar ni sesión)
const isPublicRoute = computed(() => route.meta.hideNavbar === true)

const vClickOutside = {
  mounted(el, binding) {
    el.clickOutsideEvent = function (event) { if (!(el == event.target || el.contains(event.target))) { binding.value() } };
    document.body.addEventListener('click', el.clickOutsideEvent)
  },
  unmounted(el) { document.body.removeEventListener('click', el.clickOutsideEvent) }
}

function isActive(path) {
  return route.path.startsWith(path)
}

function closeNotifs() { showNotifs.value = false }

function toggleTheme() {
  themeStore.toggleTheme()
}

function formatDate(dateStr) {
  const date = new Date(dateStr)
  const today = new Date()
  const diff = today - date
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  return `${days}d ago`
}

onMounted(async () => {
  themeStore.loadTheme()
  const { data } = await supabase.auth.getSession()
  session.value = data.session
  
  if (session.value) {
    fetchNotifications()
    supabase.channel('custom-all-channel')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `recipient_email=eq.${session.value.user.email}` }, payload => {
        notifications.value.unshift(payload.new)
      }).subscribe()
  }

  supabase.auth.onAuthStateChange((_, s) => { 
    session.value = s 
    if (s) fetchNotifications()
  })
})

async function fetchNotifications() {
  if (!session.value) return
  const { data } = await supabase.from('notifications')
    .select('*')
    .eq('recipient_email', session.value.user.email)
    .order('created_at', { ascending: false })
    .limit(15)
  notifications.value = data || []
}

async function markAllRead() {
  if (!session.value) return
  notifications.value.forEach(n => n.is_read = true)
  await supabase.from('notifications').update({ is_read: true }).eq('recipient_email', session.value.user.email)
}

async function goToNotification(n) {
  showNotifs.value = false
  if (!n.is_read) {
    n.is_read = true
    await supabase.from('notifications').update({ is_read: true }).eq('id', n.id)
  }
  router.push(`/projects?project=${n.project_id}&stage=${n.stage_id}`)
}

async function logout() {
  await supabase.auth.signOut()
  router.push('/login')
}
</script>

<style scoped>
/* LAYOUT PRINCIPAL */
.app-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: var(--bg-app);
}

/* NAVBAR SUPERIOR */
.top-navbar {
  height: 64px;
  background: var(--bg-card);
  border-bottom: 1px solid var(--border-main);
  display: flex;
  align-items: center;
  padding: 0 1.5rem;
  position: sticky;
  top: 0;
  z-index: 100;
  gap: 2rem;
}

.navbar-left {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.logo-section {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.logo {
  width: 28px;
  height: 28px;
  border-radius: var(--r-2);
  object-fit: contain;
}

.brand-name {
  font-size: var(--fs-12);
  font-weight: 700;
  color: var(--text-main);
  text-transform: uppercase;
  letter-spacing: var(--tr-eyebrow);
}

/* MENÚ NAVEGACIÓN */
.navbar-menu {
  flex: 1;
  display: flex;
  gap: 0.25rem;
  align-items: center;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.875rem;
  color: var(--text-muted);
  text-decoration: none;
  border-radius: var(--r-1);
  font-size: var(--fs-12);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: var(--tr-allcaps);
  transition: color var(--dur-fast) var(--ease);
  white-space: nowrap;
  border-bottom: 2px solid transparent;
}

.nav-item:hover {
  color: var(--text-main);
  background: transparent;
}

.nav-item.active {
  color: var(--primary);
  border-bottom-color: var(--primary);
  font-weight: 600;
}

/* SECCIÓN DERECHA */
.navbar-right {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-left: auto;
}

.notifications-wrapper {
  position: relative;
}

.btn-notif {
  background: transparent;
  border: 1px solid var(--border-main);
  width: 34px;
  height: 34px;
  border-radius: var(--r-2);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: border-color var(--dur-fast) var(--ease);
  position: relative;
  font-size: 0.9rem;
  color: var(--text-muted);
}

.btn-notif:hover {
  border-color: var(--primary);
  color: var(--text-main);
}

.badge {
  position: absolute;
  top: -4px;
  right: -4px;
  background: var(--ember);
  color: var(--bone);
  font-size: 0.55rem;
  font-weight: 700;
  width: 15px;
  height: 15px;
  border-radius: var(--r-1);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid var(--bg-card);
}

.btn-theme,
.btn-logout {
  background: transparent;
  border: 1px solid var(--border-main);
  width: 34px;
  height: 34px;
  border-radius: var(--r-2);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 0.9rem;
  color: var(--text-muted);
  transition: border-color var(--dur-fast) var(--ease);
}

.btn-theme:hover,
.btn-logout:hover {
  border-color: var(--primary);
  color: var(--text-main);
}

/* NOTIFICACIONES DROPDOWN */
.notifs-dropdown {
  position: absolute;
  top: 44px;
  right: 0;
  width: 340px;
  background: var(--bg-card);
  border: 1px solid var(--border-main);
  border-radius: var(--r-3);
  box-shadow: var(--shadow-3);
  overflow: hidden;
  z-index: 200;
}

.notifs-header {
  padding: var(--s-3) var(--s-4);
  border-bottom: 1px solid var(--border-light);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.notifs-header h4 {
  margin: 0;
  font-size: var(--fs-12);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: var(--tr-eyebrow);
  color: var(--text-muted);
}

.btn-clear {
  background: transparent;
  color: var(--text-muted);
  border: none;
  cursor: pointer;
  font-size: var(--fs-12);
  font-weight: 600;
  padding: 0.2rem 0.5rem;
  border-radius: var(--r-1);
  transition: color var(--dur-fast);
}

.btn-clear:hover {
  color: var(--primary);
}

.notifs-body {
  max-height: 350px;
  overflow-y: auto;
}

.empty-notifs {
  padding: var(--s-10) var(--s-4);
  text-align: center;
  color: var(--text-muted);
  font-size: var(--fs-13);
}

.notif-item {
  padding: var(--s-3) var(--s-4);
  border-bottom: 1px solid var(--border-light);
  cursor: pointer;
  transition: background var(--dur-fast);
}

.notif-item:last-child {
  border-bottom: none;
}

.notif-item:hover {
  background: var(--bg-sunken);
}

.notif-item.unread {
  background: var(--primary-soft);
}

.notif-text {
  font-size: var(--fs-13);
  color: var(--text-main);
  margin-bottom: 0.25rem;
  line-height: 1.45;
}

.notif-time {
  font-size: var(--fs-12);
  color: var(--text-muted);
  font-family: var(--font-mono);
}

/* ÁREA DE CONTENIDO */
.content-area {
  flex: 1;
  overflow-y: auto;
}
</style>
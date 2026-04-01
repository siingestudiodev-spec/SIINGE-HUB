<template>
  <div class="app-container" v-if="session || isPublicRoute">
    
    <header class="top-navbar" v-if="!route.meta.hideNavbar">
      <div class="navbar-left">
        <div class="logo-section">
          <img src="https://i.ibb.co/xK52ckkK/Whats-App-Image-2026-02-24-at-13-58-58-1.jpg" alt="logo" class="logo" />
          <div class="brand-name">SIINGE Hub</div>
        </div>
      </div>

      <nav class="navbar-menu">
        <router-link to="/manufacturers" class="nav-item" :class="{ active: isActive('/manufacturers') }">
          🏭 Manufacturers
        </router-link>
        <router-link to="/projects" class="nav-item" :class="{ active: isActive('/projects') }">
          📋 Projects
        </router-link>
        <router-link to="/sourcing" class="nav-item" :class="{ active: isActive('/sourcing') }">
          🔍 Sourcing
        </router-link>
        <router-link to="/templates" class="nav-item" :class="{ active: isActive('/templates') }">
          📧 Templates
        </router-link>
        <router-link to="/calendar" class="nav-item" :class="{ active: isActive('/calendar') }">
          📅 Calendar
        </router-link>
        <router-link to="/events" class="nav-item" :class="{ active: isActive('/events') }">
          🎪 Events
        </router-link>
      </nav>

      <div class="navbar-right">
        <div class="notifications-wrapper" v-click-outside="closeNotifs">
          <button @click="showNotifs = !showNotifs" class="btn-notif">
            <span>🔔</span>
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
          {{ isDark ? '☀️' : '🌙' }}
        </button>
        <button @click="logout" class="btn-logout">⎋</button>
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
  width: 36px;
  height: 36px;
  border-radius: 6px;
  object-fit: contain;
}

.brand-name {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--text-main);
}

/* MENÚ NAVEGACIÓN */
.navbar-menu {
  flex: 1;
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.6rem 1rem;
  color: var(--text-body);
  text-decoration: none;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 500;
  transition: all 0.15s;
  white-space: nowrap;
  border-bottom: 2px solid transparent;
}

.nav-item:hover {
  background: var(--border-light);
  color: var(--text-main);
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
  width: 36px;
  height: 36px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s;
  position: relative;
  font-size: 1rem;
}

.btn-notif:hover {
  background: var(--border-light);
  border-color: var(--primary);
}

.badge {
  position: absolute;
  top: -4px;
  right: -4px;
  background: #ef4444;
  color: white;
  font-size: 0.6rem;
  font-weight: 700;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid var(--bg-card);
}

.btn-theme,
.btn-logout {
  background: transparent;
  border: 1px solid var(--border-main);
  width: 36px;
  height: 36px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.15s;
}

.btn-theme:hover,
.btn-logout:hover {
  background: var(--border-light);
  border-color: var(--primary);
}

/* NOTIFICACIONES DROPDOWN */
.notifs-dropdown {
  position: absolute;
  top: 45px;
  right: 0;
  width: 340px;
  background: var(--bg-card);
  border: 1px solid var(--border-main);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  overflow: hidden;
  z-index: 200;
}

.notifs-header {
  padding: 0.9rem 1rem;
  border-bottom: 1px solid var(--border-light);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.notifs-header h4 {
  margin: 0;
  font-size: 0.9rem;
  color: var(--text-main);
}

.btn-clear {
  background: transparent;
  color: var(--text-muted);
  border: none;
  cursor: pointer;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  transition: 0.2s;
}

.btn-clear:hover {
  color: var(--primary);
  background: var(--border-light);
}

.notifs-body {
  max-height: 350px;
  overflow-y: auto;
}

.empty-notifs {
  padding: 2rem 1rem;
  text-align: center;
  color: var(--text-muted);
  font-size: 0.85rem;
  font-style: italic;
}

.notif-item {
  padding: 0.8rem 1rem;
  border-bottom: 1px solid var(--border-light);
  cursor: pointer;
  transition: background 0.2s;
}

.notif-item:last-child {
  border-bottom: none;
}

.notif-item:hover {
  background: var(--bg-app);
}

.notif-item.unread {
  background: rgba(79, 70, 229, 0.08);
}

.notif-text {
  font-size: 0.85rem;
  color: var(--text-main);
  margin-bottom: 0.3rem;
  line-height: 1.4;
}

.notif-time {
  font-size: 0.75rem;
  color: var(--text-muted);
}

/* ÁREA DE CONTENIDO */
.content-area {
  flex: 1;
  overflow-y: auto;
}
</style>
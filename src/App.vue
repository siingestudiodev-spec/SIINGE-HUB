<template>
  <div class="app-container" v-if="session">
    <div class="sidebar">
      <div class="sidebar-header">
        <img src="https://i.ibb.co/xK52ckkK/Whats-App-Image-2026-02-24-at-13-58-58-1.jpg" alt="logo" class="logo" />
        <div class="brand-text">
          <div class="brand-name">SIINGE</div>
          <div class="brand-sub">Hub</div>
        </div>
      </div>

      <nav class="nav-menu">
        <router-link to="/manufacturers" class="nav-item" :class="{ active: isActive('/manufacturers') }">
          <span class="icon">🏭</span>
          <span class="label">Manufacturers</span>
        </router-link>
        <router-link to="/projects" class="nav-item" :class="{ active: isActive('/projects') }">
          <span class="icon">📋</span>
          <span class="label">Projects</span>
        </router-link>
        <router-link to="/sourcing" class="nav-item" :class="{ active: isActive('/sourcing') }">
          <span class="icon">🔍</span>
          <span class="label">Sourcing</span>
        </router-link>
        <router-link to="/project-sourcing" class="nav-item" :class="{ active: isActive('/project-sourcing') }">
          <span class="icon">📦</span>
          <span class="label">Components</span>
        </router-link>
        <router-link to="/quotes" class="nav-item" :class="{ active: isActive('/quotes') }">
          <span class="icon">💰</span>
          <span class="label">Quotes</span>
        </router-link>
        <router-link to="/templates" class="nav-item" :class="{ active: isActive('/templates') }">
          <span class="icon">📧</span>
          <span class="label">Templates</span>
        </router-link>
        <router-link to="/calendar" class="nav-item" :class="{ active: isActive('/calendar') }">
          <span class="icon">📅</span>
          <span class="label">Calendar</span>
        </router-link>
        <router-link to="/events" class="nav-item" :class="{ active: isActive('/events') }">
          <span class="icon">🎪</span>
          <span class="label">Events</span>
        </router-link>
      </nav>

      <div class="sidebar-footer">
        <button @click="toggleTheme" class="btn-icon-sidebar" :title="isDark ? 'Light Mode' : 'Dark Mode'">
          {{ isDark ? '☀️' : '🌙' }}
        </button>
        <button @click="logout" class="btn-icon-sidebar" title="Sign Out">
          ⎋
        </button>
      </div>
    </div>

    <div class="main-layout">
      <header class="top-header">
        <div class="notif-section">
          <div class="notifications-wrapper" v-click-outside="closeNotifs">
            <button @click="showNotifs = !showNotifs" class="btn-notif">
              <span class="notif-icon">🔔</span>
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
        </div>
      </header>

      <main class="content-area">
        <router-view />
      </main>
    </div>
  </div>
  <div v-else>
    <router-view />
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
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
  const { data } = await supabase.from('notifications')
    .select('*')
    .eq('recipient_email', session.value.user.email)
    .order('created_at', { ascending: false })
    .limit(15)
  notifications.value = data || []
}

async function markAllRead() {
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
  min-height: 100vh;
  background: var(--bg-app);
}

/* SIDEBAR */
.sidebar {
  width: 260px;
  background: var(--bg-card);
  border-right: 1px solid var(--border-main);
  display: flex;
  flex-direction: column;
  position: fixed;
  left: 0;
  top: 0;
  height: 100vh;
  overflow-y: auto;
  z-index: 90;
}

.sidebar-header {
  padding: 1.2rem 1rem;
  border-bottom: 1px solid var(--border-light);
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.logo {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  object-fit: contain;
}

.brand-text {
  flex: 1;
}

.brand-name {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--text-main);
  line-height: 1;
}

.brand-sub {
  font-size: 0.7rem;
  color: var(--primary);
  font-weight: 600;
}

/* NAVEGACIÓN */
.nav-menu {
  flex: 1;
  padding: 0.75rem 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.7rem 0.75rem;
  color: var(--text-body);
  text-decoration: none;
  border-radius: 6px;
  font-size: 0.9rem;
  font-weight: 500;
  transition: all 0.15s;
  border-left: 3px solid transparent;
}

.nav-item:hover {
  background: var(--border-light);
  color: var(--text-main);
}

.nav-item.active {
  background: rgba(79, 70, 229, 0.1);
  color: var(--primary);
  border-left-color: var(--primary);
  font-weight: 600;
}

.nav-item .icon {
  font-size: 1.1rem;
  width: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.nav-item .label {
  flex: 1;
  white-space: nowrap;
}

/* PIE DE SIDEBAR */
.sidebar-footer {
  padding: 1rem 0.75rem;
  border-top: 1px solid var(--border-light);
  display: flex;
  gap: 0.5rem;
}

.btn-icon-sidebar {
  flex: 1;
  padding: 0.6rem;
  background: transparent;
  border: 1px solid var(--border-main);
  color: var(--text-muted);
  border-radius: 6px;
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-icon-sidebar:hover {
  background: var(--border-light);
  color: var(--text-main);
  border-color: var(--primary);
}

/* MAIN LAYOUT */
.main-layout {
  flex: 1;
  margin-left: 260px;
  display: flex;
  flex-direction: column;
}

/* TOP HEADER */
.top-header {
  height: 56px;
  background: var(--bg-card);
  border-bottom: 1px solid var(--border-main);
  display: flex;
  align-items: center;
  padding: 0 1.5rem;
  position: sticky;
  top: 0;
  z-index: 80;
}

.notif-section {
  display: flex;
  gap: 1rem;
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

.notif-icon {
  display: flex;
  align-items: center;
  justify-content: center;
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
  background: rgba(0, 0, 0, 0.02);
}

.notifs-header h4 {
  margin: 0;
  font-size: 0.9rem;
  color: var(--text-main);
  font-weight: 600;
}

.btn-clear {
  background: transparent;
  border: none;
  color: var(--primary);
  font-size: 0.75rem;
  cursor: pointer;
  font-weight: 600;
  transition: color 0.15s;
}

.btn-clear:hover {
  color: var(--primary-hover);
}

.notifs-body {
  max-height: 360px;
  overflow-y: auto;
}

.empty-notifs {
  padding: 2rem 1rem;
  text-align: center;
  color: var(--text-muted);
  font-size: 0.85rem;
}

.notif-item {
  padding: 0.9rem 1rem;
  border-bottom: 1px solid var(--border-light);
  cursor: pointer;
  transition: background 0.15s;
}

.notif-item:hover {
  background: rgba(79, 70, 229, 0.05);
}

.notif-item.unread {
  background: rgba(79, 70, 229, 0.08);
  border-left: 3px solid var(--primary);
}

.notif-text {
  font-size: 0.85rem;
  color: var(--text-body);
  margin-bottom: 0.3rem;
  line-height: 1.3;
}

.notif-time {
  font-size: 0.7rem;
  color: var(--text-muted);
}

/* CONTENT AREA */
.content-area {
  flex: 1;
  overflow-y: auto;
  padding: 0;
}

/* SCROLLBAR */
.sidebar::-webkit-scrollbar,
.notifs-body::-webkit-scrollbar,
.content-area::-webkit-scrollbar {
  width: 6px;
}

.sidebar::-webkit-scrollbar-track,
.notifs-body::-webkit-scrollbar-track,
.content-area::-webkit-scrollbar-track {
  background: transparent;
}

.sidebar::-webkit-scrollbar-thumb,
.notifs-body::-webkit-scrollbar-thumb,
.content-area::-webkit-scrollbar-thumb {
  background: var(--border-main);
  border-radius: 3px;
}

.sidebar::-webkit-scrollbar-thumb:hover,
.notifs-body::-webkit-scrollbar-thumb:hover,
.content-area::-webkit-scrollbar-thumb:hover {
  background: var(--border-light);
}
</style>
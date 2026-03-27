<template>
  <div class="app-container">
    <nav v-if="session">
      <div class="nav-brand">
        <img src="https://i.ibb.co/xK52ckkK/Whats-App-Image-2026-02-24-at-13-58-58-1.jpg" alt="logo" class="nav-logo" />
        <div>
          <div class="brand-name">SIINGE STUDIO</div>
          <div class="brand-sub">Manufacturers Hub</div>
        </div>
      </div>
      
      <div class="nav-links">
        <router-link to="/manufacturers">Manufacturers</router-link>
        <router-link to="/templates">Templates</router-link>
        <router-link to="/projects">Projects</router-link>
        <router-link to="/sourcing">Sourcing</router-link>
        <router-link to="/calendar">Calendar</router-link>
        <router-link to="/events">Events</router-link>
      </div>

      <div class="notifications-wrapper" v-click-outside="closeNotifs">
        <button @click="showNotifs = !showNotifs" class="btn-bell">
          🔔
          <span v-if="unreadCount > 0" class="badge">{{ unreadCount }}</span>
        </button>

        <div v-if="showNotifs" class="notifs-dropdown">
          <div class="notifs-header">
            <h4>Notifications</h4>
            <button v-if="unreadCount > 0" @click="markAllRead" class="btn-text-micro">Mark all read</button>
          </div>
          <div class="notifs-body">
            <div v-if="notifications.length === 0" class="empty-notifs">No new notifications</div>
            <div v-for="n in notifications" :key="n.id" 
                 class="notif-item" 
                 :class="{ 'unread': !n.is_read }"
                 @click="goToNotification(n)">
              <div class="notif-text">{{ n.message }}</div>
              <div class="notif-time">{{ new Date(n.created_at).toLocaleDateString() }}</div>
            </div>
          </div>
        </div>
      </div>

      <button @click="logout" class="btn-logout">Sign Out</button>
    </nav>
    <router-view />
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from './lib/supabase'

const router = useRouter()
const session = ref(null)

// ESTADO DE NOTIFICACIONES
const notifications = ref([])
const showNotifs = ref(false)
const unreadCount = computed(() => notifications.value.filter(n => !n.is_read).length)

// Directiva simple para cerrar el dropdown al hacer clic fuera
const vClickOutside = {
  mounted(el, binding) {
    el.clickOutsideEvent = function (event) { if (!(el == event.target || el.contains(event.target))) { binding.value() } };
    document.body.addEventListener('click', el.clickOutsideEvent)
  },
  unmounted(el) { document.body.removeEventListener('click', el.clickOutsideEvent) }
}

function closeNotifs() { showNotifs.value = false }

onMounted(async () => {
  const { data } = await supabase.auth.getSession()
  session.value = data.session
  
  if (session.value) {
    fetchNotifications()
    // MAGIA: Escuchar notificaciones en tiempo real
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
  // Enviar a Proyectos con parámetros en la URL
  router.push(`/projects?project=${n.project_id}&stage=${n.stage_id}`)
}

async function logout() {
  await supabase.auth.signOut()
  router.push('/login')
}
</script>

<style>
/* ESTILO MAESTRO PARA EL FONDO OSCURO */
.app-container { background-color: var(--bg-app); min-height: 100vh; width: 100%; color: var(--text-body); }
html, body { background-color: var(--bg-app) !important; margin: 0; padding: 0; }

nav {
  background: var(--bg-card); padding: 0 2rem; height: 64px; display: flex; align-items: center; gap: 1.5rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3); position: sticky; top: 0; z-index: 100; border-bottom: 1px solid var(--border-main);
}
.nav-brand { display: flex; align-items: center; gap: 0.75rem; margin-right: 1rem; }
.nav-logo { width: 36px; height: 36px; border-radius: 8px; object-fit: contain; }
.brand-name { font-weight: 800; font-size: 0.88rem; color: var(--text-main); letter-spacing: 0.05em; text-transform: uppercase; }
.brand-sub { font-size: 0.72rem; color: var(--primary); font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; }
.nav-links { display: flex; gap: 0.5rem; flex: 1; }
.nav-links a {
  color: var(--text-muted); text-decoration: none; font-weight: 600; font-size: 0.92rem; padding: 0.5rem 0.9rem;
  border-radius: 8px; transition: all 0.15s;
}
.nav-links a:hover { background: var(--border-light); color: var(--text-main); }
.nav-links a.router-link-active { background: var(--border-light); color: var(--primary); font-weight: 700; border: 1px solid var(--border-main); }

/* NOTIFICACIONES UI */
.notifications-wrapper { position: relative; }
.btn-bell { background: transparent; border: 1px solid var(--border-main); color: white; width: 40px; height: 40px; border-radius: 50%; font-size: 1.2rem; cursor: pointer; position: relative; transition: 0.2s; display: flex; align-items: center; justify-content: center;}
.btn-bell:hover { background: var(--border-light); }
.badge { position: absolute; top: -2px; right: -2px; background: var(--danger-text); color: white; font-size: 0.65rem; font-weight: 800; width: 18px; height: 18px; border-radius: 50%; display: flex; align-items: center; justify-content: center; }

.notifs-dropdown { position: absolute; top: 50px; right: 0; width: 320px; background: var(--bg-card); border: 1px solid var(--border-main); border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); overflow: hidden; z-index: 200; }
.notifs-header { padding: 1rem; border-bottom: 1px solid var(--border-main); display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.2);}
.notifs-header h4 { margin: 0; font-size: 0.95rem; color: var(--text-main); }
.btn-text-micro { background: transparent; border: none; color: var(--primary); font-size: 0.75rem; cursor: pointer; font-weight: 600;}
.notifs-body { max-height: 350px; overflow-y: auto; }
.empty-notifs { padding: 2rem; text-align: center; color: var(--text-muted); font-size: 0.85rem; }
.notif-item { padding: 1rem; border-bottom: 1px solid var(--border-light); cursor: pointer; transition: 0.2s; }
.notif-item:hover { background: var(--bg-app); }
.notif-item.unread { background: rgba(99, 102, 241, 0.1); border-left: 3px solid var(--primary); }
.notif-text { font-size: 0.85rem; color: var(--text-body); margin-bottom: 0.3rem; line-height: 1.3;}
.notif-time { font-size: 0.7rem; color: var(--text-muted); }

.btn-logout { background: transparent; color: var(--text-muted); border: 1px solid var(--border-main); padding: 0.4rem 0.9rem; border-radius: 8px; cursor: pointer; font-size: 0.88rem; font-family: 'Inter', sans-serif; transition: all 0.15s; font-weight: 600; }
.btn-logout:hover { color: var(--text-main); border-color: var(--text-main); background: var(--bg-app); }
</style>
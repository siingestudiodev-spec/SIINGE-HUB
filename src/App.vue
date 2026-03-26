<template>
  <div>
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
      <button @click="logout" class="btn-logout">Sign Out</button>
    </nav>
    <router-view />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from './lib/supabase'

const router = useRouter()
const session = ref(null)

onMounted(async () => {
  const { data } = await supabase.auth.getSession()
  session.value = data.session
  supabase.auth.onAuthStateChange((_, s) => { session.value = s })
})

async function logout() {
  await supabase.auth.signOut()
  router.push('/login')
}
</script>

<style>
nav {
  background: var(--bg-card);
  padding: 0 2rem;
  height: 64px;
  display: flex;
  align-items: center;
  gap: 2rem;
  box-shadow: 0 1px 4px rgba(0,0,0,0.05);
  position: sticky;
  top: 0;
  z-index: 100;
  border-bottom: 1px solid var(--border-main);
}
.nav-brand { display: flex; align-items: center; gap: 0.75rem; margin-right: 1rem; }
.nav-logo { width: 36px; height: 36px; border-radius: 8px; object-fit: contain; }
.brand-name { font-weight: 800; font-size: 0.88rem; color: var(--text-main); letter-spacing: 0.05em; text-transform: uppercase; }
.brand-sub { font-size: 0.72rem; color: var(--primary); font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; }
.nav-links { display: flex; gap: 0.5rem; flex: 1; }
.nav-links a {
  color: var(--text-muted); text-decoration: none; font-weight: 600;
  font-size: 0.92rem; padding: 0.5rem 0.9rem;
  border-radius: 8px; transition: all 0.15s;
}
.nav-links a:hover { background: var(--border-light); color: var(--text-main); }
.nav-links a.router-link-active { background: var(--bg-app); color: var(--primary); font-weight: 700; border: 1px solid var(--border-main); }
.btn-logout {
  background: transparent; color: var(--text-muted);
  border: 1px solid var(--border-main); padding: 0.4rem 0.9rem;
  border-radius: 8px; cursor: pointer; font-size: 0.88rem;
  font-family: 'Inter', sans-serif; transition: all 0.15s; font-weight: 600;
}
.btn-logout:hover { color: var(--text-main); border-color: var(--text-main); background: var(--bg-app); }
</style>
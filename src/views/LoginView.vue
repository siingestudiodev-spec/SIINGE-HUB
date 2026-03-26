<template>
  <div class="login-wrapper">
    <div class="login-card">
      <div class="login-header">
        <img src="https://i.ibb.co/xK52ckkK/Whats-App-Image-2026-02-24-at-13-58-58-1.jpg" alt="SIINGE STUDIO" class="logo" />
        <h1>SIINGE STUDIO</h1>
        <p class="app-name">Manufacturers Hub</p>
        <p class="subtitle">Sign in to your workspace</p>
      </div>

      <div v-if="message" class="alert">{{ message }}</div>

      <form @submit.prevent="handleLogin">
        <div class="field">
          <label>Email</label>
          <input v-model="email" type="email" placeholder="you@siingestudio.com" required />
        </div>
        <div class="field">
          <label>Password</label>
          <input v-model="password" type="password" placeholder="••••••••" required />
        </div>
        <button type="submit" class="btn-login" :disabled="loading">
          {{ loading ? 'Signing in...' : 'Sign In →' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../lib/supabase'

const router = useRouter()
const email = ref('')
const password = ref('')
const loading = ref(false)
const message = ref('')

async function handleLogin() {
  loading.value = true
  message.value = ''
  const { error } = await supabase.auth.signInWithPassword({
    email: email.value,
    password: password.value
  })
  if (error) { message.value = error.message }
  else { router.push('/manufacturers') }
  loading.value = false
}
</script>

<style scoped>
.login-wrapper {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  /* Fondo más profundo acorde al tema oscuro */
  background: radial-gradient(circle at top right, #1e1e2e, #0b0b14);
}

.login-card {
  background: var(--bg-card);
  padding: 2.5rem;
  border-radius: 24px;
  border: 1px solid var(--border-main);
  box-shadow: 0 24px 64px rgba(0,0,0,0.5);
  width: 100%;
  max-width: 420px;
}

.login-header { text-align: center; margin-bottom: 2rem; }

.logo {
  width: 90px;
  height: 90px;
  object-fit: contain;
  border-radius: 20px;
  margin-bottom: 1rem;
  /* Brillo sutil para que el logo resalte en oscuro */
  filter: drop-shadow(0 0 10px rgba(79, 70, 229, 0.3));
}

h1 { 
  font-size: 1.4rem; 
  font-weight: 800; 
  color: var(--text-main); 
  letter-spacing: 0.05em; 
  text-transform: uppercase; 
  margin-bottom: 0.2rem; 
}

.app-name { 
  font-size: 0.95rem; 
  font-weight: 600; 
  color: var(--primary); 
  letter-spacing: 0.08em; 
  text-transform: uppercase; 
  margin-bottom: 0.4rem; 
}

.subtitle { color: var(--text-muted); font-size: 0.88rem; }

.field { margin-bottom: 1.1rem; }

label { 
  display: block; 
  font-size: 0.85rem; 
  font-weight: 600; 
  margin-bottom: 0.4rem; 
  color: var(--text-body); 
}

input {
  width: 100%; 
  padding: 0.75rem 1rem;
  border: 1.5px solid var(--border-main); 
  border-radius: 10px;
  font-size: 0.95rem; 
  color: var(--text-main); 
  background: var(--bg-app);
  font-family: 'Inter', sans-serif; 
  transition: all 0.2s;
}

input:focus { 
  outline: none; 
  border-color: var(--primary); 
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
}

.btn-login {
  width: 100%;
  background: var(--primary);
  color: white; 
  border: none; 
  padding: 0.85rem;
  border-radius: 10px; 
  font-size: 0.95rem; 
  font-weight: 700;
  cursor: pointer; 
  margin-top: 0.5rem;
  transition: all 0.2s;
  font-family: 'Inter', sans-serif; 
  letter-spacing: 0.02em;
}

.btn-login:hover { 
  filter: brightness(1.1);
  transform: translateY(-1px); 
}

.btn-login:disabled { 
  opacity: 0.6; 
  cursor: not-allowed; 
  transform: none; 
}

.alert { 
  background: var(--danger-bg); 
  color: var(--danger-text); 
  padding: 0.75rem 1rem; 
  border-radius: 8px; 
  margin-bottom: 1rem; 
  font-size: 0.88rem; 
  border: 1px solid rgba(225, 29, 72, 0.2);
}
</style>
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
  background: var(--bg-app);
}
.login-card {
  background: var(--bg-card);
  padding: 3rem 2.5rem;
  border-radius: var(--r-3);
  border: 1px solid var(--border-light);
  box-shadow: var(--shadow-2);
  width: 100%;
  max-width: 400px;
}
.login-header { text-align: center; margin-bottom: 2rem; }
.logo {
  width: 72px;
  height: 72px;
  object-fit: contain;
  border-radius: var(--r-2);
  margin-bottom: 1.25rem;
}
h1 {
  font-size: var(--fs-13);
  font-weight: 700;
  color: var(--text-main);
  letter-spacing: var(--tr-eyebrow);
  text-transform: uppercase;
  margin: 0 0 0.25rem;
}
.app-name {
  font-size: var(--fs-12);
  font-weight: 600;
  color: var(--primary);
  letter-spacing: var(--tr-eyebrow);
  text-transform: uppercase;
  margin-bottom: 0.5rem;
}
.subtitle { color: var(--text-muted); font-size: var(--fs-13); }
.field { margin-bottom: var(--s-4); }
label {
  display: block;
  font-size: var(--fs-12);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: var(--s-2);
  color: var(--text-muted);
}
input {
  width: 100%;
  padding: 0.7rem var(--s-4);
  border: 1px solid var(--border-main);
  border-radius: var(--r-1);
  font-size: var(--fs-14);
  color: var(--text-main);
  background: var(--bg-app);
  font-family: var(--font-sans);
  transition: border-color var(--dur-fast) var(--ease);
  box-sizing: border-box;
}
input:focus { outline: none; border-color: var(--text-main); }
.btn-login {
  width: 100%;
  background: var(--ink);
  color: var(--paper);
  border: none;
  padding: 0.875rem;
  border-radius: var(--r-1);
  font-size: var(--fs-12);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: var(--tr-allcaps);
  cursor: pointer;
  margin-top: var(--s-2);
  transition: opacity var(--dur-fast) var(--ease);
  font-family: var(--font-sans);
}
.btn-login:hover { opacity: 0.88; }
.btn-login:disabled { opacity: 0.45; cursor: not-allowed; }
.alert {
  background: var(--danger-bg);
  color: var(--danger-text);
  padding: var(--s-3) var(--s-4);
  border-radius: var(--r-2);
  margin-bottom: var(--s-4);
  font-size: var(--fs-13);
}
</style>

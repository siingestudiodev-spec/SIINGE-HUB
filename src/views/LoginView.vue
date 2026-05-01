<template>
  <div class="login-wrapper">
    <img src="/src/assets/siinge-mark.png" class="watermark" alt="" aria-hidden="true" />
    <div class="login-card">
      <div class="login-header">
        <img :src="logoImage" alt="SIINGE STUDIO" class="logo" />
        <h1 class="display display--lg">SIINGE STUDIO</h1>
        <p class="eyebrow" style="margin-top: 8px;">Manufacturers Hub</p>
        <p class="eyebrow subtitle">Sign in to your workspace</p>
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
          <span>{{ loading ? 'Signing in...' : 'Sign In' }}</span>
          <ArrowRight v-if="!loading" :size="14" :stroke-width="1.5" />
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../lib/supabase'
import { ArrowRight } from 'lucide-vue-next'
import logoImage from '@/assets/siinge-logo.png'

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
  width: 96px;
  height: 96px;
  object-fit: contain;
  border-radius: var(--r-2);
  margin-bottom: 1.25rem;
}
h1 {
  margin: 0 0 0.25rem;
}
.subtitle {
  margin-top: 0.35rem;
}
.watermark {
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  width: 160px;
  height: 160px;
  object-fit: contain;
  opacity: 0.04;
  pointer-events: none;
  user-select: none;
}
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
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
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

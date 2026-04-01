import { createRouter, createWebHistory } from 'vue-router'
import { supabase } from '../lib/supabase'
import ManufacturersView from '../views/ManufacturersView.vue'
import TemplatesView from '../views/TemplatesView.vue'
import ProjectsView from '../views/ProjectsView.vue'
import ProjectSourcingView from '../views/ProjectSourcingView.vue' 
import QuoteComparison from '../views/QuoteComparison.vue'
import LoginView from '../views/LoginView.vue'
import Sourcing from '../views/Sourcing.vue'
import Events from '../views/Events.vue'
import CalendarView from '../views/CalendarView.vue' 
import TestingView from '../views/TestingView.vue' 

const routes = [
  { path: '/login', component: LoginView },
  { path: '/', redirect: '/manufacturers' },
  { 
    path: '/manufacturers', 
    component: ManufacturersView, 
    meta: { requiresAuth: true } 
  },
  { 
    path: '/templates', 
    component: TemplatesView, 
    meta: { requiresAuth: true } 
  },
  { 
    path: '/projects', 
    component: ProjectsView, 
    meta: { requiresAuth: true } 
  },
  { 
    path: '/projects/:id/sourcing', 
    component: ProjectSourcingView, 
    meta: { requiresAuth: true } 
  }, 
  { 
    path: '/projects/:id/quotes', 
    component: QuoteComparison, 
    meta: { requiresAuth: true } 
  },
  { 
    path: '/sourcing', 
    component: Sourcing, 
    meta: { requiresAuth: true } 
  },
  { 
    path: '/events', 
    component: Events, 
    meta: { requiresAuth: true } 
  },
  { 
    path: '/calendar', 
    component: CalendarView, 
    meta: { requiresAuth: true } 
  },
  { 
    // RUTA AISLADA PÚBLICA PARA FIRMAS
    path: '/testing', 
    component: TestingView, 
    meta: { requiresAuth: false, hideNavbar: true } 
  } 
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach(async (to) => {
  const { data: { session } } = await supabase.auth.getSession()
  
  // Si la ruta requiere auth y no hay sesión, al login
  if (to.meta.requiresAuth && !session) return '/login'
  
  // Si ya hay sesión y trata de entrar al login, lo mandamos a la app
  if (to.path === '/login' && session) return '/manufacturers'
})

export default router
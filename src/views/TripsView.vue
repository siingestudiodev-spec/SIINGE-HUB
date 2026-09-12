<template>
  <div class="container">
    <div class="header">
      <div>
        <h1>Trip Map</h1>
        <p class="subtitle">Sourcing trips — set the cities and dates, then plan on the map</p>
      </div>
      <div class="header-actions">
        <button @click="newTrip" class="btn-primary" :disabled="creating">
          {{ creating ? 'Creating…' : '+ New trip' }}
        </button>
      </div>
    </div>

    <div v-if="err" class="tv-warn">{{ err }}</div>

    <div v-if="loading" class="tv-empty">Loading…</div>
    <div v-else-if="!trips.length" class="tv-empty">
      No trips yet. Create one to start planning.
    </div>

    <div v-else class="tv-grid">
      <article v-for="t in trips" :key="t.id" class="tv-card" :class="{ archived: t.archived }">
        <header class="tv-card-h">
          <h2>{{ t.name }}</h2>
          <span class="tv-dates">{{ fmtRange(t.date_start, t.date_end) || 'no dates' }}</span>
        </header>

        <div class="tv-stats">
          <span><b>{{ (t.legs || []).length }}</b> cities</span>
          <span><b>{{ meetingDays(t) }}</b> meeting days</span>
          <span><b>{{ d(t).places.length }}</b> places</span>
          <span class="tv-meet" :class="{ pend: stat(t).pending }">
            <b>{{ stat(t).confirmed }}/{{ stat(t).total }}</b> meetings confirmed
          </span>
        </div>

        <div v-if="(t.legs || []).length" class="tv-legs">
          <span v-for="l in (t.legs || []).slice(0, 8)" :key="l.id" class="tv-leg">{{ l.city }}</span>
          <span v-if="(t.legs || []).length > 8" class="tv-leg more">+{{ t.legs.length - 8 }}</span>
        </div>
        <p v-else class="tv-nolegs">No cities yet — open Configure to add them.</p>

        <footer class="tv-card-f">
          <router-link :to="`/trip-map/${t.id}`" class="btn-primary tv-btn">
            <MapPin :size="13" :stroke-width="1.7" /> Open map
          </router-link>
          <router-link :to="`/trip-map/${t.id}/setup`" class="btn-secondary tv-btn">
            <Settings :size="13" :stroke-width="1.7" /> Configure
          </router-link>
          <button class="tv-icon" title="Duplicate" @click="duplicate(t)"><Copy :size="14" :stroke-width="1.6" /></button>
          <button class="tv-icon danger" title="Delete" @click="remove(t)"><Trash2 :size="14" :stroke-width="1.6" /></button>
        </footer>
      </article>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { MapPin, Settings, Copy, Trash2 } from 'lucide-vue-next'
import { Trips, fmtRange, legFreeDays, normalizeData, apptStats } from '../lib/trips'

const router = useRouter()
const trips = ref([])
const loading = ref(true)
const creating = ref(false)
const err = ref('')

function meetingDays(t) {
  return (t.legs || []).reduce((n, l) => n + legFreeDays(l, t.blackouts || []).count, 0)
}
const dataCache = new WeakMap()
/** normalizeData folds the legacy bases/customStops shape in, so cache it per row. */
function d(t) {
  if (!dataCache.has(t)) dataCache.set(t, normalizeData(t.data, t.legs))
  return dataCache.get(t)
}
function stat(t) { return apptStats(d(t).appointments) }

async function load() {
  loading.value = true
  try { trips.value = await Trips.list(); err.value = '' }
  catch (e) { err.value = 'Could not load trips: ' + (e.message || e) }
  loading.value = false
}

async function newTrip() {
  creating.value = true
  try {
    const t = await Trips.create({ name: 'Untitled trip', legs: [], blackouts: [], data: {} })
    router.push(`/trip-map/${t.id}/setup`)
  } catch (e) { err.value = 'Could not create the trip: ' + (e.message || e) }
  creating.value = false
}

async function duplicate(t) {
  try {
    const c = await Trips.create({
      name: t.name + ' (copy)', date_start: t.date_start, date_end: t.date_end,
      legs: t.legs || [], blackouts: t.blackouts || [],
      // keep where we sleep, drop the bookings — a copy is a fresh schedule
      data: { routes: {}, places: d(t).places, appointments: [] },
    })
    router.push(`/trip-map/${c.id}/setup`)
  } catch (e) { err.value = 'Could not duplicate the trip: ' + (e.message || e) }
}

async function remove(t) {
  if (!confirm(`Delete "${t.name}"? Its places, routes and booked meetings go with it.`)) return
  try { await Trips.remove(t.id); await load() }
  catch (e) { err.value = 'Could not delete the trip: ' + (e.message || e) }
}

onMounted(load)
</script>

<style scoped>
.container { max-width: 1100px; margin: 0 auto; padding: 2rem 1.5rem; }
.header { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; flex-wrap: wrap; margin-bottom: 1.5rem; }
h1 { font-size: 1.6rem; font-weight: 700; color: var(--text-main); margin: 0; }
.subtitle { color: var(--text-muted); margin: 0.25rem 0 0; font-size: 0.9rem; }
.btn-primary {
  padding: 0.5rem 0.9rem; border: 1px solid var(--primary); border-radius: var(--r-2);
  background: var(--primary); color: var(--bone); cursor: pointer; font-size: var(--fs-13); font-weight: 600;
}
.btn-primary:hover { background: var(--primary-hover); border-color: var(--primary-hover); }
.btn-secondary {
  padding: 0.5rem 0.9rem; border: 1px solid var(--border-main); border-radius: var(--r-2);
  background: transparent; color: var(--text-main); cursor: pointer; font-size: var(--fs-13); font-weight: 600;
}
.btn-secondary:hover { border-color: var(--primary); }
.btn-primary:disabled, .btn-secondary:disabled { opacity: 0.5; cursor: default; }

.tv-warn {
  border: 1px solid var(--caution); background: var(--caution-soft); color: var(--ember-deep);
  padding: 10px 14px; border-radius: var(--r-2); margin-bottom: var(--s-4); font-size: var(--fs-13);
}
.tv-empty { padding: var(--s-16) var(--s-4); text-align: center; color: var(--text-muted); font-size: var(--fs-14); }

.tv-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(330px, 100%), 1fr)); gap: var(--s-4); }
.tv-card {
  border: 1px solid var(--border-main); border-radius: var(--r-3); background: var(--bg-card);
  padding: var(--s-4); display: flex; flex-direction: column; gap: var(--s-3);
}
.tv-card.archived { opacity: 0.55; }
.tv-card-h { display: flex; align-items: baseline; gap: var(--s-3); flex-wrap: wrap; }
.tv-card-h h2 { margin: 0; font-size: var(--fs-16); font-weight: 700; color: var(--text-main); }
.tv-dates { margin-left: auto; font-family: var(--font-mono); font-size: var(--fs-12); color: var(--text-muted); }

.tv-stats { display: flex; gap: var(--s-4); font-size: var(--fs-12); color: var(--text-muted); flex-wrap: wrap; }
.tv-stats b { color: var(--text-main); font-variant-numeric: tabular-nums; }
.tv-meet b { color: var(--positive); }
.tv-meet.pend b { color: var(--caution); }

.tv-legs { display: flex; flex-wrap: wrap; gap: 4px; }
.tv-leg {
  font-family: var(--font-mono); font-size: 0.68rem; padding: 2px 7px; border-radius: var(--r-pill);
  background: var(--bg-sunken); color: var(--text-body);
}
.tv-leg.more { color: var(--text-subtle); }
.tv-nolegs { margin: 0; font-size: var(--fs-12); color: var(--text-subtle); font-style: italic; }

.tv-card-f { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; margin-top: auto; padding-top: var(--s-2); }
.tv-btn { display: inline-flex; align-items: center; gap: 5px; text-decoration: none; font-size: var(--fs-12); padding: 6px 10px; }
.tv-icon {
  margin-left: auto; background: transparent; border: 1px solid var(--border-main); color: var(--text-muted);
  width: 30px; height: 30px; border-radius: var(--r-2); display: flex; align-items: center; justify-content: center; cursor: pointer;
}
.tv-icon + .tv-icon { margin-left: 0; }
.tv-icon:hover { border-color: var(--primary); color: var(--text-main); }
.tv-icon.danger:hover { border-color: var(--critical); color: var(--critical); }

@media (max-width: 700px) {
  .container { padding: 1.25rem 1rem; }
  .header { gap: 0.75rem; }
  .header-actions, .header-actions .btn-primary { width: 100%; }
  .tv-btn { flex: 1; min-height: 38px; }
  .tv-icon { width: 38px; height: 38px; }
}
</style>

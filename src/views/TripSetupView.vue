<template>
  <div class="container" v-if="trip">
    <div class="header">
      <div>
        <router-link to="/trip-map" class="ts-back">← Trips</router-link>
        <h1>Trip setup</h1>
        <p class="subtitle">Dates and cities. The map will show the suppliers in these regions.</p>
      </div>
      <div class="header-actions">
        <button class="btn-secondary" @click="save(false)" :disabled="saving">
          {{ saving ? 'Saving…' : 'Save' }}
        </button>
        <button class="btn-primary" @click="save(true)" :disabled="saving || !trip.legs.length">
          Save and open map
        </button>
      </div>
    </div>

    <div v-if="err" class="ts-warn">{{ err }}</div>

    <!-- BASICS -->
    <section class="ts-card">
      <h2 class="ts-h">Trip details</h2>
      <div class="ts-row">
        <label class="ts-f grow">
          <span>Name</span>
          <input v-model="trip.name" placeholder="e.g. Europe Sep–Oct 2026" />
        </label>
        <label class="ts-f">
          <span>From</span>
          <input type="date" v-model="trip.date_start" />
        </label>
        <label class="ts-f">
          <span>To</span>
          <input type="date" v-model="trip.date_end" />
        </label>
        <button class="ts-mini" @click="datesFromLegs" title="Take the range from the cities below">↧ from cities</button>
      </div>
    </section>

    <!-- CITIES -->
    <section class="ts-card">
      <h2 class="ts-h">
        Cities
        <span class="ts-count">{{ trip.legs.length }}</span>
        <span class="ts-sum">{{ totalMeetingDays }} meeting days in total</span>
      </h2>

      <div class="ts-add">
        <input v-model="q" @keydown.enter.prevent="doSearch" placeholder="Search a city… (e.g. Porto, Naples)" />
        <button class="btn-secondary" @click="doSearch" :disabled="searching || q.trim().length < 2">
          {{ searching ? 'Searching…' : 'Search' }}
        </button>
      </div>
      <ul v-if="results.length" class="ts-results">
        <li v-for="(r, i) in results" :key="i">
          <button @click="addLeg(r)">
            <b>{{ r.city }}</b><span v-if="r.country"> · {{ r.country }}</span>
            <em>{{ r.label }}</em>
          </button>
        </li>
        <li><button class="ts-dismiss" @click="results = []">close</button></li>
      </ul>
      <p v-else-if="searched && !searching" class="ts-none">No results. Try another name.</p>

      <div v-if="!trip.legs.length" class="ts-none">Add your first city to get started.</div>

      <div v-for="(l, i) in trip.legs" :key="l.id" class="ts-leg">
        <div class="ts-leg-top">
          <span class="ts-leg-n">{{ i + 1 }}</span>
          <input class="ts-leg-city" v-model="l.city" placeholder="City" />
          <input class="ts-leg-country" v-model="l.country" placeholder="Country" />
          <span class="ts-leg-ll" :class="{ missing: l.lat == null }">
            {{ l.lat != null ? l.lat.toFixed(3) + ', ' + l.lon.toFixed(3) : 'no coordinates' }}
          </span>
          <button class="ts-icon" @click="move(i, -1)" :disabled="i === 0" title="Move up">▲</button>
          <button class="ts-icon" @click="move(i, 1)" :disabled="i === trip.legs.length - 1" title="Move down">▼</button>
          <button class="ts-icon danger" @click="removeLeg(i)" title="Remove">✕</button>
        </div>
        <div class="ts-leg-bot">
          <label class="ts-f sm"><span>Arrive</span><input type="date" v-model="l.from" /></label>
          <label class="ts-f sm"><span>Leave</span><input type="date" v-model="l.to" /></label>
          <label class="ts-chk"><input type="checkbox" v-model="l.travelIn" /> first day is travel</label>
          <label class="ts-chk"><input type="checkbox" v-model="l.travelOut" /> last day is travel</label>
          <label class="ts-f sm"><span>Radius km</span><input type="number" min="10" max="600" step="10" v-model.number="l.radiusKm" /></label>
          <span class="ts-free" :class="{ zero: freeOf(l).count === 0 }">
            {{ freeOf(l).count }} {{ freeOf(l).count === 1 ? 'day' : 'days' }} · {{ fmtDayList(freeOf(l).free) }}
          </span>
        </div>
      </div>
    </section>

    <!-- BLACKOUTS -->
    <section class="ts-card">
      <h2 class="ts-h">Blackouts <span class="ts-sub">date ranges with no meetings (holidays, events…)</span></h2>
      <div v-for="(b, i) in trip.blackouts" :key="i" class="ts-black">
        <label class="ts-f sm"><span>From</span><input type="date" v-model="b.from" /></label>
        <label class="ts-f sm"><span>To</span><input type="date" v-model="b.to" /></label>
        <input class="ts-black-lbl" v-model="b.label" placeholder="Reason (optional)" />
        <button class="ts-icon danger" @click="trip.blackouts.splice(i, 1)">✕</button>
      </div>
      <button class="ts-mini" @click="trip.blackouts.push({ from: '', to: '', label: '' })">+ Add blackout</button>
    </section>
  </div>

  <div v-else class="container"><p class="ts-none">{{ err || 'Loading…' }}</p></div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Trips, geocode, blankLeg, legFreeDays, fmtDayList } from '../lib/trips'

const route = useRoute()
const router = useRouter()
const trip = ref(null)
const err = ref('')
const saving = ref(false)
const q = ref('')
const results = ref([])
const searching = ref(false)
const searched = ref(false)

const freeOf = (l) => legFreeDays(l, trip.value.blackouts || [])
const totalMeetingDays = computed(() =>
  !trip.value ? 0 : trip.value.legs.reduce((n, l) => n + freeOf(l).count, 0))

async function doSearch() {
  searching.value = true; searched.value = true
  results.value = await geocode(q.value)
  searching.value = false
}

function addLeg(r) {
  const prev = trip.value.legs[trip.value.legs.length - 1]
  trip.value.legs.push(blankLeg({
    city: r.city, country: r.country, lat: r.lat, lon: r.lon,
    from: prev ? prev.to : (trip.value.date_start || ''),
    to: '',
  }))
  results.value = []; q.value = ''; searched.value = false
}

function removeLeg(i) {
  const l = trip.value.legs[i]
  if (!confirm(`Remove ${l.city || 'this city'}? Its route and booked meetings stay in the trip but lose their city.`)) return
  trip.value.legs.splice(i, 1)
}

function move(i, d) {
  const j = i + d
  if (j < 0 || j >= trip.value.legs.length) return
  const a = trip.value.legs
  ;[a[i], a[j]] = [a[j], a[i]]
}

function datesFromLegs() {
  const ds = trip.value.legs.map(l => l.from).filter(Boolean).sort()
  const es = trip.value.legs.map(l => l.to).filter(Boolean).sort()
  if (ds.length) trip.value.date_start = ds[0]
  if (es.length) trip.value.date_end = es[es.length - 1]
}

async function save(thenMap) {
  saving.value = true; err.value = ''
  try {
    await Trips.save(trip.value.id, {
      name: trip.value.name,
      date_start: trip.value.date_start || null,
      date_end: trip.value.date_end || null,
      legs: JSON.parse(JSON.stringify(trip.value.legs)),
      blackouts: JSON.parse(JSON.stringify(trip.value.blackouts)),
    })
    if (thenMap) router.push(`/trip-map/${trip.value.id}`)
  } catch (e) {
    err.value = 'Could not save: ' + (e.message || e)
  }
  saving.value = false
}

onMounted(async () => {
  try {
    const t = await Trips.get(route.params.id)
    if (!t) { err.value = 'Trip not found.'; return }
    t.legs = (t.legs || []).map(l => blankLeg(l))
    t.blackouts = t.blackouts || []
    trip.value = t
  } catch (e) { err.value = 'Could not load the trip: ' + (e.message || e) }
})
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

.ts-back { font-size: var(--fs-12); color: var(--text-muted); text-decoration: none; display: block; margin-bottom: 2px; }
.ts-back:hover { color: var(--primary); }
.ts-warn {
  border: 1px solid var(--critical); background: var(--danger-bg); color: var(--danger-text);
  padding: 10px 14px; border-radius: var(--r-2); margin-bottom: var(--s-4); font-size: var(--fs-13);
}
.ts-card {
  border: 1px solid var(--border-main); border-radius: var(--r-3); background: var(--bg-card);
  padding: var(--s-4); margin-bottom: var(--s-4);
}
.ts-h {
  margin: 0 0 var(--s-3); font-size: var(--fs-12); font-weight: 700; text-transform: uppercase;
  letter-spacing: var(--tr-allcaps); color: var(--text-muted); display: flex; align-items: center; gap: var(--s-3);
}
.ts-count { font-family: var(--font-mono); color: var(--primary); }
.ts-sum, .ts-sub { margin-left: auto; font-weight: 400; text-transform: none; letter-spacing: 0; color: var(--text-subtle); font-size: var(--fs-12); }

.ts-row { display: flex; gap: var(--s-3); align-items: flex-end; flex-wrap: wrap; }
.ts-f { display: flex; flex-direction: column; gap: 3px; }
.ts-f.grow { flex: 1; min-width: 200px; }
.ts-f.sm { min-width: 118px; }
.ts-f span {
  font-family: var(--font-mono); font-size: 0.6rem; text-transform: uppercase;
  letter-spacing: 0.06em; color: var(--text-subtle);
}
.ts-f input, .ts-add input, .ts-leg-city, .ts-leg-country, .ts-black-lbl {
  padding: 7px 9px; border: 1px solid var(--border-main); border-radius: var(--r-2);
  background: var(--bg-app); color: var(--text-main); font: inherit; font-size: var(--fs-13);
}
.ts-mini {
  font-size: var(--fs-12); padding: 6px 10px; border: 1px solid var(--border-main);
  border-radius: var(--r-2); background: var(--bg-app); color: var(--text-body); cursor: pointer;
}
.ts-mini:hover { border-color: var(--primary); }

.ts-add { display: flex; gap: var(--s-2); margin-bottom: var(--s-2); }
.ts-add input { flex: 1; }
.ts-results { list-style: none; margin: 0 0 var(--s-3); padding: 0; border: 1px solid var(--border-main); border-radius: var(--r-2); overflow: hidden; }
.ts-results li + li { border-top: 1px solid var(--border-light); }
.ts-results button {
  width: 100%; text-align: left; background: var(--bg-app); border: none; padding: 8px 10px;
  cursor: pointer; font-size: var(--fs-13); color: var(--text-body);
}
.ts-results button:hover { background: var(--bg-sunken); }
.ts-results em { display: block; font-style: normal; font-size: var(--fs-12); color: var(--text-subtle); margin-top: 2px; }
.ts-dismiss { color: var(--text-muted) !important; text-align: center !important; font-size: var(--fs-12) !important; }
.ts-none { color: var(--text-subtle); font-size: var(--fs-13); font-style: italic; padding: var(--s-2) 0; }

.ts-leg { border: 1px solid var(--border-light); border-radius: var(--r-2); padding: var(--s-3); margin-bottom: var(--s-2); background: var(--bg-app); }
.ts-leg-top { display: flex; gap: var(--s-2); align-items: center; flex-wrap: wrap; }
.ts-leg-n { font-family: var(--font-mono); font-size: var(--fs-12); color: var(--text-subtle); width: 16px; flex: none; }
.ts-leg-city { flex: 1; min-width: 130px; font-weight: 600; }
.ts-leg-country { width: 140px; }
.ts-leg-ll { font-family: var(--font-mono); font-size: 0.66rem; color: var(--text-subtle); }
.ts-leg-ll.missing { color: var(--critical); }
.ts-leg-bot { display: flex; gap: var(--s-3); align-items: flex-end; flex-wrap: wrap; margin-top: var(--s-2); padding-top: var(--s-2); border-top: 1px dashed var(--border-light); }
.ts-chk { display: flex; align-items: center; gap: 5px; font-size: var(--fs-12); color: var(--text-body); padding-bottom: 7px; }
.ts-free { margin-left: auto; font-family: var(--font-mono); font-size: var(--fs-12); color: var(--positive); padding-bottom: 7px; }
.ts-free.zero { color: var(--text-subtle); }

.ts-icon {
  background: transparent; border: 1px solid var(--border-main); color: var(--text-muted);
  width: 26px; height: 26px; border-radius: var(--r-1); cursor: pointer; font-size: 0.7rem; flex: none;
}
.ts-icon:disabled { opacity: 0.35; cursor: default; }
.ts-icon:hover:not(:disabled) { border-color: var(--primary); color: var(--text-main); }
.ts-icon.danger:hover { border-color: var(--critical); color: var(--critical); }

.ts-black { display: flex; gap: var(--s-3); align-items: flex-end; margin-bottom: var(--s-2); flex-wrap: wrap; }
.ts-black-lbl { flex: 1; min-width: 160px; }

@media (max-width: 700px) {
  .container { padding: 1.25rem 1rem; }
  .header-actions { display: flex; gap: 0.5rem; width: 100%; }
  .header-actions button { flex: 1; }
  /* iOS zooms the whole page on focus whenever an input sits under 16px */
  .ts-f input, .ts-add input, .ts-leg-city, .ts-leg-country, .ts-black-lbl { font-size: 16px; }
  .ts-add { flex-wrap: wrap; }
  .ts-add input { min-width: 100%; }
  .ts-add button { width: 100%; }
  .ts-leg-city, .ts-leg-country { min-width: 100%; width: auto; }
  .ts-f.sm { flex: 1 1 130px; min-width: 130px; }
  .ts-icon { width: 34px; height: 34px; }
  .ts-mini { min-height: 36px; }
  .ts-chk { padding-bottom: 0; min-height: 34px; }
  .ts-free { margin-left: 0; flex-basis: 100%; padding-bottom: 0; }
  .ts-results button { padding: 11px 10px; }
}

</style>

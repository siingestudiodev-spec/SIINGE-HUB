<template>
  <div class="sop-container">
    <div class="sop-header">
      <div>
        <h1 class="sop-h1">Daily SOP</h1>
        <p class="sop-sub">Product Operations Manager · {{ me || '—' }}</p>
      </div>
      <div class="sop-controls">
        <span class="tabs">
          <button @click="tab = 'daily'" :class="{ on: tab === 'daily' }">Daily</button>
          <button @click="tab = 'weekly'" :class="{ on: tab === 'weekly' }">Weekly</button>
        </span>
        <input type="date" v-model="day" class="filter-input" :max="today()" />
        <button v-if="day !== today()" @click="day = today()" class="btn-range">Today</button>
      </div>
    </div>

    <p v-if="note" class="sop-note">{{ note }}</p>
    <div v-if="loading" class="sop-empty">Loading…</div>

    <template v-else>
      <div class="summary">
        <div class="bar"><div class="bar-fill" :style="{ width: prog.pct + '%' }"></div></div>
        <div class="summary-row">
          <span class="summary-pct">{{ prog.pct }}%</span>
          <span class="summary-frac">{{ prog.done }} of {{ prog.total }} done</span>
          <span class="summary-when">{{ tab === 'weekly' ? `week of ${week}` : day }}</span>
        </div>
      </div>

      <p class="legend">
        <span class="tag auto">auto</span> the hub can prove it ·
        <span class="tag">manual</span> nothing here can see it ·
        the rest show what the data says and wait for you
      </p>

      <div v-for="s in sections" :key="s.id" class="block">
        <div class="block-head">
          <span class="block-title">{{ s.title }}</span>
          <span class="block-frac" :class="{ full: s.done === s.total }">{{ s.done }}/{{ s.total }}</span>
        </div>
        <p class="block-obj">{{ s.objective }}</p>
        <p v-if="s.rule" class="block-rule">{{ s.rule }}</p>

        <label v-for="i in s.items" :key="i.id" class="item" :class="{ done: i.done }">
          <input
            type="checkbox"
            :checked="i.done"
            :disabled="i.by === 'data'"
            @change="toggle(i.id, $event.target.checked)"
          />
          <span class="item-label">{{ i.label }}</span>
          <span v-if="i.evidence" class="item-ev" :class="{ good: i.by === 'data' }">{{ i.evidence }}</span>
          <span v-if="i.manual" class="tag">manual</span>
          <span v-else-if="i.by === 'data'" class="tag auto">auto</span>
        </label>
      </div>

      <div class="block">
        <div class="block-head"><span class="block-title">Alibaba Good Fit Checklist</span></div>
        <p class="block-obj">Verify before adding an Alibaba supplier to the approved database. Record findings in the manufacturer profile.</p>
        <ul class="ali">
          <li v-for="c in ALIBABA_CHECKLIST" :key="c">{{ c }}</li>
        </ul>
      </div>

      <p class="foot">
        Waiting on a reply or building today's report?
        <router-link to="/activity">Activity</router-link>.
      </p>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { supabase } from '../lib/supabase'
import { loadActivity, loadSopSheets, saveSopSheet } from '../lib/activityData'
import { ymd } from '../lib/dailyReport'
import { DAILY, WEEKLY, ALIBABA_CHECKLIST, signals, status, progress, weekOf } from '../lib/sop'

const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' })

const me = ref('')
const day = ref(today())
const tab = ref('daily')
const loading = ref(true)
const note = ref('')
const data = ref({ inbound: [], outbound: [], audits: [], pending: [], followupsDue: 0, silent: 0 })
const checkedDaily = ref({})
const checkedWeekly = ref({})

const week = computed(() => weekOf(day.value))

// The weekly sheet counts the whole week; the daily one counts its day.
const span = computed(() => (tab.value === 'weekly'
  ? { from: week.value, to: day.value }
  : { from: day.value, to: day.value }))

async function load() {
  loading.value = true
  data.value = await loadActivity(span.value)
  const sheets = await loadSopSheets(day.value, week.value)
  checkedDaily.value = sheets.daily?.checked || {}
  checkedWeekly.value = sheets.weekly?.checked || {}
  loading.value = false
}

const inSpan = iso => {
  const d = ymd(iso)
  return d >= span.value.from && d <= span.value.to
}

const sig = computed(() => signals({
  inbound: data.value.inbound.filter(r => inSpan(r.received_at)),
  audits: data.value.audits,
  sends: data.value.outbound.filter(r => inSpan(r.sent_at)),
  pending: data.value.pending,
  followupsDue: data.value.followupsDue,
  silent: data.value.silent,
  reportSent: Boolean(checkedDaily.value['report-sierra']),
}))

const sections = computed(() => (tab.value === 'weekly'
  ? status(WEEKLY, sig.value, checkedWeekly.value)
  : status(DAILY, sig.value, checkedDaily.value)))

const prog = computed(() => progress(sections.value))

async function toggle(id, on) {
  const weekly = tab.value === 'weekly'
  const box = weekly ? checkedWeekly : checkedDaily
  const next = { ...box.value }
  if (on) next[id] = true
  else delete next[id]
  box.value = next

  const error = await saveSopSheet({
    userEmail: me.value,
    day: weekly ? week.value : day.value,
    kind: weekly ? 'weekly' : 'daily',
    checked: next,
  })
  note.value = error ? `Could not save: ${error.message}` : ''
}

watch([day, tab], load)

onMounted(async () => {
  const { data: { user } } = await supabase.auth.getUser()
  me.value = user?.email || ''
  await load()
})
</script>

<style scoped>
.sop-container { padding: 2rem; max-width: 820px; margin: 0 auto; }
.sop-header { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem; margin-bottom: 1.5rem; }
.sop-h1 { font-size: 1.4rem; font-weight: 700; color: var(--text-main); margin: 0; }
.sop-sub { font-size: 0.8rem; color: var(--text-muted); margin: 0.15rem 0 0; }
.sop-controls { display: flex; gap: 0.4rem; align-items: center; flex-wrap: wrap; }
.filter-input { padding: 0.35rem 0.6rem; border: 1px solid var(--border-main); border-radius: 6px; font-size: 0.82rem; background: var(--bg-app); color: var(--text-main); }
.btn-range { padding: 0.35rem 0.7rem; border: 1px solid var(--border-main); border-radius: 6px; background: transparent; color: var(--text-muted); font-size: 0.78rem; cursor: pointer; }
.tabs { display: inline-flex; gap: 0.25rem; }
.tabs button { font-size: 0.78rem; padding: 0.35rem 0.8rem; border: 1px solid var(--border-main); border-radius: 6px; background: transparent; color: var(--text-muted); cursor: pointer; }
.tabs button.on { background: var(--text-main); color: var(--bg-app); border-color: var(--text-main); }
.sop-note { font-size: 0.8rem; color: #991b1b; margin: 0 0 1rem; }
.sop-empty { color: var(--text-muted); padding: 3rem; text-align: center; }

.summary { margin-bottom: 1rem; }
.bar { height: 6px; background: var(--border-light); border-radius: 3px; overflow: hidden; }
.bar-fill { height: 100%; background: #16a34a; transition: width 0.25s; }
.summary-row { display: flex; align-items: baseline; gap: 0.6rem; margin-top: 0.4rem; }
.summary-pct { font-size: 1.05rem; font-weight: 700; color: var(--text-main); }
.summary-frac { font-size: 0.8rem; color: var(--text-muted); }
.summary-when { margin-left: auto; font-size: 0.75rem; color: var(--text-muted); }
.legend { font-size: 0.72rem; color: var(--text-muted); border-bottom: 1px solid var(--border-main); padding-bottom: 0.9rem; margin: 0 0 1.5rem; }

.block { margin-bottom: 1.6rem; }
.block-head { display: flex; align-items: baseline; gap: 0.5rem; }
.block-title { font-size: 0.92rem; font-weight: 600; color: var(--text-main); }
.block-frac { font-size: 0.72rem; color: var(--text-muted); }
.block-frac.full { color: #16a34a; font-weight: 700; }
.block-obj { font-size: 0.76rem; color: var(--text-muted); margin: 0.15rem 0 0.5rem; }
.block-rule { font-size: 0.73rem; color: #92400e; background: #fef3c7; border-radius: 4px; padding: 5px 9px; margin: 0.4rem 0 0.6rem; }
.item { display: flex; align-items: center; gap: 0.5rem; padding: 0.28rem 0; font-size: 0.85rem; color: var(--text-main); cursor: pointer; }
.item.done .item-label { color: var(--text-muted); text-decoration: line-through; }
.item input:disabled { cursor: default; }
.item-label { flex: 1; }
.item-ev { font-size: 0.72rem; color: var(--text-muted); white-space: nowrap; }
.item-ev.good { color: #16a34a; }
.tag { font-size: 0.62rem; text-transform: uppercase; letter-spacing: 0.04em; border: 1px solid var(--border-main); color: var(--text-muted); border-radius: 3px; padding: 0 4px; }
.tag.auto { border-color: #16a34a; color: #16a34a; }
.ali { margin: 0.3rem 0 0; padding-left: 1.1rem; }
.ali li { font-size: 0.83rem; color: var(--text-main); padding: 0.12rem 0; }
.foot { font-size: 0.8rem; color: var(--text-muted); border-top: 1px solid var(--border-main); padding-top: 1rem; margin-top: 2rem; }
</style>

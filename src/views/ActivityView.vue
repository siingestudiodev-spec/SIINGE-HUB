<template>
  <div class="rep-container">
    <!-- ── The shelf ─────────────────────────────────────────── -->
    <template v-if="mode === 'list'">
      <div class="rep-header">
        <div>
          <h1 class="rep-h1">Reports</h1>
          <p class="rep-sub">What you chose to report, kept as you sent it</p>
        </div>
        <button @click="compose()" class="btn-primary">New report</button>
      </div>

      <p v-if="note" class="rep-note">{{ note }}</p>
      <div v-if="loading" class="rep-empty">Loading…</div>

      <div v-else-if="!reports.length" class="rep-empty">
        <p>No reports yet.</p>
        <p class="dim">Pick a day, choose what belongs in it, and it lands here.</p>
      </div>

      <div v-else>
        <article v-for="r in reports" :key="r.id" class="card">
          <div class="card-top">
            <div>
              <h2 class="card-title">{{ r.title || span(r) }}</h2>
              <p class="card-meta">
                {{ span(r) }} · saved {{ when(r.created_at) }}
                <span v-if="r.user_email !== me"> · {{ r.user_email }}</span>
              </p>
            </div>
            <div class="card-actions">
              <button @click="copy(r)" class="btn-quiet">{{ copiedId === r.id ? 'Copied' : 'Copy' }}</button>
              <button @click="open = open === r.id ? null : r.id" class="btn-quiet">
                {{ open === r.id ? 'Hide' : 'Read' }}
              </button>
              <button v-if="r.user_email === me" @click="remove(r)" class="btn-quiet danger">Delete</button>
            </div>
          </div>
          <pre v-if="open === r.id" class="report">{{ r.body }}</pre>
          <p v-else class="card-peek">{{ peek(r.body) }}</p>
        </article>
      </div>
    </template>

    <!-- ── Making one ────────────────────────────────────────── -->
    <template v-else>
      <div class="rep-header">
        <div>
          <h1 class="rep-h1">New report</h1>
          <p class="rep-sub">Everything from the range is in. Untick what should not go out.</p>
        </div>
        <div class="rep-actions">
          <button @click="mode = 'list'" class="btn-quiet">Cancel</button>
          <button @click="save" class="btn-primary" :disabled="saving">
            {{ saving ? 'Saving…' : 'Save report' }}
          </button>
        </div>
      </div>

      <div class="rep-filters">
        <select v-model="kind" class="filter-input">
          <option value="daily">Daily activity</option>
          <option value="outreach">Outreach — who we contacted and when</option>
        </select>
        <template v-if="kind === 'daily'">
          <button @click="setRange(0)" class="btn-range" :class="{ on: preset === 0 }">Today</button>
          <button @click="setRange(1)" class="btn-range" :class="{ on: preset === 1 }">Yesterday</button>
          <button @click="setRange(6)" class="btn-range" :class="{ on: preset === 6 }">7 days</button>
          <input type="date" v-model="from" class="filter-input" :max="to" />
          <input type="date" v-model="to" class="filter-input" :min="from" />
          <select v-model="source" class="filter-input">
            <option value="all">Hub logs + mailbox</option>
            <option value="hub">Hub logs only</option>
          </select>
        </template>
        <select v-model="folder" class="filter-input">
          <option value="">All folders</option>
          <option v-for="f in folders" :key="f.id" :value="f.id">{{ f.name }}</option>
        </select>
        <input v-model="title" class="filter-input title" placeholder="Title (optional)" />
      </div>
      <p v-if="kind === 'outreach'" class="loghint">
        Every company on record, no date range. Initial reach and follow-ups only —
        no subjects, no delivery detail.
      </p>

      <p v-if="note" class="rep-note">{{ note }}</p>
      <div v-if="loading" class="rep-empty">Loading…</div>

      <template v-else>
        <p v-if="!candidates.length" class="rep-empty sm">Nothing happened in this range.</p>
        <div v-else class="picks">
          <label v-for="c in candidates" :key="c.key" class="pick" :class="{ off: excluded.has(c.key) }">
            <input type="checkbox" :checked="!excluded.has(c.key)" @change="togglePick(c.key)" />
            <span class="pick-kind" :class="'k-' + c.kind.replace(' ', '-')">{{ c.kind }}</span>
            <span class="pick-name">{{ c.name }}</span>
          </label>
        </div>

        <!-- A call or a WhatsApp is not in any inbox. Logged here it joins the company's
             history, so next month's report still knows it happened. -->
        <div class="logbox">
          <button @click="showLog = !showLog" class="btn-quiet">
            {{ showLog ? 'Close' : '+ Log a call, WhatsApp or outside email' }}
          </button>
          <div v-if="showLog" class="logform">
            <select v-model="logTarget" class="filter-input">
              <option value="">Which company…</option>
              <optgroup label="Manufacturers">
                <option v-for="m in manufacturers" :key="m.id" :value="`manufacturer:${m.id}`">{{ m.company_name }}</option>
              </optgroup>
              <optgroup label="Sourcing">
                <option v-for="s in sourcing" :key="s.id" :value="`sourcing:${s.id}`">{{ s.provider }}</option>
              </optgroup>
            </select>
            <input type="date" v-model="logDate" class="filter-input" :max="to" />
            <input v-model="logNote" class="filter-input grow"
                   placeholder="What happened — e.g. Called Allan, holds the SS27 slot until Nov 15"
                   @keyup.enter="addLog" />
            <button @click="addLog" class="btn-primary" :disabled="!logTarget || !logNote.trim() || logging">
              {{ logging ? 'Saving…' : 'Log it' }}
            </button>
          </div>
          <p v-if="showLog" class="loghint">
            Logged contacts are marked in the report as typed by hand, never as tracked email.
          </p>
        </div>

        <div class="edit-head">
          <span>Write over anything. The draft stops updating once you do.</span>
          <button v-if="dirty" @click="regenerate" class="btn-quiet">Back to the draft</button>
        </div>
        <textarea v-model="body" class="report editable" rows="22" spellcheck="false"></textarea>
      </template>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { supabase } from '../lib/supabase'
import { buildReport, buildOutreachReport, isOutreach, timelines, ymd } from '../lib/dailyReport'
import { loadActivity } from '../lib/activityData'

const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' })
const daysAgo = n => {
  const d = new Date(today() + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() - n)
  return d.toISOString().slice(0, 10)
}

const me = ref('')
const mode = ref('list')
const loading = ref(true)
const saving = ref(false)
const note = ref('')
const reports = ref([])
const open = ref(null)
const copiedId = ref(null)

const from = ref(today())
const to = ref(today())
const preset = ref(0)
const title = ref('')
const excluded = ref(new Set())
const data = ref({ outbound: [], inbound: [], audits: [] })

async function loadReports() {
  loading.value = true
  const { data: rows, error } = await supabase.from('reports').select('*')
    .order('created_at', { ascending: false }).limit(200)
  if (error) note.value = `Could not load reports: ${error.message}`
  reports.value = rows || []
  loading.value = false
}

function setRange(n) {
  preset.value = n
  from.value = daysAgo(n)
  to.value = n === 1 ? daysAgo(1) : today()
}

async function compose() {
  mode.value = 'compose'
  note.value = ''
  title.value = ''
  excluded.value = new Set()
  body.value = ''
  generated.value = ''
  kind.value = 'daily'
  folder.value = ''
  setRange(0)
  await Promise.all([loadRange(), loadCompanies()])
}

async function loadRange() {
  loading.value = true
  data.value = await loadActivity({ from: from.value, to: to.value })
  loading.value = false
}

const inRange = iso => {
  const d = ymd(iso)
  return d >= from.value && d <= to.value
}

// "Hub logs only" drops everything the mailbox contributed: the Sent folder's rows and
// every incoming message. What is left is what the hub itself recorded, which is the
// version to send when the mailbox sync is behind or noisy.
const source = ref('all')

// Folders live on manufacturers, so picking one also drops every sourcing provider —
// a report about Porto has no business carrying a fabric mill from the trade show.
const folders = ref([])
const folderOf = ref(new Map())
const folder = ref('')
const inFolder = row => !folder.value ||
  (row.kind === 'manufacturer' && folderOf.value.get(row.entity_id) === folder.value)

const sends = computed(() => {
  const rows = source.value === 'hub'
    ? data.value.outbound.filter(r => r.source !== 'mailbox')
    : data.value.outbound
  return rows.filter(inFolder)
})

const replies = computed(() => source.value === 'hub'
  ? []
  : data.value.inbound.filter(r =>
      inFolder({ kind: r.matched_kind, entity_id: r.matched_entity_id })))

const kind = ref('daily')

// The roster ignores the range entirely, so its chips are every company with outreach
// on record, not just the ones touched this week.
const outreachGroups = computed(() =>
  timelines(sends.value.filter(isOutreach), new Date().toISOString())
    .sort((a, b) => a.name.localeCompare(b.name)))

// One chip per thing the report would talk about.
const candidates = computed(() => {
  const now = new Date().toISOString()
  if (kind.value === 'outreach') {
    return outreachGroups.value.map(t => ({
      key: `${t.kind}:${t.entityId}`, kind: 'outreach', name: t.name,
    }))
  }
  const companies = timelines(sends.value, now)
    .filter(t => t.sends.some(r => inRange(r.sent_at)))
    .map(t => ({
      key: `${t.kind}:${t.entityId}`,
      kind: inRange(t.sends[0].sent_at) ? 'first contact' : 'follow-up',
      name: t.name,
    }))
  const inboundChips = replies.value.filter(r => inRange(r.received_at))
    .map(r => ({ key: `reply:${r.id}`, kind: 'reply', name: r.entity_name || r.from_email }))
  const changes = data.value.audits.length && !folder.value
    ? [{ key: 'hub-changes', kind: 'hub changes', name: `${data.value.audits.length} records` }]
    : []
  return [...companies, ...inboundChips, ...changes]
})

const kept = computed(() => sends.value.filter(r => !excluded.value.has(`${r.kind}:${r.entity_id}`)))

const scope = computed(() => folders.value.find(f => f.id === folder.value)?.name || null)

const preview = computed(() => kind.value === 'outreach'
  ? buildOutreachReport({ user: me.value, emails: kept.value, scope: scope.value })
  : buildReport({
      from: from.value,
      to: to.value,
      user: me.value,
      scope: scope.value,
      emails: kept.value,
      inbound: replies.value.filter(r => !excluded.value.has(`reply:${r.id}`)),
      // Record changes are not folder-scoped, so a folder report leaves them out
      // rather than pretending they belong to it.
      audits: folder.value || excluded.value.has('hub-changes') ? [] : data.value.audits,
    }))

function togglePick(key) {
  const next = new Set(excluded.value)
  next.has(key) ? next.delete(key) : next.add(key)
  excluded.value = next
}

// The text is the thing being saved, so once you touch it the generator stops writing
// over your words. Changing a chip after that would silently undo an edit.
// `generated` holds the last machine draft so "Back to the draft" has something to
// return to; `body` is what gets saved. Comparing against the live preview instead
// would treat every date change as your edit and stop refreshing the draft.
const body = ref('')
const generated = ref('')
const dirty = computed(() => body.value !== generated.value)
watch(preview, text => {
  const wasClean = !dirty.value
  generated.value = text
  if (wasClean) body.value = text
}, { immediate: true })
const regenerate = () => { body.value = generated.value }

const manufacturers = ref([])
const sourcing = ref([])
const showLog = ref(false)
const logTarget = ref('')
const logDate = ref(today())
const logNote = ref('')
const logging = ref(false)

async function loadCompanies() {
  const [m, s, f] = await Promise.all([
    supabase.from('manufacturers').select('id,company_name,folder_id').order('company_name'),
    supabase.from('sourcing').select('id,provider').order('provider'),
    supabase.from('folders').select('id,name').eq('section', 'manufacturers').order('name'),
  ])
  manufacturers.value = m.data || []
  sourcing.value = s.data || []
  folders.value = f.data || []
  folderOf.value = new Map((m.data || []).map(x => [x.id, x.folder_id]))
}

// Written into the same table the hub's own emails use, with no subject — which is
// exactly what marks it as hand-logged everywhere it is read.
async function addLog() {
  const [kind, id] = logTarget.value.split(':')
  if (!kind || !id || !logNote.value.trim()) return
  logging.value = true
  const table = kind === 'manufacturer' ? 'manufacturer_email_logs' : 'sourcing_email_logs'
  const fk = kind === 'manufacturer' ? 'manufacturer_id' : 'sourcing_id'
  const { error } = await supabase.from(table).insert([{
    [fk]: id,
    template_name: logNote.value.trim(),
    // Noon, so the row lands on the chosen day in Bogotá whichever way it is read back.
    sent_at: new Date(`${logDate.value}T12:00:00-05:00`).toISOString(),
  }])
  logging.value = false
  if (error) { note.value = `Could not log it: ${error.message}`; return }
  logNote.value = ''
  await loadRange()
}

// The text is stored, not recomputed. A report is a record of what you sent, and it
// must not quietly rewrite itself when tomorrow's sync changes the underlying rows.
async function save() {
  saving.value = true
  // A roster has no range of its own, so it records the one it actually covers:
  // the oldest outreach on it through today.
  const dates = kept.value.filter(isOutreach).map(r => ymd(r.sent_at)).sort()
  const span = kind.value === 'outreach'
    ? { from_day: dates[0] || today(), to_day: today() }
    : { from_day: from.value, to_day: to.value }

  const { error } = await supabase.from('reports').insert([{
    user_email: me.value,
    title: title.value.trim() || null,
    ...span,
    body: body.value,
    included: candidates.value.filter(c => !excluded.value.has(c.key)).map(c => c.key),
  }])
  saving.value = false
  if (error) { note.value = `Could not save: ${error.message}`; return }
  mode.value = 'list'
  await loadReports()
}

async function remove(r) {
  if (!confirm(`Delete this report? ${span(r)}`)) return
  const { error } = await supabase.from('reports').delete().eq('id', r.id)
  if (error) { note.value = `Could not delete: ${error.message}`; return }
  await loadReports()
}

async function copy(r) {
  await navigator.clipboard.writeText(r.body)
  copiedId.value = r.id
  setTimeout(() => (copiedId.value = null), 1500)
}

const span = r => (r.from_day === r.to_day ? r.from_day : `${r.from_day} → ${r.to_day}`)
const peek = b => (b || '').split('\n').filter(l => l.trim()).slice(2, 4).join(' · ').slice(0, 130)
const when = iso => new Date(iso).toLocaleString('en-US', {
  month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
})

watch([from, to], () => { if (mode.value === 'compose') loadRange() })

onMounted(async () => {
  const { data: { user } } = await supabase.auth.getUser()
  me.value = user?.email || ''
  await loadReports()
})
</script>

<style scoped>
.rep-container { padding: 2rem; max-width: 900px; margin: 0 auto; }
.rep-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; flex-wrap: wrap; margin-bottom: 1.5rem; }
.rep-h1 { font-size: 1.4rem; font-weight: 700; color: var(--text-main); margin: 0; }
.rep-sub { font-size: 0.8rem; color: var(--text-muted); margin: 0.15rem 0 0; }
.rep-actions { display: flex; gap: 0.4rem; align-items: center; }
.rep-filters { display: flex; gap: 0.4rem; flex-wrap: wrap; align-items: center; margin-bottom: 1.2rem; }
.filter-input { padding: 0.35rem 0.6rem; border: 1px solid var(--border-main); border-radius: 6px; font-size: 0.82rem; background: var(--bg-app); color: var(--text-main); }
.filter-input.title { min-width: 200px; flex: 1; }
.btn-range { padding: 0.35rem 0.7rem; border: 1px solid var(--border-main); border-radius: 6px; background: transparent; color: var(--text-muted); font-size: 0.78rem; cursor: pointer; }
.btn-range.on { background: var(--text-main); color: var(--bg-app); border-color: var(--text-main); }
.btn-primary { padding: 0.4rem 1rem; border: 1px solid var(--text-main); border-radius: 6px; background: var(--text-main); color: var(--bg-app); font-size: 0.83rem; font-weight: 600; cursor: pointer; }
.btn-primary:disabled { opacity: 0.6; cursor: default; }
.btn-quiet { padding: 0.3rem 0.7rem; border: 1px solid var(--border-main); border-radius: 6px; background: transparent; color: var(--text-muted); font-size: 0.76rem; cursor: pointer; }
.btn-quiet.danger:hover { color: #991b1b; border-color: #991b1b; }
.rep-note { font-size: 0.8rem; color: #991b1b; margin: 0 0 1rem; }
.rep-empty { color: var(--text-muted); padding: 3.5rem 1rem; text-align: center; }
.rep-empty.sm { padding: 1.5rem; }
.rep-empty p { margin: 0.2rem 0; }
.rep-empty .dim { font-size: 0.82rem; opacity: 0.8; }

.card { border: 1px solid var(--border-main); border-radius: 8px; padding: 0.9rem 1.1rem; margin-bottom: 0.7rem; }
.card-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; }
.card-title { font-size: 0.95rem; font-weight: 600; color: var(--text-main); margin: 0; }
.card-meta { font-size: 0.73rem; color: var(--text-muted); margin: 0.15rem 0 0; }
.card-actions { display: flex; gap: 0.3rem; flex-shrink: 0; }
.card-peek { font-size: 0.78rem; color: var(--text-muted); margin: 0.6rem 0 0; }

.picks { display: flex; flex-wrap: wrap; gap: 0.35rem; margin-bottom: 1.2rem; }
.pick { display: inline-flex; align-items: center; gap: 0.4rem; border: 1px solid var(--border-main); border-radius: 20px; padding: 3px 11px 3px 7px; font-size: 0.78rem; cursor: pointer; color: var(--text-main); }
.pick.off { opacity: 0.45; }
.pick-kind { font-size: 0.6rem; text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-muted); }
.k-reply { color: #2563eb; }
.k-first-contact { color: #16a34a; }
.pick-name { font-weight: 500; }
.logbox { border: 1px dashed var(--border-main); border-radius: 8px; padding: 0.7rem 0.9rem; margin-bottom: 1rem; }
.logform { display: flex; gap: 0.4rem; flex-wrap: wrap; margin-top: 0.6rem; }
.logform .grow { flex: 1; min-width: 240px; }
.loghint { font-size: 0.72rem; color: var(--text-muted); margin: 0.5rem 0 0; }
.edit-head { display: flex; align-items: center; gap: 0.6rem; font-size: 0.73rem; color: var(--text-muted); margin-bottom: 0.3rem; }
.edit-head button { margin-left: auto; }
.editable { width: 100%; resize: vertical; box-sizing: border-box; }
.report { font-size: 0.8rem; line-height: 1.55; white-space: pre-wrap; background: var(--bg-app); border: 1px solid var(--border-main); border-radius: 8px; padding: 1.1rem 1.3rem; margin: 0.7rem 0 0; color: var(--text-main); font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
</style>

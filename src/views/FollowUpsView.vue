<template>
  <div class="followups-view">

    <!-- PAGE HEADER -->
    <div class="page-header">
      <div>
        <h2 class="page-title">Follow-ups</h2>
        <p class="page-sub" v-if="!loading">
          {{ dueList.length }} due now &middot; {{ upcomingList.length }} upcoming
        </p>
      </div>
      <button @click="fetchData" class="btn btn-ghost btn-sm">↻ Refresh</button>
    </div>

    <!-- LOADING -->
    <div v-if="loading" class="empty-state">
      <p class="loading-text">Loading follow-ups...</p>
    </div>

    <template v-else>

      <!-- DUE NOW SECTION -->
      <section class="list-section" v-if="dueList.length">
        <div class="section-header">
          <h3 class="section-title">Due Now</h3>
          <span class="count-badge red">{{ dueList.length }}</span>
        </div>

        <div class="table-wrapper">
          <table class="followup-table">
            <thead>
              <tr>
                <th>Company</th>
                <th>Contact</th>
                <th>Overdue</th>
                <th>Notes</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="m in dueList" :key="m.id" class="followup-row">
                <td class="col-company">
                  <div class="company-name">{{ m.company_name }}</div>
                  <div class="company-email" v-if="m.email">{{ m.email }}</div>
                </td>
                <td>{{ m.contact_name || '—' }}</td>
                <td>
                  <span :class="['overdue-badge', m.daysOverdue === 0 ? 'today' : 'past']">
                    {{ m.overdueLabel }}
                  </span>
                </td>
                <td class="col-notes">
                  <span v-if="m.followup_type === 'call'" class="type-badge call"><Phone :size="11" :stroke-width="2" /> Call</span>
                  <span v-else class="type-badge email">✉ Email</span>
                  <span class="notes-text">{{ m.followup_notes || '—' }}</span>
                </td>
                <td class="col-actions">
                  <template v-if="m.followup_type === 'call'">
                    <button @click="markDone(m)" class="btn btn-call btn-sm">
                      <Phone :size="12" :stroke-width="2" /> Mark as Called
                    </button>
                  </template>
                  <template v-else>
                    <button @click="openCompose(m)" class="btn btn-primary btn-sm">
                      ✉ Compose &amp; Send
                    </button>
                    <button @click="markDone(m)" class="btn btn-ghost btn-sm">
                      ✓ Mark as Done
                    </button>
                  </template>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- UPCOMING SECTION -->
      <section class="list-section" v-if="upcomingList.length">
        <div class="section-header">
          <h3 class="section-title">Upcoming</h3>
          <span class="count-badge gray">{{ upcomingList.length }}</span>
        </div>

        <div class="table-wrapper">
          <table class="followup-table">
            <thead>
              <tr>
                <th>Company</th>
                <th>Contact</th>
                <th>Due In</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="m in upcomingList" :key="m.id" class="followup-row upcoming-row">
                <td class="col-company">
                  <div class="company-name">{{ m.company_name }}</div>
                </td>
                <td>{{ m.contact_name || '—' }}</td>
                <td>
                  <span class="overdue-badge upcoming">{{ m.daysUntilLabel }}</span>
                </td>
                <td class="col-notes">{{ m.followup_notes || '—' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- EMPTY STATE -->
      <div v-if="!dueList.length && !upcomingList.length" class="empty-state">
        <div class="empty-icon"><CheckCircle :size="32" :stroke-width="1.5" /></div>
        <h3>All caught up!</h3>
        <p>No manufacturer follow-ups pending.</p>
      </div>

    </template>

    <!-- ─── COMPOSE MODAL ──────────────────────────────────────── -->
    <div v-if="compose.show" class="modal-overlay" @click.self="compose.show = false">
      <div class="modal-box">
        <div class="modal-header">
          <h3>Compose Follow-up</h3>
          <button @click="compose.show = false" class="btn-close">✕</button>
        </div>

        <div class="modal-body">
          <div v-if="compose.error" class="error-banner">{{ compose.error }}</div>

          <div class="field">
            <label>To</label>
            <input
              class="input input-disabled"
              :value="compose.manu?.contact_name
                ? `${compose.manu.contact_name} <${compose.manu.email}>`
                : compose.manu?.email"
              disabled
            />
          </div>

          <div class="field" v-if="templates.length">
            <label>Template (optional)</label>
            <select class="input" @change="applyTemplate($event.target.value)">
              <option value="">— Select a template —</option>
              <option v-for="t in templates" :key="t.id" :value="t.id">{{ t.name }}</option>
            </select>
          </div>

          <div class="field">
            <label>Subject</label>
            <input
              v-model="compose.subject"
              class="input"
              placeholder="Subject"
              required
            />
          </div>

          <div class="field">
            <label>Message</label>
            <textarea
              v-model="compose.body"
              class="textarea"
              rows="10"
              placeholder="Write your follow-up message..."
            ></textarea>
          </div>
        </div>

        <div class="modal-footer">
          <button @click="compose.show = false" class="btn btn-ghost">Cancel</button>
          <button
            @click="sendEmail"
            :disabled="compose.sending || !compose.subject || !compose.body"
            class="btn btn-primary"
          >
            {{ compose.sending ? 'Sending...' : 'Send' }}
          </button>
        </div>
      </div>
    </div>

    <!-- ─── NEXT FOLLOW-UP MODAL ───────────────────────────────── -->
    <div v-if="nextFu.show" class="modal-overlay" @click.self="skipNextFollowup">
      <div class="modal-box modal-box-sm">
        <div class="modal-header">
          <h3>Schedule Next Follow-up?</h3>
          <button @click="skipNextFollowup" class="btn-close">✕</button>
        </div>

        <div class="modal-body">
          <p class="modal-hint">
            Set a reminder date for
            <strong>{{ nextFu.manu?.company_name }}</strong>.
            You can skip this and set it later from Manufacturers.
          </p>
          <div class="field">
            <label>Date</label>
            <input
              type="date"
              v-model="nextFu.date"
              class="input"
              :min="tomorrowDate"
            />
          </div>
        </div>

        <div class="modal-footer">
          <button @click="skipNextFollowup" class="btn btn-ghost">Skip</button>
          <button
            @click="scheduleNextFollowup"
            :disabled="!nextFu.date"
            class="btn btn-primary"
          >
            Set Date
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { supabase } from '../lib/supabase'
import { Phone, CheckCircle } from 'lucide-vue-next'

const SUPABASE_URL     = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

// ─── State ────────────────────────────────────────────────────────
const manufacturers = ref([])
const templates     = ref([])
const loading       = ref(true)

const compose = ref({
  show: false, manu: null, subject: '', body: '', sending: false, error: ''
})

const nextFu = ref({ show: false, manu: null, date: '' })

// ─── Computed ─────────────────────────────────────────────────────
const tomorrowDate = computed(() => {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toISOString().split('T')[0]
})

const dueList = computed(() =>
  manufacturers.value
    .filter(m => m._isDue)
    .sort((a, b) => new Date(a.followup_due_at) - new Date(b.followup_due_at))
)

const upcomingList = computed(() =>
  manufacturers.value
    .filter(m => !m._isDue)
    .sort((a, b) => new Date(a.followup_due_at) - new Date(b.followup_due_at))
)

// ─── Data fetching ────────────────────────────────────────────────
async function fetchData() {
  loading.value = true
  const [{ data: manus }, { data: tmpls }] = await Promise.all([
    supabase
      .from('manufacturers')
      .select('id, company_name, contact_name, email, followup_due_at, followup_notes, followup_type')
      .not('followup_due_at', 'is', null)
      .is('followup_sent_at', null)
      .is('followup_manually_completed_at', null)
      .order('followup_due_at', { ascending: true }),
    supabase.from('templates').select('id, name, subject, body').order('name'),
  ])
  if (manus) {
    const now = new Date()
    manufacturers.value = manus.map(m => enrichManu(m, now))
  }
  templates.value = tmpls || []
  loading.value = false
}

function applyTemplate(templateId) {
  const t = templates.value.find(t => t.id === templateId)
  if (!t) return
  compose.value.subject = t.subject?.replace(/{{company_name}}/g, compose.value.manu?.company_name || '') || compose.value.subject
  compose.value.body    = t.body?.replace(/{{company_name}}/g, compose.value.manu?.company_name || '') || compose.value.body
}

function enrichManu(m, now = new Date()) {
  const todayMidnight = new Date(now)
  todayMidnight.setHours(0, 0, 0, 0)

  const due = new Date(m.followup_due_at)
  due.setHours(0, 0, 0, 0)

  const diffDays = Math.round((todayMidnight - due) / 86400000)
  const isDue    = new Date(m.followup_due_at) <= now

  return {
    ...m,
    _isDue: isDue,
    daysOverdue: diffDays,
    overdueLabel: diffDays === 0 ? 'Today' : `${diffDays}d overdue`,
    daysUntilLabel: diffDays === 0 ? 'Today' : `In ${Math.abs(diffDays)}d`,
  }
}

// ─── Actions ──────────────────────────────────────────────────────
function removeFromList(id) {
  manufacturers.value = manufacturers.value.filter(m => m.id !== id)
}

function openCompose(manu) {
  compose.value = {
    show: true,
    manu,
    subject: `Follow-up: ${manu.company_name}`,
    body: '',
    sending: false,
    error: '',
  }
}

async function sendEmail() {
  const { manu, subject, body } = compose.value
  if (!subject || !body) return
  if (!manu?.email) {
    compose.value.error = 'This manufacturer has no email address on file.'
    return
  }

  compose.value.sending = true
  compose.value.error   = ''

  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/send-manu-email`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ manufacturer_id: manu.id, subject, body }),
    })
    const result = await res.json()
    if (!res.ok) throw new Error(result.error || 'Failed to send email')

    compose.value.show = false
    removeFromList(manu.id)
    rescheduleDigest()
    showNextFollowup(manu)
  } catch (err) {
    compose.value.error = err.message
  } finally {
    compose.value.sending = false
  }
}

async function markDone(manu) {
  await supabase
    .from('manufacturers')
    .update({ followup_manually_completed_at: new Date().toISOString() })
    .eq('id', manu.id)

  removeFromList(manu.id)
  rescheduleDigest()
  showNextFollowup(manu)
}

// ─── Next follow-up scheduling ────────────────────────────────────
function showNextFollowup(manu) {
  nextFu.value = { show: true, manu, date: '' }
}

function skipNextFollowup() {
  nextFu.value = { show: false, manu: null, date: '' }
}

async function scheduleNextFollowup() {
  if (!nextFu.value.date || !nextFu.value.manu) return

  // Store as 08:00 local Bogotá (use noon UTC to stay safe across DST)
  const isoDate = new Date(nextFu.value.date + 'T13:00:00Z').toISOString()

  await supabase
    .from('manufacturers')
    .update({
      followup_due_at: isoDate,
      followup_sent_at: null,
      followup_manually_completed_at: null,
    })
    .eq('id', nextFu.value.manu.id)

  nextFu.value = { show: false, manu: null, date: '' }
  // No need to add back to local list — it will reappear when its date arrives
}

// ─── Digest reschedule (fire-and-forget) ─────────────────────────
function rescheduleDigest() {
  fetch(`${SUPABASE_URL}/functions/v1/send-manu-digest`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  }).catch(() => {})
}

onMounted(fetchData)
</script>

<style scoped>
.followups-view {
  padding: 2rem;
  max-width: 1100px;
  margin: 0 auto;
}

/* ── Header ─────────────────────────────────────────────────────── */
.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 2rem;
}

.page-title {
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--text-main);
  margin: 0 0 0.3rem;
}

.page-sub {
  font-size: 0.85rem;
  color: var(--text-muted);
  margin: 0;
}

/* ── Sections ───────────────────────────────────────────────────── */
.list-section {
  margin-bottom: 2rem;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin-bottom: 0.75rem;
}

.section-title {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--text-main);
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.count-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 22px;
  height: 22px;
  padding: 0 6px;
  border-radius: 20px;
  font-size: 0.72rem;
  font-weight: 700;
}

.count-badge.red  { background: #fee2e2; color: #dc2626; }
.count-badge.gray { background: var(--border-light); color: var(--text-muted); }

/* ── Table ──────────────────────────────────────────────────────── */
.table-wrapper {
  overflow-x: auto;
  border: 1px solid var(--border-main);
  border-radius: 8px;
}

.followup-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}

.followup-table thead tr {
  background: var(--bg-app);
}

.followup-table th {
  padding: 0.65rem 1rem;
  text-align: left;
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  white-space: nowrap;
  border-bottom: 1px solid var(--border-main);
}

.followup-table td {
  padding: 0.85rem 1rem;
  border-bottom: 1px solid var(--border-light);
  vertical-align: middle;
  color: var(--text-body);
}

.followup-row:last-child td {
  border-bottom: none;
}

.followup-row:hover td {
  background: var(--bg-app);
}

.upcoming-row td {
  opacity: 0.75;
}

.col-company {
  min-width: 160px;
}

.company-name {
  font-weight: 600;
  color: var(--text-main);
}

.company-email {
  font-size: 0.78rem;
  color: var(--text-muted);
  margin-top: 2px;
}

.col-notes {
  max-width: 220px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--text-muted);
  font-size: 0.82rem;
}

.col-actions {
  display: flex;
  gap: 0.5rem;
  white-space: nowrap;
}

/* ── Overdue badge ──────────────────────────────────────────────── */
.overdue-badge {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 700;
  white-space: nowrap;
}

.overdue-badge.today    { background: #fef3c7; color: #d97706; }
.overdue-badge.past     { background: #fee2e2; color: #dc2626; }
.overdue-badge.upcoming { background: var(--border-light); color: var(--text-muted); }

.type-badge { display: inline-block; font-size: 0.7rem; font-weight: 700; padding: 1px 7px; border-radius: 20px; margin-right: 0.4rem; white-space: nowrap; }
.type-badge.call  { background: #ede9fe; color: #7c3aed; }
.type-badge.email { background: #dbeafe; color: #1d4ed8; }
.notes-text { font-size: 0.82rem; color: var(--text-muted); }

.btn-call { background: #ede9fe; color: #7c3aed; border-color: #c4b5fd; }
.btn-call:hover { background: #ddd6fe; }

/* ── Buttons ────────────────────────────────────────────────────── */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.15s;
  white-space: nowrap;
  text-decoration: none;
}

.btn-sm {
  padding: 0.35rem 0.75rem;
  font-size: 0.78rem;
}

.btn-primary {
  background: var(--primary);
  color: #fff;
  border-color: var(--primary);
}

.btn-primary:hover:not(:disabled) {
  opacity: 0.88;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-ghost {
  background: transparent;
  color: var(--text-body);
  border-color: var(--border-main);
}

.btn-ghost:hover {
  background: var(--border-light);
  color: var(--text-main);
}

/* ── Empty / loading state ──────────────────────────────────────── */
.empty-state {
  text-align: center;
  padding: 4rem 2rem;
  color: var(--text-muted);
}

.empty-icon {
  font-size: 2.5rem;
  margin-bottom: 0.75rem;
}

.empty-state h3 {
  font-size: 1.1rem;
  color: var(--text-main);
  margin: 0 0 0.4rem;
}

.empty-state p,
.loading-text {
  font-size: 0.88rem;
  margin: 0;
}

/* ── Modals ─────────────────────────────────────────────────────── */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 500;
  padding: 1rem;
}

.modal-box {
  background: var(--bg-card);
  border: 1px solid var(--border-main);
  border-radius: 10px;
  width: 100%;
  max-width: 580px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  max-height: 90vh;
}

.modal-box-sm {
  max-width: 400px;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.1rem 1.4rem;
  border-bottom: 1px solid var(--border-light);
}

.modal-header h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-main);
}

.btn-close {
  background: transparent;
  border: none;
  font-size: 1rem;
  color: var(--text-muted);
  cursor: pointer;
  padding: 0.2rem 0.4rem;
  border-radius: 4px;
  line-height: 1;
  transition: 0.15s;
}

.btn-close:hover {
  background: var(--border-light);
  color: var(--text-main);
}

.modal-body {
  padding: 1.25rem 1.4rem;
  overflow-y: auto;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.6rem;
  padding: 1rem 1.4rem;
  border-top: 1px solid var(--border-light);
}

/* ── Form fields ────────────────────────────────────────────────── */
.field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.field label {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.input,
.textarea {
  width: 100%;
  padding: 0.55rem 0.75rem;
  border: 1px solid var(--border-main);
  border-radius: 6px;
  background: var(--bg-app);
  color: var(--text-main);
  font-size: 0.875rem;
  font-family: inherit;
  box-sizing: border-box;
  transition: border-color 0.15s;
}

.input:focus,
.textarea:focus {
  outline: none;
  border-color: var(--primary);
}

.input-disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.textarea {
  resize: vertical;
  min-height: 120px;
  line-height: 1.5;
}

.modal-hint {
  font-size: 0.875rem;
  color: var(--text-body);
  margin: 0;
  line-height: 1.5;
}

/* ── Error banner ───────────────────────────────────────────────── */
.error-banner {
  background: #fee2e2;
  color: #dc2626;
  border: 1px solid #fca5a5;
  border-radius: 6px;
  padding: 0.6rem 0.9rem;
  font-size: 0.85rem;
  font-weight: 500;
}
</style>

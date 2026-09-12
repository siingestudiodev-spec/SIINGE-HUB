<template>
  <div class="container">
    <div class="header">
      <div>
        <router-link v-if="fromQuote" :to="`/projects/${fromQuote.project_id}/quotes`" class="back">← Back to Quotes</router-link>
        <h1>Landed Cost</h1>
        <p class="subtitle">What a quoted price actually costs once it clears US customs.</p>
      </div>
    </div>

    <div v-if="staleWarning" class="stale-banner">
      ⚠ Tariff rates were last updated {{ staleWarning }}. Tariffs have moved several times this year — confirm with your broker before quoting a client.
    </div>

    <div class="layout">
      <!-- ---------- INPUTS ---------- -->
      <div class="panel">
        <h2 class="panel-title">The order</h2>
        <div class="field-grid">
          <label>Unit price (USD)<input type="number" step="0.01" v-model.number="form.unitPrice" /></label>
          <label>Quantity<input type="number" step="1" v-model.number="form.quantity" /></label>
          <label>Country of origin
            <select v-model="form.country">
              <option value="">— select —</option>
              <option v-for="r in rates" :key="r.country" :value="r.country">{{ r.country }}</option>
            </select>
          </label>
          <label>Incoterm quoted
            <select v-model="form.incoterm">
              <option v-for="i in ['EXW','FCA','FAS','FOB','CFR','CIF','CPT','CIP','DAP','DPU','DDP']" :key="i" :value="i">{{ i }}</option>
            </select>
          </label>
        </div>
        <p v-if="isDeliveredTerm" class="field-note">
          {{ form.incoterm }} is a delivered term — the factory already carries freight, duty and clearance,
          so their price is the landed cost. Use the DDP comparison below instead of building it up here.
        </p>

        <h2 class="panel-title mt-4">Duty</h2>
        <div class="field-grid">
          <label class="wide">Garment type (sets the starting rate)
            <select v-model="selectedHts" @change="applyHtsPreset">
              <option value="">— pick one to prefill, or type the rate —</option>
              <option v-for="h in HTS_PRESETS" :key="h.code" :value="h.code">{{ h.label }} · {{ h.code }} · {{ h.rate }}%</option>
            </select>
          </label>
          <label>MFN duty rate (%)<input type="number" step="0.1" v-model.number="form.mfnRate" /></label>
          <label>Legacy China 301 (%)<input type="number" step="0.1" v-model.number="form.legacy301Rate" :disabled="form.country !== 'China'" /></label>
        </div>
        <p class="field-note">
          <strong>Section 301 (forced labor): {{ result.effective301Rate }}%</strong>
          <template v-if="countryRate">
            — {{ countryRate.section_301_rate }}% for {{ form.country }}<template v-if="countryRate.combined_ceiling != null">, capped at a {{ countryRate.combined_ceiling }}% combined MFN+301 ceiling, which leaves {{ result.effective301Rate }}%</template>.
          </template>
          <template v-else>— pick a country of origin.</template>
        </p>
        <p class="field-note warn">
          The duty rate follows the exact 10-digit HTS code, which depends on knit vs woven, gender and chief-weight fibre.
          These presets get you in range; a broker confirms the real one.
        </p>

        <h2 class="panel-title mt-4">Freight &amp; clearance</h2>
        <div class="field-grid">
          <label>Ocean freight, total<input type="number" step="1" v-model.number="form.seaFreight" /></label>
          <label>Ocean transit (days)<input type="number" step="1" v-model.number="form.seaDays" /></label>
          <label>Air freight, total<input type="number" step="1" v-model.number="form.airFreight" /></label>
          <label>Air transit (days)<input type="number" step="1" v-model.number="form.airDays" /></label>
          <label>Insurance<input type="number" step="1" v-model.number="form.insurance" /></label>
          <label>Brokerage / entry fee<input type="number" step="1" v-model.number="form.brokerage" /></label>
        </div>

        <h2 class="panel-title mt-4">Compare against a DDP quote</h2>
        <div class="field-grid">
          <label>DDP unit price, if quoted<input type="number" step="0.01" v-model.number="form.ddpUnitPrice" /></label>
        </div>
      </div>

      <!-- ---------- RESULTS ---------- -->
      <div class="panel">
        <h2 class="panel-title">Breakdown — {{ form.mode === 'sea' ? 'ocean' : 'air' }}</h2>
        <div class="mode-toggle">
          <button :class="{ active: form.mode === 'sea' }" @click="form.mode = 'sea'">Sea</button>
          <button :class="{ active: form.mode === 'air' }" @click="form.mode = 'air'">Air</button>
        </div>

        <table class="breakdown">
          <tbody>
            <tr><td>Goods ({{ form.quantity || 0 }} × ${{ (form.unitPrice || 0).toFixed(2) }})</td><td>{{ money(result.customsValue) }}</td></tr>
            <tr><td>Duty — MFN {{ form.mfnRate || 0 }}%</td><td>{{ money(result.duty) }}</td></tr>
            <tr><td>Section 301 — {{ result.effective301Rate }}%</td><td>{{ money(result.section301) }}</td></tr>
            <tr v-if="result.legacy301 > 0"><td>Legacy China 301 — {{ form.legacy301Rate }}%</td><td>{{ money(result.legacy301) }}</td></tr>
            <tr><td>MPF — 0.3464%<span v-if="atMpfBound" class="bound-note">({{ atMpfBound }})</span></td><td>{{ money(result.mpf) }}</td></tr>
            <tr v-if="result.hmf > 0"><td>HMF — 0.125% (ocean only)</td><td>{{ money(result.hmf) }}</td></tr>
            <tr><td>Freight</td><td>{{ money(result.freight) }}</td></tr>
            <tr v-if="result.insurance > 0"><td>Insurance</td><td>{{ money(result.insurance) }}</td></tr>
            <tr v-if="result.brokerage > 0"><td>Brokerage</td><td>{{ money(result.brokerage) }}</td></tr>
            <tr class="total-row"><td>Landed total</td><td>{{ money(result.total) }}</td></tr>
            <tr class="unit-row"><td>Per unit</td><td>{{ money(result.perUnit) }}</td></tr>
          </tbody>
        </table>

        <div v-if="result.customsValue > 0" class="uplift">
          Quoted at <strong>${{ (form.unitPrice || 0).toFixed(2) }}</strong>, lands at
          <strong>{{ money(result.perUnit) }}</strong> — <strong>{{ result.upliftPct.toFixed(1) }}%</strong> above the quote.
        </div>

        <!-- Sea vs air -->
        <h2 class="panel-title mt-4">Sea vs air</h2>
        <table class="compare">
          <thead><tr><th></th><th>Sea</th><th>Air</th></tr></thead>
          <tbody>
            <tr><td>Freight</td><td>{{ money(modes.sea.freight) }}</td><td>{{ money(modes.air.freight) }}</td></tr>
            <tr><td>Duties &amp; fees</td><td>{{ money(modes.sea.dutiesAndFees) }}</td><td>{{ money(modes.air.dutiesAndFees) }}</td></tr>
            <tr class="total-row"><td>Landed total</td><td>{{ money(modes.sea.total) }}</td><td>{{ money(modes.air.total) }}</td></tr>
            <tr class="unit-row"><td>Per unit</td><td>{{ money(modes.sea.perUnit) }}</td><td>{{ money(modes.air.perUnit) }}</td></tr>
            <tr><td>Transit</td><td>{{ form.seaDays }} days</td><td>{{ form.airDays }} days</td></tr>
          </tbody>
        </table>
        <div v-if="modes.costPerDaySaved" class="verdict">
          Air costs <strong>{{ money(modes.airPremium) }}</strong> more and saves
          <strong>{{ modes.daysSaved }} days</strong> — about
          <strong>{{ money(modes.costPerDaySaved) }} per day</strong> bought.
        </div>

        <!-- DDP vs FOB -->
        <template v-if="form.ddpUnitPrice > 0">
          <h2 class="panel-title mt-4">DDP vs {{ form.incoterm }}</h2>
          <table class="compare">
            <thead><tr><th></th><th>{{ form.incoterm }} landed</th><th>DDP quoted</th></tr></thead>
            <tbody>
              <tr class="total-row"><td>Total</td><td>{{ money(incoterms.fobTotal) }}</td><td>{{ money(incoterms.ddpTotal) }}</td></tr>
              <tr class="unit-row"><td>Per unit</td><td>{{ money(incoterms.fobPerUnit) }}</td><td>{{ money(incoterms.ddpPerUnit) }}</td></tr>
            </tbody>
          </table>
          <div class="verdict" :class="incoterms.cheaper === 'ddp' ? 'good' : 'warn'">
            <strong>{{ incoterms.cheaper === 'ddp' ? 'DDP wins' : form.incoterm + ' wins' }}</strong>
            by {{ money(Math.abs(incoterms.difference)) }}
            ({{ money(Math.abs(incoterms.ddpPerUnit - incoterms.fobPerUnit)) }}/unit).
            <template v-if="incoterms.cheaper === 'ddp'">
              DDP also moves customs risk and clearance work onto the factory.
            </template>
            <template v-else>
              Remember DDP still buys you one invoice and no clearance work — worth something even at a premium.
            </template>
          </div>
        </template>

        <!-- Broker -->
        <h2 class="panel-title mt-4">Customs broker</h2>
        <div class="broker" :class="result.brokerNeeded ? 'warn' : 'good'">
          <strong>{{ result.brokerNeeded ? 'Broker needed' : 'Broker optional' }}</strong> — {{ result.entryType }} entry.
          <div class="broker-reason">{{ result.reason }}</div>
        </div>

        <button @click="copySummary" class="btn-primary mt-4">Copy breakdown</button>
      </div>
    </div>

    <p class="disclaimer">
      An estimate for planning, not a customs declaration. Duty rates follow the exact HTS classification
      and tariff policy has changed repeatedly this year — confirm with a licensed broker before committing a price to a client.
    </p>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { supabase } from '../lib/supabase'
import { calculateLandedCost, compareModes, compareIncoterms } from '../lib/landedCost.js'
import { HTS_PRESETS, normalizeCountry } from '../lib/htsPresets.js'

const route = useRoute()
const rates = ref([])
const fromQuote = ref(null)
const selectedHts = ref('')

const form = ref({
  unitPrice: 0, quantity: 0, country: '', incoterm: 'FOB',
  mfnRate: 0, legacy301Rate: 0,
  mode: 'sea',
  seaFreight: 0, airFreight: 0, seaDays: 32, airDays: 6,
  insurance: 0, brokerage: 175,
  ddpUnitPrice: 0,
})

const countryRate = computed(() => rates.value.find(r => r.country === form.value.country) || null)

// Delivered terms already include duty and freight in the factory's price, so building
// a landed cost on top of one would double-count.
const isDeliveredTerm = computed(() => ['DDP', 'DAP', 'DPU'].includes(form.value.incoterm))

const calcInput = computed(() => ({
  unitPrice: form.value.unitPrice,
  quantity: form.value.quantity,
  mfnRate: form.value.mfnRate,
  section301Rate: countryRate.value?.section_301_rate || 0,
  combinedCeiling: countryRate.value?.combined_ceiling ?? null,
  legacy301Rate: form.value.country === 'China' ? form.value.legacy301Rate : 0,
  insurance: form.value.insurance,
  brokerage: form.value.brokerage,
}))

const result = computed(() => calculateLandedCost({
  ...calcInput.value,
  mode: form.value.mode,
  freight: form.value.mode === 'sea' ? form.value.seaFreight : form.value.airFreight,
}))

const modes = computed(() => compareModes(calcInput.value, {
  seaFreight: form.value.seaFreight, airFreight: form.value.airFreight,
  seaDays: form.value.seaDays, airDays: form.value.airDays,
}))

const incoterms = computed(() => compareIncoterms({
  fobLanded: result.value,
  ddpUnitPrice: form.value.ddpUnitPrice,
  quantity: form.value.quantity,
}))

// The MPF floor and cap bite silently otherwise — a small order pays far more than
// 0.3464% and a huge one far less, and the number looks wrong until you know why.
const atMpfBound = computed(() => {
  const raw = result.value.customsValue * 0.003464
  if (result.value.customsValue <= 0) return ''
  if (raw < 33.58) return 'minimum'
  if (raw > 651.50) return 'capped'
  return ''
})

const staleWarning = computed(() => {
  const dates = rates.value.map(r => r.updated_at).filter(Boolean).sort()
  if (dates.length === 0) return ''
  const newest = new Date(dates[dates.length - 1])
  const days = Math.floor((Date.now() - newest) / 86400000)
  return days > 90 ? `${days} days ago` : ''
})

const money = (n) => (n == null || !Number.isFinite(n)) ? '—'
  : n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 })

function applyHtsPreset() {
  const hit = HTS_PRESETS.find(h => h.code === selectedHts.value)
  if (hit) form.value.mfnRate = hit.rate
}

function copySummary() {
  const r = result.value
  const lines = [
    `LANDED COST — ${form.value.quantity} units from ${form.value.country || '—'} (${form.value.incoterm})`,
    '',
    `Goods                 ${money(r.customsValue)}`,
    `Duty (MFN ${form.value.mfnRate}%)      ${money(r.duty)}`,
    `Section 301 (${r.effective301Rate}%)    ${money(r.section301)}`,
    ...(r.legacy301 > 0 ? [`Legacy China 301      ${money(r.legacy301)}`] : []),
    `MPF + HMF             ${money(r.mpf + r.hmf)}`,
    `Freight (${form.value.mode})         ${money(r.freight)}`,
    ...(r.insurance > 0 ? [`Insurance             ${money(r.insurance)}`] : []),
    ...(r.brokerage > 0 ? [`Brokerage             ${money(r.brokerage)}`] : []),
    '                      ───────────',
    `Landed total          ${money(r.total)}`,
    `Per unit              ${money(r.perUnit)}`,
    '',
    `Quoted ${money(form.value.unitPrice)}/unit → lands ${money(r.perUnit)}/unit (+${r.upliftPct.toFixed(1)}%)`,
    '',
    'Estimate for planning. Duty follows the exact HTS classification — confirm with a licensed broker.',
  ]
  navigator.clipboard.writeText(lines.join('\n')).catch(() => {})
}

// Prefilled from a quote: price, quantity, incoterm and the manufacturer's country all
// already live in the hub, so the only thing left to type is freight.
async function prefillFromQuote(quoteId) {
  const { data: q } = await supabase.from('quotes').select('*').eq('id', quoteId).maybeSingle()
  if (!q) return
  fromQuote.value = q
  form.value.unitPrice = Number(String(q.pricing_tiers?.[0]?.price ?? q.price_range ?? '').replace(/[^0-9.]/g, '')) || 0
  form.value.quantity = Number(String(q.pricing_tiers?.[0]?.moq ?? q.moq_per_color ?? '').replace(/[^0-9.]/g, '')) || 0
  if (q.incoterm) form.value.incoterm = q.incoterm

  const { data: m } = await supabase.from('manufacturers').select('country').eq('id', q.manufacturer_id).maybeSingle()
  const country = normalizeCountry(m?.country)
  if (rates.value.some(r => r.country === country)) form.value.country = country
}

onMounted(async () => {
  const { data } = await supabase.from('tariff_rates').select('*').order('country')
  rates.value = data || []
  if (route.query.quote) await prefillFromQuote(route.query.quote)
})
</script>

<style scoped>
.container { max-width: 1200px; margin: 0 auto; padding: 2rem 1.5rem; }
.header { margin-bottom: 1.5rem; }
.back { color: var(--primary); text-decoration: none; font-size: 0.85rem; font-weight: 600; margin-bottom: 0.5rem; display: block; }
h1 { font-size: 1.8rem; font-weight: 800; color: var(--text-main); margin: 0; }
.subtitle { color: var(--text-muted); font-size: 0.9rem; margin-top: 0.2rem; }

.stale-banner { background: rgba(245,158,11,0.12); border: 1px solid rgba(245,158,11,0.4); color: #f59e0b; padding: 0.75rem 1rem; border-radius: 10px; font-size: 0.85rem; margin-bottom: 1.25rem; }

.layout { display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 1.25rem; align-items: start; }
.panel { background: var(--bg-card); border: 1px solid var(--border-main); border-radius: 14px; padding: 1.5rem; }
.panel-title { font-size: 0.72rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-muted); margin: 0 0 0.9rem; }
.mt-4 { margin-top: 1.75rem; }

.field-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(165px, 1fr)); gap: 0.75rem; }
.field-grid label { display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-muted); }
.field-grid label.wide { grid-column: 1 / -1; }
input, select { width: 100%; padding: 0.55rem 0.7rem; border: 1.5px solid var(--border-main); border-radius: 8px; font-size: 0.9rem; background: var(--bg-app); color: var(--text-main); box-sizing: border-box; }
input:focus, select:focus { border-color: var(--primary); outline: none; box-shadow: 0 0 0 2px rgba(99,102,241,0.1); }
input:disabled { opacity: 0.4; cursor: not-allowed; }
.field-note { font-size: 0.78rem; color: var(--text-muted); margin: 0.7rem 0 0; line-height: 1.5; }
.field-note.warn { color: #f59e0b; }

.mode-toggle { display: flex; gap: 0.4rem; margin-bottom: 0.9rem; }
.mode-toggle button { flex: 1; padding: 0.5rem; border: 1px solid var(--border-main); background: transparent; color: var(--text-muted); border-radius: 8px; cursor: pointer; font-size: 0.82rem; font-weight: 700; }
.mode-toggle button.active { background: var(--primary); color: #fff; border-color: var(--primary); }

.breakdown, .compare { width: 100%; border-collapse: collapse; font-size: 0.86rem; }
.breakdown td, .compare td, .compare th { padding: 0.45rem 0.2rem; border-bottom: 1px solid var(--border-light); color: var(--text-body); }
.breakdown td:last-child, .compare td:not(:first-child) { text-align: right; font-variant-numeric: tabular-nums; }
.compare th { font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); text-align: right; }
.compare th:first-child { text-align: left; }
.total-row td { font-weight: 800; color: var(--text-main); border-top: 2px solid var(--border-main); }
.unit-row td { font-weight: 800; color: var(--primary); }
.bound-note { font-size: 0.7rem; color: #f59e0b; margin-left: 0.3rem; }

.uplift { margin-top: 0.9rem; padding: 0.75rem 1rem; background: rgba(99,102,241,0.08); border-radius: 10px; font-size: 0.85rem; color: var(--text-body); }
.verdict { margin-top: 0.75rem; padding: 0.75rem 1rem; border-radius: 10px; font-size: 0.83rem; line-height: 1.5; background: rgba(99,102,241,0.08); color: var(--text-body); }
.verdict.good, .broker.good { background: rgba(34,197,94,0.1); color: #22c55e; }
.verdict.warn, .broker.warn { background: rgba(245,158,11,0.1); color: #f59e0b; }
.broker { padding: 0.8rem 1rem; border-radius: 10px; font-size: 0.85rem; }
.broker-reason { margin-top: 0.35rem; font-size: 0.8rem; line-height: 1.5; opacity: 0.9; }

.btn-primary { background: var(--primary); color: #fff; border: none; padding: 0.65rem 1.2rem; border-radius: 8px; font-weight: 700; cursor: pointer; font-size: 0.85rem; width: 100%; }
.btn-primary:hover { filter: brightness(1.1); }
.disclaimer { margin-top: 1.5rem; font-size: 0.76rem; color: var(--text-muted); line-height: 1.6; font-style: italic; }
</style>

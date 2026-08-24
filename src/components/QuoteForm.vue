<template>
  <div class="inline-form">
    <div class="inline-form-grid">
      <div class="input-field">
        <label>Item / Piece *</label>
        <input v-model="data.material_comp" placeholder="e.g. Scarf, Sleeves, Bag..." />
      </div>
      <div class="input-field">
        <label>Composition</label>
        <input v-model="data.composition" placeholder="e.g. 70% Modal / 30% Nylon, 260 GSM" />
      </div>
      <div class="input-field">
        <label>Specialty / Process</label>
        <input v-model="data.specialty" placeholder="e.g. Screen print, Embroidery..." />
      </div>
      <div class="input-field">
        <label>Incoterm</label>
        <select v-model="data.incoterm">
          <option value="">—</option>
          <option v-for="i in INCOTERMS" :key="i.code" :value="i.code">{{ i.code }} — {{ i.label }}</option>
        </select>
      </div>
      <div class="input-field">
        <label>Port / Place</label>
        <input v-model="data.port" :placeholder="portPlaceholder" />
      </div>
      <div class="input-field">
        <label>Sample Cost (USD)</label>
        <input v-model.number="data.sample_cost" type="number" step="0.01" />
      </div>
      <div class="input-field">
        <label>Sample Lead Time</label>
        <input v-model="data.sample_lead_time" placeholder="e.g. 3-5 weeks" />
      </div>
      <div class="input-field">
        <label>Bulk Lead Time</label>
        <input v-model="data.bulk_lead_time" placeholder="e.g. 6-8 weeks" />
      </div>
      <div class="input-field">
        <label>Notes</label>
        <input v-model="data.notes" placeholder="Additional details..." />
      </div>
      <div class="input-field">
        <label>Date Requested</label>
        <input type="date" v-model="data.requested_at" />
      </div>
      <div class="input-field">
        <label>Date Received</label>
        <input type="date" v-model="data.received_at" />
      </div>
    </div>

    <div class="tiers-section mt-3">
      <label class="section-label">Pricing Tiers (MOQ &amp; Price)</label>
      <div class="tiers-list">
        <div v-for="(tier, i) in data.pricing_tiers" :key="i" class="tier-row">
          <div class="tier-input-group">
            <span class="tier-prefix">MOQ:</span>
            <input v-model="tier.moq" placeholder="e.g. 100" />
          </div>
          <div class="tier-icon">➔</div>
          <div class="tier-input-group">
            <span class="tier-prefix">Price:</span>
            <input v-model="tier.price" placeholder="e.g. $5.00" />
          </div>
          <button @click="removeTier(i)" class="btn-remove-tier" v-if="data.pricing_tiers.length > 1">✕</button>
        </div>
      </div>
      <button @click="addTier" class="btn-add-tier">+ Add Tier</button>
    </div>

    <div class="inline-form-actions mt-3">
      <button @click="$emit('cancel')" class="btn-export">Cancel</button>
      <!-- A factory usually quotes one shipping term for the whole quote, even when it
           covers several items. This copies it across without retyping it per row. -->
      <button v-if="data.incoterm || data.port" @click="$emit('apply-all')" class="btn-export"
              title="Copy this incoterm and port onto every saved option for this manufacturer">
        Apply incoterm to all options
      </button>
      <button @click="$emit('save')" class="btn-primary" :disabled="saving">
        {{ saving ? 'Saving...' : (editing ? 'Update Option' : 'Save Option') }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  data: { type: Object, required: true },
  saving: { type: Boolean, default: false },
  editing: { type: Boolean, default: false },
})
defineEmits(['save', 'cancel', 'apply-all'])

// Incoterms 2020, full set.
const INCOTERMS = [
  { code: 'EXW', label: 'Ex Works' },
  { code: 'FCA', label: 'Free Carrier' },
  { code: 'FAS', label: 'Free Alongside Ship' },
  { code: 'FOB', label: 'Free On Board' },
  { code: 'CFR', label: 'Cost and Freight' },
  { code: 'CIF', label: 'Cost, Insurance and Freight' },
  { code: 'CPT', label: 'Carriage Paid To' },
  { code: 'CIP', label: 'Carriage and Insurance Paid To' },
  { code: 'DAP', label: 'Delivered At Place' },
  { code: 'DPU', label: 'Delivered At Place Unloaded' },
  { code: 'DDP', label: 'Delivered Duty Paid' },
]

// Which port the term refers to flips with the incoterm: the F-terms and EXW name the
// origin the goods leave from, the C/D-terms name where they land. Same field either
// way — the hint just stops "FOB / New York" from being recorded when the factory
// meant "FOB Shanghai".
const ORIGIN_TERMS = ['EXW', 'FCA', 'FAS', 'FOB']
const portPlaceholder = computed(() => {
  if (!props.data.incoterm) return 'e.g. Shanghai'
  return ORIGIN_TERMS.includes(props.data.incoterm)
    ? 'Port of loading — e.g. Shanghai'
    : 'Destination — e.g. New York'
})

function addTier() { props.data.pricing_tiers.push({ moq: '', price: '' }) }
function removeTier(i) {
  if (props.data.pricing_tiers.length > 1) props.data.pricing_tiers.splice(i, 1)
}
</script>

<style scoped>
/* Scoped styles don't cross the component boundary, so the form owns its look. */
.inline-form { padding: 1.5rem; border-top: 2px dashed var(--primary); }
.inline-form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 0.8rem; }
.inline-form-actions { display: flex; justify-content: flex-end; gap: 0.8rem; flex-wrap: wrap; }
.input-field label, .section-label { display: block; font-size: 0.75rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 0.4rem; }
input, select { width: 100%; padding: 0.6rem 0.8rem; border: 1.5px solid var(--border-main); border-radius: 8px; font-size: 0.9rem; transition: border-color 0.2s; background: var(--bg-app); color: var(--text-main); box-sizing: border-box; }
input:focus, select:focus { border-color: var(--primary); outline: none; box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.1); }
.mt-3 { margin-top: 1rem; }

.tiers-section { background: rgba(0,0,0,0.15); border: 1px dashed var(--border-main); padding: 1rem; border-radius: 10px; }
.tiers-list { display: flex; flex-direction: column; gap: 0.8rem; margin-bottom: 1rem; }
.tier-row { display: flex; align-items: center; gap: 0.8rem; flex-wrap: wrap; }
.tier-input-group { display: flex; align-items: center; background: var(--bg-app); border: 1px solid var(--border-main); border-radius: 8px; overflow: hidden; flex: 1; min-width: 150px; }
.tier-prefix { padding: 0 0.8rem; font-size: 0.75rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase; background: rgba(255,255,255,0.05); border-right: 1px solid var(--border-main); height: 100%; display: flex; align-items: center; }
.tier-input-group input { border: none; border-radius: 0; background: transparent; }
.tier-input-group input:focus { box-shadow: none; }
.tier-icon { color: var(--text-muted); font-size: 1.2rem; }
.btn-remove-tier { background: transparent; color: var(--danger-text); border: 1px solid var(--danger-text); border-radius: 6px; width: 34px; height: 34px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-weight: bold; transition: 0.2s; }
.btn-remove-tier:hover { background: var(--danger-bg); }
.btn-add-tier { background: rgba(99, 102, 241, 0.1); color: var(--primary); border: 1px dashed var(--primary); padding: 0.5rem 1rem; border-radius: 8px; cursor: pointer; font-size: 0.8rem; font-weight: 700; width: max-content; transition: 0.2s; }
.btn-add-tier:hover { background: var(--primary); color: white; }

.btn-primary { background: var(--primary); color: white; border: none; padding: 0.7rem 1.2rem; border-radius: 8px; font-weight: 700; cursor: pointer; font-size: 0.85rem; transition: 0.2s; }
.btn-primary:hover { filter: brightness(1.1); }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-export { background: transparent; color: var(--text-main); border: 1px solid var(--border-main); padding: 0.7rem 1.2rem; border-radius: 8px; font-weight: 700; cursor: pointer; font-size: 0.85rem; transition: 0.2s; }
.btn-export:hover { background: var(--bg-app); }
</style>

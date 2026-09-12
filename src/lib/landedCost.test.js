// Run with: node src/lib/landedCost.test.js
import assert from 'node:assert/strict'
import {
  calculateLandedCost, effectiveSection301, merchandiseProcessingFee,
  harborMaintenanceFee, entryGuidance, compareModes, compareIncoterms,
  FY2026_FEES, FORMAL_ENTRY_THRESHOLD,
} from './landedCost.js'

const near = (a, b, tol = 0.01) => Math.abs(a - b) < tol

// --- Section 301 overlay, with and without the EU/Taiwan ceiling ---
assert.equal(effectiveSection301(16.5, 12.5, null), 12.5, 'China: overlay stacks in full')
assert.equal(effectiveSection301(16.5, 12.5, 10), 0, 'EU: apparel MFN already exceeds the 10% cap, so no overlay')
assert.equal(effectiveSection301(4, 12.5, 10), 6, 'EU: low-duty goods take only the remainder up to the cap')
assert.equal(effectiveSection301(0, 10, null), 10)

// --- MPF floor and cap ---
assert.ok(near(merchandiseProcessingFee(100000), 346.40), 'mid-range MPF is the plain percentage')
assert.equal(merchandiseProcessingFee(1000), FY2026_FEES.mpfMin, 'small entries pay the floor')
assert.equal(merchandiseProcessingFee(10_000_000), FY2026_FEES.mpfMax, 'large entries hit the cap')

// --- HMF is ocean-only ---
assert.ok(near(harborMaintenanceFee(100000, 'sea'), 125))
assert.equal(harborMaintenanceFee(100000, 'air'), 0, 'air freight pays no harbor fee')

// --- Entry type / broker ---
assert.equal(entryGuidance(5000).entryType, 'formal')
assert.equal(entryGuidance(5000).brokerNeeded, true)
assert.equal(entryGuidance(1200).entryType, 'informal')
assert.equal(entryGuidance(1200).brokerNeeded, false)
assert.equal(entryGuidance(FORMAL_ENTRY_THRESHOLD).entryType, 'formal', 'the threshold itself is formal')

// --- Full calculation: the real Frontera shape (10k cotton tees, FOB Shanghai) ---
const frontera = {
  unitPrice: 5.47, quantity: 10000,
  mfnRate: 16.5,          // cotton knit tee, 6109.10.00
  section301Rate: 12.5,   // China, forced-labor overlay
  mode: 'sea', freight: 3200, insurance: 250, brokerage: 175,
}
const r = calculateLandedCost(frontera)
assert.ok(near(r.customsValue, 54700), 'customs value is goods only, freight excluded')
assert.ok(near(r.duty, 9025.50), '16.5% of 54,700')
assert.ok(near(r.section301, 6837.50), '12.5% of 54,700')
assert.ok(near(r.mpf, 189.48), '0.3464% of 54,700, inside floor and cap')
assert.ok(near(r.hmf, 68.375), '0.125% ocean')
assert.ok(near(r.total, 54700 + 9025.50 + 6837.50 + 189.48 + 68.375 + 3200 + 250 + 175))
assert.ok(near(r.perUnit, r.total / 10000))
assert.ok(r.perUnit > 7.4 && r.perUnit < 7.5, `per-unit landed lands near $7.44, got ${r.perUnit.toFixed(2)}`)
assert.ok(r.upliftPct > 35 && r.upliftPct < 37, 'a $5.47 FOB tee lands ~36% above the quoted price')
assert.equal(r.brokerNeeded, true)

// The same tee in polyester roughly doubles the duty — the reason fibre content
// belongs in the quote comparison at all.
const poly = calculateLandedCost({ ...frontera, mfnRate: 32 })
assert.ok(poly.duty > r.duty * 1.9, 'synthetic duty is ~2x cotton')

// Portugal: EU ceiling wipes out the overlay entirely.
const portugal = calculateLandedCost({ ...frontera, section301Rate: 12.5, combinedCeiling: 10 })
assert.equal(portugal.section301, 0)
assert.ok(portugal.total < r.total, 'EU sourcing lands cheaper on duty alone')

// Legacy China lists stack on top of the new overlay.
const withLegacy = calculateLandedCost({ ...frontera, legacy301Rate: 7.5 })
assert.ok(near(withLegacy.legacy301, 4102.50))
assert.ok(near(withLegacy.total - r.total, 4102.50), 'legacy adds on top, it does not replace')

// --- Sea vs air ---
const modes = compareModes(frontera, { seaFreight: 3200, airFreight: 18400, seaDays: 32, airDays: 6 })
// Air costs the freight difference, less the harbor fee only ocean pays.
assert.ok(near(modes.airPremium, (18400 - 3200) - modes.sea.hmf), 'premium is the freight delta minus the HMF air avoids')
assert.ok(modes.air.hmf === 0 && modes.sea.hmf > 0)
assert.equal(modes.daysSaved, 26)
assert.ok(modes.costPerDaySaved > 0)
assert.ok(near(modes.costPerDaySaved, modes.airPremium / 26))
assert.equal(modes.sea.duty, modes.air.duty, 'duty does not move with transport mode')

// --- DDP vs FOB ---
const ddpCheaper = compareIncoterms({ fobLanded: r, ddpUnitPrice: 7.00, quantity: 10000 })
assert.equal(ddpCheaper.cheaper, 'ddp', '$7.00 DDP beats a $5.47 FOB that lands at ~$7.44')
const ddpWorse = compareIncoterms({ fobLanded: r, ddpUnitPrice: 8.50, quantity: 10000 })
assert.equal(ddpWorse.cheaper, 'fob')

// --- Degenerate inputs must not produce NaN ---
const empty = calculateLandedCost({ unitPrice: 0, quantity: 0, mfnRate: 0, section301Rate: 0, mode: 'sea' })
assert.equal(empty.perUnit, 0)
assert.equal(empty.upliftPct, 0)
assert.ok(Number.isFinite(empty.total))

console.log('landedCost: all checks passed')

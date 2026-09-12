// Landed-cost math for US imports. Pure functions — `node src/lib/landedCost.test.js`
// exercises them. Everything that moves with policy (duty rates, the Section 301
// overlay, fee caps) is passed in rather than baked in, so a rate change is a data
// edit and never a redeploy.
//
// The chain, in the order CBP applies it:
//   customs value  = price paid for the goods
//   + MFN duty     = customs value x the HTS rate for that garment
//   + Section 301  = the forced-labor overlay, by country of origin
//   + legacy 301   = the older China lists, which stack on top
//   + MPF          = 0.3464%, floored and capped
//   + HMF          = 0.125%, ocean freight only
//   + freight, insurance, brokerage
//
// ponytail: customs value is taken as the goods value alone. That is right for
// EXW/FCA/FOB quotes, where international freight is invoiced separately and is not
// dutiable. A CIF or DDP quote bundles freight into the price and CBP will only let
// you deduct it if the invoice states it separately — so for those terms enter the
// goods portion, not the all-in number. Split it into its own input if that stops
// being obvious to whoever is typing.

// FY2026 statutory fee rates. Congress resets the MPF floor and cap each fiscal year;
// they are arguments with these as defaults so an October change needs no code edit.
export const FY2026_FEES = {
  mpfRate: 0.003464,
  mpfMin: 33.58,
  mpfMax: 651.50,
  hmfRate: 0.00125,
}

// Above this entered value CBP requires a formal entry: a customs bond, a full
// declaration, and in practice a licensed broker to file it.
export const FORMAL_ENTRY_THRESHOLD = 2500

const pct = (rate) => (rate || 0) / 100

// The Section 301 forced-labor overlay, after any combined ceiling.
// The EU and Taiwan are capped at 10% for MFN + 301 together, so where the garment's
// own duty already reaches the cap the overlay lands at zero rather than stacking.
export function effectiveSection301(mfnRate, section301Rate, combinedCeiling) {
  const base = section301Rate || 0
  if (combinedCeiling == null) return base
  return Math.max(0, Math.min(base, combinedCeiling - (mfnRate || 0)))
}

export function merchandiseProcessingFee(customsValue, fees = FY2026_FEES) {
  const raw = customsValue * fees.mpfRate
  return Math.min(Math.max(raw, fees.mpfMin), fees.mpfMax)
}

export function harborMaintenanceFee(customsValue, mode, fees = FY2026_FEES) {
  return mode === 'sea' ? customsValue * fees.hmfRate : 0
}

// Since the $800 de minimis was suspended in June 2026, every commercial shipment
// clears customs regardless of value — the only question left is which entry type.
export function entryGuidance(customsValue) {
  if (customsValue >= FORMAL_ENTRY_THRESHOLD) {
    return {
      entryType: 'formal',
      brokerNeeded: true,
      reason: `Entered value is $${customsValue.toFixed(2)}, at or above the $${FORMAL_ENTRY_THRESHOLD} formal-entry line. This needs a customs bond and a full declaration — in practice, a licensed broker files it.`,
    }
  }
  return {
    entryType: 'informal',
    brokerNeeded: false,
    reason: `Entered value is $${customsValue.toFixed(2)}, under the $${FORMAL_ENTRY_THRESHOLD} formal-entry line, so an informal entry is allowed and no bond is required. Duty is still owed — the $800 de minimis exemption was suspended in June 2026 — and most importers still hand this to a broker rather than self-file.`,
  }
}

/**
 * @param {object} o
 * @param {number} o.unitPrice     quoted price per unit
 * @param {number} o.quantity      units on the order
 * @param {number} o.mfnRate       HTS duty rate, percent (e.g. 16.5)
 * @param {number} o.section301Rate  forced-labor overlay, percent (e.g. 12.5)
 * @param {number} [o.combinedCeiling] MFN+301 cap, percent — EU and Taiwan only
 * @param {number} [o.legacy301Rate]   older China lists, percent
 * @param {'sea'|'air'} o.mode
 * @param {number} [o.freight]     total international freight
 * @param {number} [o.insurance]   total insurance
 * @param {number} [o.brokerage]   brokerage / entry filing fee
 * @param {object} [o.fees]        override FY2026_FEES
 */
export function calculateLandedCost(o) {
  const quantity = Number(o.quantity) || 0
  const customsValue = (Number(o.unitPrice) || 0) * quantity

  const mfn = pct(o.mfnRate)
  const s301 = pct(effectiveSection301(o.mfnRate, o.section301Rate, o.combinedCeiling))
  const legacy = pct(o.legacy301Rate)

  const duty = customsValue * mfn
  const section301 = customsValue * s301
  const legacy301 = customsValue * legacy
  const mpf = merchandiseProcessingFee(customsValue, o.fees)
  const hmf = harborMaintenanceFee(customsValue, o.mode, o.fees)

  const freight = Number(o.freight) || 0
  const insurance = Number(o.insurance) || 0
  const brokerage = Number(o.brokerage) || 0

  const dutiesAndFees = duty + section301 + legacy301 + mpf + hmf
  const total = customsValue + dutiesAndFees + freight + insurance + brokerage

  return {
    customsValue,
    duty,
    section301,
    legacy301,
    mpf,
    hmf,
    freight,
    insurance,
    brokerage,
    dutiesAndFees,
    total,
    perUnit: quantity > 0 ? total / quantity : 0,
    // How much the quoted price understates what the client actually pays.
    upliftPct: customsValue > 0 ? ((total - customsValue) / customsValue) * 100 : 0,
    effective301Rate: effectiveSection301(o.mfnRate, o.section301Rate, o.combinedCeiling),
    ...entryGuidance(customsValue),
  }
}

// Same order priced both ways. Duty and fees are identical — only freight, HMF and
// transit move — so this isolates the part of the decision that is actually a choice.
export function compareModes(base, { seaFreight, airFreight, seaDays, airDays }) {
  const sea = calculateLandedCost({ ...base, mode: 'sea', freight: seaFreight })
  const air = calculateLandedCost({ ...base, mode: 'air', freight: airFreight })
  return {
    sea: { ...sea, transitDays: seaDays },
    air: { ...air, transitDays: airDays },
    airPremium: air.total - sea.total,
    airPremiumPerUnit: air.perUnit - sea.perUnit,
    daysSaved: (seaDays || 0) - (airDays || 0),
    // What each day of speed costs. The number that makes the call when a launch
    // date is on the line.
    costPerDaySaved: (seaDays || 0) > (airDays || 0)
      ? (air.total - sea.total) / ((seaDays || 0) - (airDays || 0))
      : null,
  }
}

// A DDP quote is the factory's all-in number: they carry freight, duty and clearance.
// Comparing it to an FOB quote means landing the FOB one first, which is the whole
// point of this tool.
export function compareIncoterms({ fobLanded, ddpUnitPrice, quantity }) {
  const ddpTotal = (Number(ddpUnitPrice) || 0) * (Number(quantity) || 0)
  return {
    fobTotal: fobLanded.total,
    fobPerUnit: fobLanded.perUnit,
    ddpTotal,
    ddpPerUnit: Number(ddpUnitPrice) || 0,
    difference: ddpTotal - fobLanded.total,
    cheaper: ddpTotal < fobLanded.total ? 'ddp' : 'fob',
  }
}

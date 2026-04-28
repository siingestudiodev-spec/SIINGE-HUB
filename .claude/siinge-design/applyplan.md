# SIINGE Apply Plan — `newcrm/client-crm/`

Per-file checklist for re-skinning the CRM. Work top-down. Each phase builds on the last.

**Authoritative visual targets:** `ui_kits/crm/*.jsx` (React recreations of every screen).
**Token source:** `colors_and_type.css`.

---

## Phase 0 — Prep (do before anything else)

- [ ] `cd newcrm/client-crm && git checkout -b feat/siinge-reskin`
- [ ] `npm install` (ensure `lucide-vue-next` resolves — it's already in deps)
- [ ] Copy `colors_and_type.css` → `src/styles/siinge-tokens.css`
- [ ] Copy `assets/logo-mark-wordmark.png` → `src/assets/siinge-logo.png`
- [ ] Copy `assets/logo-mark-wordmark-white.png` → `src/assets/siinge-logo-white.png` (for ink sidebar)

---

## Phase 1 — Foundation (tokens, fonts, logo swap)

**`src/style.css`**
- [ ] Add at top: `@import './styles/siinge-tokens.css';`
- [ ] Set body: `background: var(--paper); color: var(--ink-2); font-family: var(--font-sans);`

**`index.html`**
- [ ] Add to `<head>`:
  ```html
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400&display=swap">
  ```
- [ ] Update `<title>` to `SIINGE — Studio CRM`
- [ ] Replace `/favicon.svg` with the SIINGE mark (copy from `assets/favicon.svg` if a new one was supplied, else keep)

---

## Phase 2 — Login (`src/components/Login.vue`)

Target: `ui_kits/crm/Login.jsx`.

- [ ] Replace any Vite/Vue logo with `siinge-logo.png`, centered, max-width 96px
- [ ] Background: `var(--paper)`; optional faint watermark of the arch mark at 4% opacity behind card
- [ ] Card: `background: var(--bone); border: 1px solid var(--bone-edge); border-radius: 4px; padding: 48px 40px;`
- [ ] Heading: Cormorant Garamond italic, 32px, `var(--ink)` — e.g. *"Welcome back."*
- [ ] Subhead: Inter 13px, `var(--ink-3)`, letter-spacing `0.02em`
- [ ] Inputs: 1px border `var(--ink-5)`, no rounding (2px max), focus border → `var(--ink)`
- [ ] Primary button: `background: var(--ink); color: var(--paper);` — full width, 48px tall, no shadow, letter-spacing 0.08em, uppercase, 12px
- [ ] Remove any `shadow-2xl`, gradients, `rounded-xl` on inner elements

---

## Phase 3 — App Shell (`src/layouts/AppLayout.vue`)

Target: `ui_kits/crm/Sidebar.jsx` + `TopBar`.

### Sidebar
- [ ] Background: `var(--ink)`; text: `var(--paper)`
- [ ] Logo block: `siinge-logo-white.png` at 32px, plus wordmark in Cormorant
- [ ] Nav items: Inter 13px, uppercase, letter-spacing 0.14em, color `rgba(250,247,242,0.6)`
- [ ] Active item: `color: var(--paper)` + 2px left rail in `var(--ember)`
- [ ] Hover: `color: var(--paper)` only — no background fill
- [ ] Remove all emoji nav icons; use `lucide-vue-next` (`Gauge`, `Kanban`, `Users`, `FileText`, `Settings`)

### TopBar
- [ ] Height 72px, background `var(--paper)`, bottom hairline `var(--ink-5)`
- [ ] Left: small eyebrow (uppercase 10px, `var(--ink-3)`) above a Cormorant italic page title (24px)
- [ ] Right: action area — buttons per Phase 4

---

## Phase 4 — Buttons, Chips, Modals (global)

**New file: `src/components/ui/Btn.vue`** (port from `ui_kits/crm/primitives.jsx` → `Btn`)
- Variants: `primary` (ink), `ember` (CTA, rare), `ghost` (transparent + border), `text`
- Sizes: `sm` (32px), `md` (40px)
- Uppercase, tracking 0.08em, no border-radius beyond 2px

**`src/components/ConfirmModal.vue`**
- [ ] Delete gradient header `bg-gradient-to-r from-blue-600 to-blue-700`
- [ ] Header: flat `var(--ink)` background, Cormorant italic title in `var(--paper)`
- [ ] Body: `var(--bone)`, ink-2 text
- [ ] Cancel = ghost; Confirm = ink (or ember if `isDangerous` → use `var(--critical)` instead)

**Chip component** (`src/components/ui/Chip.vue`)
- Port from `primitives.jsx` → `Chip`
- Replace all inline tier classes (`bg-purple-100 text-purple-700` etc.) with chip variants

---

## Phase 5 — Dashboard (`src/views/Dashboard.vue`)

Target: `ui_kits/crm/Dashboard.jsx`.

- [ ] Page background: `var(--paper)`
- [ ] KPI tiles: bone card, Cormorant italic 48px numeral in `var(--ink)`, small eyebrow label above
- [ ] Kill all `font-black`, `bg-blue-100`, `text-blue-600` in tiles
- [ ] "Loss reasons" / charts: hairline bars in `var(--ink-5)` with `var(--ember)` fill
- [ ] Activity feed: serif italic actor name, sans body, mono timestamp in `var(--ink-4)`
- [ ] Remove all emoji (`🔔`, `📞`, `✅`, `📋`) → Lucide icons

---

## Phase 6 — Pipeline (`src/views/Pipeline.vue`)

Target: `ui_kits/crm/Pipeline.jsx`.

- [ ] Column headers: eyebrow (uppercase 10px ink-3) + Cormorant count
- [ ] Card: bone, 1px `var(--bone-edge)`, 16px padding, no shadow
- [ ] Client name: Cormorant italic 16px, line-height 1.3
- [ ] Project title: Inter 12px ink-3, margin-top 8px
- [ ] Value: mono font, ink-2
- [ ] Tier: chip (Phase 4)
- [ ] Stage colors → tonal hairline only (see `--positive`, `--caution`, `--critical`, `--info`)

---

## Phase 7 — Clients (`src/views/Clients.vue`)

Target: `ui_kits/crm/Clients.jsx`.

- [ ] Table header row: eyebrow style, bottom hairline `var(--ink)`
- [ ] Rows: no zebra stripes, just bottom hairline in `var(--ink-5)`
- [ ] Client name: Cormorant italic; all other cells Inter 13px
- [ ] Status column: chip component
- [ ] Search input: borderless with bottom hairline, Cormorant italic placeholder

---

## Phase 8 — Contracts & Portal (`src/views/Contracts.vue`, `src/views/public/PublicSign.vue`)

Target: `ui_kits/crm/ContractsLog.jsx` + `PortalSign`.

- [ ] Contracts table: same pattern as Clients
- [ ] Signature portal: full-bleed paper, centered bone card, arch mark watermark, signature pad with ink-only stroke
- [ ] "Signed" confirmation: ember hairline, serif italic confirmation line

---

## Phase 9 — Project Detail Drawer (`src/components/ProjectDetail.vue`)

- [ ] Drawer enters from right; backdrop `rgba(14,14,12,0.4)` no blur (brand uses solid)
- [ ] Header: flat paper-2, Cormorant title, chip for tier
- [ ] Tabs: eyebrow style, active → ink underline (NOT blue)
- [ ] "Suggested Action" section: replace `bg-amber-50 border-l-4 border-amber-400 🔔` with a clean bone card, a `Sparkles` Lucide icon in `var(--ember)`, Cormorant italic title

---

## Phase 10 — Contract Editor (`src/components/ContractEditor.vue`)

- [ ] Document canvas stays white (it represents a printed page)
- [ ] Surrounding chrome uses brand tokens
- [ ] Toolbar buttons: ghost variant
- [ ] "Send for signature" CTA: ember button

---

## Global find-and-replace (after component work)

Run these across `src/`:

| Find | Replace |
|---|---|
| `text-blue-600` | `text-[var(--ember)]` |
| `bg-blue-600` | `bg-[var(--ink)]` |
| `bg-blue-700` | `bg-[var(--ink)]` |
| `from-blue-600 to-blue-700` | `bg-[var(--ink)]` (drop gradient) |
| `hover:bg-blue-700` | `hover:opacity-90` |
| `focus:ring-blue-500` | `focus:ring-[var(--ink)]` |
| `bg-slate-900` | `bg-[var(--ink)]` |
| `font-black` | `font-normal italic` + swap to serif class |
| `rounded-xl`, `rounded-2xl` on cards | `rounded-sm` (2px) or remove |
| `shadow-2xl`, `shadow-xl` on modals | `shadow-none` + 1px border |

---

## Verification

After each phase:
- [ ] `npm run dev` and visit affected screen
- [ ] Compare against corresponding `ui_kits/crm/*.jsx` preview
- [ ] No regressions in reactivity / Supabase calls
- [ ] Console clean

---

## Out of scope (do NOT touch)

- `src/router/`
- `src/composables/`
- `src/lib/supabaseClient.js`
- `supabase/` migrations
- `.env*`
- `package.json` dependencies (everything needed is already installed)

---

## Definition of done

- [ ] All 10 phases complete
- [ ] No Tailwind blue/slate classes remain in Vue templates (grep passes)
- [ ] No emoji in templates (grep passes)
- [ ] Fonts load (Cormorant + Inter visible in DevTools Network)
- [ ] Logo present in Login + Sidebar
- [ ] Each screen visually matches its `ui_kits/crm/` counterpart

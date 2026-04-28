# SIINGE STUDIO — Design System

> Editorial minimalism for an internal tool. Ink on warm paper. Serif headlines, structured sans for UI. Restraint over ornament.

---

## Sources

This system was reverse-engineered from a small set of inputs and the brand mark itself:

- **Logo**: `uploads/SIINGE LOGO 2.png` — hand-drawn arch enclosing a sun rising over waves; SIINGE wordmark set in a classic high-contrast serif. The mark is monoline, all strokes a single weight. Re-cropped derivatives live in `assets/`.
- **Codebase**: `newcrm/client-crm/` — Vue 3 + Vite + Tailwind 4 + Supabase internal CRM. Five core surfaces:
  - `Login.vue` — the only screen that already speaks the brand: black-on-cream, uppercased SIINGE STUDIO, ultra-wide tracking on labels.
  - `AppLayout.vue` — the chrome (sidebar + topbar). Currently `slate-900 / blue-400` — generic SaaS, not on-brand.
  - `Dashboard.vue` — KPIs, win-rate, demographics. Heavy use of `font-black` and `tracking-widest` uppercase eyebrows (good!) but rainbow accent colors (off-brand).
  - `Pipeline.vue` — Kanban with 9 stages, tier accents, status chips.
  - `Clients.vue` / `Contracts.vue` — directory tables with NDA/SOW status.
  - `ClientPortal.vue` — public-facing signature flow, PDF preview + draw-to-sign.

The brief: **"this is an internal CRM, but I'm testing this tool to see how can you improve the whole site."** This system is the answer — the tokens, components, and screens needed to bring the existing CRM in line with the elegance of the Login screen and the logo.

---

## What's in here

| File / Folder | Purpose |
|---|---|
| `colors_and_type.css` | Single source of truth for color, type, spacing, radii, shadow, motion tokens. Drop-in CSS variables. |
| `assets/` | Brand marks (full lockup, mark-only, wordmark-only, white reverse). |
| `preview/` | Specimen cards rendered for the Design System tab. One sub-concept per card. |
| `ui_kits/crm/` | Re-skinned CRM screens — sidebar, dashboard, pipeline, clients table, signature portal. JSX components + interactive `index.html`. |
| `SKILL.md` | Skill manifest so this folder works as a portable Agent Skill. |

---

## CONTENT FUNDAMENTALS

Voice is **direct, briefly stated, and uppercased where it counts**. The CRM already establishes this in its labels and microcopy — we lean into it.

### Tone
- **Quiet authority.** Statements, not pitches. "Authorized Personnel Only" not "Welcome back to your dashboard!" The signed-document confirmation is a single line: "Document Signed & Secured."
- **Studio, not startup.** No exclamation points. No emoji in product copy. No "Let's…" or "Awesome!" If the existing CRM uses an emoji (📞 ✅ 🔔), treat as legacy and replace with type or icon.
- **Operator-facing.** This is internal software. Copy assumes the reader knows the business. Skip explainers; show the data.

### Casing
- **UPPERCASE + wide tracking** for: section labels, button text, status chips, table headers, eyebrows. Tracking `0.18em` for labels, `0.08em` for buttons.
- **Title Case** for screen titles when set in serif display ("Sales Pipeline", "Clients Directory").
- **Sentence case** for body copy and form labels-in-context.
- The wordmark is always **SIINGE** or **SIINGE STUDIO** — never "Siinge" mid-sentence. The mark itself is the source of truth.

### Person & address
- **You** for the operator ("Your pipeline value", "Sign here").
- **The client** for the third party ("The client opened this document on…"). Never "they" before naming who.
- **We** is reserved for studio-to-client artifacts (proposals, public portal). Internal CRM never says "we."

### Length & rhythm
- Page subtitle = one sentence, no period if under ten words. ("Real-time insights on deal flow, revenue, and client segments." — keep the period when it's a full sentence; drop it for fragments.)
- Empty states: a single label, uppercased. ("EMPTY STAGE", "NO CONTRACTS FOUND".)
- Confirmation dialogs: title in 2–4 words, body one sentence stating the consequence.

### Specific examples (lifted, then refined)

| Before (in repo) | After (on brand) |
|---|---|
| "Welcome" | (remove — the topbar shouldn't greet) |
| "+ Add Client" | "NEW CLIENT" with a hairline `+` glyph |
| "Loading clients..." | "LOADING" with a thin progress rule |
| "Are you sure you want to delete…" | "Delete this client. All linked projects and signed contracts go with it." |
| "📋 No contracts found" | "NO CONTRACTS ON FILE" |
| "Crunching numbers..." | "COMPILING" |
| "✅ Sept 12, 2025" (signed) | "Signed · Sept 12, 2025" (positive ink, no emoji) |

### Numbers
- Currency: `$12,400` — comma separator, no decimals on whole values. Use mono numerals (`tabular-nums`) in tables.
- Dates: `12 Sept 2025` (day-month-year, abbreviated month, no comma). Long form for formal docs: `September 12, 2025`.
- Refs / IDs: 8-char monospace in `--ink-3`, prefixed `#` only when shown standalone.

### Emoji
**Effectively none.** The codebase has stragglers (📞 📋 ✅ 🔔 🔒) — replace each with either type, a thin SVG icon, or remove entirely. The single sanctioned glyph is the SIINGE mark.

---

## VISUAL FOUNDATIONS

The brand is **ink on warm paper**. The logo's monoline strokes set the rule: thin, deliberate, uniform.

### Color
- **Paper (`#FAF7F2`)** is the default background — never pure white in app chrome. Cards sit on paper as bone-white (`#FFFFFF`) with a hairline edge.
- **Ink (`#0E0E0C`)** does the heavy lifting: type, primary buttons, hairlines, the sidebar fill in dark variant.
- **Ember (`#C2410C`)** is the only chromatic accent — used at most twice per screen (a CTA, a single signed indicator). Never as decoration. Never as a background fill larger than a chip.
- Semantic tones (moss / amber-ochre / terracotta / dusk) are muted, earthy variants of green / yellow / red / blue. Never neon. Never web-safe. They appear only on status indicators.

### Type
- **Cormorant Garamond** for display (page titles, section openers, hero numbers, signed quotes). High-contrast classical serif — the wordmark feel.
- **Inter** for everything else: nav, body, table cells, buttons, form labels.
- **JetBrains Mono** for IDs, refs, and tabular numerals in tables.
- The signature move: an **uppercased Inter eyebrow with `0.18em` tracking** above every editorial title in serif. This is the visual rhythm of the brand.
  - `RECORD #4F2A9C` *(eyebrow)*
  - *Catalina Beach Studio* *(serif title)*

### Spacing & layout
- **4px base, but breathe.** Card padding is `24px` minimum; section gutters `48px`; page edges `64px` on desktop.
- **Editorial rule lines** (1px ink hairlines) are the primary divider — preferred over shadows or background bands. They run full bleed across sections.
- **Asymmetric layouts** are encouraged: a serif headline left-aligned to a narrow column with metadata stacked beside it, paper visible between. Avoid centered "marketing" hero patterns.
- Fixed elements: sidebar (240px), topbar (64px), public portal narrows to 720px max.

### Backgrounds & imagery
- Solid **paper** by default. Sunken regions (table headers, sidebar dark variant) shift to `--paper-2` or `--ink`.
- **No gradients.** None. Not for buttons, not for hero washes, not for cards.
- **No textures, no grain, no patterns.** The mark itself is the only ornament.
- When imagery is used (project covers, client headshots), it's **B&W or warm-monochrome**, treated with `mix-blend-multiply` against paper — never floated on a colored card.
- Optional: the sun-arch **mark itself**, scaled large, set at 6% opacity in the corner of empty states or login. Used surgically.

### Animation
- **Quiet.** `cubic-bezier(0.2, 0.6, 0.2, 1)` — a single ease curve.
- Durations: `120ms` for hover/feedback, `220ms` for transitions, `420ms` for entrances. Nothing longer.
- **No bounces, no springs, no overshoot.** Opacity fades and 4–8px translations only.
- Loading: a thin 1px progress bar that fills left-to-right at `--ember`. No spinners. (The repo has spinners — replace.)

### Hover & press
- **Hover**: shift fill by one step in the neutral ramp. (`paper` → `paper-2`, `bone` → `paper`, ink button → `ink-2`.) No color change for chips. Underline appears on hover for serif links — solid 1px in ember.
- **Press**: opacity drops to `0.85`. No scale transform on buttons. Cards may shift 1px down on press to feel pressed-into-paper.
- **Focus**: 2px ink outline at `2px` offset. No browser-default blue ring.

### Borders
- **1px ink hairlines** dominate. Borders are either `--border` (taupe `#C9C2B4`) on paper, or `--border-soft` (`#EDE7DA`) for cards-on-paper, or full `--ink` for the editorial rule.
- **No double borders. No colored borders.** A border in ember is the exception — used once, on a CTA outline state if at all.

### Shadow system
- **Almost none.** Cards rest on paper with a 1px edge, not a shadow.
- `--shadow-1` is a near-imperceptible 1px lift for hovered table rows.
- `--shadow-2` for floating menus / dropdowns.
- `--shadow-3` reserved for modal overlays (a soft dark cast 60% below the modal).
- Inner shadows are forbidden except on the iframe well in the signature portal.

### Capsules vs gradients
- Status uses **square chips with 2px radius** and an inner-set 1px border in the same hue family. No pills (except the live "open" status indicator dot).
- The **arch shape** (`--r-arch`) is a brand callback — used sparingly: avatar frames, the empty-state container, the login card top edge.

### Transparency & blur
- Modal scrims: `rgba(14,14,12,0.32)` with `backdrop-filter: blur(2px)`.
- The sidebar's dark variant uses a solid ink fill — **no glassmorphism**.
- Watermark imagery: 6% opacity, no blur.

### Imagery vibe
- Warm-monochrome or true B&W. Soft natural light. Documentary or studio, never "stock."
- If color appears in imagery, it's earth-toned — clay, sand, sea-glass. Never saturated.

### Corner radii
- `0` — full-bleed sections, the editorial rule.
- `2px` — chips, badges, status indicators, inputs.
- `4px` — buttons, default cards.
- `8px` — modals, prominent surface cards.
- `12px` — public portal main card only (a softer touchpoint for clients).
- `999px` (pill) — *only* for status dots and avatar.
- `--r-arch` — the sun-arch shape, used 1–2 times per screen max.

### Cards (the canonical pattern)
A SIINGE card is:
- **Bone surface (`#FFFFFF`)** on paper.
- **1px hairline edge** (`--border-soft`) — never a shadow.
- **24px padding minimum.**
- **An eyebrow label** in the top-left corner (uppercase, wide tracking, `--ink-3`).
- **A serif title** beneath it, generous line-height.
- **Sans body / metadata** below.
- A **right-aligned action**, if any, set in small uppercased text or a thin chevron.

### Layout rules
- Page header band is `paper`. Content area is `paper`. Sidebar is `ink` (dark) or `paper-2` (light variant).
- Sticky table headers carry a 1px ink underline, not a shadow.
- Modals letterbox the page with a 32% ink overlay; modal content is bone with `--shadow-3`.

---

## ICONOGRAPHY

The codebase already imports **`lucide-vue-next`** (Lucide). The team has chosen Lucide. We honor that.

- **Lucide icons** are the standard: 1.5px stroke, 24×24 viewBox, rounded line caps. Used at `16px` (inline with text) or `20px` (in nav, buttons, table actions). CDN: `https://unpkg.com/lucide-static@latest/icons/<name>.svg`.
- The codebase also has a custom sprite at `newcrm/client-crm/public/icons.svg` — copied into `assets/icons.svg` for reference.
- **Hand-rolled inline SVG** (the small action icons in `Clients.vue`: pencil, trash, plus) should be replaced with Lucide equivalents (`Pencil`, `Trash2`, `Plus`) at consistent stroke weight.
- **Emoji are deprecated** (see CONTENT). Specifically: replace 📞→`Phone`, 📋→`FileText`, ✅→`Check`, 🔔→`Bell`, 🔒→`Lock`.
- **Status uses no icon at all** — a 6px dot in the appropriate semantic color is enough.
- The **SIINGE mark** is the single brand glyph. Used as: favicon, login watermark, sidebar header, empty-state watermark (at 6% opacity, very large), and on the public portal letterhead.

### Substitutions flagged
None — Lucide is a perfect match for the brand's monoline aesthetic and is already in the codebase.

### Font substitution flag
- **Cormorant Garamond** (Google Fonts) is the closest free analogue to the wordmark's display serif. The original wordmark may be a custom-cut or commercial face (Bodoni-adjacent / Mrs Eaves-adjacent). If a licensed file exists, drop the `.woff2` into `fonts/` and update `--font-display`.
- **Inter** chosen for UI sans (already in the repo via `style.css`).
- **JetBrains Mono** is a defensible default for IDs; could swap for IBM Plex Mono if a more editorial mono is preferred.

---

## Index

```
.
├── README.md                  ← you are here
├── SKILL.md                   ← Agent Skill manifest
├── colors_and_type.css        ← all design tokens
├── assets/
│   ├── logo-mark-wordmark.png ← full lockup (the original)
│   ├── logo-mark.png          ← arch + sun + waves only
│   ├── logo-wordmark.png      ← SIINGE wordmark only
│   ├── logo-mark-wordmark-white.png ← reversed for dark surfaces
│   └── icons.svg              ← legacy sprite from the codebase (reference)
├── preview/                   ← specimen cards for the Design System tab
│   └── (color, type, components, brand cards)
└── ui_kits/
    └── crm/
        ├── README.md
        ├── index.html         ← interactive re-skin of the CRM
        ├── tokens.css         ← scoped import of colors_and_type
        ├── Sidebar.jsx
        ├── TopBar.jsx
        ├── Dashboard.jsx
        ├── Pipeline.jsx
        ├── Clients.jsx
        ├── ContractsLog.jsx
        ├── PortalSign.jsx
        └── primitives.jsx     ← Button, Chip, Eyebrow, RuleLine, etc.
```

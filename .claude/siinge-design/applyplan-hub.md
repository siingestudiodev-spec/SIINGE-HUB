# SIINGE Apply Plan — SIINGE-HUB (Manufacturers Hub)

Per-file checklist for re-skinning **SIINGE-HUB** to match the CRM brand language.

> **IMPORTANT — No italics.** Where the CRM uses Cormorant Garamond italic for editorial accents, SIINGE-HUB uses **Inter at heavier weights or wider tracking** instead. The brand stays minimal and editorial, but typographically straight.

**Stack:** Vue 3, Pinia, Vue Router, Supabase, Vite. No Tailwind — uses CSS custom properties (already SIINGE-aligned in `src/style.css`).

**Status:** Tokens ✅ already applied. Need to: (1) remove emojis, (2) localize logo, (3) refine type, (4) polish components.

---

## Phase 0 — Prep

- [ ] `git checkout -b feat/siinge-polish`
- [ ] Install Lucide for Vue: `npm i lucide-vue-next`
- [ ] Copy `assets/logo-mark-wordmark.png` → `src/assets/siinge-logo.png`
- [ ] Copy `assets/logo-mark-wordmark-white.png` → `src/assets/siinge-logo-white.png`
- [ ] Copy `assets/logo-mark.png` → `src/assets/siinge-mark.png` (icon-only)

---

## Phase 1 — Tipografía sin cursiva

**`src/style.css`**

- [ ] Verify Inter is the only font family (it already is — good)
- [ ] **Add display weight class** for what would have been "serif italic" in CRM:

```css
/* DISPLAY — uppercase, tracked, weight-driven (replaces serif italic from CRM) */
.display {
  font-family: var(--font-sans);
  font-weight: 300;          /* lighter weight = elegance without italic */
  font-size: var(--fs-28);
  letter-spacing: -0.01em;
  line-height: 1.15;
  color: var(--text-main);
}
.display--lg { font-size: var(--fs-36); font-weight: 200; letter-spacing: -0.02em; }
.display--sm { font-size: var(--fs-22); font-weight: 400; letter-spacing: -0.005em; }

/* TITLE — section/card titles */
.title {
  font-family: var(--font-sans);
  font-weight: 600;
  font-size: var(--fs-18);
  letter-spacing: -0.005em;
  color: var(--text-main);
}

/* NUMERIC — KPI and table figures */
.numeric {
  font-family: var(--font-sans);
  font-weight: 200;
  font-size: var(--fs-36);
  letter-spacing: -0.03em;
  font-feature-settings: 'tnum' 1, 'lnum' 1;
  line-height: 1;
}
```

**Rule of thumb:** wherever the CRM JSX uses `<Serif italic>`, SIINGE-HUB uses `<span class="display">` with weight 200–300 and tight tracking.

---

## Phase 2 — Logo + brand mark (`src/App.vue`, `src/views/LoginView.vue`)

- [ ] Replace `https://i.ibb.co/xK52ckkK/...` with `import logo from '@/assets/siinge-logo.png'` and bind `<img :src="logo">`. Same for the white version in dark mode.
- [ ] In `App.vue` navbar logo: use `siinge-mark.png` (icon-only) at 28px next to wordmark
- [ ] In `LoginView.vue`: use `siinge-logo.png` (full lockup) at max 96px
- [ ] Switch logo source dynamically based on theme:
```vue
<img :src="isDark ? logoWhite : logoDark" alt="SIINGE" class="logo" />
```

---

## Phase 3 — Eliminar TODOS los emojis (`src/App.vue`)

Replace navbar emojis with Lucide icons:

| Emoji | Reemplazo (Lucide) |
|---|---|
| 🏭 Manufacturers | `<Factory :size="14" />` |
| 📋 Projects | `<ClipboardList :size="14" />` |
| 🔍 Sourcing | `<Search :size="14" />` |
| 📧 Templates | `<Mail :size="14" />` |
| 📅 Calendar | `<Calendar :size="14" />` |
| 🎪 Events | `<PartyPopper :size="14" />` |
| 📞 Follow-ups | `<Phone :size="14" />` |
| 🔔 Notifications | `<Bell :size="16" />` |
| ☀️ / 🌙 Theme | `<Sun />` / `<Moon />` |
| ⎋ Logout | `<LogOut :size="16" />` |

**Pattern:**
```vue
<script setup>
import { Factory, ClipboardList, Search, Mail, Calendar, PartyPopper, Phone, Bell, Sun, Moon, LogOut } from 'lucide-vue-next'
</script>

<template>
  <router-link to="/manufacturers" class="nav-item" :class="{ active: isActive('/manufacturers') }">
    <Factory :size="14" :stroke-width="1.5" />
    <span>Manufacturers</span>
  </router-link>
</template>
```

- [ ] Keep `stroke-width="1.5"` on all icons (matches CRM iconography spec)
- [ ] Update `.nav-item` CSS: ensure `gap: 0.5rem` and `align-items: center`

---

## Phase 4 — Navbar refinement (`src/App.vue`)

- [ ] Change brand block: small mark (28px) + wordmark in Inter 700, uppercase, tracking `var(--tr-eyebrow)`
- [ ] Active nav state: keep ember underline, but **remove the `font-weight: 700` on active** — change to `font-weight: 600` (subtler shift)
- [ ] Notification badge: change `border-radius: 50%` → `border-radius: var(--r-1)` (2px) for consistency with brand's anti-pill stance
- [ ] Theme toggle button: replace inline emoji with `<Sun :size="14" />` / `<Moon :size="14" />`
- [ ] Logout button: replace ⎋ with `<LogOut :size="14" />`

---

## Phase 5 — LoginView (`src/views/LoginView.vue`)

- [ ] Replace `<h1>SIINGE STUDIO</h1>` (currently small uppercase) with a **larger, lighter** treatment:
```vue
<h1 class="display display--lg">SIINGE STUDIO</h1>
<p class="eyebrow" style="margin-top: 8px;">Manufacturers Hub</p>
```
- [ ] Remove the secondary "app-name" line (consolidate into eyebrow above)
- [ ] Subtitle "Sign in to your workspace" → eyebrow style, color `var(--text-muted)`
- [ ] Background: add faint mark watermark at 4% opacity, bottom-right (use `siinge-mark.png` as `<img>` absolute-positioned)
- [ ] Button arrow `→` → replace with Lucide `<ArrowRight :size="14" />`

---

## Phase 6 — ManufacturersView (`src/views/ManufacturersView.vue`) — 47KB, biggest file

- [ ] Audit all emojis: search for `[\u{1F300}-\u{1FAFF}]` and replace with Lucide
- [ ] Tier badges: ensure they use `--positive-soft / --positive`, etc. (not raw hex)
- [ ] Table header rows: use `.eyebrow` class
- [ ] Card titles: use `.title` class
- [ ] Numeric counts/totals: use `.numeric` class
- [ ] Status pills: same shape language as CRM chips — 2px radius, uppercase 10px, tracking 0.14em

---

## Phase 7 — ProjectsView (`src/views/ProjectsView.vue`) — 48KB

Same treatment as ManufacturersView:
- [ ] De-emoji
- [ ] Apply `.eyebrow`, `.title`, `.numeric` classes consistently
- [ ] Stage colors → tonal hairlines only (`--positive`, `--caution`, `--critical`, `--info`)
- [ ] Drawer/modal headers: flat ink background, light-weight Inter title (NO italic)
- [ ] Action buttons: ink primary, ember CTA, ghost secondary

---

## Phase 8 — All other Views (uniform pass)

For each of:
- `src/views/CalendarView.vue`
- `src/views/Events.vue`
- `src/views/FollowUpsView.vue`
- `src/views/ProjectSourcingView.vue`
- `src/views/QuoteComparison.vue`
- `src/views/Sourcing.vue`
- `src/views/TemplatesView.vue`
- `src/views/TestingView.vue`

Apply this checklist:
- [ ] Remove all emojis → Lucide
- [ ] Page header: `.eyebrow` + `.display` (NOT serif italic)
- [ ] Section titles: `.title`
- [ ] Numbers/counts: `.numeric`
- [ ] Buttons: ink primary / ember CTA / ghost
- [ ] Pills/chips: 2px radius, uppercase 10px
- [ ] No gradients, no shadows beyond `var(--shadow-1)` for hovers

---

## Phase 9 — Components (`src/components/`)

Currently only `HelloWorld.vue` exists. As you extract reusable pieces from the views, create:

- [ ] `src/components/ui/Btn.vue` — variants: primary (ink), ember (CTA), ghost, danger
- [ ] `src/components/ui/Chip.vue` — tones: neutral, pos, cau, crit, info, ember
- [ ] `src/components/ui/Eyebrow.vue` — tiny uppercase label
- [ ] `src/components/ui/Display.vue` — large light-weight type (replaces "serif italic" pattern from CRM)
- [ ] `src/components/ui/Card.vue` — `var(--bg-card)` + `var(--border-light)` + 2–4px radius

Reference `ui_kits/crm/primitives.jsx` from the design-system folder for prop shapes — but **do not port italic styling**.

---

## Global find-and-replace

| Find | Replace with |
|---|---|
| `font-style: italic` | (remove) |
| `font-family: 'Cormorant'` or `serif` | `var(--font-sans)` (Inter) |
| Any emoji `🏭📋🔍📧📅🎪📞🔔☀️🌙⎋✅❌⚠️📞🎯` | Lucide icon |
| `border-radius: 999px` (pills) | `var(--r-1)` (2px) — except avatars |
| `border-radius: 50%` on small badges | `var(--r-1)` |
| Inline `#xxxxxx` colors | `var(--*)` token |
| `font-weight: 800` or `900` | `font-weight: 200` or `300` (light editorial) |

---

## Out of scope (do NOT touch)

- `src/router/`
- `src/stores/themeStore.js` (works fine, already brand-aligned)
- `src/lib/supabase.js`
- `supabase/` migrations
- `.env`
- `package.json` (only addition: `lucide-vue-next`)

---

## Verification

After each phase:
- [ ] `npm run dev`
- [ ] Visit affected screen in light mode AND dark mode
- [ ] No console errors
- [ ] No emoji visible in DOM (use DevTools find: 🏭 etc.)
- [ ] Compare against `ui_kits/crm/index.html` — visual sibling, not twin (no italics)

---

## Definition of done

- [ ] Zero emojis in any `.vue` template
- [ ] Logo loads from local `src/assets/`, not external URL
- [ ] Inter is the only font family
- [ ] Display headings use weight 200–300 + tight tracking (the "no-italic editorial" signature)
- [ ] All tier/status pills are 2px radius, uppercase, tracked
- [ ] Light + dark modes both look intentional
- [ ] All 11 view files audited

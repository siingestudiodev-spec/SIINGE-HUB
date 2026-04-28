# SIINGE CRM — UI Kit

A re-skin of the existing `newcrm/client-crm/` Vue app in the SIINGE editorial-minimalist system. Click-thru prototype, not production code.

## Files
- `index.html` — interactive entry. Boots into Login, persists to localStorage.
- `primitives.jsx` — `Btn`, `Chip`, `Field`, `Input`, `Card`, `Icon`, `SiingeMark`, `Eyebrow`, `Serif`, `Rule`.
- `Sidebar.jsx` — ink sidebar + topbar.
- `Login.jsx` — full-bleed login with watermark mark.
- `Dashboard.jsx` — KPIs, loss-reasons, demographics, activity feed.
- `Pipeline.jsx` — kanban with editorial column heads.
- `Clients.jsx` — directory table with search + status chips.
- `ContractsLog.jsx` — contracts table + public sign portal.

## What changed vs the existing CRM
| Before | After |
|---|---|
| `slate-900` sidebar + `blue-400` accent | Ink sidebar with brand mark, ember active rail |
| `font-black` rainbow KPI tiles | Display-serif numerals on bone with ember accent |
| Tier left-border in purple/blue/slate | Ink/neutral chips, single ember accent reserved for CTA |
| Emoji in tables (📞 ✅ 📋) | Lucide icons + type-only status |
| Spinners, `animate-pulse` | A single live dot for "opened" state; no spinners |
| Generic blue buttons | Ink primary, ember CTA, ghost secondary |

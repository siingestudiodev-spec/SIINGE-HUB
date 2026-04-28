# HANDOFF — Applying SIINGE to the CRM with Claude Code

This folder is a **Claude Code Skill**. Drop it next to (or above) the `newcrm/` repo and let Claude Code drive the re-skin.

---

## Setup (one time, 2 min)

### Option A — Skill lives inside the repo (simplest)
```
newcrm/
  client-crm/
  .claude/
    siinge-design/      ← unzip this folder here
      SKILL.md
      README.md
      HANDOFF.md
      applyplan.md
      colors_and_type.css
      assets/
      ui_kits/
      preview/
```

### Option B — Skill lives globally (reuse across projects)
```
~/.claude/skills/siinge-design/
  SKILL.md
  README.md
  ...
```
Claude Code auto-discovers skills in `~/.claude/skills/`.

---

## How to run it

Open `newcrm/` in VS Code, start Claude Code, and paste **one of these prompts** depending on how bold you want to be.

### Prompt 1 — Safest: read + plan, no edits yet
> Read `.claude/siinge-design/SKILL.md`, `README.md`, and `applyplan.md`. Then open `newcrm/client-crm/src/` and cross-reference the applyplan against the actual files. Tell me:
> 1. Which files in the plan exist / are missing / have moved
> 2. Any risky edits (logic-adjacent, not pure cosmetic)
> 3. A recommended order to tackle them in
> Do NOT edit anything yet.

### Prompt 2 — Foundation pass (tokens + fonts + logo, no component rewrites)
> Using `.claude/siinge-design/`, do Phase 1 from `applyplan.md` only:
> - Copy `colors_and_type.css` into `newcrm/client-crm/src/styles/siinge-tokens.css`
> - Import it at the top of `src/style.css`
> - Add the Google Fonts link to `index.html`
> - Copy `assets/logo-mark-wordmark.png` into `src/assets/`
> - Replace the Vite logo in `Login.vue` and `AppLayout.vue` with the SIINGE mark
> Stop after Phase 1. Show me the diff.

### Prompt 3 — Full re-skin, file by file
> Using `.claude/siinge-design/`, work through `applyplan.md` Phase by Phase. After each Phase, pause and show me the diff before moving on. Match the visual treatment of `ui_kits/crm/*.jsx` — these are the authoritative targets. Do not change Vue reactivity, routing, Supabase calls, or business logic. Cosmetic edits only.

### Prompt 4 — Single file (safest iterative loop)
> Re-skin ONLY `newcrm/client-crm/src/components/Login.vue` to match `.claude/siinge-design/ui_kits/crm/Login.jsx`. Preserve all Supabase auth logic. Show diff before applying.

Then repeat with `AppLayout.vue`, `Dashboard.vue`, etc.

---

## Tips for working with Claude Code here

- **Always ask for a plan first.** The model is better when it has read both sides before editing.
- **Reference the JSX kit as source of truth.** e.g. *"match `ui_kits/crm/primitives.jsx` `Btn`"*.
- **Don't let it touch:** `router/`, `composables/`, `lib/supabaseClient.js`, `.env*`, `supabase/`. These are logic, not visuals.
- **Keep emoji-stripping explicit.** Say *"replace all emoji in Vue templates with Lucide icons via `lucide-vue-next` (already installed)"*.
- **If it drifts from the brand,** paste `README.md`'s VISUAL FOUNDATIONS section into the chat as a reminder.

---

## Verifying the result

After each phase, Claude Code should run:
```bash
cd newcrm/client-crm
npm run dev
```
Open the app, click through Login → Dashboard → Pipeline → Clients → Contracts. Compare side-by-side with the interactive kit at `.claude/siinge-design/ui_kits/crm/index.html` (open it in any browser).

---

## When you're done

- Commit the `.claude/siinge-design/` folder too — it becomes living documentation.
- If the team adopts it, promote to `~/.claude/skills/` so other repos get it.

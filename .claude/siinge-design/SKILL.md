---
name: siinge-design
description: Use this skill to generate well-branded interfaces and assets for SIINGE Studio, either for production or throwaway prototypes/mocks/etc. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping.
user-invocable: true
---

Read the README.md file within this skill, and explore the other available files.
If creating visual artifacts (slides, mocks, throwaway prototypes, etc), copy assets out and create static HTML files for the user to view. If working on production code, you can copy assets and read the rules here to become an expert in designing with this brand.

If the user asks you to apply this design system to an existing codebase (especially the `newcrm/client-crm/` Vue app), read `HANDOFF.md` and then `applyplan.md` — the latter is a per-file, phase-by-phase checklist. Work one phase at a time, show diffs before applying, and use `ui_kits/crm/*.jsx` as the authoritative visual target. Do NOT change Vue reactivity, routing, Supabase logic, or dependencies — cosmetic edits only.

If the user invokes this skill without any other guidance, ask them what they want to build or design, ask some questions, and act as an expert designer who outputs HTML artifacts _or_ production code, depending on the need.

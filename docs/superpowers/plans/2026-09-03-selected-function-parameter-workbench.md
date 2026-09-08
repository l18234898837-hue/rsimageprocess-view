# Selected Function Parameter Workbench Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make each multisource product parameter workbench show only the parameter groups required by the functions selected for that product.

**Architecture:** Keep product pipelines and existing form validators intact. Add a pure product-aware visibility policy, pass selected targets into product drawers, and conditionally render only relevant groups and summaries. Automatic dependency resolution remains an execution-plan concern.

**Tech Stack:** Vue 3, TypeScript, Vitest, existing Element Plus drawers.

**Spec:** `docs/superpowers/specs/2026-09-02-multisource-processing-refactor-design.md`

## Global Constraints

- Modify only the multisource satellite processing frontend module.
- Do not change backend APIs or add dependencies.
- Preserve existing upload, validation, task, retry, and download behavior.
- No parameter group for an unselected target may be rendered in the workbench.
- Product-specific selectable targets and parameter visibility must remain distinct from automatic prerequisites.

---

### Task 1: Define selected-function parameter visibility

**Files:**

- Create: `src/features/multisource/parameterVisibility.ts`
- Test: `src/features/multisource/parameterVisibility.test.ts`

- [ ] Write tests for empty selection, GF-6 preprocessing, GF-6 derived functions, and product-specific target filtering.
- [ ] Run `pnpm exec tsx --test src/features/multisource/parameterVisibility.test.ts` and verify it fails because the policy is absent.
- [ ] Implement typed product policies and `getVisibleParameterGroups(productId, selectedTargets)`.
- [ ] Run the focused test and verify it passes.

### Task 2: Connect product drawers and summaries

**Files:**

- Modify: `src/components/LeftPanel/MultiSourceSatelliteProcess.vue`
- Modify: `src/features/multisource/Gf6WfvL1aParameterDrawer.vue`
- Modify: `src/features/multisource/Fy3hMersiParameterDrawer.vue`
- Modify: `src/features/multisource/Fy4bAgriParameterDrawer.vue`
- Modify: `src/features/multisource/Hy2dAltimeterParameterDrawer.vue`
- Modify: `src/features/multisource/productParameterDrawer.test.ts`

- [ ] Add failing source-contract assertions that every drawer receives selected targets and that product summaries are gated by a non-empty selection.
- [ ] Run the focused test and verify the new assertions fail.
- [ ] Pass `selectedTargets` to each drawer, use the policy for product-specific groups, and hide the summary/workbench when no target is selected.
- [ ] Keep existing form state and validation; only render selected-function parameter groups and relevant shared fields.
- [ ] Run focused tests and verify they pass.

### Task 3: Verify the multisource module

**Files:**

- No production files outside the multisource module.

- [ ] Run `pnpm test:multisource`.
- [ ] Run `pnpm build`.
- [ ] Check `git diff --name-only` and confirm all source changes are inside the multisource module.

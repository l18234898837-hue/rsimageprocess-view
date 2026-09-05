# Multisource Coordinator Refactor Design

## Goal

Reduce the orchestration responsibility of the multisource satellite workspace without changing its rendered UI, product workflow, API contract, or behavior outside the multisource module.

## Scope

In scope:

- Restore corrupted Chinese text in the multisource files changed by the `316409a` merge.
- Extract repeated product-form reset and selected-target synchronization from `MultiSourceSatelliteProcess.vue`.
- Extract product-specific workbench and drawer data preparation for every supported product from the parent component.
- Add focused tests for the extracted state adapter and for restored visible text.

Out of scope:

- Any backend, API, router, map, or left-panel shell change.
- Any DOM, CSS class, layout, visual style, copy choice, interaction sequence, or drawer behavior change.
- A registry-driven rewrite of all product summary components.
- Changes to non-multisource product workflows.

## Baseline Recovery

The current working tree contains valid UTF-8 byte sequences whose text values were incorrectly converted to mojibake in several multisource source and test files. `13a5e08` is the verified Chinese-text baseline for the pre-merge multisource implementation. `316409a` contributes current UI and interaction refinements.

Recovery rules:

1. Restore only user-facing and test text values from the verified baseline or the equivalent intended Chinese copy visible in the `13a5e08..316409a` diff.
2. Keep all structural, event-handling, accessibility, and style additions introduced by `316409a`.
3. Do not use blind whole-file checkout or character-set transforms.
4. Verify each repaired file remains strict UTF-8 and contains no replacement character.

## Architecture

`MultiSourceSatelliteProcess.vue` remains the single UI coordinator. It owns the reactive product form objects, `useProcessingTask`, upload events, template selection, drawer visibility, and template markup. Existing child components keep their public props and emitted events.

Create `src/features/multisource/multisourceProductState.ts` as a pure state adapter. It receives the existing product form objects through explicit structural interfaces; it has no Vue imports and no DOM dependency.

The adapter exposes three operations:

```ts
export function resetMultisourceProductForms(
  forms: MultisourceProductForms
): void;
export function syncProductAlgorithmSelection(
  forms: MultisourceProductForms,
  selectedTargets: readonly string[]
): void;
export function buildHy1cWorkbenchSummary(
  form: Hy1cCziL2aForm
): Hy1cWorkbenchSummary;
export function buildFy3hWorkbenchSummary(
  form: Fy3hMersiForm
): Fy3hWorkbenchSummary;
export function buildHy2dWorkbenchSummary(
  form: Hy2dAltimeterForm
): Hy2dWorkbenchSummary;
export function buildFy4bWorkbenchSummary(
  form: Fy4bAgriForm,
  metricLabel: (metric: string) => string
): Fy4bWorkbenchSummary;
export function buildGf6WorkbenchSummary(
  form: Gf6WfvL1aForm,
  metricLabel: (metric: string) => string
): Gf6WorkbenchSummary;
```

`resetMultisourceProductForms` mutates only the existing reactive form objects with their existing `default...Form()` factories. `syncProductAlgorithmSelection` keeps the current contract: selected targets enable only the matching algorithm controls for FY-3H, FY-4B, and GF-6, and enable HY-2D gridding only for `track-gridding`. HY-1C remains untouched because its existing form uses a different local control contract.

The adapter also exposes product-summary builders for HY-1C, FY-3H, HY-2D, FY-4B, and GF-6. Each builder maps its existing form state to the exact props and display values already consumed by that product's workbench and drawer. No builder returns template markup or CSS decisions.

`buildGf6WorkbenchSummary` maps the unchanged GF-6 form state to the existing workbench props: bands, grid, ROI, RGB channels, stretch, feature metric labels, and saliency source/threshold. `Gf6ProcessingWorkbench.vue` remains a presentational component. The other product-specific summaries retain their existing DOM and components; only their data preparation moves out of the parent.

## Data Flow

1. `ProcessingPlanPanel` emits a new `selectedTargets` array.
2. `MultiSourceSatelliteProcess.vue` stores the array as it does today.
3. The parent calls `syncProductAlgorithmSelection(forms, selectedTargets)`.
4. Product-summary builders derive the existing workbench and parameter-drawer display values from those unchanged form objects.
5. Computed parameter visibility, the execution plan, current parameter drawers, and existing workbench props consume the same selected target state and summary values.
6. On template changes, the parent calls `resetMultisourceProductForms(forms)` before clearing selected targets and closing the current parameter drawer.

No child receives new state that it did not receive before. No server payload or processing-plan algorithm changes.

## Verification

- Unit tests prove reset restores all product forms to their current defaults.
- Unit tests prove target selection changes only the existing affected algorithm flags.
- Unit tests prove every product summary matches the current parent formatting contract, including HY-1C, FY-3H, HY-2D, FY-4B, and GF-6.
- Existing source-contract tests are updated only for restored Chinese copy and the new adapter calls.
- Run `pnpm test:multisource`, `pnpm exec vue-tsc --noEmit --skipLibCheck`, `git diff --check`, and `pnpm build`.
- Open `http://localhost:8849/#/satellite-applications` and verify: package folding, selected-step execution plan, GF-6 workbench visibility, parameter drawer opening, and the restored Chinese labels.

# Multisource Coordinator Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract all product form and summary coordination from `MultiSourceSatelliteProcess.vue` without changing the UI.

**Architecture:** Keep `MultiSourceSatelliteProcess.vue` as the task and UI coordinator. Add a pure TypeScript adapter for all five product forms, with no Vue or DOM dependency. Existing workbench and drawer Vue components keep their current markup, props, events, CSS classes, and styles.

**Tech Stack:** Vue 3, TypeScript, Element Plus, Node `node:test`, `tsx`, Vite, Less.

**Spec:** `docs/superpowers/specs/2026-09-05-multisource-coordinator-refactor-design.md`

## Global Constraints

- Modify only `src/features/multisource/**`, `src/components/LeftPanel/MultiSourceSatelliteProcess.vue`, and focused multisource tests.
- Do not change backend requests, snapshots, router, map, left-panel shell, DOM hierarchy, CSS class names, visual layout, or user interaction sequence.
- Do not alter UI copy because of terminal rendering. Verify source files as UTF-8 and retain the current remote UI wording.
- Preserve UI refinements from `316409a`.
- Do not stage `.tools/`, local logs, or unrelated planning artifacts.

---

### Task 1: Verify Multisource Copy Encoding

**Files:**

- Modify: `src/components/LeftPanel/MultiSourceSatelliteProcess.vue`
- Modify: `src/components/LeftPanel/ProcessingPlanPanel.vue`
- Modify: `src/features/multisource/Gf6ProcessingWorkbench.vue`
- Modify: affected text-bearing parameter, template, pipeline, and test files under `src/features/multisource/`
- Test: `src/features/multisource/productParameterDrawer.test.ts`
- Test: `src/features/multisource/processingPlanPanel.test.ts`

**Interfaces:** Consumes readable text from `13a5e08` and behavior/UI additions from `316409a`. Produces identical behavior with readable Chinese runtime and test literals.

- [x] **Step 1: Verify representative Chinese-copy contracts**

Read representative source files as UTF-8 and assert their expected labels without changing runtime text:

```ts
assert.match(panel, /选择处理功能/);
assert.match(panel, /预处理/);
assert.match(gf6Workbench, /参数工作台/);
assert.match(gf6Workbench, /输出波段/);
assert.match(workspace, /卫星数据选择/);
```

- [x] **Step 2: Verify source encoding rather than terminal rendering**

Run `pnpm test:multisource -- --test-name-pattern="processing plan panel|GF-6 workbench summary"`.

Expected: the source is valid UTF-8; PowerShell display alone is not evidence of a source-text defect.

- [x] **Step 3: Leave verified text values unchanged**

Do not rewrite text based solely on terminal output. Preserve tags, handlers, conditions, styles, and additions from `316409a`.

- [x] **Step 4: Pass focused UTF-8 regression checks**

Add a focused test that reads the four workspace core files as UTF-8, asserts the representative labels above, and checks `assert.doesNotMatch(content, /\uFFFD/)`. Re-run the command from Step 2; expected result is PASS.

- [x] **Step 5: No copy-only commit is required**

```powershell
git add src/components/LeftPanel/MultiSourceSatelliteProcess.vue src/components/LeftPanel/ProcessingPlanPanel.vue src/features/multisource
git commit -m "fix(multisource): restore readable workspace copy"
```

### Task 2: Add the All-Product State Adapter

**Files:**

- Create: `src/features/multisource/multisourceProductState.ts`
- Create: `src/features/multisource/multisourceProductState.test.ts`
- Read: `src/features/multisource/{hy1cCziL2a,fy3hMersi,hy2dAltimeter,fy4bAgri,gf6WfvL1a}Parameters.ts`

**Interfaces:**

```ts
export interface MultisourceProductForms {
  hy1c: Hy1cCziL2aForm;
  fy3h: Fy3hMersiForm;
  hy2d: Hy2dAltimeterForm;
  fy4b: Fy4bAgriForm;
  gf6: Gf6WfvL1aForm;
}
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

- [ ] **Step 1: Write failing adapter tests**

Use all five `default...Form()` factories. Mutate each form, call reset, and assert each returns to default. Assert selection sync enables HY-1C/FY-3H/FY-4B/GF-6 `features`, `fusion`, and `saliency` only for their matching targets, and enables HY-2D grid only for `track-gridding`.

For summary values, assert exact current parent formatting. Include this GF-6 contract:

```ts
assert.deepEqual(buildGf6WorkbenchSummary(gf6, label), {
  bands: ["B3"],
  grid: "EPSG:4326 · 0.1",
  roi: "107.6, 8.7, 107.7, 8.8",
  rgbBands: "B3 / B3 / B3",
  stretch: "2% - 98%",
  featureMetrics: label("statistics"),
  saliency: "B3 · 阈值 0.95"
});
```

- [ ] **Step 2: Verify the adapter tests fail**

Run `pnpm exec tsx --test src/features/multisource/multisourceProductState.test.ts`.

Expected: FAIL because the module and exports do not exist.

- [ ] **Step 3: Implement the pure adapter**

Import existing form types/default factories only. Reset supplied reactive objects with `Object.assign`. Use exact existing formatting for HY-1C panel summary plus bands, FY-3H panel summary plus `CHxx` bands, HY-2D panel summary, FY-4B CRS/ROI/algorithm text, and GF-6 bands/grid/ROI/RGB/stretch/metrics/saliency. Do not import Vue, component files, or active-template state.

- [ ] **Step 4: Verify the adapter tests pass**

Run `pnpm exec tsx --test src/features/multisource/multisourceProductState.test.ts`.

Expected: PASS with all five summaries, reset behavior, and target-selection behavior covered.

- [ ] **Step 5: Commit the adapter**

```powershell
git add src/features/multisource/multisourceProductState.ts src/features/multisource/multisourceProductState.test.ts
git commit -m "refactor(multisource): extract product state adapter"
```

### Task 3: Integrate the Adapter in the Parent Coordinator

**Files:**

- Modify: `src/components/LeftPanel/MultiSourceSatelliteProcess.vue`
- Modify: `src/features/multisource/productParameterDrawer.test.ts`

**Interfaces:** Consumes every Task 2 export. Produces the same existing form references, workbench props, drawer props, UI conditions, and event handlers.

- [ ] **Step 1: Write failing delegation contracts**

Add assertions:

```ts
assert.match(workspace, /resetMultisourceProductForms\(productForms\)/);
assert.match(workspace, /syncProductAlgorithmSelection\(productForms, value\)/);
assert.doesNotMatch(workspace, /fy3hForm\.features\.enabled =/);
assert.doesNotMatch(workspace, /gf6Form\.saliency\.enabled =/);
```

- [ ] **Step 2: Verify delegation contracts fail**

Run `pnpm test:multisource -- --test-name-pattern="workspace selects FY-4B|parameter workbench"`.

Expected: FAIL because the parent still mutates product flags and prepares summaries inline.

- [ ] **Step 3: Replace only orchestration statements**

Create one stable `productForms` object from the existing reactive forms. In `handleTemplateChange`, call `resetMultisourceProductForms(productForms)` while retaining the HY-1C ROI suggestion reset, selected-target reset, package collapse, and drawer close. In `updateSelectedTargets`, call `syncProductAlgorithmSelection(productForms, value)`. Replace each inline summary computed value with its adapter builder and pass the resulting values to the same current template expressions and child props. Do not change any `v-if`, tag, prop name, class, event binding, or drawer template.

- [ ] **Step 4: Verify all multisource tests pass**

Run `pnpm test:multisource`.

Expected: PASS; product-file, pipeline, parameter, workbench, and task workflow contracts remain green.

- [ ] **Step 5: Commit the integration**

```powershell
git add src/components/LeftPanel/MultiSourceSatelliteProcess.vue src/features/multisource/productParameterDrawer.test.ts
git commit -m "refactor(multisource): delegate product coordination"
```

### Task 4: Verify Build and Unchanged User Experience

**Files:** Verify only.

**Interfaces:** Consumes Tasks 1-3. Produces final evidence that existing UI and workflow contracts remain intact.

- [ ] **Step 1: Run static checks**

Run `pnpm exec vue-tsc --noEmit --skipLibCheck` and `git diff --check`.

Expected: both exit with code `0`.

- [ ] **Step 2: Run the production build**

Run `pnpm build`.

Expected: Vite build succeeds; record known dependency/resource warnings separately from errors.

- [ ] **Step 3: Verify the running workflow**

Open `http://localhost:8849/#/satellite-applications` and confirm package folding, selected-step dependency display, GF-6 workbench visibility, parameter drawer opening, product switching/default reset, and readable Chinese labels. Check HY-1C, FY-3H, HY-2D, FY-4B, and GF-6.

- [ ] **Step 4: Confirm final scope**

Run `git status --short` and `git diff --name-only 13a5e08..HEAD`. Confirm tracked changes are limited to the planned multisource files plus this plan/spec, and do not stage `.tools/`, logs, or unrelated documents.

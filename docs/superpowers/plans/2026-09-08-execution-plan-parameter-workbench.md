# Execution-Plan Parameter Workbench Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rework the multi-source parameter workbench so each editable parameter is visibly owned by a resolved execution-plan step and has persistent, accurate guidance.

**Architecture:** Introduce a pure workbench-plan model that maps the shared resolved `StepDefinition[]` into navigation entries and parameter-card metadata. `MultiSourceSatelliteProcess.vue` will provide the resolved steps to every drawer; drawers retain their product-specific fields but render them inside the shared step framing and navigation order. Validation remains in each product parameter module, with HY-1C extended before its new hard-limit copy is displayed.

**Tech Stack:** Vue 3 `<script setup>`, TypeScript, Element Plus, Less, Node `tsx --test`, `vue-tsc`.

**Spec:** `docs/superpowers/specs/2026-09-08-execution-plan-parameter-workbench-design.md`

## Global Constraints

- The left resolved execution plan is the only source of plan order, system/target status, and configurability.
- Keep the existing non-modal, `470px` floating workbench; it must not dim or block the map workspace.
- Do not alter pipeline order, input templates, backend payload schemas, or task-launch contracts.
- Use plain Chinese user-facing copy; do not expose internal policy versions, engineering codes, or English labels.
- Hard-limit copy must exactly match real front-end validation. Backend validation remains the final protection.
- Use `4px` to `6px` radii, restrained borders, white text on the shallow blue vertical header gradient, visible keyboard focus, and reduced-motion support.
- Do not show a permanent risk/constraint panel. Show a risk only when a computed, actionable risk exists.

---

## File Structure

- Create: `src/features/multisource/parameterWorkbenchPlan.ts` - converts `StepDefinition[]` to the plan-strip and card metadata used by all drawers.
- Create: `src/features/multisource/parameterWorkbenchPlan.test.ts` - executable contracts for per-product card order and non-configurable steps.
- Create: `src/features/multisource/ExecutionPlanStrip.vue` - keyboard-accessible plan navigation that emits a requested configurable step key.
- Modify: `src/features/multisource/ParameterWorkbenchOverview.vue` - accepts plan entries and summary rows without presenting a competing generic section.
- Modify: `src/features/multisource/hy1cCziL2aParameters.ts` - enforce the hard limits described for HY-1C features, stretch and saliency controls.
- Modify: `src/features/multisource/hy1cCziL2aParameters.test.ts` - prove the new HY-1C validation behaviors.
- Modify: `src/components/LeftPanel/MultiSourceSatelliteProcess.vue` - pass `resolvedPlanSteps` to every drawer and refactor its HY-1C inlined drawer into the same card model.
- Modify: `src/features/multisource/{Gf6WfvL1a,Fy4bAgri,Fy3hMersi,Hy2dAltimeter}ParameterDrawer.vue` - replace generic fieldsets with execution-step cards and inline field explanations.
- Modify: `src/features/multisource/unifiedProductParameterDrawer.less` - provide the plan-strip, card, field guidance and responsive presentation.
- Modify: `src/features/multisource/productParameterDrawer.test.ts` - retain source-level contracts for the resolved-plan driven interface and removed legacy labels.

### Task 1: Create the Shared Workbench Plan Model

**Files:**

- Create: `src/features/multisource/parameterWorkbenchPlan.ts`
- Create: `src/features/multisource/parameterWorkbenchPlan.test.ts`

**Interfaces:**

- Consumes: `readonly StepDefinition[]` from `pipelineDefinitions.ts`.
- Produces: `buildParameterWorkbenchPlan(steps): ParameterWorkbenchPlan`, where `ParameterWorkbenchPlan.entries` preserves resolved order and `ParameterWorkbenchPlan.cards` contains only configurable parameter cards.

- [ ] **Step 1: Write the failing model tests**

```ts
test("GF-6 plan preserves system steps and emits its projection card first", () => {
  const plan = buildParameterWorkbenchPlan(gf6ResolvedSteps);
  assert.deepEqual(
    plan.entries.map(entry => entry.key),
    [
      "upload-validation",
      "tile-mosaic",
      "rpc-geolocation",
      "projection-standardization",
      "standard-product",
      "rgb-fusion"
    ]
  );
  assert.deepEqual(
    plan.cards.map(card => card.key),
    ["projection-standardization", "rgb-fusion"]
  );
  assert.equal(plan.entries[0].status, "无需配置");
});
```

- [ ] **Step 2: Verify the test fails because the model does not exist**

Run: `pnpm exec tsx --test src/features/multisource/parameterWorkbenchPlan.test.ts`

Expected: FAIL with module-not-found for `parameterWorkbenchPlan.ts`.

- [ ] **Step 3: Implement the minimal typed plan model**

```ts
export interface ParameterWorkbenchEntry {
  key: string;
  title: string;
  status: "系统自动添加" | "用户选择" | "无需配置";
  configurable: boolean;
}

export function buildParameterWorkbenchPlan(
  steps: readonly StepDefinition[]
): ParameterWorkbenchPlan {
  const entries = steps.map(step => ({
    key: step.key,
    title: step.title,
    status: step.configurable
      ? step.kind === "target"
        ? "用户选择"
        : "系统自动添加"
      : "无需配置",
    configurable: step.configurable
  }));
  return { entries, cards: entries.filter(entry => entry.configurable) };
}
```

- [ ] **Step 4: Verify all model cases pass**

Run: `pnpm exec tsx --test src/features/multisource/parameterWorkbenchPlan.test.ts`

Expected: PASS, including GF-6 projection, FY-4B projection, HY-1C projection, FY-3H swath, and HY-2D along-track card ordering.

- [ ] **Step 5: Commit the model**

```bash
git add src/features/multisource/parameterWorkbenchPlan.ts src/features/multisource/parameterWorkbenchPlan.test.ts
git commit -m "feat: model parameter workbench execution plan"
```

### Task 2: Enforce the HY-1C Rules Shown in the Workbench

**Files:**

- Modify: `src/features/multisource/hy1cCziL2aParameters.test.ts`
- Modify: `src/features/multisource/hy1cCziL2aParameters.ts`

**Interfaces:**

- Consumes: `Hy1cCziL2aForm`.
- Produces: `validateHy1cCziL2aForm(form).issues` containing `algorithms.features.windowSize`, `algorithms.fusion`, `algorithms.saliency.threshold`, and `algorithms.saliency.windowSize` when the corresponding enabled controls violate their rules.

- [ ] **Step 1: Add a failing validation case**

```ts
test("validation rejects invalid HY-1C feature, stretch and saliency settings", () => {
  const form = defaultL2aForm();
  form.algorithms.features.windowSize = 4;
  form.algorithms.fusion.percentileLow = 80;
  form.algorithms.fusion.percentileHigh = 20;
  form.algorithms.saliency.threshold = 1.1;
  form.algorithms.saliency.windowSize = 2;

  const fields = new Set(
    validateHy1cCziL2aForm(form).issues.map(issue => issue.field)
  );
  assert.ok(fields.has("algorithms.features.windowSize"));
  assert.ok(fields.has("algorithms.fusion"));
  assert.ok(fields.has("algorithms.saliency.threshold"));
  assert.ok(fields.has("algorithms.saliency.windowSize"));
});
```

- [ ] **Step 2: Verify the new assertions fail**

Run: `pnpm exec tsx --test src/features/multisource/hy1cCziL2aParameters.test.ts`

Expected: FAIL because at least one of the four new validation fields is absent.

- [ ] **Step 3: Add the exact hard-limit validation**

```ts
const isOddWindow = (value: number) =>
  Number.isInteger(value) && value >= 3 && value % 2 === 1;
if (
  form.algorithms.features.enabled &&
  form.algorithms.features.metrics.includes("local_variance") &&
  !isOddWindow(form.algorithms.features.windowSize)
) {
  issues.push({
    field: "algorithms.features.windowSize",
    message: "局部方差窗口必须为不小于 3 的奇数"
  });
}
if (
  form.algorithms.fusion.enabled &&
  !(
    form.algorithms.fusion.percentileLow >= 0 &&
    form.algorithms.fusion.percentileLow <
      form.algorithms.fusion.percentileHigh &&
    form.algorithms.fusion.percentileHigh <= 100
  )
) {
  issues.push({
    field: "algorithms.fusion",
    message: "拉伸百分位必须满足 0 <= 低值 < 高值 <= 100"
  });
}
```

Add the equivalent `0..1` threshold and odd-window checks for enabled saliency.

- [ ] **Step 4: Verify the parameter module passes**

Run: `pnpm exec tsx --test src/features/multisource/hy1cCziL2aParameters.test.ts`

Expected: PASS with existing snapshot behavior unchanged.

- [ ] **Step 5: Commit the validation contract**

```bash
git add src/features/multisource/hy1cCziL2aParameters.ts src/features/multisource/hy1cCziL2aParameters.test.ts
git commit -m "fix: validate HY-1C parameter limits"
```

### Task 3: Add the Execution-Plan Navigation Contract

**Files:**

- Create: `src/features/multisource/ExecutionPlanStrip.vue`
- Modify: `src/features/multisource/ParameterWorkbenchOverview.vue`
- Modify: `src/features/multisource/productParameterDrawer.test.ts`

**Interfaces:**

- Consumes: `entries: readonly ParameterWorkbenchEntry[]`, `activeStep?: string`.
- Produces: `select-step` only for configurable steps. Parent scrolls to the matching `id="parameter-step-${key}"` section.

- [ ] **Step 1: Add failing source-contract tests**

```ts
assert.match(workbenchModel, /buildParameterWorkbenchPlan/);
assert.match(
  executionStrip,
  /defineEmits<\{\s*\(event: "select-step", key: string\): void/
);
assert.match(executionStrip, /entry\.configurable/);
assert.match(executionStrip, /系统自动添加|用户选择|无需配置/);
```

- [ ] **Step 2: Verify the contract test fails**

Run: `pnpm exec tsx --test src/features/multisource/productParameterDrawer.test.ts`

Expected: FAIL because `ExecutionPlanStrip.vue` is absent.

- [ ] **Step 3: Implement the compact strip and neutral summary**

```vue
<nav class="execution-plan-strip" aria-label="执行计划">
  <button
    v-for="(entry, index) in entries"
    :key="entry.key"
    :disabled="!entry.configurable"
    :class="{ 'is-active': entry.key === activeStep }"
    @click="entry.configurable && emit('select-step', entry.key)"
  >
    <span>{{ index + 1 }}</span><strong>{{ entry.title }}</strong><small>{{ entry.status }}</small>
  </button>
</nav>
```

Make `ParameterWorkbenchOverview` a compact “当前参数” summary with no generic group heading, internal English or permanent risk section.

- [ ] **Step 4: Verify source contracts pass**

Run: `pnpm exec tsx --test src/features/multisource/productParameterDrawer.test.ts`

Expected: PASS for existing archive/drawer contracts and new plan-strip assertions.

- [ ] **Step 5: Commit the shared visual component**

```bash
git add src/features/multisource/ExecutionPlanStrip.vue src/features/multisource/ParameterWorkbenchOverview.vue src/features/multisource/productParameterDrawer.test.ts
git commit -m "feat: add parameter workbench plan navigation"
```

### Task 4: Connect Resolved Plan Data and Refactor Product Drawers

**Files:**

- Modify: `src/components/LeftPanel/MultiSourceSatelliteProcess.vue`
- Modify: `src/features/multisource/Gf6WfvL1aParameterDrawer.vue`
- Modify: `src/features/multisource/Fy4bAgriParameterDrawer.vue`
- Modify: `src/features/multisource/Fy3hMersiParameterDrawer.vue`
- Modify: `src/features/multisource/Hy2dAltimeterParameterDrawer.vue`

**Interfaces:**

- Consumes: `resolvedPlanSteps: readonly StepDefinition[]` and existing form/validation props.
- Produces: `plan-steps` prop on all product drawers; every configurable resolved step renders one `section.parameter-step-card` identified by `parameter-step-${key}`.

- [ ] **Step 1: Add a failing contract that requires resolved plan props and cards**

```ts
assert.match(workspace, /:plan-steps="resolvedPlanSteps"/);
for (const drawer of drawerFiles) {
  assert.match(drawer, /planSteps: readonly StepDefinition\[\]/);
  assert.match(drawer, /buildParameterWorkbenchPlan\(props\.planSteps\)/);
  assert.match(drawer, /class="parameter-step-card"/);
}
```

- [ ] **Step 2: Verify the contract fails**

Run: `pnpm exec tsx --test src/features/multisource/productParameterDrawer.test.ts`

Expected: FAIL because drawers currently accept only `visibleSteps`.

- [ ] **Step 3: Wire the shared resolved steps and refactor each drawer**

```vue
<section
  v-if="workbenchPlan.cards.some(card => card.key === 'rgb-fusion')"
  id="parameter-step-rgb-fusion"
  class="parameter-step-card"
>
  <header><span>步骤 {{ cardIndex('rgb-fusion') }}</span><h3>RGB 融合</h3><small>用户选择</small></header>
  <p>将已启用波段组合为可视化结果。</p>
  <!-- existing form controls, labelled with purpose and persistent limits -->
</section>
```

For the four image products, map the specific projection step (`projection-standardization` or `swath-standardization`) to its grid/ROI and output-band controls. Leave non-configurable preprocessing entries in the strip with `无需配置`. For HY-2D, map feature extraction, anomaly detection and track gridding to separate cards. Replace fixed resampling/quality pseudo-inputs with plain “固定不可调整” rows.

Refactor the HY-1C inline drawer in the workspace with the same `ExecutionPlanStrip`, plan model and parameter-step-card markup; do not duplicate an independent plan source.

- [ ] **Step 4: Verify product contracts and static typing**

Run: `pnpm exec tsx --test src/features/multisource/productParameterDrawer.test.ts && pnpm typecheck`

Expected: PASS with no TypeScript or Vue template errors.

- [ ] **Step 5: Commit the product card integration**

```bash
git add src/components/LeftPanel/MultiSourceSatelliteProcess.vue src/features/multisource/Gf6WfvL1aParameterDrawer.vue src/features/multisource/Fy4bAgriParameterDrawer.vue src/features/multisource/Fy3hMersiParameterDrawer.vue src/features/multisource/Hy2dAltimeterParameterDrawer.vue src/features/multisource/productParameterDrawer.test.ts
git commit -m "feat: organize parameters by execution plan"
```

### Task 5: Apply the Workbench Visual System and Verify the Whole Flow

**Files:**

- Modify: `src/features/multisource/unifiedProductParameterDrawer.less`
- Modify: `src/features/multisource/productParameterDrawer.test.ts`

**Interfaces:**

- Consumes: `.execution-plan-strip`, `.parameter-step-card`, `.parameter-field__guide`, `.fixed-setting-row`, and existing drawer selectors.
- Produces: an accessible 470px floating workbench that wraps the plan strip, keeps field error space stable, and collapses to one column below 560px.

- [ ] **Step 1: Add failing style contracts for the visual system**

```ts
assert.match(styles, /\.execution-plan-strip\s*\{[\s\S]*?display:\s*flex;/);
assert.match(
  styles,
  /\.parameter-step-card\s*\{[\s\S]*?border-radius:\s*(4|6)px;/
);
assert.match(styles, /\.parameter-field__guide[\s\S]*?min-height:/);
assert.match(styles, /@media \(width <= 560px\)[\s\S]*?\.execution-plan-strip/);
assert.match(styles, /width:\s*470px !important/);
```

- [ ] **Step 2: Verify the style contract fails**

Run: `pnpm exec tsx --test src/features/multisource/productParameterDrawer.test.ts`

Expected: FAIL because the new selectors are not yet in the shared Less file.

- [ ] **Step 3: Implement the targeted design system**

```less
.product-parameter-drawer .execution-plan-strip {
  display: flex;
  gap: 6px;
  padding: 8px;
  overflow-x: auto;
  background: #f4f9fc;
  border: 1px solid #d3e3eb;
  border-radius: 6px;
}

.product-parameter-drawer .parameter-step-card {
  padding: 14px;
  background: #fff;
  border: 1px solid var(--drawer-line);
  border-radius: 6px;
}

.product-parameter-drawer .parameter-field__guide {
  display: block;
  min-height: 34px;
  margin-top: 6px;
  font-size: var(--drawer-font-caption);
  line-height: 1.45;
  color: var(--drawer-muted);
}
```

Keep the established blue vertical header gradient, make selected plan steps use the accent outline rather than a heavy card shadow, and add `:focus-visible`, `aria-current`, `prefers-reduced-motion`, and mobile wrapping rules.

- [ ] **Step 4: Run complete automated verification**

Run: `pnpm test:multisource && pnpm typecheck && pnpm build`

Expected: all multisource tests, TypeScript checks and production build pass.

- [ ] **Step 5: Perform browser visual QA and commit**

Open `http://localhost:8848/#/satellite-applications`; verify GF-6, FY-4B, HY-1C, FY-3H and HY-2D plan order, active-card navigation, disabled dependencies, inline validation, the 470px non-modal panel, keyboard focus, 560px narrow layout, and no overlap/overflow. Then commit:

```bash
git add src/features/multisource/unifiedProductParameterDrawer.less src/features/multisource/productParameterDrawer.test.ts
git commit -m "style: refine parameter workbench hierarchy"
```

## Self-Review

- Spec coverage: Task 1 makes the resolved plan the shared source of truth; Task 2 aligns HY-1C hard-limit copy with real validation; Task 3 adds navigation; Task 4 produces exact per-step parameter cards for all five products; Task 5 delivers the agreed 470px non-modal visual and accessibility behavior.
- Placeholder scan: no deferred implementation markers or unspecified validation remain in the tasks.
- Type consistency: `StepDefinition` is the plan input throughout; `ParameterWorkbenchEntry` is exported by Task 1, consumed by Task 3, and represented by `planSteps` props in Task 4.

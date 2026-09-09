# Task Progress Dialog and Execution-Plan Status Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the detailed multisource task timeline into an on-demand dialog while keeping live status visible on every execution-plan card.

**Architecture:** `MultiSourceSatelliteProcess.vue` remains the only owner of task state, polling data, artifact state, and task actions. `ProcessingPlanPanel.vue` receives the existing `runtimeStageViews` as readonly input and emits `show-progress`. A new presentational `TaskProgressDialog.vue` renders the same views and emits action events back to the parent. No second runtime store or duplicated stage list is introduced.

**Tech Stack:** Vue 3 `<script setup>`, TypeScript, Element Plus, Less, Node `tsx --test`, `vue-tsc`, Vite.

**Spec:** `docs/superpowers/specs/2026-09-09-task-progress-dialog-design.md`

## Global Constraints

- `resolvedPlanSteps` and `runtimeStageViews` remain the single source of truth for plan order and per-stage state.
- Do not change API requests, polling cadence, lifecycle statuses, retry eligibility, artifact URLs, or task payloads.
- Keep all task orchestration and error handling in `MultiSourceSatelliteProcess.vue`.
- Use the existing `ProcessingStepViewStatus` vocabulary and plain Chinese labels.
- Remove the main-panel detailed timeline; do not leave a hidden duplicate `progress-console` in the DOM.
- The progress dialog is responsive, keyboard accessible, and does not cancel work when closed.
- Preserve unrelated user changes, including `src/features/multisource/unifiedProductParameterDrawer.less`.

## File Structure

- Create: `src/components/LeftPanel/TaskProgressDialog.vue` - presentational dialog for summary, timeline, artifacts, and task actions.
- Modify: `src/components/LeftPanel/ProcessingPlanPanel.vue` - accept runtime views, add status labels to plan rows, and emit `show-progress`.
- Modify: `src/components/LeftPanel/MultiSourceSatelliteProcess.vue` - remove inline timeline, wire the dialog, and pass existing callbacks/formatters.
- Modify: `src/features/multisource/processingRunState.ts` - export shared status-label and progress-percentage helpers used by both views.
- Modify: `src/features/multisource/processingRunState.test.ts` - test label and percentage contracts alongside existing stage mapping tests.
- Modify: `src/features/multisource/processingPlanPanel.test.ts` - add source contracts for runtime props, status rendering, and progress trigger.
- Create: `src/features/multisource/taskProgressDialog.test.ts` - source contracts for dialog states, shared runtime input, and emitted actions.

### Task 1: Add Shared Runtime Presentation Helpers

**Files:**

- Modify: `src/features/multisource/processingRunState.ts`
- Modify: `src/features/multisource/processingRunState.test.ts`

**Interfaces:**

- Consume: `ProcessingStepViewStatus`, `RuntimeStageView`.
- Produce: `processingStepStatusLabel(status)`, `runtimeProgressPercent(views)`.

- [ ] **Step 1: Add failing tests for the shared labels and progress calculation**

```ts
test("uses the shared Chinese status vocabulary", () => {
  assert.equal(processingStepStatusLabel("WAITING"), "等待执行");
  assert.equal(processingStepStatusLabel("PROCESSING"), "正在执行");
  assert.equal(processingStepStatusLabel("SUCCEEDED"), "已完成");
  assert.equal(processingStepStatusLabel("FAILED"), "执行失败");
  assert.equal(processingStepStatusLabel("NEEDS_RERUN"), "需要重新执行");
});

test("counts only successful stages in the determinate dialog progress", () => {
  assert.equal(
    runtimeProgressPercent([
      { status: "SUCCEEDED" },
      { status: "PROCESSING" },
      { status: "WAITING" },
      { status: "FAILED" }
    ] as RuntimeStageView[]),
    25
  );
  assert.equal(runtimeProgressPercent([]), 0);
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `pnpm exec tsx --test src/features/multisource/processingRunState.test.ts`

Expected: FAIL because the two exports do not exist.

- [ ] **Step 3: Implement minimal pure helpers**

Use a complete `Record<ProcessingStepViewStatus, string>` for labels. Calculate `Math.round((succeeded / views.length) * 100)` and return `0` for an empty list; clamp the result to `0..100`.

- [ ] **Step 4: Re-run the focused test**

Run: `pnpm exec tsx --test src/features/multisource/processingRunState.test.ts`

Expected: PASS, with all existing stage mapping and artifact grouping tests unchanged.

### Task 2: Show Runtime Status in the Execution Plan

**Files:**

- Modify: `src/components/LeftPanel/ProcessingPlanPanel.vue`
- Modify: `src/components/LeftPanel/MultiSourceSatelliteProcess.vue`
- Modify: `src/features/multisource/processingPlanPanel.test.ts`

**Interfaces:**

- Add prop: `runtimeStageViews: readonly RuntimeStageView[]`.
- Add event: `show-progress: []`.
- Consume: the same `runtimeStageViews` computed by the parent; do not derive status from `taskStatus` alone.

- [ ] **Step 1: Add failing source contracts**

Assert that the panel imports `RuntimeStageView` and `processingStepStatusLabel`, declares the readonly runtime prop, renders `processingStepStatusLabel(view.status)`, and contains a `任务进度` button emitting `show-progress`. Assert the workspace passes `:runtime-stage-views="runtimeStageViews"` and listens with `@show-progress`.

- [ ] **Step 2: Run the panel test and verify it fails**

Run: `pnpm exec tsx --test src/features/multisource/processingPlanPanel.test.ts`

Expected: FAIL because the runtime prop and trigger are absent.

- [ ] **Step 3: Extend the panel interface and template**

Create a computed lookup by `step.key`. For each plan row, render a marker class `is-${view.status.toLowerCase()}` and a visible status label beside the existing target/system label. Keep the step title and sequence stable. Add a compact `任务进度` button in `.processing-plan__subheading`; its click emits `show-progress` and it remains enabled whenever `planSteps.length` is non-zero.

- [ ] **Step 4: Wire the parent event and runtime prop**

Pass `runtimeStageViews` to `ProcessingPlanPanel`. Add `const isTaskProgressOpen = ref(false)` and handle `@show-progress="isTaskProgressOpen = true"` without changing `isParameterDrawerOpen`.

- [ ] **Step 5: Verify focused contracts and preserve existing panel behavior**

Run: `pnpm exec tsx --test src/features/multisource/processingPlanPanel.test.ts`

Expected: PASS, including existing target selection, compact rows, automatic dependency summary, and upload ordering assertions.

### Task 3: Build the Presentational Task Progress Dialog

**Files:**

- Create: `src/components/LeftPanel/TaskProgressDialog.vue`
- Create: `src/features/multisource/taskProgressDialog.test.ts`

**Interfaces:**

- Props include `modelValue`, lifecycle summary props, `runtimeStageViews`, optional `runtimeCurrentStage`, completed count/percentage, action availability/loading flags, artifact expansion/loading values, and formatter callbacks for stage title, description, error text, artifact name/size, previewability, and retry eligibility.
- Emits: `update:modelValue`, `toggle-artifacts(stageId)`, `preview-artifact(artifact)`, `download-artifact(artifact)`, `retry-stage(stageId)`, `cancel`, `download-result`, and `reset`.

- [ ] **Step 1: Add failing source contracts for the dialog**

Assert the new component contains `el-dialog`, `v-model="modelValue"` or an equivalent `update:modelValue` bridge, `任务进度`, `任务尚未启动`, `runtimeStageViews`, the five status labels, `role="progressbar"`, `aria-live="polite"`, artifact `查看`/`下载`, and all seven emitted action names. Assert there is no second local stage array or polling call.

- [ ] **Step 2: Run the dialog contract test and verify it fails**

Run: `pnpm exec tsx --test src/features/multisource/taskProgressDialog.test.ts`

Expected: FAIL because the component and test do not exist.

- [ ] **Step 3: Implement the dialog shell and empty state**

Use `el-dialog` with `append-to-body`, `destroy-on-close`, `width="min(720px, calc(100vw - 32px))"`, and an accessible title. Render `任务尚未启动` when no lifecycle progress exists while still listing resolved waiting views.

- [ ] **Step 4: Implement shared summary and timeline rendering**

Render lifecycle tone, completed/total count, a clamped determinate progress bar, current-stage callout, and a scrollable row for every view. Include localized title/status/description, errors, timestamps, and a stable runtime key. Keep remote-only views at the end in the order received.

- [ ] **Step 5: Implement artifact and footer actions as emits**

Reuse the existing artifact display semantics: expand by stage id, preview only previewable artifacts, disable unauthorized downloads, show retry only for retryable backend statuses, show cancel only for `CREATED`/`RUNNING`, show final ZIP only for `SUCCEEDED`, and show reset for terminal states. The component must not call API functions directly.

- [ ] **Step 6: Verify the dialog source contracts**

Run: `pnpm exec tsx --test src/features/multisource/taskProgressDialog.test.ts`

Expected: PASS for empty, running, failed, artifact, and terminal action markup.

### Task 4: Replace the Main Timeline and Connect the Dialog

**Files:**

- Modify: `src/components/LeftPanel/MultiSourceSatelliteProcess.vue`
- Modify: `src/components/LeftPanel/ProcessingPlanPanel.vue` (only if event typing or status binding needs correction)

**Interfaces:**

- Parent keeps `runtimeStageViews`, `runtimeCurrentStage`, `taskStatusLabel`, `taskStatusTone`, `canCancel`, `isTerminal`, `isBusy`, `isDownloadingResult`, artifact refs, and all existing task functions.
- Dialog receives those values and emits are mapped to existing `toggleStageArtifacts`, `previewArtifact`, `downloadStageArtifact`, `retryTask`, `cancelTask`, `downloadTask`, and `resetTask`.

- [ ] **Step 1: Add the dialog invocation before editing out the timeline**

Render `TaskProgressDialog` near the existing artifact preview dialog. Bind `v-model="isTaskProgressOpen"`, pass all runtime and action props, and map every event to an existing parent function.

- [ ] **Step 2: Move stage formatting into explicit dialog callbacks**

Pass the existing `stageLabel`, `runtimeStageStatusLabel`, `runtimeStageDescription`, `translateProcessingErrorMessage`, `artifactFileName`, `artifactSize`, `isPreviewableArtifact`, and `canRetryStage` functions. Preserve the HY-2D special validation label behavior.

- [ ] **Step 3: Remove the inline `progress-console` markup**

Delete only the main-panel section from `v-if="progress"` through its task footer. Keep artifact preview dialog markup, task state refs, and action functions. Remove obsolete `.progress-console`, `.runtime-current-stage`, `.stage-timeline`, `.runtime-stage-row`, `.artifact-shelf`, `.server-error`, and `.task-actions` styles only when no remaining template uses them.

- [ ] **Step 4: Add reset/terminal visibility behavior**

Close the progress dialog when `resetTask` succeeds or when the active product template changes. Do not close it when polling reaches success/failure; users should be able to inspect the final state and download artifacts.

- [ ] **Step 5: Run focused multisource tests and template typecheck**

Run: `pnpm exec tsx --test src/features/multisource/processingRunState.test.ts src/features/multisource/processingPlanPanel.test.ts src/features/multisource/taskProgressDialog.test.ts && pnpm exec vue-tsc --noEmit --skipLibCheck`

Expected: focused tests pass. `vue-tsc` should report only the pre-existing baseline errors documented in the session if they remain; no new errors may reference the dialog, panel, or parent bindings.

### Task 5: Apply Runtime Status Styling and Verify the Whole Flow

**Files:**

- Modify: `src/components/LeftPanel/ProcessingPlanPanel.vue`
- Modify: `src/components/LeftPanel/TaskProgressDialog.vue`
- Modify: `src/components/LeftPanel/MultiSourceSatelliteProcess.vue`

**Interfaces:**

- Consume: existing workspace semantic colors and Element Plus dialog tokens.
- Produce: stable, responsive status cards and dialog layout without modifying parameter drawer styles.

- [ ] **Step 1: Add focused style contracts**

Assert panel selectors for `is-waiting`, `is-processing`, `is-succeeded`, `is-failed`, and `is-needs_rerun`; assert dialog styles include a bounded timeline, `role="progressbar"` support, `:focus-visible`, and a narrow viewport media rule.

- [ ] **Step 2: Implement restrained status styles**

Use gray/blue/green/red/orange semantic accents, keep plan rows compact, make the processing marker visibly active without a mandatory animation, and reserve space for status text. Give the dialog a maximum-height timeline, wrapped error text, and a footer that remains usable on narrow screens.

- [ ] **Step 3: Run the full automated verification**

Run: `pnpm test:multisource && pnpm exec vue-tsc --noEmit --skipLibCheck && git diff --check && pnpm build`

Expected: multisource tests and production build pass. Any baseline type errors outside the touched files are recorded, and no new errors are introduced by this feature.

- [ ] **Step 4: Perform browser QA**

Open `http://localhost:8848/#/satellite-applications` and verify:

1. The main panel contains the execution plan but no full progress timeline.
2. `任务进度` opens the dialog before and during a task; the pre-task state says `任务尚未启动`.
3. Running, success, failed, and rerun statuses match between plan rows and dialog rows.
4. Current stage, timestamps, localized errors, artifact preview/download, retry, cancel, final ZIP, and reset actions retain their existing behavior.
5. Desktop and 320px/narrow layouts have no horizontal overflow or overlapping text; closing the dialog never cancels processing.

- [ ] **Step 5: Review the diff for scope**

Run: `git diff --stat` and `git diff -- docs/superpowers/specs/2026-09-09-task-progress-dialog-design.md docs/superpowers/plans/2026-09-09-task-progress-dialog.md`

Confirm only the planned UI/runtime files and the two planning documents changed; do not stage unrelated user edits.

## Self-Review

- The plan panel and dialog consume the same `runtimeStageViews`; no duplicate runtime state is introduced.
- Existing task actions remain in the parent, so API contracts and error handling are unchanged.
- The old inline timeline is removed from the main panel, while artifact preview remains available through the dialog event bridge.
- Empty, active, failed, terminal, artifact, keyboard, and narrow-layout states are explicitly covered.
- 每个任务步骤都有明确文件、接口、验证命令和预期结果，没有未决实现项。

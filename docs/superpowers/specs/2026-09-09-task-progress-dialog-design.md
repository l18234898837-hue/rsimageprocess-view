# Execution Plan Runtime Status and Task Progress Dialog Design

## Goal

Keep the resolved execution plan visible in the multisource workspace while moving the detailed runtime timeline into an on-demand dialog. Every plan card must expose the same live stage status as the dialog, so users can understand what is running without permanently consuming the left-panel space.

## Scope

In scope:

- Remove the full `progress-console` timeline from the main multisource panel.
- Add a `任务进度` action to the execution-plan header.
- Show a compact runtime status on every execution-plan step card.
- Add a reusable `TaskProgressDialog` for overall task state, current stage, stage timeline, errors, timestamps, artifacts, retry, cancellation, reset, and final ZIP download.
- Reuse `resolvedPlanSteps`, `runtimeStageViews`, `taskStatus`, and the existing `useProcessingTask` actions as the single runtime source of truth.
- Preserve artifact preview as a separate nested dialog flow and keep all existing API contracts.

Out of scope:

- Changing pipeline order, stage identifiers, backend polling, task lifecycle semantics, or download endpoints.
- Adding a second runtime store or copying progress into component-local state.
- Moving parameter configuration into the runtime dialog.
- Changing the existing artifact preview dialog's visual behavior beyond the handoff from the new progress dialog.
- Fixing unrelated baseline TypeScript errors in map, auth, or HTTP modules.

## User Model

The user works from the execution plan and needs two levels of information:

1. The main panel answers "what will run and what is its current state?" with one status per step.
2. The dialog answers "what exactly is happening?" with current-stage detail, timing, errors, artifacts, and task actions.

The plan card is the entry point; the dialog is the detail surface. Closing the dialog never cancels a task.

## Information Architecture

### Main workspace

The main panel keeps upload, execution plan, identified configuration, risk notice, and task launch sections. The complete timeline is removed from this flow.

The execution-plan header contains, in order:

- The existing automatic-dependency summary when applicable.
- `任务进度` button with a progress icon. It remains available whenever a resolved plan exists; before a task is created it opens an empty state explaining `任务尚未启动`.
- The existing `配置参数` button.

Each plan step card keeps its sequence number, title, and target/system label and adds:

- A status marker with one of `等待执行`, `正在执行`, `已完成`, `执行失败`, or `需要重新执行`.
- A compact status label visible without hover.
- An active treatment for the current running or failed stage; the full explanation remains in the dialog.

### Task progress dialog

Use Element Plus `el-dialog` with `append-to-body`, `destroy-on-close`, a responsive width of `min(720px, calc(100vw - 32px))`, and an accessible title `任务进度`. The dialog is modal only while open and does not alter task execution when closed.

The dialog body contains:

- Header summary: task lifecycle label, completed/total stage count, and a determinate progress bar based on successful stages.
- Current-stage callout: current stage title, status description, and start time when present.
- Scrollable stage timeline: one row for each `runtimeStageView`, in resolved plan order; remote-only stages remain visible at the end.
- Stage details: localized status, error code/message when present, and `startedAt -> finishedAt` or `运行中`.
- Artifact shelf: expandable artifacts with `查看` for previewable images and `下载` for downloadable files.
- Footer actions: `取消任务` while `CREATED` or `RUNNING`, `重试` on retryable failed stages, `下载最终 ZIP` after success, and `重新处理` for terminal tasks.

When there is no `progress` response, the dialog renders the resolved plan as waiting rows and the empty summary `任务尚未启动`; it does not invent a task id or timestamps.

## Shared Runtime Contract

`runtimeStageViews` remains the only per-step runtime collection. The existing `RuntimeStageView` status vocabulary is used unchanged:

```ts
type ProcessingStepViewStatus =
  | "WAITING"
  | "PROCESSING"
  | "SUCCEEDED"
  | "FAILED"
  | "NEEDS_RERUN";
```

The parent enriches each view with its existing stable `runtimeId` only for rendering keys. `ProcessingPlanPanel` and `TaskProgressDialog` both receive the same readonly view array and never mutate it.

The dialog receives callbacks/events for existing actions rather than owning task orchestration:

```ts
interface TaskProgressDialogProps {
  modelValue: boolean;
  taskStatus?: ProcessingLifecycleStatus;
  taskStatusLabel: string;
  taskStatusTone: "running" | "success" | "danger" | "muted";
  runtimeStageViews: readonly RuntimeStageView[];
  runtimeCurrentStage?: RuntimeStageView;
  completedStageCount: number;
  isTerminal: boolean;
  canCancel: boolean;
  isBusy: boolean;
  isDownloadingResult: boolean;
  expandedArtifactStageIds: readonly ProcessingIdentifier[];
  previewingArtifact?: ExecutionProgressArtifact | null;
  downloadingArtifact?: ExecutionProgressArtifact | null;
}
```

Events are `update:modelValue`, `toggle-artifacts`, `preview-artifact`, `download-artifact`, `retry-stage`, `cancel`, `download-result`, and `reset`. The parent keeps the current error translation, API calls, loading refs, artifact preview URL, and task reset behavior.

## Interaction Rules

1. Clicking `任务进度` opens the dialog without changing the selected target steps or parameter drawer.
2. Polling updates immediately reflect in both plan cards and the open dialog because both consume `runtimeStageViews`.
3. The current `PROCESSING` stage is the active stage. If no stage is processing, a failed stage is the fallback current stage; otherwise no current-stage callout is shown.
4. Closing the dialog only changes visibility. `取消任务`, `重试`, `重新处理`, and downloads remain explicit actions.
5. A retry button is rendered only when the existing `canRetryStage` rule allows it and remains disabled while `isBusy` is true.
6. Artifact expansion is keyed by stage id and survives dialog rerenders but is cleared when the task is reset.
7. The progress bar uses `succeeded / total`, clamps to `0..100`, and shows `0%` for an empty or not-yet-started task.
8. Keyboard focus is visible for the dialog close button, task-progress trigger, artifact controls, retry, and footer actions. Reduced-motion users do not receive animated status pulses.

## Visual Direction

The main plan remains dense and scan-friendly. Status uses restrained semantic accents: neutral gray for waiting, blue for processing, green for success, red for failure, and orange for rerun. Do not add gradients, decorative cards, or duplicate explanatory paragraphs to the plan card.

The dialog uses one framed timeline surface, 4-6px radii, a sticky footer on narrow screens, and a maximum timeline height so long plans remain usable. Error text reserves space beneath the stage row and wraps without horizontal overflow. The dialog must remain readable at 320px viewport width.

## Accessibility and Localization

- Use `role="dialog"` through `el-dialog`, `aria-labelledby`, and `aria-live="polite"` on the current-stage summary.
- Status markers are decorative; every status is also present as text.
- Artifact rows expose file name, type, size, and action labels.
- Error messages continue through `translateProcessingErrorMessage`.
- Internal stage codes are never the primary visible label when a localized `stageLabel` exists.

## Implementation Boundaries

Create one presentational `TaskProgressDialog.vue` under `src/components/LeftPanel/`. Keep `MultiSourceSatelliteProcess.vue` as the coordinator for task state and existing action functions. Extend `ProcessingPlanPanel.vue` only with readonly runtime props and the `show-progress` event. Keep styles local to the two components and remove only the obsolete main-panel timeline selectors after the markup is removed.

## Verification

- Unit/source-contract tests prove the plan panel accepts runtime views, renders all five status labels, and emits `show-progress`.
- Unit/source-contract tests prove the dialog renders empty, running, failed, artifact, and terminal action states and uses `runtimeStageViews` rather than a second stage list.
- Existing `processingRunState` tests remain green and cover status mapping, unknown remote stages, and artifact grouping.
- Run `pnpm test:multisource`, `pnpm exec vue-tsc --noEmit --skipLibCheck`, `git diff --check`, and `pnpm build`.
- Existing baseline `pnpm typecheck` errors outside this feature must be recorded separately rather than fixed opportunistically.
- Browser QA at `http://localhost:8848/#/satellite-applications` verifies the main panel no longer contains the full timeline, the button opens the dialog, step statuses update with polling, artifact actions work, and desktop/mobile layouts do not overlap.

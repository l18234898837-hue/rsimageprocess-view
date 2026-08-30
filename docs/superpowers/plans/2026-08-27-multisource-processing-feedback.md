# Multisource Processing Feedback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make multisource processing show a ZIP-only success action, return actionable parameter errors, and reliably reset/retry task state.

**Architecture:** Keep the existing ZIP endpoint and processing task lifecycle. Preserve Worker validation messages through the Java exception/progress DTO boundary, and centralize frontend run-state/error extraction in the existing multisource task composable and rules module.

**Tech Stack:** Vue 3, TypeScript, Node test runner, Java 17, Spring Boot, JUnit 5, Python Worker, pytest.

**Spec:** User request in the current task.

## Global Constraints

- Do not change the existing database schema or data.
- Do not restart the backend.
- Run compilation and logic tests only.

---

### Task 1: Add regression tests

**Files:**

- Modify: `src/features/multisource/processingTaskRules.test.ts`
- Modify: `htht-admin/src/test/java/com/htht/web/controller/multisource/MultisourceExceptionHandlerTest.java`
- Modify: `htht-modules/htht-multisource/src/test/java/com/htht/multisource/application/usecase/RetryFailedStageUseCaseTest.java`
- Modify: `rs-algorithm-worker/tests/test_cli.py`

- [ ] Add tests for backend parameter-message preservation, failed-task retry, and Worker CLI detail preservation.
- [ ] Add frontend tests for server error extraction and processing run-state reset.
- [ ] Run each focused test and confirm the new assertions fail against the current implementation.

### Task 2: Implement backend and Worker fixes

**Files:**

- Modify: `htht-modules/htht-multisource/src/main/java/com/htht/multisource/infrastructure/worker/WorkerProtocolException.java`
- Modify: `htht-admin/src/main/java/com/htht/web/controller/multisource/MultisourceExceptionHandler.java`
- Modify: `htht-modules/htht-multisource/src/main/java/com/htht/multisource/application/usecase/service/RetryFailedStageService.java`
- Modify: `htht-admin/src/main/java/com/htht/web/controller/multisource/ProcessingExecutionController.java`
- Modify: `rs-algorithm-worker/src/rs_algorithm_worker/cli.py`

- [ ] Expose the Worker’s safe structured message for parameter errors.
- [ ] Return parameter validation messages to the client and expose failed-stage details through progress.
- [ ] Allow retry of a failed task stage while the stage attempt limit permits it.
- [ ] Preserve detailed Python validation messages in the Worker response.

### Task 3: Implement frontend behavior

**Files:**

- Modify: `src/features/multisource/processingTaskRules.ts`
- Modify: `src/features/multisource/useProcessingTask.ts`
- Modify: `src/components/LeftPanel/MultiSourceSatelliteProcess.vue`
- Modify: `src/utils/http/index.ts`

- [ ] Remove the artifact list and leave the existing final ZIP download action on successful tasks.
- [ ] Clear old candidate/progress state before a new start or retry.
- [ ] Extract backend error messages instead of displaying only HTTP status or generic failure text.
- [ ] Prevent duplicate retry clicks while the retry request is in flight.

### Task 4: Verify

- [ ] Run frontend multisource tests and type checking.
- [ ] Run Worker focused tests.
- [ ] Run backend focused Maven tests and compilation.
- [ ] Review the diff to confirm no database migration or unrelated destructive changes were added.

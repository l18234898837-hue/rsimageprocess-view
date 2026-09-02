# 多源卫星处理前端重构 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在现有多源卫星处理模块内实现四阶段处理计划体验，支持按产品选择处理功能、自动解析前置步骤、逐步骤配置、执行状态和结果下载。

**Architecture:** 在 `src/features/multisource` 增加产品流水线定义、纯函数依赖解析和处理计划状态；在 `src/components/LeftPanel` 将现有大组件拆成上传、功能选择、参数配置、计划预览和执行结果子视图。任务 API 继续由多源适配层负责，组件不直接请求后端。

**Tech Stack:** Vue 3, TypeScript, Element Plus, Vitest, 现有多源 satellite API 与参数抽屉组件。

**Spec:** `docs/superpowers/specs/2026-09-02-multisource-processing-refactor-design.md`

## Global Constraints

- 所有改动限定在当前前端仓库的多源卫星处理模块。
- 不修改后端代码，不修改其他前端业务模块，不新增第三方依赖。
- 保留现有产品文件槽位、文件校验、参数业务规则、任务轮询、取消、重试和下载能力。
- 用户选择目标功能，系统自动补齐依赖；自动步骤不能单独删除或绕过，但其可配置参数仍可编辑。
- 修改前置参数只标记下游“需要重跑”，不自动执行。
- 一次提交完整处理计划；支持单功能结果下载和全部结果 ZIP。
- 影像产品和 HY-2D 使用不同流水线定义。
- 每个任务步骤结束后都运行相关测试，最终运行 `pnpm test:multisource` 以及可用的类型检查和构建检查。

---

### Task 1: 建立产品处理流水线定义

**Files:**

- Create: `src/features/multisource/pipelineDefinitions.ts`
- Modify: `src/features/multisource/productTemplates.ts`
- Test: `src/features/multisource/pipelineDefinitions.test.ts`

**Interfaces:**

- Consumes: 现有产品模板 ID、productCode、profileVersion。
- Produces: `PipelineType`、`StepDefinition`、`PipelineDefinition`、产品能力查询函数和五个现有产品的流程定义。

- [ ] **Step 1: Write the failing tests**

为每个产品断言可用目标功能；断言 HY-2D 不包含影像标准产品步骤；断言每个依赖 key 都存在且流程无循环。

- [ ] **Step 2: Run the focused test**

Run: `pnpm exec vitest run src/features/multisource/pipelineDefinitions.test.ts`

Expected: FAIL because the pipeline definition module is not present.

- [ ] **Step 3: Implement definitions and product lookup**

声明稳定的步骤 key，区分 `system` 与 `target`，为影像产品声明共享前置流程，为 HY-2D 声明沿轨流程，并导出按产品 ID 查询定义的函数。

- [ ] **Step 4: Run the focused test**

Run: `pnpm exec vitest run src/features/multisource/pipelineDefinitions.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/multisource/pipelineDefinitions.ts src/features/multisource/pipelineDefinitions.test.ts src/features/multisource/productTemplates.ts
git commit -m "feat(multisource): define product processing pipelines"
```

### Task 2: 实现处理计划和依赖解析

**Files:**

- Create: `src/features/multisource/dependencyResolver.ts`
- Create: `src/features/multisource/processingPlan.ts`
- Test: `src/features/multisource/dependencyResolver.test.ts`
- Test: `src/features/multisource/processingPlan.test.ts`

**Interfaces:**

- Consumes: Task 1 的 `PipelineDefinition` 和 `StepDefinition`。
- Produces: `resolveProcessingPlan(definition, selectedTargets, parameters)`、`invalidateDownstream(plan, changedStep)`、目标取消后的依赖清理函数。

- [ ] **Step 1: Write failing tests**

覆盖单目标、多目标共享前置步骤、取消目标、HY-2D 异常检测自动补齐沿轨特征提取、循环依赖报错，以及修改前置参数后下游标记 `invalidatedSteps`。

- [ ] **Step 2: Run tests to verify failure**

Run: `pnpm exec vitest run src/features/multisource/dependencyResolver.test.ts src/features/multisource/processingPlan.test.ts`

Expected: FAIL with missing module or exported function errors.

- [ ] **Step 3: Implement pure resolver and plan operations**

使用 DFS 或拓扑排序解析依赖，保持定义顺序稳定；返回用户目标、解析后的完整步骤、自动前置步骤和并行组信息。目标取消后只移除不再被其他目标依赖的自动步骤。

- [ ] **Step 4: Run focused tests**

Run: `pnpm exec vitest run src/features/multisource/dependencyResolver.test.ts src/features/multisource/processingPlan.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/multisource/dependencyResolver.ts src/features/multisource/processingPlan.ts src/features/multisource/dependencyResolver.test.ts src/features/multisource/processingPlan.test.ts
git commit -m "feat(multisource): resolve processing plan dependencies"
```

### Task 3: 增加步骤参数注册和校验适配

**Files:**

- Create: `src/features/multisource/stepParameterRegistry.ts`
- Modify: `src/features/multisource/*Parameters.ts`
- Modify: `src/components/LeftPanel/*ParameterDrawer.vue`
- Test: `src/features/multisource/stepParameterRegistry.test.ts`

**Interfaces:**

- Consumes: Task 1 的步骤 key、现有产品参数默认值、snapshot 构建器和参数抽屉。
- Produces: 按产品和步骤查询参数配置的注册表、默认参数创建、步骤级校验和兼容现有 snapshot 的序列化结果。

- [ ] **Step 1: Write failing tests**

断言仅选中特征提取时只返回该步骤参数；自动前置步骤的参数可被读取和修改；切换产品时不保留不兼容字段；参数变化能生成稳定的任务 snapshot。

- [ ] **Step 2: Run focused tests**

Run: `pnpm exec vitest run src/features/multisource/stepParameterRegistry.test.ts`

Expected: FAIL because the registry is not present.

- [ ] **Step 3: Implement registry and adapters**

把现有产品参数逻辑包在步骤级适配器中，避免重写已有业务校验；为暂时没有参数的系统步骤提供空参数适配器。

- [ ] **Step 4: Run multisource tests**

Run: `pnpm test:multisource`

Expected: Existing parameter and snapshot tests remain PASS, and the new registry tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/multisource src/components/LeftPanel/*ParameterDrawer.vue
git commit -m "feat(multisource): organize parameters by processing step"
```

### Task 4: 拆分四阶段页面视图

**Files:**

- Create: `src/components/LeftPanel/multisource/UploadStep.vue`
- Create: `src/components/LeftPanel/multisource/FunctionSelectionStep.vue`
- Create: `src/components/LeftPanel/multisource/ParameterConfigStep.vue`
- Create: `src/components/LeftPanel/multisource/ProcessingPlanPreview.vue`
- Create: `src/components/LeftPanel/multisource/ProcessingResultStep.vue`
- Modify: `src/components/LeftPanel/MultiSourceSatelliteProcess.vue`
- Test: `src/components/LeftPanel/multisource/MultiSourceSatelliteProcess.test.ts`

**Interfaces:**

- Consumes: Task 2 的计划 resolver、Task 3 的参数注册表、现有上传和任务 composable。
- Produces: 四阶段向导 UI；阶段切换、返回修改、目标功能多选、自动步骤展示、参数错误定位、计划确认入口。

- [ ] **Step 1: Write failing component tests**

覆盖初始上传阶段、未完成上传不能进入功能阶段、选择目标后自动显示依赖、自动步骤不能被单独取消、只展示解析流程的参数，以及任务创建后步骤冻结。

- [ ] **Step 2: Run component tests to verify failure**

Run: `pnpm exec vitest run src/components/LeftPanel/multisource/MultiSourceSatelliteProcess.test.ts`

Expected: FAIL because the new views and state integration do not exist.

- [ ] **Step 3: Implement stage shell and child views**

由父组件持有产品、文件、处理计划和阶段状态；子组件通过明确的 props/emits 通信。继续复用现有上传控件和参数抽屉，不让子组件直接调用 API。

- [ ] **Step 4: Run focused component tests**

Run: `pnpm exec vitest run src/components/LeftPanel/multisource/MultiSourceSatelliteProcess.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/LeftPanel/MultiSourceSatelliteProcess.vue src/components/LeftPanel/multisource
git commit -m "feat(multisource): split processing flow into guided stages"
```

### Task 5: 适配任务状态、重试和结果展示

**Files:**

- Create: `src/features/multisource/processingRunState.ts`
- Modify: `src/features/multisource/useProcessingTask.ts`
- Modify: `src/api/multiSourceSatellite.ts`
- Modify: `src/components/LeftPanel/multisource/ProcessingResultStep.vue`
- Test: `src/features/multisource/processingRunState.test.ts`

**Interfaces:**

- Consumes: 现有任务生命周期、阶段进度、artifact 授权下载和 ZIP 下载接口。
- Produces: 总体任务、步骤和结果三层状态映射；失败重试；参数修改后的下游失效状态；按步骤分组的单项下载和全部 ZIP 下载。

- [ ] **Step 1: Write failing tests**

断言后端阶段状态能映射到等待、处理中、成功、失败、需要重跑；失败步骤可重试；成功的并行步骤保持成功；不可下载 artifact 没有下载动作；结果能按步骤分组。

- [ ] **Step 2: Run focused tests to verify failure**

Run: `pnpm exec vitest run src/features/multisource/processingRunState.test.ts`

Expected: FAIL because the state mapper is not present.

- [ ] **Step 3: Implement state mapper and integrate existing composable**

将任务执行状态从计划状态中隔离；保留现有轮询、取消、阶段重试和下载授权；新 UI 只消费统一状态模型。

- [ ] **Step 4: Run focused and multisource tests**

Run: `pnpm exec vitest run src/features/multisource/processingRunState.test.ts`
Run: `pnpm test:multisource`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/multisource/processingRunState.ts src/features/multisource/useProcessingTask.ts src/api/multiSourceSatellite.ts src/components/LeftPanel/multisource/ProcessingResultStep.vue
git commit -m "feat(multisource): show step results and execution state"
```

### Task 6: 集成验证和回归检查

**Files:**

- Modify: `src/components/LeftPanel/multisource/MultiSourceSatelliteProcess.test.ts`
- Modify: `src/features/multisource/*.test.ts` only when assertions must reflect the new public model.

- [ ] **Step 1: Run the complete multisource test suite**

Run: `pnpm test:multisource`

Expected: PASS.

- [ ] **Step 2: Run type checking and production build**

Run: `pnpm exec vue-tsc --noEmit`
Run: `pnpm build`

Expected: both commands complete successfully without errors from unrelated modules.

- [ ] **Step 3: Verify scope and working tree**

Run: `git diff --name-only HEAD~6..HEAD`
Run: `git status --short`

Expected: changed source files remain within the multi-source module, its existing API adapter, and the new Superpowers documentation; pre-existing local log files remain untouched.

- [ ] **Step 4: Commit final verification updates**

```bash
git add docs/superpowers src/components/LeftPanel/multisource src/components/LeftPanel/MultiSourceSatelliteProcess.vue src/features/multisource src/api/multiSourceSatellite.ts
git commit -m "test(multisource): verify processing flow refactor"
```

### Task 7: 可独立执行步骤与按步骤参数抽屉

**Files:**

- Modify: `src/features/multisource/pipelineDefinitions.ts`
- Modify: `src/features/multisource/processingPlan.ts`
- Modify: `src/components/LeftPanel/ProcessingPlanPanel.vue`
- Modify: `src/components/LeftPanel/MultiSourceSatelliteProcess.vue`
- Modify: `src/features/multisource/pipelineDefinitions.test.ts`
- Modify: `src/features/multisource/processingPlanPanel.test.ts`

**Interfaces:**

- Consumes: 现有产品表单、步骤定义和依赖解析。
- Produces: 可单独选择预处理的目标步骤；纵向选择列表；仅渲染已解析步骤对应参数区段的抽屉状态。

- [ ] **Step 1: Write failing tests**

断言影像产品和 HY-2D 的预处理根步骤可单独选择；断言功能区使用单行复选项；断言预处理单选时参数抽屉不会渲染特征、融合或显著性控制区段。

- [ ] **Step 2: Run focused tests to verify failure**

Run: `pnpm exec tsx --test src/features/multisource/pipelineDefinitions.test.ts src/features/multisource/processingPlanPanel.test.ts`

Expected: FAIL because preprocessing is only a system dependency and the drawer still displays all product controls.

- [ ] **Step 3: Implement selectable preprocessing and scoped drawers**

将每个产品流程中的可独立预处理终点标记为可选目标，同时保留其内部依赖的自动锁定关系。处理计划面板改为单列步骤行；父组件根据解析计划为各现有参数抽屉传递可见步骤集合，抽屉仅渲染该集合对应的字段组。

- [ ] **Step 4: Run focused and multisource tests**

Run: `pnpm exec tsx --test src/features/multisource/pipelineDefinitions.test.ts src/features/multisource/processingPlanPanel.test.ts`
Run: `pnpm test:multisource`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/multisource src/components/LeftPanel/MultiSourceSatelliteProcess.vue src/components/LeftPanel/ProcessingPlanPanel.vue docs/superpowers
git commit -m "feat(multisource): scope processing steps and parameters"
```

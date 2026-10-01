# 前端全量类型检查治理 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 消除全量 `vue-tsc` 错误，并保留既有多源处理与地图页面的运行行为。

**Architecture:** 先修复共享类型及已经定位的 TypeScript 基线问题，再用显式 number 转换和固定 ROI 元组消除参数抽屉的重复错误，最后补齐各页面真实 API/模板模型。每个批次都用相关单测和 `pnpm typecheck` 验证。

**Tech Stack:** Vue 3、TypeScript、vue-tsc、Element Plus、Cesium、tsx node:test。

**Spec:** `docs/superpowers/specs/2026-09-30-frontend-typecheck-remediation-design.md`

## Global Constraints

- 不新增 `any`、`@ts-ignore`、`@ts-nocheck` 或 TypeScript 配置降级。
- 保持后端 API、Worker 参数快照和页面交互不变。
- 数值输入写入 number；ROI 保持 `[west, south, east, north]` 四元组。
- 最终必须执行 `pnpm test:multisource`、`pnpm typecheck`、`pnpm build`。

---

### Task 1: 提交已验证的基础 TypeScript 修复

**Files:**

- Modify: `src/router/utils.ts`, `src/components/ReAuth/src/auth.tsx`, `src/utils/http/index.ts`
- Modify: `src/libs/MapboxVectorTileImageryProvider.ts`, `src/libs/tdtmap.ts`, `src/components/Menu/Menu.vue`
- Create: `src/features/multisource/routerPermissions.test.ts`

**Interfaces:** Produces `hasRequiredPermissions(permissions, required)` and typed online imagery entries.

- [ ] **Step 1: Keep the existing failing permission import test as the red test**

The test imports `hasRequiredPermissions` and asserts a user with only `task:read` cannot satisfy `["task:read", "task:download"]`.

- [ ] **Step 2: Verify the test now passes**

Run: `pnpm test:multisource`  
Expected: all tests pass, including `routerPermissions.test.ts`.

- [ ] **Step 3: Verify the base compiler stage**

Run: `npx tsc --noEmit`  
Expected: exit 0.

- [ ] **Step 4: Commit the focused baseline repair**

`git add src/router/utils.ts src/components/ReAuth/src/auth.tsx src/utils/http/index.ts src/libs/MapboxVectorTileImageryProvider.ts src/libs/tdtmap.ts src/components/Menu/Menu.vue src/features/multisource/routerPermissions.test.ts && git commit -m "fix: repair frontend TypeScript baselines"`

### Task 2: 共享 ROI 与数值输入模型

**Files:**

- Modify: `src/features/multisource/Fy3hMersiParameterDrawer.vue`
- Modify: `src/features/multisource/Fy4bAgriParameterDrawer.vue`
- Modify: `src/features/multisource/Gf6WfvL1aParameterDrawer.vue`
- Modify: `src/features/multisource/Hy2dAltimeterParameterDrawer.vue`
- Modify: `src/components/LeftPanel/MultiSourceSatelliteProcess.vue`
- Test: existing `src/features/multisource/*Parameters.test.ts`

**Interfaces:** Every numeric `el-input`/`el-input-number` binding writes a number; writable `computed<RoiBounds>` getter returns a four-item tuple.

- [ ] **Step 1: Run the parameter tests before changes**

Run: `pnpm test:multisource`  
Expected: existing behavior passes; typecheck still reports number/ROI errors.

- [ ] **Step 2: Fix one drawer first and verify typecheck error reduction**

Use `v-model.number` for text inputs representing numeric model properties. For writable ROI computed values return `[west, south, east, north] as RoiBounds`; setter destructures exactly four numbers and rejects non-finite bounds through existing validation.

- [ ] **Step 3: Apply the same explicit conversion to the remaining drawers and processing panel**

Do not change parameter field interfaces to string. Add `packageValidationIssue` as the computed/ref actually used by the launch card.

- [ ] **Step 4: Verify behavior and commit**

Run: `pnpm test:multisource && pnpm typecheck`  
Expected: all number/ROI/missing-launch-field diagnostics are absent.  
Commit: `git add src/features/multisource src/components/LeftPanel/MultiSourceSatelliteProcess.vue && git commit -m "fix: type multisource parameter bindings"`

### Task 3: 通用组件与表单接口

**Files:**

- Modify: `src/components/DictTag/index.vue`
- Modify: `src/components/LeftPanel/form.vue`
- Modify: `src/components/LeftPanel/starAnalysisTooltip0721.vue`
- Modify: `src/components/Ribbon/form.vue`
- Modify: `src/components/Map/mapCopy.vue`, `src/components/Map/mapLegend.vue`
- Modify: `src/components/Menu/Menu.vue`

**Interfaces:** Dictionary options have `value`, `label`, optional Element Plus tag fields; tree nodes own optional `children`; menu password update response exposes `code`/`msg` only after await.

- [ ] **Step 1: Add narrow type fixtures or existing-component behavior tests where utilities are present**

For each API call, assert the real awaited response shape before reading result properties. For dictionary/tree components, type the prop values to their displayed fields rather than casting template values.

- [ ] **Step 2: Implement exact local interfaces and missing imports/defaults**

Import `ElMessage` in Menu, add the `qaAlgorithm` initial form field, use Element Plus accepted form trigger literals, and pass the map legend API its declared string input.

- [ ] **Step 3: Verify and commit**

Run: `pnpm typecheck`  
Expected: diagnostics for these files are absent.  
Commit: `git add src/components && git commit -m "fix: type shared component contracts"`

### Task 4: 在线数据与数据源面板模型

**Files:**

- Modify: `src/views/dataSource/OnlineDataList.vue`
- Modify: `src/views/dataSource/panel/panel.vue`
- Modify: `src/api/dataSource/legend.ts` only if its exported API name is genuinely incorrect

**Interfaces:** Online data rows explicitly include optional `properties`; remote legend search is imported under its actual exported name; data-panel numeric form fields remain number.

- [ ] **Step 1: Trace each API import to its exported symbol before editing**

Run: `rg -n "export.*search|export.*Legend" src/api/dataSource/legend.ts`  
Expected: identify the existing API name; do not add duplicate compatibility exports.

- [ ] **Step 2: Fix local response/row interfaces and number bindings**

Await API promises, declare `properties` as the shape read in templates, initialize list state as an array, and apply `v-model.number` to numeric panel inputs.

- [ ] **Step 3: Verify and commit**

Run: `pnpm typecheck`  
Expected: no diagnostics under `src/views/dataSource`.  
Commit: `git add src/views/dataSource src/api/dataSource/legend.ts && git commit -m "fix: type data source views"`

### Task 5: Full verification and correction loop

**Files:** only files implicated by remaining diagnostics.

- [ ] **Step 1: Run the complete gate**

Run: `pnpm test:multisource && pnpm typecheck && pnpm build`  
Expected: all commands exit 0.

- [ ] **Step 2: Inspect for prohibited workarounds**

Run: `rg -n "@ts-ignore|@ts-nocheck|\bany\b" src && git diff --check`  
Expected: no new prohibited suppression or formatting errors.

- [ ] **Step 3: Commit correction-only changes and report exact evidence**

`git add <corrected-files> && git commit -m "fix: complete frontend typecheck remediation"`

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const panel = readFileSync(
  "src/components/LeftPanel/ProcessingPlanPanel.vue",
  "utf8"
);
const workspace = readFileSync(
  "src/components/LeftPanel/MultiSourceSatelliteProcess.vue",
  "utf8"
);

test("processing plan panel exposes selectable targets and automatic prerequisites", () => {
  assert.match(panel, /选择处理功能/);
  assert.doesNotMatch(panel, /PROCESSING PLAN/);
  assert.doesNotMatch(panel, /class="processing-plan__empty"/);
  assert.match(panel, /processing-plan__help/);
  assert.match(panel, /el-tooltip/);
  assert.match(panel, /系统自动添加/);
  assert.match(panel, /update:selectedTargets/);
  assert.match(panel, /:disabled="disabled \|\| isLockedTarget/);
  assert.match(panel, /processing-plan__group/);
  assert.match(panel, /预处理/);
  assert.match(panel, /专题处理/);
});

test("selected processing targets stay compact and open the workbench below", () => {
  assert.doesNotMatch(panel, /processing-plan__detail/);
  assert.match(panel, /processing-plan__step-row/);
  assert.match(panel, /grid-template-columns: minmax\(0, 1fr\)/);
  assert.match(panel, /checkedTargets/);
  assert.match(panel, /lockedTargets/);
  assert.match(panel, /isLockedTarget/);
  assert.match(workspace, /@configure="isParameterDrawerOpen = true"/);
});

test("execution plan keeps three compact rows visible and scrolls remaining steps", () => {
  assert.match(panel, /class="processing-plan__steps"/);
  assert.match(panel, /class="processing-plan__step-title-row"/);
  assert.match(panel, /class="processing-plan__step-status"/);
  assert.match(
    panel,
    /\.processing-plan__steps\s*\{[\s\S]*?max-height:\s*132px;[\s\S]*?overflow-y:\s*auto;/
  );
  assert.match(
    panel,
    /\.processing-plan__step\s*\{[\s\S]*?align-items:\s*center;/
  );
  assert.match(
    panel,
    /\.processing-plan__step-marker\s*\{[\s\S]*?margin-top:\s*0;/
  );
});

test("processing target descriptions open directly above their cards", () => {
  assert.match(
    panel,
    /class="processing-plan__target-tooltip"[\s\S]*?placement="top"[\s\S]*?:offset="6"/
  );
});

test("execution plan uses a compact heading without connector arrows", () => {
  assert.doesNotMatch(panel, /class="processing-plan__arrow"/);
  assert.doesNotMatch(panel, /↓/);
  assert.match(panel, /v-for="\(step, index\) in planSteps"/);
  assert.match(panel, /class="processing-plan__step-index"/);
  assert.match(panel, /\{\{ index \+ 1 \}\}/);
  assert.match(
    panel,
    /\.processing-plan__subheading strong\s*\{[\s\S]*?font-size:\s*13px;/
  );
});

test("processing choices stay compact and distinguish automatic prerequisites", () => {
  assert.doesNotMatch(panel, /processing-plan__detail/);
  assert.match(panel, /processing-plan__target-tooltip/);
  assert.doesNotMatch(panel, /<small v-if="step\.productTitle">/);
  assert.match(panel, /checkedTargets/);
  assert.match(panel, /isAutomaticTarget/);
  assert.match(panel, /自动依赖/);
});

test("automatic prerequisites are summarized inline instead of blocking with a dialog", () => {
  assert.match(panel, /processing-plan__dependency-summary/);
  assert.match(panel, /automaticPlanSteps/);
  assert.match(panel, /查看自动补齐的前置步骤/);
  assert.match(panel, /placement="top"/);
  assert.doesNotMatch(workspace, /<MultisourceDialog/);
  assert.doesNotMatch(workspace, /dependencyDialog(Open|Steps)/);
});

test("multisource workspace integrates the plan before upload and requires a target", () => {
  assert.match(workspace, /<ProcessingPlanPanel/);
  assert.match(workspace, /:target-steps="targetSteps"/);
  assert.match(workspace, /selectedTargets\.value\.length > 0/);
  assert.match(workspace, /function updateSelectedTargets/);
});

test("multisource workspace places file upload before processing plan selection", () => {
  assert.ok(workspace.indexOf('aria-labelledby="package-title"') >= 0);
  assert.doesNotMatch(workspace, /class="mission-section__note"/);
  assert.match(workspace, /package-requirements-tooltip/);
  assert.match(workspace, /width: 18px;/);
  assert.doesNotMatch(
    workspace,
    /<span class="mission-section__signal" aria-hidden="true" \/>\s*<strong id="package-title">/
  );
  assert.match(workspace, /--plain-surface: #ffffff;/);
  assert.ok(
    workspace.indexOf('aria-labelledby="package-title"') <
      workspace.indexOf("<ProcessingPlanPanel")
  );
});

test("multisource help and upload cards use compact accessible affordances", () => {
  const gf6Workbench = readFileSync(
    "src/features/multisource/Gf6ProcessingWorkbench.vue",
    "utf8"
  );

  assert.match(panel, /<QuestionFilled \/>/);
  assert.match(workspace, /<QuestionFilled \/>/);
  assert.match(gf6Workbench, /<QuestionFilled \/>/);
  assert.match(workspace, /class="file-slot__details"/);
  assert.match(workspace, /class="file-slot__upload-hint"/);
  assert.match(workspace, /class="file-slot"[\s\S]*?is-actionable/);
  assert.match(workspace, /@click="handleSlotActivate\(slot\.id, \$event\)"/);
  assert.doesNotMatch(workspace, /<label[^>]*file-slot__picker/);
  assert.match(workspace, /EMPTY: "未上传"/);
  assert.doesNotMatch(
    workspace,
    /slots\[slot\.id\]\.file\?\.name \|\| "选择文件"/
  );
  assert.match(
    workspace,
    /\.satellite-workspace \.file-slot\.is-empty \.file-slot__status\s*\{[\s\S]*?color:\s*#b44c4c;/
  );
  assert.match(
    workspace,
    /\.satellite-workspace \.file-slot\.is-actionable\s*\{[\s\S]*?cursor:\s*pointer;/
  );
  assert.match(
    workspace,
    /\.satellite-workspace \.file-slot__remove\s*\{[\s\S]*?width:\s*24px;[\s\S]*?height:\s*24px;/
  );
});

test("product slots keep format guidance in hover text and make empty cards uploadable", () => {
  assert.doesNotMatch(
    workspace,
    /class="diagnostic-strip"[\s\S]*?validationMessages/
  );
  assert.match(
    workspace,
    /:content="[\s\S]*slot\.role[\s\S]*slot\.extensions\.join\(' \/ '\)/
  );
  assert.match(workspace, /placement="top"/);
  assert.doesNotMatch(workspace, /<small[\s\S]*?>\{\{ slot\.role \}\}/);
  assert.match(
    workspace,
    /\.satellite-workspace \.file-slot__meta\s*\{[\s\S]*?padding-right:\s*0;/
  );
  assert.match(workspace, /卫星数据选择/);
  assert.doesNotMatch(workspace, /<header class="mission-panel__masthead">/);
  assert.doesNotMatch(workspace, /选择产品包，校验配置，然后下发处理任务/);
});

test("upload progress is rendered as a slim card-bottom rail", () => {
  assert.match(
    workspace,
    /class="file-slot__status"[\s\S]*?v-if="slots\[slot\.id\]\.status === 'UPLOADING'"[\s\S]*?uploadProgress \?\? 0/
  );
  assert.match(
    workspace,
    /\.satellite-workspace \.file-slot__progress\s*\{[\s\S]*?position:\s*absolute;[\s\S]*?bottom:\s*0;[\s\S]*?height:\s*3px;/
  );
});

test("product package stays collapsed for missing uploads but expands for actionable errors", () => {
  assert.match(workspace, /const isPackageExpanded = ref\(false\)/);
  assert.match(workspace, /const isPackageContentVisible = computed\(/);
  assert.match(workspace, /const hasPackageAttention = computed\(/);
  assert.match(
    workspace,
    /isPackageExpanded\.value\s*\|\|\s*hasPackageAttention\.value/
  );
  assert.doesNotMatch(
    workspace,
    /isPackageExpanded\.value\s*\|\|\s*isUploading\.value\s*\|\|\s*validationMessages\.value\.length/
  );
  assert.match(workspace, /@click="togglePackageExpanded"/);
  assert.match(workspace, /v-if="isPackageContentVisible"/);
  assert.match(workspace, /isPackageExpanded\.value = false;/);
});

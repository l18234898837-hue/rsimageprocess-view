import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { compileStyleAsync, parse } from "@vue/compiler-sfc";
import { featureMetricLabel } from "./featureMetricLabels";

test("feature metric keys keep their API values but render Chinese labels", () => {
  assert.equal(featureMetricLabel("statistics"), "统计特征");
  assert.equal(featureMetricLabel("gradient"), "梯度特征");
  assert.equal(featureMetricLabel("local_variance"), "局部方差");
  assert.equal(featureMetricLabel("toa_nir_red_nd"), "近红外与红光归一化差异");
  assert.equal(featureMetricLabel("btd_c13_c14"), "C13 与 C14 亮温差");

  const fy4bDrawer = readFileSync(
    "src/features/multisource/Fy4bAgriParameterDrawer.vue",
    "utf8"
  );
  const gf6Drawer = readFileSync(
    "src/features/multisource/Gf6WfvL1aParameterDrawer.vue",
    "utf8"
  );
  const workspace = readFileSync(
    "src/components/LeftPanel/MultiSourceSatelliteProcess.vue",
    "utf8"
  );

  assert.match(fy4bDrawer, /featureMetricLabel\(metric\)/);
  assert.match(gf6Drawer, /featureMetricLabel\(metric\)/);
  assert.doesNotMatch(fy4bDrawer, /<span>\{\{ metric \}\}<\/span>/);
  assert.doesNotMatch(gf6Drawer, /<span>\{\{ metric \}\}<\/span>/);
  assert.match(
    workspace,
    /buildFy4bWorkbenchSummary\(fy4bForm, featureMetricLabel\)/
  );
});

test("teleported product drawers compile the shared theme as global CSS", async () => {
  const drawerFiles = [
    "src/features/multisource/Fy3hMersiParameterDrawer.vue",
    "src/features/multisource/Fy4bAgriParameterDrawer.vue",
    "src/features/multisource/Gf6WfvL1aParameterDrawer.vue",
    "src/features/multisource/Hy2dAltimeterParameterDrawer.vue"
  ];
  const sharedStyles = readFileSync(
    "src/features/multisource/unifiedProductParameterDrawer.less",
    "utf8"
  );
  const workspaceFilename =
    "src/components/LeftPanel/MultiSourceSatelliteProcess.vue";
  const workspaceDescriptor = parse(readFileSync(workspaceFilename, "utf8"), {
    filename: workspaceFilename
  }).descriptor;
  const themeOwner = workspaceDescriptor.styles.find(block =>
    block.content.includes("unifiedProductParameterDrawer.less")
  );
  assert.ok(themeOwner, "the workspace should own the global drawer theme");
  assert.ok(!themeOwner.scoped);

  for (const filename of drawerFiles) {
    const descriptor = parse(readFileSync(filename, "utf8"), {
      filename
    }).descriptor;
    assert.equal(
      descriptor.styles.some(block =>
        block.src?.includes("unifiedProductParameterDrawer.less")
      ),
      false,
      `${filename} must not register a duplicate external style owner`
    );
  }

  const compiled = await compileStyleAsync({
    id: "data-v-teleport-contract",
    filename: workspaceFilename,
    source: sharedStyles,
    scoped: Boolean(themeOwner.scoped),
    preprocessLang: "less"
  });

  assert.deepEqual(compiled.errors, []);
  assert.doesNotMatch(compiled.code, /data-v-teleport-contract/);
  assert.match(compiled.code, /\.product-parameter-drawer\s*\{/);
  assert.match(
    compiled.code,
    /\.product-parameter-drawer\.mission-parameter-drawer\s*\{[\s\S]*?background:\s*var\(--drawer-canvas\)/
  );
  assert.match(compiled.code, /--drawer-font-control:\s*0\.8125rem/);
  assert.match(compiled.code, /--drawer-control-height:\s*2\.5rem/);
  assert.match(compiled.code, /min-height:\s*var\(--drawer-control-height\)/);
});

test("parameter drawer keeps focused controls inside its scrolling body", () => {
  const styles = readFileSync(
    "src/features/multisource/productParameterDrawer.less",
    "utf8"
  );

  assert.match(
    styles,
    /\.el-drawer__body\) \{[\s\S]*?min-height: 0;[\s\S]*?overflow-y: auto;/
  );
  assert.match(styles, /\.toggle \{\s*position: relative;/);
  assert.match(styles, /\.chip-list label \{\s*position: relative;/);
  assert.match(
    styles,
    /\.toggle input \{[\s\S]*?position: absolute;[\s\S]*?inset: 0;/
  );
});

test("FY-4B and GF-6 drawers expose their constrained engineering controls", () => {
  const fy4bDrawer = readFileSync(
    "src/features/multisource/Fy4bAgriParameterDrawer.vue",
    "utf8"
  );
  const gf6Drawer = readFileSync(
    "src/features/multisource/Gf6WfvL1aParameterDrawer.vue",
    "utf8"
  );

  assert.match(fy4bDrawer, /class="product-parameter-drawer"/);
  assert.match(fy4bDrawer, /<template #header="\{ titleId \}"\s*>/);
  assert.match(fy4bDrawer, /<h2 :id="titleId">FY-4B AGRI 参数<\/h2>/);
  assert.match(fy4bDrawer, /FY-4B AGRI 参数/);
  assert.match(fy4bDrawer, /NOMINAL_UNVERIFIED/);
  assert.match(fy4bDrawer, /NIR_RED_BLUE/);
  assert.match(fy4bDrawer, /targetCrs/);
  assert.match(fy4bDrawer, /form\.roi/);
  assert.match(fy4bDrawer, /form\.features/);
  assert.match(fy4bDrawer, /form\.saliency/);

  assert.match(gf6Drawer, /class="product-parameter-drawer"/);
  assert.match(gf6Drawer, /<template #header="\{ titleId \}"\s*>/);
  assert.match(gf6Drawer, /<h2 :id="titleId">GF-6 WFV L1A 参数<\/h2>/);
  assert.match(gf6Drawer, /GF-6 WFV L1A 参数/);
  assert.doesNotMatch(gf6Drawer, /OUTPUT PROFILE/);
  assert.match(gf6Drawer, /NOMINAL_RPC_NO_DEM/);
  assert.match(gf6Drawer, /accuracyStatus=UNVALIDATED/);
  assert.match(gf6Drawer, /CANDIDATE_ONLY/);
  assert.match(gf6Drawer, /rpcHeightMode/);
  assert.match(gf6Drawer, /rpcHeight/);
  assert.match(gf6Drawer, /form\.resolution/);
  assert.match(gf6Drawer, /:min="resolutionConstraint\.minimum"/);
  assert.match(gf6Drawer, /后端会在写入前按网格像元数和预估字节执行最终保护/);
  assert.match(gf6Drawer, /form\.bands/);
  assert.match(gf6Drawer, /form\.fusion/);
});

test("workspace selects FY-4B and GF-6 parameter drawers with integrated stages", () => {
  const workspace = readFileSync(
    "src/components/LeftPanel/MultiSourceSatelliteProcess.vue",
    "utf8"
  );
  const gf6Drawer = readFileSync(
    "src/features/multisource/Gf6WfvL1aParameterDrawer.vue",
    "utf8"
  );

  assert.match(workspace, /Fy4bAgriParameterDrawer/);
  assert.match(workspace, /Gf6WfvL1aParameterDrawer/);
  assert.match(workspace, /FY4B_AGRI_TEMPLATE/);
  assert.match(workspace, /GF6_WFV_L1A_TEMPLATE/);
  assert.match(workspace, /buildFy4bAgriSnapshot/);
  assert.match(workspace, /buildGf6WfvL1aSnapshot/);
  assert.match(workspace, /<Gf6WfvL1aParameterDrawer/);
  assert.match(workspace, /:visible-steps="visibleParameterGroups"/);
  assert.doesNotMatch(workspace, /<Gf6ProcessingWorkbench/);
  assert.doesNotMatch(workspace, /import Gf6ProcessingWorkbench/);
  assert.match(gf6Drawer, /<legend>工程网格<\/legend>/);
  assert.match(gf6Drawer, /<legend>输出波段<\/legend>/);
  assert.match(gf6Drawer, /WGS84 ROI/);
  assert.match(
    workspace,
    /STANDARDIZE_FY4B_AGRI: "处理 FY-4B AGRI 全圆盘产品"/
  );
  assert.match(
    workspace,
    /STANDARDIZE_GF6_WFV_L1A: "处理 GF-6 WFV L1A 工程产品"/
  );
});

test("GF-6 drawer limits algorithm controls to the selected processing steps", () => {
  const drawer = readFileSync(
    "src/features/multisource/Gf6WfvL1aParameterDrawer.vue",
    "utf8"
  );
  const workspace = readFileSync(
    "src/components/LeftPanel/MultiSourceSatelliteProcess.vue",
    "utf8"
  );

  assert.match(drawer, /visibleSteps/);
  assert.match(drawer, /visibleSteps\.includes\(['"]feature-extraction['"]\)/);
  assert.match(drawer, /visibleSteps\.includes\(['"]rgb-fusion['"]\)/);
  assert.match(drawer, /visibleSteps\.includes\(['"]anomaly-detection['"]\)/);
  assert.match(workspace, /:visible-steps="visibleParameterGroups"/);
});

test("parameter workbench is driven by the resolved execution plan", () => {
  const workspace = readFileSync(
    "src/components/LeftPanel/MultiSourceSatelliteProcess.vue",
    "utf8"
  );
  const drawerFiles = [
    "Fy3hMersiParameterDrawer.vue",
    "Fy4bAgriParameterDrawer.vue",
    "Gf6WfvL1aParameterDrawer.vue",
    "Hy2dAltimeterParameterDrawer.vue"
  ];

  assert.match(workspace, /:visible-steps="visibleParameterGroups"/);
  assert.match(
    workspace,
    /getVisibleParameterGroups\([\s\S]*?processingPlan\.value\.resolvedSteps/
  );

  for (const filename of drawerFiles) {
    const drawer = readFileSync(`src/features/multisource/${filename}`, "utf8");
    assert.match(drawer, /visibleSteps: readonly string\[\]/);
    assert.match(drawer, /visibleSteps\.includes\(/);
  }
});

test("product launch remains below the left-side execution plan", () => {
  const workspace = readFileSync(
    "src/components/LeftPanel/MultiSourceSatelliteProcess.vue",
    "utf8"
  );

  assert.match(workspace, /<section class="mission-section mission-launch"/);
  assert.match(workspace, /<el-icon class="el-icon--right"><ArrowRight \/><\/el-icon>/);
  assert.doesNotMatch(workspace, /ProductProcessingLaunch/);

  for (const filename of [
    "Fy3hMersiParameterDrawer.vue",
    "Fy4bAgriParameterDrawer.vue",
    "Gf6WfvL1aParameterDrawer.vue",
    "Hy2dAltimeterParameterDrawer.vue"
  ]) {
    const drawer = readFileSync(`src/features/multisource/${filename}`, "utf8");
    assert.doesNotMatch(drawer, /<slot name="launch"\s*\/>/);
  }
});

test("workspace delegates multisource form coordination to the shared adapter", () => {
  const workspace = readFileSync(
    "src/components/LeftPanel/MultiSourceSatelliteProcess.vue",
    "utf8"
  );

  assert.match(workspace, /resetMultisourceProductForms\(productForms\)/);
  assert.match(
    workspace,
    /syncProductAlgorithmSelection\(productForms, value\)/
  );
  assert.doesNotMatch(workspace, /fy3hForm\.features\.enabled\s*=/);
  assert.doesNotMatch(workspace, /gf6Form\.saliency\.enabled\s*=/);
});

test("derived output status remains on the left execution plan", () => {
  const workspace = readFileSync(
    "src/components/LeftPanel/MultiSourceSatelliteProcess.vue",
    "utf8"
  );
  const plan = readFileSync(
    "src/components/LeftPanel/ProcessingPlanPanel.vue",
    "utf8"
  );
  assert.match(plan, /processing-plan__target/);
  assert.doesNotMatch(workspace, /DerivedOutputChecklist/);

  for (const filename of [
    "Fy3hMersiParameterDrawer.vue",
    "Fy4bAgriParameterDrawer.vue",
    "Hy2dAltimeterParameterDrawer.vue",
    "Gf6WfvL1aParameterDrawer.vue"
  ]) {
    const drawer = readFileSync(`src/features/multisource/${filename}`, "utf8");
    assert.doesNotMatch(drawer, /DerivedOutputChecklist/);
    assert.doesNotMatch(
      drawer,
      /v-model="form\.(features|fusion|saliency)\.enabled"/
    );
  }
});

test("derived output checklist keeps three statuses legible in a vertical layout", () => {
  const checklist = readFileSync(
    "src/features/multisource/DerivedOutputChecklist.vue",
    "utf8"
  );
  const styles = readFileSync(
    "src/features/multisource/unifiedProductParameterDrawer.less",
    "utf8"
  );
  assert.match(checklist, /derived-output-checklist__indicator/);
  assert.match(
    styles,
    /derived-output-checklist__items\s*\{[\s\S]*?flex-direction:\s*column;/
  );
  assert.match(
    styles,
    /derived-output-checklist__indicator\s*\{[\s\S]*?border:/
  );
  assert.match(
    styles,
    /derived-output-checklist__items\s+input:checked\s+\+\s+\.derived-output-checklist__indicator/
  );
});

test("right-side parameter drawers render editable output bands", () => {
  const fy3hDrawer = readFileSync(
    "src/features/multisource/Fy3hMersiParameterDrawer.vue",
    "utf8"
  );
  const gf6Drawer = readFileSync(
    "src/features/multisource/Gf6WfvL1aParameterDrawer.vue",
    "utf8"
  );

  assert.match(fy3hDrawer, /<legend>输出波段<\/legend>/);
  assert.match(fy3hDrawer, /v-for="band in FY3H_MERSI_BANDS"/);
  assert.match(gf6Drawer, /<legend>输出波段<\/legend>/);
  assert.match(gf6Drawer, /v-for="band in GF6_WFV_L1A_BANDS"/);
  assert.match(gf6Drawer, /v-model="form\.bands"/);
});

test("right-side workbench overview retains output, parameter, and constraint summaries", () => {
  const workspace = readFileSync(
    "src/components/LeftPanel/MultiSourceSatelliteProcess.vue",
    "utf8"
  );
  const overview = readFileSync(
    "src/features/multisource/ParameterWorkbenchOverview.vue",
    "utf8"
  );
  const drawers = [
    "src/features/multisource/Fy3hMersiParameterDrawer.vue",
    "src/features/multisource/Fy4bAgriParameterDrawer.vue",
    "src/features/multisource/Hy2dAltimeterParameterDrawer.vue",
    "src/features/multisource/Gf6WfvL1aParameterDrawer.vue"
  ].map(path => readFileSync(path, "utf8"));

  assert.match(overview, /PARAMETER WORKBENCH/);
  assert.match(overview, /parameter-workbench-overview__bands/);
  assert.match(overview, /parameter-workbench-overview__parameters/);
  assert.match(overview, /parameter-workbench-overview__constraints/);
  assert.match(workspace, /<ParameterWorkbenchOverview/);
  for (const drawer of drawers) {
    assert.match(drawer, /import ParameterWorkbenchOverview/);
    assert.match(drawer, /<ParameterWorkbenchOverview/);
  }
  assert.doesNotMatch(workspace, /<dd>{{ gf6Summary\.bands }}<\/dd>/);
});

test("GF-6 workbench summary owns the planned visual sections", () => {
  const component = readFileSync(
    "src/features/multisource/Gf6ProcessingWorkbench.vue",
    "utf8"
  );
  assert.match(component, /configuration-workbench/);
  assert.doesNotMatch(component, /CONFIGURATION WORKSPACE/);
  assert.match(component, /<h2 id="gf6-workbench-title">参数工作台<\/h2>/);
  assert.match(component, /configuration-workbench__help/);
  assert.match(component, /输出波段/);
  assert.match(component, /派生输出/);
  assert.match(component, /必要参数/);
  assert.match(component, /工程约束/);
  assert.match(component, /selectedTargets\.includes\(['"]rgb-fusion['"]\)/);
  assert.match(
    component,
    /selectedTargets\.includes\(['"]feature-extraction['"]\)/
  );
  assert.match(
    component,
    /selectedTargets\.includes\(['"]anomaly-detection['"]\)/
  );
});

test("parameter workbench opens from the execution plan after targets are selected", () => {
  const workspace = readFileSync(
    "src/components/LeftPanel/MultiSourceSatelliteProcess.vue",
    "utf8"
  );
  const panel = readFileSync(
    "src/components/LeftPanel/ProcessingPlanPanel.vue",
    "utf8"
  );
  const gf6Drawer = readFileSync(
    "src/features/multisource/Gf6WfvL1aParameterDrawer.vue",
    "utf8"
  );

  assert.match(workspace, /@configure="isParameterDrawerOpen = true"/);
  assert.match(workspace, /v-model="isParameterDrawerOpen"/);
  assert.doesNotMatch(workspace, /class="mission-section configuration-brief"/);
  assert.doesNotMatch(workspace, /<Gf6ProcessingWorkbench/);
  assert.match(panel, /v-if="planSteps\.length"/);
  assert.match(panel, /class="processing-plan__configure"/);
  assert.match(gf6Drawer, /完成配置/);
});

test("multisource prerequisite notices stay inline with the execution plan", () => {
  const workspace = readFileSync(
    "src/components/LeftPanel/MultiSourceSatelliteProcess.vue",
    "utf8"
  );
  const panel = readFileSync(
    "src/components/LeftPanel/ProcessingPlanPanel.vue",
    "utf8"
  );
  assert.doesNotMatch(workspace, /MultisourceDialog/);
  assert.match(panel, /processing-plan__dependency-summary/);
  assert.match(panel, /automaticPlanSummary/);
});

test("product parameter drawers use an inset, content-sized floating workbench", () => {
  const styles = readFileSync(
    "src/features/multisource/unifiedProductParameterDrawer.less",
    "utf8"
  );

  assert.match(styles, /top:\s*24px;/);
  assert.match(styles, /right:\s*24px;/);
  assert.match(styles, /bottom:\s*24px;/);
  assert.match(styles, /height:\s*fit-content;/);
  assert.match(styles, /max-height:\s*calc\(100vh - 48px\);/);
  assert.match(styles, /\.el-drawer__body\s*\{[\s\S]*?overflow-y:\s*auto;/);
});

test("product package exposes ZIP import inside the existing upload section", () => {
  const workspace = readFileSync(
    "src/components/LeftPanel/MultiSourceSatelliteProcess.vue",
    "utf8"
  );

  assert.match(
    workspace,
    /:aria-label="[\s\S]*?isArchivePickerActionable \? '导入 ZIP 产品包' : undefined[\s\S]*?"/
  );
  assert.match(workspace, /accept="\.zip,application\/zip"/);
  assert.match(workspace, /handleArchiveChange/);
  assert.match(workspace, /matchProductArchiveEntries/);
  assert.match(workspace, /await uploadSlot\(match\.slot\.id, file\)/);
  assert.match(workspace, /const isArchivePickerActionable = computed/);
  assert.match(
    workspace,
    /:role="isArchivePickerActionable \? 'button' : undefined"/
  );
  assert.match(workspace, /@keydown\.enter\.prevent="openArchivePicker"/);
  assert.match(workspace, /@keydown\.space\.prevent="openArchivePicker"/);
  assert.match(workspace, /@click\.stop="cancelArchiveImport"/);
  assert.doesNotMatch(workspace, /class="package-archive-import"/);
  assert.doesNotMatch(workspace, /解析预览/);
  assert.doesNotMatch(workspace, /确认填充并上传/);
});

test("product package locks individual uploads and contains archive parsing feedback", () => {
  const workspace = readFileSync(
    "src/components/LeftPanel/MultiSourceSatelliteProcess.vue",
    "utf8"
  );

  assert.match(
    workspace,
    /function isSlotActionable\(status: string\) \{[\s\S]*?!isArchiveImporting\.value/
  );
  assert.match(
    workspace,
    /:disabled="isTaskActive \|\| isBusy \|\| isArchiveImporting"/
  );
  assert.doesNotMatch(
    workspace,
    /支持 ZIP 分片上传，服务端解析后自动匹配当前产品/
  );
  assert.match(workspace, /archive-import-panel__current-file/);
  assert.match(
    workspace,
    /archive-import-panel__current-file[\s\S]*?text-overflow: ellipsis/
  );
});

test("completed product archive import locks the card until a package file changes", () => {
  const workspace = readFileSync(
    "src/components/LeftPanel/MultiSourceSatelliteProcess.vue",
    "utf8"
  );

  assert.match(
    workspace,
    /const isArchivePickerActionable = computed\([\s\S]*?archiveImportProgress\.status !== "COMPLETED"/
  );
  assert.match(
    workspace,
    /function removeProductSlot\(slotId: SlotId\) \{[\s\S]*?archiveImportProgress\.status === "COMPLETED"[\s\S]*?resetArchiveProgress\(\)/
  );
});

test("product archive import card presents the ZIP selection hint inline", () => {
  const workspace = readFileSync(
    "src/components/LeftPanel/MultiSourceSatelliteProcess.vue",
    "utf8"
  );

  assert.match(workspace, /点击选择产品包导入，仅支持\.zip格式/);
  assert.match(workspace, /border:\s*1px dashed #78b8d2;/);
});

test("product package collapse keeps the ZIP import card visible", () => {
  const workspace = readFileSync(
    "src/components/LeftPanel/MultiSourceSatelliteProcess.vue",
    "utf8"
  );

  assert.match(
    workspace,
    /<div\s+class="archive-import-panel"[\s\S]*?<\/div>\s*<div\s+v-if="isPackageContentVisible"\s+class="file-stack"/
  );
  assert.match(workspace, /请在下方上传对应产品包/);
});

test("canceling a product archive resets the import card state", () => {
  const workspace = readFileSync(
    "src/components/LeftPanel/MultiSourceSatelliteProcess.vue",
    "utf8"
  );

  assert.match(
    workspace,
    /await cancelArchiveUpload\(archiveUploadId\.value\);[\s\S]*?resetArchiveProgress\(\);/
  );
});

test("processing plan title matches the product package heading size", () => {
  const panel = readFileSync(
    "src/components/LeftPanel/ProcessingPlanPanel.vue",
    "utf8"
  );

  assert.match(panel, /\.processing-plan h4\s*\{[\s\S]*?font-size:\s*15px;/);
});

test("product package slots show parsed filenames and slot mapping", () => {
  const workspace = readFileSync(
    "src/components/LeftPanel/MultiSourceSatelliteProcess.vue",
    "utf8"
  );

  assert.match(workspace, /slotDisplayName\(slot\.id, slot\.label\)/);
  assert.doesNotMatch(workspace, /slotSourceDescription/);
  assert.doesNotMatch(workspace, /file-slot__source/);
  assert.match(workspace, /v-if="slots\[slot\.id\]\.status !== 'EMPTY'"/);
});

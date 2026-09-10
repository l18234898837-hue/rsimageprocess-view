import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { compileStyleAsync, parse } from "@vue/compiler-sfc";
import { featureMetricLabel } from "./featureMetricLabels";

test("feature metrics explain their purpose and output in a shared selection list", () => {
  assert.equal(featureMetricLabel("statistics"), "影像质量统计");
  assert.equal(featureMetricLabel("gradient"), "边界与变化");
  assert.equal(featureMetricLabel("local_variance"), "纹理复杂度");
  assert.equal(featureMetricLabel("toa_nir_red_nd"), "近红外-红光差异");
  assert.equal(featureMetricLabel("btd_c13_c14"), "C13-C14 亮温差");

  const metricLabels = readFileSync(
    "src/features/multisource/featureMetricLabels.ts",
    "utf8"
  );
  assert.match(metricLabels, /export function featureMetricOptions/);
  assert.match(metricLabels, /输出：统计摘要 JSON/);
  assert.match(metricLabels, /输出：梯度特征栅格/);
  assert.match(metricLabels, /输出：局部方差特征栅格/);
  assert.match(metricLabels, /description: "判断数据质量"/);
  assert.match(metricLabels, /description: "突出边界与变化"/);
  assert.match(metricLabels, /description: "识别纹理复杂地表"/);

  const fy3hDrawer = readFileSync(
    "src/features/multisource/Fy3hMersiParameterDrawer.vue",
    "utf8"
  );
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

  for (const drawer of [fy3hDrawer, fy4bDrawer, gf6Drawer, workspace]) {
    assert.match(drawer, /<FeatureMetricPicker/);
    assert.match(drawer, /featureMetricOptions\(/);
  }

  const picker = readFileSync(
    "src/features/multisource/FeatureMetricPicker.vue",
    "utf8"
  );
  assert.match(picker, /feature-metric-picker__meta/);
  assert.match(picker, /metric\.description[\s\S]*metric\.output/);
  assert.doesNotMatch(picker, /feature-metric-picker__description/);
  assert.doesNotMatch(picker, /feature-metric-picker__output/);
  assert.match(picker, /<ParameterHint/);
  assert.match(picker, /<slot name="local-variance"/);

  assert.match(
    workspace,
    /buildFy4bWorkbenchSummary\(fy4bForm, featureMetricLabel\)/
  );
});

test("feature metric rows keep the texture control independent from selection", () => {
  const picker = readFileSync(
    "src/features/multisource/FeatureMetricPicker.vue",
    "utf8"
  );
  const theme = readFileSync(
    "src/features/multisource/unifiedProductParameterDrawer.less",
    "utf8"
  );

  assert.match(
    picker,
    /feature-metric-picker__inline-parameter[\s\S]*@click\.stop/
  );
  assert.doesNotMatch(
    theme,
    /feature-metric-picker__item input\s*\{[^}]*inset:\s*0;/s
  );
  assert.match(
    theme,
    /feature-metric-picker__item input[\s\S]*?pointer-events:\s*none;/
  );
  assert.match(
    theme,
    /feature-metric-picker__parameter[\s\S]*grid-template-columns:\s*104px\s+116px/
  );
  assert.match(
    theme,
    /feature-metric-picker__parameter[\s\S]*parameter-number-input[\s\S]*width:\s*116px/
  );
});

test("output bands and feature metrics provide concise user guidance", () => {
  const outputPicker = readFileSync(
    "src/features/multisource/OutputBandPicker.vue",
    "utf8"
  );
  assert.match(outputPicker, /output-band-picker__hint/);
  assert.match(outputPicker, /选择要写入标准产品的波段/);

  const picker = readFileSync(
    "src/features/multisource/FeatureMetricPicker.vue",
    "utf8"
  );
  assert.doesNotMatch(picker, /用途：\{\{ metric\.description \}\}/);
  assert.doesNotMatch(picker, /\{\{ metric\.output \}\}/);
  assert.match(picker, /metric\.description[\s\S]*生成/);
});

test("parameter drawers group ROI controls and explain the remaining sparse fields", () => {
  const drawerFiles = [
    "Fy3hMersiParameterDrawer.vue",
    "Fy4bAgriParameterDrawer.vue",
    "Gf6WfvL1aParameterDrawer.vue"
  ];
  for (const filename of drawerFiles) {
    const drawer = readFileSync(`src/features/multisource/${filename}`, "utf8");
    assert.match(drawer, /roi-parameter-block/);
    assert.match(drawer, /按经纬度范围处理/);
  }
  const workspace = readFileSync(
    "src/components/LeftPanel/MultiSourceSatelliteProcess.vue",
    "utf8"
  );
  assert.match(workspace, /roi-parameter-block/);
  assert.match(workspace, /按经纬度范围处理/);

  const gf6Drawer = readFileSync(
    "src/features/multisource/Gf6WfvL1aParameterDrawer.vue",
    "utf8"
  );
  assert.match(gf6Drawer, /固定模式：CONSTANT/);
  assert.match(gf6Drawer, /固定值：0 米/);
  assert.match(gf6Drawer, /用于检测的输出波段/);
  assert.match(gf6Drawer, /红色通道/);
  assert.match(gf6Drawer, /绿色通道/);
  assert.match(gf6Drawer, /蓝色通道/);
});

test("ROI controls stay disabled until every required product file is uploaded", () => {
  const workspace = readFileSync(
    "src/components/LeftPanel/MultiSourceSatelliteProcess.vue",
    "utf8"
  );
  assert.match(
    workspace,
    /v-model="l2aForm\.roi\.enabled"[\s\S]*?!allSlotsUploaded/
  );
  assert.equal(
    (workspace.match(/:roi-data-ready="allSlotsUploaded"/g) ?? []).length,
    3
  );

  for (const filename of [
    "Fy3hMersiParameterDrawer.vue",
    "Fy4bAgriParameterDrawer.vue",
    "Gf6WfvL1aParameterDrawer.vue"
  ]) {
    const drawer = readFileSync(`src/features/multisource/${filename}`, "utf8");
    assert.match(drawer, /roiDataReady: boolean/);
    assert.match(drawer, /请先完成当前产品所需文件上传，再开启 ROI/);
  }
});

test("product drawers remove legacy output profile and processing summary rows", () => {
  const fy3hDrawer = readFileSync(
    "src/features/multisource/Fy3hMersiParameterDrawer.vue",
    "utf8"
  );
  const hy2dDrawer = readFileSync(
    "src/features/multisource/Hy2dAltimeterParameterDrawer.vue",
    "utf8"
  );
  const workspace = readFileSync(
    "src/components/LeftPanel/MultiSourceSatelliteProcess.vue",
    "utf8"
  );

  assert.doesNotMatch(fy3hDrawer, /class="profile-signal"/);
  assert.doesNotMatch(fy3hDrawer, /OUTPUT PROFILE/);
  assert.doesNotMatch(hy2dDrawer, /class="profile-signal"/);
  assert.doesNotMatch(hy2dDrawer, /OUTPUT PROFILE/);
  assert.doesNotMatch(workspace, /class="parameter-drawer__signal"/);
  assert.doesNotMatch(workspace, /class="l2a-console__heading"/);
  assert.doesNotMatch(workspace, /l2a-drawer-controls-title/);
});

test("all output coordinate system controls fill the dedicated guidance column", () => {
  const files = [
    "src/features/multisource/Fy3hMersiParameterDrawer.vue",
    "src/features/multisource/Fy4bAgriParameterDrawer.vue",
    "src/features/multisource/Gf6WfvL1aParameterDrawer.vue",
    "src/components/LeftPanel/MultiSourceSatelliteProcess.vue"
  ];
  for (const filename of files) {
    const source = readFileSync(filename, "utf8");
    assert.match(source, /输出坐标系/);
    assert.match(
      source,
      /guidance="(?:请选择输出坐标系|仅支持 EPSG:4326 或 EPSG:4490|推荐自动选择，也可指定 UTM 分区)"/
    );
  }
});

test("HY-1C grid, ROI, and algorithm values use the shared parameter controls", () => {
  const workspace = readFileSync(
    "src/components/LeftPanel/MultiSourceSatelliteProcess.vue",
    "utf8"
  );

  assert.match(
    workspace,
    /import ParameterNumberInput from "@\/features\/multisource\/ParameterNumberInput\.vue"/
  );
  assert.match(workspace, /工程网格/);
  assert.match(
    workspace,
    /roi-parameter-block[\s\S]*?<label class="toggle-row">/
  );
  assert.match(
    workspace,
    /<div class="field-grid">[\s\S]*?v-model="l2aForm\.roi\[field\.key\]"/
  );

  for (const control of [
    /<ParameterNumberInput[\s\S]*?v-model="l2aForm\.grid\.resolutionMeters"/,
    /<ParameterNumberInput[\s\S]*?v-model="l2aForm\.roi\[field\.key\]"/,
    /<ParameterNumberInput[\s\S]*?v-model="l2aForm\.algorithms\.features\.windowSize"/,
    /<ParameterNumberInput[\s\S]*?v-model="l2aForm\.algorithms\.fusion\.lowPercentile"/,
    /<ParameterNumberInput[\s\S]*?v-model="l2aForm\.algorithms\.fusion\.highPercentile"/,
    /<ParameterNumberInput[\s\S]*?v-model="l2aForm\.algorithms\.saliency\.threshold"/,
    /<ParameterNumberInput[\s\S]*?v-model="l2aForm\.algorithms\.saliency\.windowSize"/
  ]) {
    assert.match(workspace, control);
  }
  assert.doesNotMatch(workspace, /v-model\.number="l2aForm\./);
});

test("FY-3H keeps its grid and optional WGS84 ROI in one engineering grid block", () => {
  const drawer = readFileSync(
    "src/features/multisource/Fy3hMersiParameterDrawer.vue",
    "utf8"
  );

  assert.match(
    drawer,
    /工程网格[\s\S]*?<label class="toggle-row">[\s\S]*?v-model="form\.roi\.enabled"/
  );
  assert.match(
    drawer,
    /<div v-if="form\.roi\.enabled" class="field-grid compact-grid">[\s\S]*?v-model="form\.roi\[field\.key\]"/
  );
  assert.match(
    drawer,
    /<fieldset[\s\S]*?工程网格[\s\S]*?<\/fieldset>[\s\S]*?<fieldset[\s\S]*?输出波段/
  );
  assert.doesNotMatch(drawer, /<legend class="toggle-heading">/);
});

test("FY-3H presents fixed resampling as a standard disabled field", () => {
  const drawer = readFileSync(
    "src/features/multisource/Fy3hMersiParameterDrawer.vue",
    "utf8"
  );

  assert.match(
    drawer,
    /连续数据重采样[\s\S]*?<input value="nearest" disabled \/>[\s\S]*?固定值：nearest/
  );
  assert.doesNotMatch(drawer, /<div class="fixed-setting-row">/);
});

test("HY-1C presents scientific resampling as a standard disabled input", () => {
  const workspace = readFileSync(
    "src/components/LeftPanel/MultiSourceSatelliteProcess.vue",
    "utf8"
  );
  assert.match(
    workspace,
    /科学重采样[\s\S]*?<input[\s\S]*?value="nearest"[\s\S]*?disabled[\s\S]*?固定值：nearest/
  );
  assert.doesNotMatch(
    workspace,
    /<div class="fixed-setting-row">[\s\S]*?科学重采样/
  );
});

test("image parameter drawers synchronize algorithm enablement after target selection", () => {
  const drawerFiles = [
    "src/features/multisource/Fy3hMersiParameterDrawer.vue",
    "src/features/multisource/Fy4bAgriParameterDrawer.vue",
    "src/features/multisource/Gf6WfvL1aParameterDrawer.vue"
  ];

  for (const filename of drawerFiles) {
    const drawer = readFileSync(filename, "utf8");
    assert.match(
      drawer,
      /\(\) => \[\s*props\.form\.features\.enabled,[\s\S]*?props\.form\.fusion\.enabled,[\s\S]*?props\.form\.saliency\.enabled[\s\S]*?\][\s\S]*?form\.features\.enabled\s*=\s*featuresEnabled;[\s\S]*?form\.fusion\.enabled\s*=\s*fusionEnabled;[\s\S]*?form\.saliency\.enabled\s*=\s*saliencyEnabled;/
    );
  }
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
  assert.match(compiled.code, /--drawer-font-control:\s*13px/);
  assert.match(compiled.code, /--drawer-control-height:\s*30px/);
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

test("FY-4B and GF-6 drawers keep engineering controls editable without technical warnings", () => {
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
  assert.match(
    fy4bDrawer,
    /<h2 :id="titleId" class="drawer-heading__workbench-title">\s*参数配置工作台\s*<\/h2>/
  );
  assert.doesNotMatch(fy4bDrawer, /FY-4B AGRI 参数/);
  assert.doesNotMatch(fy4bDrawer, /NOMINAL_UNVERIFIED/);
  assert.doesNotMatch(fy4bDrawer, /engineering-warning/);
  assert.match(fy4bDrawer, /近红外、红光、蓝光/);
  assert.match(fy4bDrawer, /targetCrs/);
  assert.match(fy4bDrawer, /form\.roi/);
  assert.match(fy4bDrawer, /form\.features/);
  assert.match(fy4bDrawer, /form\.saliency/);

  assert.match(gf6Drawer, /class="product-parameter-drawer"/);
  assert.match(gf6Drawer, /<template #header="\{ titleId \}"\s*>/);
  assert.match(
    gf6Drawer,
    /<h2 :id="titleId" class="drawer-heading__workbench-title">\s*参数配置工作台\s*<\/h2>/
  );
  assert.doesNotMatch(gf6Drawer, /GF-6 WFV L1A 参数/);
  assert.doesNotMatch(gf6Drawer, /OUTPUT PROFILE/);
  assert.doesNotMatch(gf6Drawer, /NOMINAL_RPC_NO_DEM/);
  assert.doesNotMatch(gf6Drawer, /accuracyStatus=UNVALIDATED/);
  assert.doesNotMatch(gf6Drawer, /CANDIDATE_ONLY/);
  assert.match(gf6Drawer, /rpcHeightMode/);
  assert.match(gf6Drawer, /rpcHeight/);
  assert.match(gf6Drawer, /form\.resolution/);
  assert.match(gf6Drawer, /:min="resolutionConstraint\.minimum"/);
  assert.match(gf6Drawer, /后端会按网格像元数和预估字节执行最终保护/);
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
  assert.match(gf6Drawer, /<legend>\s*工程网格\s*<ParameterHint/);
  assert.match(gf6Drawer, /<legend>\s*输出波段\s*<ParameterHint/);
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
  assert.match(
    workspace,
    /<el-icon class="el-icon--right"><ArrowRight \/><\/el-icon>/
  );
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

  assert.match(fy3hDrawer, /<legend>\s*输出波段\s*<ParameterHint/);
  assert.match(fy3hDrawer, /<OutputBandPicker[\s\S]*?v-model="form\.bands"/);
  assert.match(gf6Drawer, /<legend>\s*输出波段\s*<ParameterHint/);
  assert.match(gf6Drawer, /<OutputBandPicker[\s\S]*?v-model="form\.bands"/);
});

test("all products use the shared output band picker", () => {
  const workspace = readFileSync(
    "src/components/LeftPanel/MultiSourceSatelliteProcess.vue",
    "utf8"
  );
  const fy3hDrawer = readFileSync(
    "src/features/multisource/Fy3hMersiParameterDrawer.vue",
    "utf8"
  );
  const gf6Drawer = readFileSync(
    "src/features/multisource/Gf6WfvL1aParameterDrawer.vue",
    "utf8"
  );
  const picker = readFileSync(
    "src/features/multisource/OutputBandPicker.vue",
    "utf8"
  );

  assert.match(picker, /defineModel<[^>]+\[\]>/);
  assert.match(
    picker,
    /已选\s*\{\{ selectedBands\.length \}\}\s*\/\s*\{\{ bands\.length \}\}/
  );
  assert.match(picker, /output-band-picker__group/);
  assert.doesNotMatch(picker, /output-band-picker__check|<Check/);
  assert.match(workspace, /<OutputBandPicker[\s\S]*?v-model="l2aForm\.bands"/);
  assert.match(fy3hDrawer, /<OutputBandPicker[\s\S]*?v-model="form\.bands"/);
  assert.match(gf6Drawer, /<OutputBandPicker[\s\S]*?v-model="form\.bands"/);
});

test("workbench keeps processing risks out of the drawer and shows launch-time notices", () => {
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

  assert.match(overview, /当前参数/);
  assert.doesNotMatch(overview, /PARAMETER WORKBENCH/);
  assert.doesNotMatch(overview, /parameter-workbench-overview__bands/);
  assert.doesNotMatch(overview, /必要参数/);
  assert.match(overview, /parameter-workbench-overview__parameters/);
  assert.doesNotMatch(overview, /constraints/);
  assert.doesNotMatch(overview, /处理说明/);
  assert.doesNotMatch(overview, /formatProcessingNote/);
  assert.match(workspace, /<ParameterWorkbenchOverview/);
  assert.match(workspace, /const processingRiskNotice = computed/);
  assert.match(
    workspace,
    /if \([\s\S]*?!canStart\.value[\s\S]*?!visibleParameterGroups\.value\.includes\("preprocess"\)/
  );
  assert.match(
    workspace,
    /当前处理未启用地形校正，山区或高差较大区域的定位可能存在偏差。/
  );
  assert.match(
    workspace,
    /当前产品的名义定位尚未完成测绘级验证；涉及坐标量测或边界判读前请先核验。/
  );
  assert.match(workspace, /v-if="processingRiskNotice"/);
  assert.match(workspace, /class="mission-section processing-risk-notice"/);
  for (const drawer of drawers) {
    assert.match(drawer, /import ParameterWorkbenchOverview/);
    assert.match(drawer, /<ParameterWorkbenchOverview/);
    assert.match(drawer, /参数配置工作台/);
    assert.doesNotMatch(drawer, /:constraints=/);
    assert.doesNotMatch(
      drawer,
      /ENGINEERING CONFIGURATION|SWATH CONFIGURATION|FULL-DISK CONFIGURATION|TRACK CONFIGURATION|CONFIGURATION WORKSPACE/
    );
  }
  assert.doesNotMatch(drawers[1], /engineering-warning/);
  assert.doesNotMatch(workspace, /<dd>{{ gf6Summary\.bands }}<\/dd>/);
});

test("task launch requires confirmed parameters and explains each blocking stage", () => {
  const workspace = readFileSync(
    "src/components/LeftPanel/MultiSourceSatelliteProcess.vue",
    "utf8"
  );
  assert.match(workspace, /const isConfigurationConfirmed = ref\(false\)/);
  assert.match(workspace, /const launchHint = computed/);
  assert.match(workspace, /请先上传完整产品包/);
  assert.match(workspace, /请选择至少一个处理功能/);
  assert.match(workspace, /请打开配置参数，检查并点击“完成配置”/);
  assert.match(workspace, /参数配置已完成，可以开始处理/);
  assert.match(
    workspace,
    /selectedTargets\.value\.length > 0 &&\s+isConfigurationConfirmed\.value/
  );
  assert.match(workspace, /function confirmParameterConfiguration/);
  for (const filename of [
    "Fy3hMersiParameterDrawer.vue",
    "Hy2dAltimeterParameterDrawer.vue",
    "Fy4bAgriParameterDrawer.vue",
    "Gf6WfvL1aParameterDrawer.vue"
  ]) {
    const drawer = readFileSync(`src/features/multisource/${filename}`, "utf8");
    assert.match(drawer, /confirm: \[\]/);
    assert.match(drawer, /@click="emit\('confirm'\)"/);
    assert.match(drawer, /:disabled="!locked && issues\.length > 0"/);
  }
});

test("parameter workbenches use compact stepper controls for editable numbers", () => {
  const stepper = readFileSync(
    "src/features/multisource/ParameterNumberInput.vue",
    "utf8"
  );
  const styles = readFileSync(
    "src/features/multisource/unifiedProductParameterDrawer.less",
    "utf8"
  );

  assert.match(stepper, /parameter-number-input/);
  assert.match(stepper, /stepDown/);
  assert.match(stepper, /stepUp/);
  assert.match(stepper, /emit\("update:modelValue"/);
  assert.match(
    styles,
    /parameter-number-input\s*\{[\s\S]*?grid-template-columns:\s*24px minmax\(0, 1fr\) 24px;[\s\S]*?min-height:\s*30px;/
  );

  for (const filename of [
    "Fy3hMersiParameterDrawer.vue",
    "Fy4bAgriParameterDrawer.vue",
    "Hy2dAltimeterParameterDrawer.vue",
    "Gf6WfvL1aParameterDrawer.vue"
  ]) {
    const drawer = readFileSync(`src/features/multisource/${filename}`, "utf8");
    assert.match(drawer, /import ParameterNumberInput/);
    assert.match(drawer, /<ParameterNumberInput/);
  }
});

test("numeric steppers dispatch a single change event without rebinding it", () => {
  const stepper = readFileSync(
    "src/features/multisource/ParameterNumberInput.vue",
    "utf8"
  );

  assert.doesNotMatch(stepper, /@change="notifyChange"/);
  assert.match(
    stepper,
    /dispatchEvent\(new Event\("change", \{ bubbles: true \}\)\)/
  );
});

test("target CRS controls use the compact field treatment", () => {
  const styles = readFileSync(
    "src/features/multisource/unifiedProductParameterDrawer.less",
    "utf8"
  );

  assert.match(
    styles,
    /(?:input|select)\.crs-input\s*\{[\s\S]*?min-height:\s*30px;[\s\S]*?padding:\s*5px 10px;/
  );

  for (const filename of [
    "Fy3hMersiParameterDrawer.vue",
    "Fy4bAgriParameterDrawer.vue",
    "Gf6WfvL1aParameterDrawer.vue"
  ]) {
    const drawer = readFileSync(`src/features/multisource/${filename}`, "utf8");
    assert.match(drawer, /class="crs-input"/);
  }
});

test("parameter workbench uses a light blue vertical header and compact summary card", () => {
  const theme = readFileSync(
    "src/features/multisource/unifiedProductParameterDrawer.less",
    "utf8"
  );

  assert.match(theme, /width: 470px !important/);
  assert.match(
    theme,
    /linear-gradient\(180deg, #1492f9 0%, #75c8f2 58%, #d8f0fd 100%\)/
  );
  assert.match(
    theme,
    /\.parameter-workbench-overview\s*\{[\s\S]*margin-top: 6px;[\s\S]*background: var\(--drawer-panel\);[\s\S]*border: 1px solid var\(--drawer-line\);[\s\S]*border-radius: 4px;/
  );
  assert.match(theme, /h2\.drawer-heading__workbench-title[\s\S]*color: #fff;/);
  assert.match(
    theme,
    /\.parameter-workbench-overview__heading strong[\s\S]*padding: 0;[\s\S]*background: transparent;[\s\S]*border-left: 0;/
  );
});

test("parameter drawers do not repeat selected processing states as heading switches", () => {
  const drawers = [
    "src/features/multisource/Fy3hMersiParameterDrawer.vue",
    "src/features/multisource/Fy4bAgriParameterDrawer.vue",
    "src/features/multisource/Gf6WfvL1aParameterDrawer.vue",
    "src/features/multisource/Hy2dAltimeterParameterDrawer.vue"
  ].map(path => readFileSync(path, "utf8"));
  const workspace = readFileSync(
    "src/components/LeftPanel/MultiSourceSatelliteProcess.vue",
    "utf8"
  );

  for (const drawer of drawers) {
    assert.doesNotMatch(
      drawer,
      /<legend class="toggle-heading">[\s\S]*?:checked="visibleSteps\.includes/
    );
  }
  assert.doesNotMatch(
    workspace,
    /<legend class="toggle-heading">[\s\S]*?:checked="selectedTargets\.includes/
  );
});

test("parameter workbenches explain editable settings on hover without repeating the execution plan", () => {
  const drawers = [
    "src/features/multisource/Fy3hMersiParameterDrawer.vue",
    "src/features/multisource/Fy4bAgriParameterDrawer.vue",
    "src/features/multisource/Gf6WfvL1aParameterDrawer.vue",
    "src/features/multisource/Hy2dAltimeterParameterDrawer.vue"
  ].map(path => readFileSync(path, "utf8"));
  const workspace = readFileSync(
    "src/components/LeftPanel/MultiSourceSatelliteProcess.vue",
    "utf8"
  );
  const theme = readFileSync(
    "src/features/multisource/unifiedProductParameterDrawer.less",
    "utf8"
  );

  for (const drawer of drawers) {
    assert.doesNotMatch(drawer, /ExecutionPlanStrip/);
    assert.match(drawer, /parameter-step-card/);
    assert.match(drawer, /ParameterHint/);
    assert.doesNotMatch(drawer, /parameter-step-card__purpose/);
    assert.doesNotMatch(drawer, /class="field-note"/);
    assert.doesNotMatch(drawer, /固定不可调整/);
  }
  assert.doesNotMatch(workspace, /<ExecutionPlanStrip/);
  assert.match(workspace, /parameter-step-card/);
  assert.match(theme, /\.parameter-step-card\s*\{/);
  assert.match(theme, /\.fixed-setting-row\s*\{/);
  assert.match(theme, /\.parameter-hint\s*\{/);
});

test("parameter workbenches show numeric guidance and matching validation beside inputs", () => {
  const hy2dDrawer = readFileSync(
    "src/features/multisource/Hy2dAltimeterParameterDrawer.vue",
    "utf8"
  );
  const fy4bDrawer = readFileSync(
    "src/features/multisource/Fy4bAgriParameterDrawer.vue",
    "utf8"
  );
  const workspace = readFileSync(
    "src/components/LeftPanel/MultiSourceSatelliteProcess.vue",
    "utf8"
  );
  const fy3hDrawer = readFileSync(
    "src/features/multisource/Fy3hMersiParameterDrawer.vue",
    "utf8"
  );
  const gf6Drawer = readFileSync(
    "src/features/multisource/Gf6WfvL1aParameterDrawer.vue",
    "utf8"
  );

  for (const field of [
    "featureWindowSize",
    "anomaly.madThreshold",
    "anomaly.jumpThresholdMeters",
    "grid.spacingDegrees"
  ]) {
    assert.match(hy2dDrawer, new RegExp(`fields=\"\\['${field}'\\]`));
  }
  for (const field of [
    "saliency.source",
    "saliency.threshold",
    "saliency.windowSize"
  ]) {
    assert.match(fy4bDrawer, new RegExp(`fields=\"\\['${field}'\\]`));
  }
  assert.match(workspace, /import ParameterFieldStatus/);
  for (const field of [
    "grid.resolutionMeters",
    "algorithms.features.windowSize",
    "algorithms.fusion.percentiles",
    "algorithms.saliency.threshold",
    "algorithms.saliency.windowSize"
  ]) {
    assert.match(workspace, new RegExp(`fields=\"\\['${field}'\\]`));
  }
  for (const [drawer, fields] of [
    [fy4bDrawer, ["features.metrics", "saliency.source"]],
    [gf6Drawer, ["features.metrics", "fusion.bands", "saliency.source"]],
    [
      fy3hDrawer,
      ["bands", "features.metrics", "fusion.bands", "saliency.source"]
    ]
  ] as const) {
    for (const field of fields) {
      assert.match(drawer, new RegExp(`fields=\"\\['${field}'\\]`));
    }
  }
  assert.match(
    fy3hDrawer,
    /<FeatureMetricPicker[\s\S]*?<\/FeatureMetricPicker>\s*<ParameterFieldStatus :issues="issues" :fields="\['features\.metrics'\]" \/>/
  );
  assert.match(
    fy3hDrawer,
    /<template #local-variance>[\s\S]*?fields="\['features\.windowSize'\]"/
  );
});

test("GF-6 RGB channels provide individual hover explanations", () => {
  const gf6Drawer = readFileSync(
    "src/features/multisource/Gf6WfvL1aParameterDrawer.vue",
    "utf8"
  );

  assert.match(
    gf6Drawer,
    /<strong>R<\/strong>\s*红色通道[\s\S]*label="红色通道"/
  );
  assert.match(
    gf6Drawer,
    /<strong>G<\/strong>\s*绿色通道[\s\S]*label="绿色通道"/
  );
  assert.match(
    gf6Drawer,
    /<strong>B<\/strong>\s*蓝色通道[\s\S]*label="蓝色通道"/
  );
});

test("RGB workbench rows use the shared channel labels and guidance", () => {
  const fy3hDrawer = readFileSync(
    "src/features/multisource/Fy3hMersiParameterDrawer.vue",
    "utf8"
  );
  const workspace = readFileSync(
    "src/components/LeftPanel/MultiSourceSatelliteProcess.vue",
    "utf8"
  );

  for (const source of [fy3hDrawer, workspace]) {
    assert.match(source, /name: "红色通道", guide: "暖色与高反射目标"/);
    assert.match(source, /name: "绿色通道", guide: "植被与中间色调"/);
    assert.match(source, /name: "蓝色通道", guide: "水体、薄雾与冷色调"/);
    assert.doesNotMatch(source, /红色：暖色与高反射目标/);
    assert.match(
      source,
      /<strong>\{\{ channel\.label \}\}<\/strong> \{\{ channel\.name \}\}/
    );
  }

  assert.match(
    workspace,
    /\.l2a-console \.rgb-grid label\s*\{[\s\S]*?grid-template-columns: 96px minmax\(0, 1fr\) 136px;/
  );
  assert.match(workspace, /\.l2a-console \.rgb-grid \.parameter-field__guide/);
});

test("RGB band options stay in numeric order", () => {
  const fy3hDrawer = readFileSync(
    "src/features/multisource/Fy3hMersiParameterDrawer.vue",
    "utf8"
  );
  const gf6Drawer = readFileSync(
    "src/features/multisource/Gf6WfvL1aParameterDrawer.vue",
    "utf8"
  );

  assert.match(
    fy3hDrawer,
    /form\.bands\.filter\(band => band <= 19\)\.sort\(\(left, right\) => left - right\)/
  );
  assert.match(gf6Drawer, /const rgbBands = computed\(\(\) =>[\s\S]*?sort\(/);
  assert.match(gf6Drawer, /v-for="band in rgbBands"/);
});

test("parameter workbenches use a single-line field layout with a dedicated status column", () => {
  const theme = readFileSync(
    "src/features/multisource/unifiedProductParameterDrawer.less",
    "utf8"
  );

  assert.match(theme, /\.field-grid,[\s\S]*?grid-template-columns:\s*1fr;/);
  assert.match(
    theme,
    /:is\(\.field-grid, \.control-grid, \.roi-grid, \.rgb-grid\)\s+label,[\s\S]*?grid-template-columns:\s*96px minmax\(0, 1fr\) minmax\(116px, 136px\);/
  );
  assert.match(theme, /\.parameter-field__guide\s*\{[\s\S]*?grid-column:\s*3;/);
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

  assert.match(styles, /position:\s*fixed\s*!important;/);
  assert.match(styles, /top:\s*88px\s*!important;/);
  assert.match(styles, /right:\s*24px\s*!important;/);
  assert.match(styles, /bottom:\s*24px\s*!important;/);
  assert.match(styles, /height:\s*auto\s*!important;/);
  assert.match(styles, /max-height:\s*calc\(100vh - 112px\)\s*!important;/);
  assert.match(styles, /top:\s*56px\s*!important;/);
  assert.match(styles, /max-height:\s*calc\(100vh - 68px\)\s*!important;/);
  assert.match(styles, /\.el-drawer__body\s*\{[\s\S]*?overflow-y:\s*auto;/);
});

test("product parameter drawers stay available as non-modal right-side inspectors", () => {
  const drawerFiles = [
    "src/features/multisource/Fy3hMersiParameterDrawer.vue",
    "src/features/multisource/Fy4bAgriParameterDrawer.vue",
    "src/features/multisource/Gf6WfvL1aParameterDrawer.vue",
    "src/features/multisource/Hy2dAltimeterParameterDrawer.vue",
    "src/components/LeftPanel/MultiSourceSatelliteProcess.vue"
  ];

  for (const filename of drawerFiles) {
    const drawer = readFileSync(filename, "utf8");
    assert.match(
      drawer,
      /:modal="false"/,
      `${filename} should not dim the workspace`
    );
    assert.match(
      drawer,
      /modal-class="parameter-drawer-overlay"/,
      `${filename} should let workspace clicks pass through the host`
    );
    assert.match(
      drawer,
      /append-to-body/,
      `${filename} should remain above the map workspace`
    );
  }
});

test("product parameter drawers use compact desktop widths", () => {
  const standardDrawers = [
    "src/features/multisource/Fy3hMersiParameterDrawer.vue",
    "src/features/multisource/Fy4bAgriParameterDrawer.vue",
    "src/features/multisource/Gf6WfvL1aParameterDrawer.vue"
  ];
  const compactDrawers = [
    "src/features/multisource/Hy2dAltimeterParameterDrawer.vue",
    "src/components/LeftPanel/MultiSourceSatelliteProcess.vue"
  ];

  for (const filename of standardDrawers) {
    assert.match(readFileSync(filename, "utf8"), /size="480px"/);
  }

  for (const filename of compactDrawers) {
    assert.match(readFileSync(filename, "utf8"), /size="440px"/);
  }
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

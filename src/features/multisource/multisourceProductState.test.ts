import test from "node:test";
import assert from "node:assert/strict";
import {
  buildFy3hWorkbenchSummary,
  buildFy4bWorkbenchSummary,
  buildGf6WorkbenchSummary,
  buildHy1cWorkbenchSummary,
  buildHy2dWorkbenchSummary,
  resetMultisourceProductForms,
  syncProductAlgorithmSelection
} from "./multisourceProductState";
import { defaultL2aForm } from "./hy1cCziL2aParameters";
import { defaultFy3hMersiForm } from "./fy3hMersiParameters";
import { defaultHy2dAltimeterForm } from "./hy2dAltimeterParameters";
import { defaultFy4bAgriForm } from "./fy4bAgriParameters";
import { defaultGf6WfvL1aForm } from "./gf6WfvL1aParameters";

const createForms = () => ({
  hy1c: defaultL2aForm(),
  fy3h: defaultFy3hMersiForm(),
  hy2d: defaultHy2dAltimeterForm(),
  fy4b: defaultFy4bAgriForm(),
  gf6: defaultGf6WfvL1aForm()
});

test("selection synchronization preserves all product contracts", () => {
  const forms = createForms();
  syncProductAlgorithmSelection(forms, [
    "feature-extraction",
    "track-gridding"
  ]);
  for (const form of [
    forms.hy1c.algorithms,
    forms.fy3h,
    forms.fy4b,
    forms.gf6
  ]) {
    assert.equal(form.features.enabled, true);
    assert.equal(form.fusion.enabled, false);
    assert.equal(form.saliency.enabled, false);
  }
  assert.equal(forms.hy2d.grid.enabled, true);
});

test("reset restores all product forms", () => {
  const forms = createForms();
  syncProductAlgorithmSelection(forms, [
    "feature-extraction",
    "rgb-fusion",
    "anomaly-detection",
    "track-gridding"
  ]);
  resetMultisourceProductForms(forms);
  assert.deepEqual(forms, createForms());
});

test("enabling GF-6 RGB uses the recommended natural-colour band mapping", () => {
  const forms = createForms();
  forms.gf6.bands = [8];

  syncProductAlgorithmSelection(forms, ["rgb-fusion"]);

  assert.deepEqual(forms.gf6.bands, [1, 2, 3, 8]);
  assert.deepEqual(
    [forms.gf6.fusion.red, forms.gf6.fusion.green, forms.gf6.fusion.blue],
    [3, 2, 1]
  );

  forms.gf6.fusion.red = 3;
  forms.gf6.fusion.green = 3;
  forms.gf6.fusion.blue = 3;
  syncProductAlgorithmSelection(forms, ["rgb-fusion"]);
  assert.deepEqual(
    [forms.gf6.fusion.red, forms.gf6.fusion.green, forms.gf6.fusion.blue],
    [3, 3, 3]
  );
});

test("GF-6 workbench summary keeps existing prop formatting", () => {
  assert.deepEqual(
    buildGf6WorkbenchSummary(defaultGf6WfvL1aForm(), value => value),
    {
      bands: ["B3"],
      grid: "EPSG:4326 · 0.1",
      roi: "107.6, 8.7, 107.7, 8.8",
      rgbBands: "B3 / B3 / B3",
      stretch: "2% - 98%",
      featureMetrics: "statistics",
      saliency: "B3 · 阈值 0.95"
    }
  );
});

test("all product workbench summaries preserve current display values", () => {
  const forms = createForms();
  assert.deepEqual(
    buildHy1cWorkbenchSummary(forms.hy1c).bands,
    forms.hy1c.bands
  );
  assert.deepEqual(
    buildFy3hWorkbenchSummary(forms.fy3h).outputBands[0],
    "CH01"
  );
  assert.equal(buildHy2dWorkbenchSummary(forms.hy2d).window, "21 点滑动窗口");
  assert.deepEqual(
    buildFy4bWorkbenchSummary(forms.fy4b, value => value),
    {
      grid: "EPSG:4326",
      roi: "全圆盘",
      algorithms: "特征关闭 · 假彩色关闭 · 显著性关闭"
    }
  );
});

import {
  defaultL2aForm,
  buildHy1cCziL2aPanelSummary,
  type Hy1cCziL2aForm
} from "./hy1cCziL2aParameters";
import {
  defaultFy3hMersiForm,
  buildFy3hMersiPanelSummary,
  type Fy3hMersiForm
} from "./fy3hMersiParameters";
import {
  defaultHy2dAltimeterForm,
  buildHy2dAltimeterPanelSummary,
  type Hy2dAltimeterForm
} from "./hy2dAltimeterParameters";
import { defaultFy4bAgriForm, type Fy4bAgriForm } from "./fy4bAgriParameters";
import {
  defaultGf6WfvL1aForm,
  type Gf6WfvL1aForm
} from "./gf6WfvL1aParameters";

export interface MultisourceProductForms {
  hy1c: Hy1cCziL2aForm;
  fy3h: Fy3hMersiForm;
  hy2d: Hy2dAltimeterForm;
  fy4b: Fy4bAgriForm;
  gf6: Gf6WfvL1aForm;
}

export interface Gf6WorkbenchSummary {
  bands: string[];
  grid: string;
  roi: string;
  rgbBands: string;
  stretch: string;
  featureMetrics: string;
  saliency: string;
}

export function buildHy1cWorkbenchSummary(form: Hy1cCziL2aForm) {
  return { ...buildHy1cCziL2aPanelSummary(form), bands: [...form.bands] };
}

export function buildFy3hWorkbenchSummary(form: Fy3hMersiForm) {
  return {
    ...buildFy3hMersiPanelSummary(form),
    outputBands: form.bands.map(band => `CH${String(band).padStart(2, "0")}`)
  };
}

export function buildHy2dWorkbenchSummary(form: Hy2dAltimeterForm) {
  return buildHy2dAltimeterPanelSummary(form);
}

export function buildFy4bWorkbenchSummary(
  form: Fy4bAgriForm,
  metricLabel: (metric: string) => string
) {
  return {
    grid: form.targetCrs,
    roi: form.roi ? form.roi.join(", ") : "全圆盘",
    algorithms: [
      form.features.enabled
        ? `特征: ${form.features.metrics.map(metricLabel).join("、")}`
        : "特征关闭",
      form.fusion.enabled ? "假彩色: NIR_RED_BLUE" : "假彩色关闭",
      form.saliency.enabled ? `显著性: ${form.saliency.source}` : "显著性关闭"
    ].join(" · ")
  };
}

export function resetMultisourceProductForms(forms: MultisourceProductForms) {
  Object.assign(forms.hy1c, defaultL2aForm());
  Object.assign(forms.fy3h, defaultFy3hMersiForm());
  Object.assign(forms.hy2d, defaultHy2dAltimeterForm());
  Object.assign(forms.fy4b, defaultFy4bAgriForm());
  Object.assign(forms.gf6, defaultGf6WfvL1aForm());
}

export function syncProductAlgorithmSelection(
  forms: MultisourceProductForms,
  selectedTargets: readonly string[]
) {
  const enabled = new Set(selectedTargets);
  const applyImageAlgorithms = (algorithms: {
    features: { enabled: boolean };
    fusion: { enabled: boolean };
    saliency: { enabled: boolean };
  }) => {
    algorithms.features.enabled = enabled.has("feature-extraction");
    algorithms.fusion.enabled = enabled.has("rgb-fusion");
    algorithms.saliency.enabled = enabled.has("anomaly-detection");
  };

  applyImageAlgorithms(forms.hy1c.algorithms);
  applyImageAlgorithms(forms.fy3h);
  applyImageAlgorithms(forms.fy4b);
  const wasGf6RgbEnabled = forms.gf6.fusion.enabled;
  applyImageAlgorithms(forms.gf6);
  if (forms.gf6.fusion.enabled && !wasGf6RgbEnabled) {
    forms.gf6.bands = [...new Set([...forms.gf6.bands, 1, 2, 3])].sort(
      (left, right) => left - right
    );
    forms.gf6.fusion.red = 3;
    forms.gf6.fusion.green = 2;
    forms.gf6.fusion.blue = 1;
  }
  forms.hy2d.grid.enabled = enabled.has("track-gridding");
}

export function buildGf6WorkbenchSummary(
  form: Gf6WfvL1aForm,
  metricLabel: (metric: string) => string
): Gf6WorkbenchSummary {
  return {
    bands: form.bands.map(band => `B${band}`),
    grid: `${form.targetCrs} · ${form.resolution}`,
    roi: form.roi ? form.roi.join(", ") : "全幅镶嵌",
    rgbBands: `B${form.fusion.red} / B${form.fusion.green} / B${form.fusion.blue}`,
    stretch: `${form.fusion.lowPercentile}% - ${form.fusion.highPercentile}%`,
    featureMetrics: form.features.metrics.map(metricLabel).join("、"),
    saliency: `${form.saliency.source} · 阈值 ${form.saliency.threshold}`
  };
}

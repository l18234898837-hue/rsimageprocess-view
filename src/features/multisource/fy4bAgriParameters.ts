export const FY4B_AGRI_METRICS = [
  "statistics",
  "gradient",
  "local_variance",
  "toa_nir_red_nd",
  "btd_c13_c14"
] as const;
export const FY4B_AGRI_SALIENCY_SOURCES = [
  "C02_REFLECTANCE_500M",
  "C03_REFLECTANCE_1000M",
  "C13_BRIGHTNESS_TEMPERATURE_4000M",
  "toa_nir_red_nd",
  "btd_c13_c14"
] as const;
export const FY4B_AGRI_DEFAULT_ROI = [120, 30, 122, 32] as const;

type Fy4bMetric = (typeof FY4B_AGRI_METRICS)[number];
type Fy4bSaliencySource = (typeof FY4B_AGRI_SALIENCY_SOURCES)[number];

export interface Fy4bAgriForm {
  targetCrs: "EPSG:4326" | "EPSG:4490";
  roi: [number, number, number, number] | null;
  features: { enabled: boolean; metrics: Fy4bMetric[]; windowSize: number };
  fusion: {
    enabled: boolean;
    mode: "NIR_RED_BLUE";
    lowPercentile: number;
    highPercentile: number;
  };
  saliency: {
    enabled: boolean;
    source: Fy4bSaliencySource;
    threshold: number;
    windowSize: number;
  };
}

export interface Fy4bAgriSnapshot {
  schemaVersion: "1";
  targetCrs: Fy4bAgriForm["targetCrs"];
  roi: [number, number, number, number] | null;
  features: { enabled: boolean; metrics: Fy4bMetric[]; windowSize?: number };
  fusion: {
    enabled: boolean;
    mode: "NIR_RED_BLUE";
    percentiles: [number, number];
  };
  saliency: Fy4bAgriForm["saliency"];
}

export interface Fy4bAgriValidationIssue {
  field: string;
  message: string;
}

const isOddWindow = (value: number) =>
  Number.isInteger(value) && value >= 3 && value % 2 === 1;
const DERIVED_SALIENCY_SOURCES = ["toa_nir_red_nd", "btd_c13_c14"] as const;
const isValidRoi = (roi: Fy4bAgriForm["roi"]) =>
  roi !== null &&
  roi.every(Number.isFinite) &&
  roi[0] >= -180 &&
  roi[2] <= 180 &&
  roi[1] >= -90 &&
  roi[3] <= 90 &&
  roi[0] < roi[2] &&
  roi[1] < roi[3];

export function defaultFy4bAgriForm(): Fy4bAgriForm {
  return {
    targetCrs: "EPSG:4326",
    roi: [...FY4B_AGRI_DEFAULT_ROI],
    features: { enabled: false, metrics: ["statistics"], windowSize: 3 },
    fusion: {
      enabled: false,
      mode: "NIR_RED_BLUE",
      lowPercentile: 2,
      highPercentile: 98
    },
    saliency: {
      enabled: false,
      source: "C02_REFLECTANCE_500M",
      threshold: 0.5,
      windowSize: 3
    }
  };
}

export function validateFy4bAgriForm(form: Fy4bAgriForm) {
  const issues: Fy4bAgriValidationIssue[] = [];
  if (!["EPSG:4326", "EPSG:4490"].includes(form.targetCrs)) {
    issues.push({
      field: "targetCrs",
      message: "仅支持 EPSG:4326 或 EPSG:4490"
    });
  }
  if (form.roi !== null && !isValidRoi(form.roi)) {
    issues.push({ field: "roi", message: "ROI 必须是有效的 WGS84 范围" });
  }
  if (
    !form.features.metrics.length ||
    new Set(form.features.metrics).size !== form.features.metrics.length ||
    form.features.metrics.some(metric => !FY4B_AGRI_METRICS.includes(metric))
  ) {
    issues.push({
      field: "features.metrics",
      message: "请选择有效且唯一的特征指标"
    });
  }
  if (
    form.features.metrics.includes("local_variance") &&
    !isOddWindow(form.features.windowSize)
  ) {
    issues.push({
      field: "features.windowSize",
      message: "局部方差窗口必须是不小于 3 的奇数"
    });
  }
  if (form.fusion.mode !== "NIR_RED_BLUE") {
    issues.push({
      field: "fusion.mode",
      message: "融合模式固定为 NIR_RED_BLUE"
    });
  }
  if (
    !Number.isFinite(form.fusion.lowPercentile) ||
    !Number.isFinite(form.fusion.highPercentile) ||
    form.fusion.lowPercentile < 0 ||
    form.fusion.lowPercentile >= form.fusion.highPercentile ||
    form.fusion.highPercentile > 100
  ) {
    issues.push({
      field: "fusion.percentiles",
      message: "融合百分位必须满足 0 <= 低值 < 高值 <= 100"
    });
  }
  if (
    form.saliency.enabled &&
    !FY4B_AGRI_SALIENCY_SOURCES.includes(form.saliency.source)
  ) {
    issues.push({ field: "saliency.source", message: "请选择允许的显著性源" });
  }
  if (
    form.saliency.enabled &&
    DERIVED_SALIENCY_SOURCES.includes(
      form.saliency.source as (typeof DERIVED_SALIENCY_SOURCES)[number]
    ) &&
    (!form.features.enabled ||
      !form.features.metrics.includes(form.saliency.source as Fy4bMetric))
  ) {
    issues.push({
      field: "saliency.source",
      message: "派生显著性源必须启用并选择对应的特征指标"
    });
  }
  if (
    form.saliency.enabled &&
    (!Number.isFinite(form.saliency.threshold) ||
      form.saliency.threshold < 0 ||
      form.saliency.threshold > 1)
  ) {
    issues.push({
      field: "saliency.threshold",
      message: "显著性阈值必须在 0 到 1 之间"
    });
  }
  if (form.saliency.enabled && !isOddWindow(form.saliency.windowSize)) {
    issues.push({
      field: "saliency.windowSize",
      message: "显著性窗口必须是不小于 3 的奇数"
    });
  }
  return { valid: issues.length === 0, issues };
}

export function buildFy4bAgriSnapshot(form: Fy4bAgriForm): Fy4bAgriSnapshot {
  const validation = validateFy4bAgriForm(form);
  if (!validation.valid)
    throw new Error(validation.issues.map(issue => issue.message).join("；"));
  return {
    schemaVersion: "1",
    targetCrs: form.targetCrs,
    roi: form.roi ? ([...form.roi] as [number, number, number, number]) : null,
    features: {
      enabled: form.features.enabled,
      metrics: [...form.features.metrics],
      ...(form.features.metrics.includes("local_variance")
        ? { windowSize: form.features.windowSize }
        : {})
    },
    fusion: {
      enabled: form.fusion.enabled,
      mode: "NIR_RED_BLUE",
      percentiles: [form.fusion.lowPercentile, form.fusion.highPercentile]
    },
    saliency: { ...form.saliency }
  };
}

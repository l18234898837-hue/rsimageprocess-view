export const GF6_WFV_L1A_BANDS = [1, 2, 3, 4, 5, 6, 7, 8] as const;
export const GF6_WFV_L1A_METRICS = [
  "statistics",
  "gradient",
  "local_variance"
] as const;
export const GF6_WFV_L1A_MAX_WINDOW_SIZE = 255;

type Gf6Metric = (typeof GF6_WFV_L1A_METRICS)[number];

const GF6_GEOGRAPHIC_EPSG_CODES = new Set(["EPSG:4326", "EPSG:4490"]);

export function gf6ResolutionConstraint(targetCrs: string) {
  const geographic = GF6_GEOGRAPHIC_EPSG_CODES.has(
    targetCrs.trim().toUpperCase()
  );
  return geographic
    ? { minimum: 0.00001, step: 0.00001, unit: "度" as const }
    : { minimum: 1, step: 1, unit: "米" as const };
}

export interface Gf6WfvL1aForm {
  targetCrs: string;
  resolution: number;
  roi: [number, number, number, number] | null;
  bands: number[];
  features: { enabled: boolean; metrics: Gf6Metric[]; windowSize: number };
  fusion: {
    enabled: boolean;
    red: number;
    green: number;
    blue: number;
    lowPercentile: number;
    highPercentile: number;
  };
  saliency: {
    enabled: boolean;
    source: string;
    threshold: number;
    windowSize: number;
  };
}

export interface Gf6WfvL1aSnapshot {
  schemaVersion: "gf6-wfv-l1a-v1";
  targetCrs: string;
  resolution: number;
  rpcHeightMode: "CONSTANT";
  rpcHeight: 0;
  roi: [number, number, number, number] | null;
  bands: number[];
  features: { enabled: boolean; metrics: Gf6Metric[]; windowSize?: number };
  fusion: {
    enabled: boolean;
    red: number;
    green: number;
    blue: number;
    percentiles: [number, number];
  };
  saliency: Gf6WfvL1aForm["saliency"];
}

const isOddWindow = (value: number) =>
  Number.isInteger(value) &&
  value >= 3 &&
  value <= GF6_WFV_L1A_MAX_WINDOW_SIZE &&
  value % 2 === 1;

export function defaultGf6WfvL1aForm(): Gf6WfvL1aForm {
  return {
    targetCrs: "EPSG:4326",
    resolution: 0.1,
    roi: [107.6, 8.7, 107.7, 8.8],
    bands: [3],
    features: { enabled: false, metrics: ["statistics"], windowSize: 3 },
    fusion: {
      enabled: false,
      red: 3,
      green: 3,
      blue: 3,
      lowPercentile: 2,
      highPercentile: 98
    },
    saliency: { enabled: false, source: "B3", threshold: 0.95, windowSize: 9 }
  };
}

export function validateGf6WfvL1aForm(form: Gf6WfvL1aForm) {
  const issues: Array<{ field: string; message: string }> = [];
  const validCrsSyntax = /^EPSG:\d+$/i.test(form.targetCrs.trim());
  if (!validCrsSyntax) {
    issues.push({
      field: "targetCrs",
      message: "目标坐标系必须使用 EPSG:<编号>"
    });
  }
  if (!Number.isFinite(form.resolution) || form.resolution <= 0) {
    issues.push({ field: "resolution", message: "输出分辨率必须为正数" });
  } else if (validCrsSyntax) {
    const constraint = gf6ResolutionConstraint(form.targetCrs);
    if (form.resolution < constraint.minimum) {
      issues.push({
        field: "resolution",
        message:
          constraint.unit === "度"
            ? "地理坐标系输出分辨率不得小于 0.00001°"
            : "投影坐标系输出分辨率不得小于 1 米；后端会校验 CRS 的轴单位"
      });
    }
  }
  if (
    form.roi !== null &&
    (!form.roi.every(Number.isFinite) ||
      form.roi[0] >= form.roi[2] ||
      form.roi[1] >= form.roi[3])
  ) {
    issues.push({
      field: "roi",
      message: "ROI 必须按 minLon、minLat、maxLon、maxLat 排列"
    });
  }
  const selectedBands = new Set(form.bands);
  if (
    !form.bands.length ||
    selectedBands.size !== form.bands.length ||
    form.bands.some(band => !GF6_WFV_L1A_BANDS.includes(band as never))
  ) {
    issues.push({ field: "bands", message: "请至少选择一个唯一的 B1-B8 波段" });
  }
  if (
    !form.features.metrics.length ||
    new Set(form.features.metrics).size !== form.features.metrics.length ||
    form.features.metrics.some(metric => !GF6_WFV_L1A_METRICS.includes(metric))
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
      message: "局部方差窗口必须是 3 到 255 之间的奇数"
    });
  }
  if (
    form.fusion.enabled &&
    [form.fusion.red, form.fusion.green, form.fusion.blue].some(
      band => !selectedBands.has(band)
    )
  ) {
    issues.push({ field: "fusion.bands", message: "RGB 融合只能使用已选波段" });
  }
  if (
    form.fusion.enabled &&
    (!Number.isFinite(form.fusion.lowPercentile) ||
      !Number.isFinite(form.fusion.highPercentile) ||
      form.fusion.lowPercentile < 0 ||
      form.fusion.lowPercentile >= form.fusion.highPercentile ||
      form.fusion.highPercentile > 100)
  ) {
    issues.push({
      field: "fusion.percentiles",
      message: "融合百分位必须满足 0 <= 低值 < 高值 <= 100"
    });
  }
  if (
    form.saliency.enabled &&
    !selectedBands.has(Number(form.saliency.source.replace(/^B/i, "")))
  ) {
    issues.push({
      field: "saliency.source",
      message: "显著性源必须来自已选波段"
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
      message: "显著性窗口必须是 3 到 255 之间的奇数"
    });
  }
  return { valid: issues.length === 0, issues };
}

export function buildGf6WfvL1aSnapshot(form: Gf6WfvL1aForm): Gf6WfvL1aSnapshot {
  const fallbackBand = form.bands[0];
  const validation = validateGf6WfvL1aForm(form);
  if (!validation.valid)
    throw new Error(validation.issues.map(issue => issue.message).join("；"));
  return {
    schemaVersion: "gf6-wfv-l1a-v1",
    targetCrs: form.targetCrs.trim(),
    resolution: form.resolution,
    rpcHeightMode: "CONSTANT",
    rpcHeight: 0,
    roi: form.roi ? ([...form.roi] as [number, number, number, number]) : null,
    bands: [...form.bands],
    features: {
      enabled: form.features.enabled,
      metrics: [...form.features.metrics],
      ...(form.features.metrics.includes("local_variance")
        ? { windowSize: form.features.windowSize }
        : {})
    },
    fusion: {
      enabled: form.fusion.enabled,
      red: form.fusion.enabled ? form.fusion.red : fallbackBand,
      green: form.fusion.enabled ? form.fusion.green : fallbackBand,
      blue: form.fusion.enabled ? form.fusion.blue : fallbackBand,
      percentiles: form.fusion.enabled
        ? [form.fusion.lowPercentile, form.fusion.highPercentile]
        : [2, 98]
    },
    saliency: form.saliency.enabled
      ? { ...form.saliency }
      : { enabled: false, source: `B${fallbackBand}`, threshold: 0.95, windowSize: 9 }
  };
}

export const FY3H_MERSI_BANDS = Array.from(
  { length: 25 },
  (_, index) => index + 1
) as readonly number[];

export type Fy3hFeatureMetric = "statistics" | "gradient" | "local_variance";

export interface Fy3hMersiForm {
  targetCrs: string;
  resolutionDegrees: number;
  resolutionMeters: number;
  continuousResampling: "nearest";
  bands: number[];
  roi: {
    enabled: boolean;
    minLon?: number;
    minLat?: number;
    maxLon?: number;
    maxLat?: number;
  };
  features: {
    enabled: boolean;
    metrics: Fy3hFeatureMetric[];
    windowSize: number;
  };
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
    windowSize: number;
    threshold: number;
  };
}

export interface Fy3hMersiValidationIssue {
  field: string;
  message: string;
}

export interface Fy3hMersiSnapshot {
  targetCrs: string;
  resolutionDegrees?: number;
  resolutionMeters?: number;
  continuousResampling: "nearest";
  bands: number[];
  roi?: [number, number, number, number];
  features:
    | { enabled: false }
    | {
        enabled: true;
        metrics: Fy3hFeatureMetric[];
        windowSize?: number;
      };
  fusion:
    | { enabled: false }
    | {
        enabled: true;
        red: number;
        green: number;
        blue: number;
        percentiles: [number, number];
      };
  saliency:
    | { enabled: false }
    | {
        enabled: true;
        source: string;
        windowSize: number;
        threshold: number;
      };
}

export interface Fy3hMersiPanelSummary {
  bands: string;
  grid: string;
  roi: string;
  algorithms: string[];
}

export function fy3hVariableName(band: number) {
  const suffix = band <= 19 ? "REFLECTANCE" : "BRIGHTNESS_TEMPERATURE";
  return `CH${String(band).padStart(2, "0")}_${suffix}`;
}

export function defaultFy3hMersiForm(): Fy3hMersiForm {
  return {
    targetCrs: "EPSG:4326",
    resolutionDegrees: 0.01,
    resolutionMeters: 1000,
    continuousResampling: "nearest",
    bands: [...FY3H_MERSI_BANDS],
    roi: { enabled: false },
    features: {
      enabled: false,
      metrics: ["statistics", "gradient", "local_variance"],
      windowSize: 3
    },
    fusion: {
      enabled: false,
      red: 3,
      green: 2,
      blue: 1,
      lowPercentile: 2,
      highPercentile: 98
    },
    saliency: {
      enabled: false,
      source: fy3hVariableName(1),
      windowSize: 3,
      threshold: 0.5
    }
  };
}

function isOddWindow(value: number) {
  return Number.isInteger(value) && value >= 3 && value % 2 === 1;
}

export function normalizeFy3hTargetCrs(targetCrs: string): string | null {
  const value = targetCrs.trim();
  const match =
    /^(?:EPSG\s*:\s*)?([1-9]\d*)$/i.exec(value) ??
    /^urn:ogc:def:crs:EPSG:(?:[^:]*:)?([1-9]\d*)$/i.exec(value) ??
    /^https?:\/\/www\.opengis\.net\/def\/crs\/EPSG\/[^/]+\/([1-9]\d*)\/?$/i.exec(
      value
    );
  return match ? `EPSG:${Number(match[1])}` : null;
}

export function isFy3hWgs84Crs(targetCrs: string) {
  return normalizeFy3hTargetCrs(targetCrs) === "EPSG:4326";
}

function isProjectedCrs(targetCrs: string) {
  const normalized = normalizeFy3hTargetCrs(targetCrs);
  return normalized !== null && normalized !== "EPSG:4326";
}

export function validateFy3hMersiForm(form: Fy3hMersiForm) {
  const issues: Fy3hMersiValidationIssue[] = [];
  const selectedBands = new Set(form.bands);

  if (
    !form.bands.length ||
    form.bands.some(band => !Number.isInteger(band) || band < 1 || band > 25) ||
    selectedBands.size !== form.bands.length
  ) {
    issues.push({
      field: "bands",
      message: "请至少选择一个不重复的 1-25 波段"
    });
  }
  if (!normalizeFy3hTargetCrs(form.targetCrs)) {
    issues.push({
      field: "targetCrs",
      message: "目标坐标系请使用 EPSG:<编号>"
    });
  }
  const resolution = isProjectedCrs(form.targetCrs)
    ? form.resolutionMeters
    : form.resolutionDegrees;
  if (!Number.isFinite(resolution) || resolution <= 0) {
    issues.push({ field: "resolution", message: "输出分辨率必须为正数" });
  }
  if (form.continuousResampling !== "nearest") {
    issues.push({
      field: "continuousResampling",
      message: "连续数据重采样固定为 nearest"
    });
  }
  if (form.roi.enabled) {
    const { minLon, minLat, maxLon, maxLat } = form.roi;
    const validRoi =
      [minLon, minLat, maxLon, maxLat].every(Number.isFinite) &&
      (minLon as number) >= -180 &&
      (maxLon as number) <= 180 &&
      (minLat as number) >= -90 &&
      (maxLat as number) <= 90 &&
      (minLon as number) < (maxLon as number) &&
      (minLat as number) < (maxLat as number);
    if (!validRoi) {
      issues.push({
        field: "roi",
        message: "ROI 必须是有效的 WGS84 范围，且最小值小于最大值"
      });
    }
  }

  if (form.features.enabled) {
    if (!form.features.metrics.length) {
      issues.push({ field: "features.metrics", message: "请至少选择一项特征" });
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
  }

  if (form.fusion.enabled) {
    const rgb = [form.fusion.red, form.fusion.green, form.fusion.blue];
    if (rgb.some(band => !selectedBands.has(band) || band > 19)) {
      issues.push({
        field: "fusion.bands",
        message: "RGB 融合只能使用已选的 1-19 反射通道"
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
  }

  if (form.saliency.enabled) {
    const allowedSources = new Set(
      form.bands.flatMap(band => {
        const variable = fy3hVariableName(band);
        const featureSources = form.features.enabled
          ? form.features.metrics
              .filter(metric => metric !== "statistics")
              .map(metric => `${metric}:${variable}`)
          : [];
        return [variable, ...featureSources];
      })
    );
    if (!allowedSources.has(form.saliency.source)) {
      issues.push({
        field: "saliency.source",
        message: "显著性源必须来自已选波段或已启用的栅格特征"
      });
    }
    if (!isOddWindow(form.saliency.windowSize)) {
      issues.push({
        field: "saliency.windowSize",
        message: "显著性窗口必须是不小于 3 的奇数"
      });
    }
    if (
      !Number.isFinite(form.saliency.threshold) ||
      form.saliency.threshold < 0 ||
      form.saliency.threshold > 1
    ) {
      issues.push({
        field: "saliency.threshold",
        message: "显著性阈值必须在 0 到 1 之间"
      });
    }
  }

  return { valid: issues.length === 0, issues };
}

export function buildFy3hMersiSnapshot(form: Fy3hMersiForm): Fy3hMersiSnapshot {
  const validation = validateFy3hMersiForm(form);
  if (!validation.valid) {
    throw new Error(validation.issues.map(issue => issue.message).join("；"));
  }

  const targetCrs = normalizeFy3hTargetCrs(form.targetCrs);
  if (!targetCrs) {
    throw new Error("目标坐标系请使用 EPSG:<编号>");
  }
  const projected = targetCrs !== "EPSG:4326";
  const features: Fy3hMersiSnapshot["features"] = form.features.enabled
    ? {
        enabled: true,
        metrics: [...form.features.metrics],
        ...(form.features.metrics.includes("local_variance")
          ? { windowSize: form.features.windowSize }
          : {})
      }
    : { enabled: false };
  const fusion: Fy3hMersiSnapshot["fusion"] = form.fusion.enabled
    ? {
        enabled: true,
        red: form.fusion.red,
        green: form.fusion.green,
        blue: form.fusion.blue,
        percentiles: [form.fusion.lowPercentile, form.fusion.highPercentile]
      }
    : { enabled: false };
  const saliency: Fy3hMersiSnapshot["saliency"] = form.saliency.enabled
    ? {
        enabled: true,
        source: form.saliency.source,
        windowSize: form.saliency.windowSize,
        threshold: form.saliency.threshold
      }
    : { enabled: false };

  return {
    targetCrs,
    ...(projected
      ? { resolutionMeters: form.resolutionMeters }
      : { resolutionDegrees: form.resolutionDegrees }),
    continuousResampling: "nearest",
    bands: [...form.bands],
    ...(form.roi.enabled
      ? {
          roi: [
            form.roi.minLon as number,
            form.roi.minLat as number,
            form.roi.maxLon as number,
            form.roi.maxLat as number
          ] as [number, number, number, number]
        }
      : {}),
    features,
    fusion,
    saliency
  };
}

export function buildFy3hMersiPanelSummary(
  form: Fy3hMersiForm
): Fy3hMersiPanelSummary {
  const algorithms: string[] = [];
  if (form.features.enabled) {
    algorithms.push(`特征提取 · ${form.features.metrics.length} 项`);
  }
  if (form.fusion.enabled) {
    algorithms.push(
      `RGB 融合 · CH${form.fusion.red}/CH${form.fusion.green}/CH${form.fusion.blue}`
    );
  }
  if (form.saliency.enabled) {
    algorithms.push(`显著性 · ${form.saliency.source}`);
  }
  return {
    bands:
      form.bands.length === 25
        ? "全部 25 个 MERSI 通道"
        : form.bands
            .map(band => `CH${String(band).padStart(2, "0")}`)
            .join(" / ") || "未选择波段",
    grid: isProjectedCrs(form.targetCrs)
      ? `${form.targetCrs.trim()} · ${form.resolutionMeters} m`
      : `${form.targetCrs.trim()} · ${form.resolutionDegrees}°`,
    roi: form.roi.enabled ? "已启用 WGS84 ROI" : "全幅扫描带",
    algorithms: algorithms.length ? algorithms : ["未启用扩展算法"]
  };
}

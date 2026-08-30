export const HY1C_CZI_BANDS = ["B460", "B560", "B650", "B825"] as const;

export type Hy1cCziBand = (typeof HY1C_CZI_BANDS)[number];
export type Hy1cFeatureMetric = "statistics" | "gradient" | "local_variance";

export interface Hy1cCziL2aForm {
  bands: Hy1cCziBand[];
  grid: {
    targetCrs: string;
    resolutionMeters: number;
    scienceResampling: "nearest";
  };
  roi: {
    enabled: boolean;
    minLon?: number;
    minLat?: number;
    maxLon?: number;
    maxLat?: number;
  };
  quality: {
    policy: "default";
  };
  algorithms: {
    features: {
      enabled: boolean;
      metrics: Hy1cFeatureMetric[];
      windowSize: number;
    };
    fusion: {
      enabled: boolean;
      red: Hy1cCziBand;
      green: Hy1cCziBand;
      blue: Hy1cCziBand;
      lowPercentile: number;
      highPercentile: number;
    };
    saliency: {
      enabled: boolean;
      source: Hy1cCziBand;
      threshold: number;
      windowSize: number;
    };
  };
}

export interface Hy1cCziL2aSnapshot {
  schemaVersion: "1";
  operation: "STANDARDIZE_L2A";
  bands: Hy1cCziBand[];
  grid: {
    targetCrs: string;
    resolutionMeters: number;
    scienceResampling: "nearest";
  };
  roiWgs84?: {
    minLon: number;
    minLat: number;
    maxLon: number;
    maxLat: number;
  };
  quality: {
    policy: "default";
  };
  algorithms: Hy1cCziL2aForm["algorithms"];
}

export interface Hy1cCziL2aValidationIssue {
  field: string;
  message: string;
}

export interface Hy1cCziL2aValidationResult {
  valid: boolean;
  issues: Hy1cCziL2aValidationIssue[];
}

export interface Hy1cCziL2aPanelSummary {
  bands: string;
  grid: string;
  roi: string;
  algorithms: string[];
}

export function defaultL2aForm(): Hy1cCziL2aForm {
  return {
    bands: [...HY1C_CZI_BANDS],
    grid: {
      targetCrs: "AUTO_UTM",
      resolutionMeters: 50,
      scienceResampling: "nearest"
    },
    roi: {
      enabled: true,
      minLon: 115.8,
      minLat: 14.8,
      maxLon: 117.1,
      maxLat: 15.8
    },
    quality: { policy: "default" },
    algorithms: {
      features: {
        enabled: true,
        metrics: ["statistics", "gradient", "local_variance"],
        windowSize: 3
      },
      fusion: {
        enabled: true,
        red: "B650",
        green: "B560",
        blue: "B460",
        lowPercentile: 2,
        highPercentile: 98
      },
      saliency: {
        enabled: true,
        source: "B560",
        threshold: 0.5,
        windowSize: 5
      }
    }
  };
}

export function buildHy1cCziL2aPanelSummary(
  form: Hy1cCziL2aForm
): Hy1cCziL2aPanelSummary {
  const algorithms: string[] = [];

  if (form.algorithms.features.enabled) {
    algorithms.push(`特征提取 · ${form.algorithms.features.metrics.length} 项`);
  }
  if (form.algorithms.fusion.enabled) {
    const { red, green, blue } = form.algorithms.fusion;
    algorithms.push(`RGB 融合 · ${red}/${green}/${blue}`);
  }
  if (form.algorithms.saliency.enabled) {
    const { source, threshold } = form.algorithms.saliency;
    algorithms.push(`显著性 · ${source} / ${threshold}`);
  }

  return {
    bands: form.bands.join(" / ") || "未选择波段",
    grid: `${form.grid.targetCrs.trim() || "未设置 CRS"} · ${form.grid.resolutionMeters} m`,
    roi: form.roi.enabled ? "已启用 ROI 裁剪" : "全幅产品",
    algorithms: algorithms.length ? algorithms : ["未启用扩展算法"]
  };
}

export function validateHy1cCziL2aForm(
  form: Hy1cCziL2aForm
): Hy1cCziL2aValidationResult {
  const issues: Hy1cCziL2aValidationIssue[] = [];
  const selectedBands = new Set(form.bands);
  const hasUnknownBand = form.bands.some(
    band => !HY1C_CZI_BANDS.includes(band)
  );

  if (form.bands.length === 0 || hasUnknownBand) {
    issues.push({ field: "bands", message: "请至少选择一个有效的 CZI 波段" });
  }
  if (
    !Number.isFinite(form.grid.resolutionMeters) ||
    form.grid.resolutionMeters <= 0
  ) {
    issues.push({
      field: "grid.resolutionMeters",
      message: "输出分辨率必须为正数"
    });
  }
  if (!form.grid.targetCrs.trim()) {
    issues.push({ field: "grid.targetCrs", message: "请输入目标投影坐标系" });
  }
  if (form.grid.scienceResampling !== "nearest") {
    issues.push({
      field: "grid.scienceResampling",
      message: "科学数据重采样固定为 nearest"
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
        field: "roiWgs84",
        message: "ROI 必须是有效的 WGS84 范围，且最小值小于最大值"
      });
    }
  }

  if (form.algorithms.fusion.enabled) {
    const fusionBands = [
      form.algorithms.fusion.red,
      form.algorithms.fusion.green,
      form.algorithms.fusion.blue
    ];
    if (fusionBands.some(band => !selectedBands.has(band))) {
      issues.push({
        field: "algorithms.fusion",
        message: "融合 RGB 必须全部来自已选波段"
      });
    }
  }
  if (
    form.algorithms.saliency.enabled &&
    !selectedBands.has(form.algorithms.saliency.source)
  ) {
    issues.push({
      field: "algorithms.saliency.source",
      message: "显著性源必须是已选波段"
    });
  }

  return { valid: issues.length === 0, issues };
}

export function buildHy1cCziL2aSnapshot(
  form: Hy1cCziL2aForm
): Hy1cCziL2aSnapshot {
  const validation = validateHy1cCziL2aForm(form);
  if (!validation.valid) {
    throw new Error(validation.issues.map(issue => issue.message).join("；"));
  }

  const roiWgs84 = form.roi.enabled
    ? {
        minLon: form.roi.minLon as number,
        minLat: form.roi.minLat as number,
        maxLon: form.roi.maxLon as number,
        maxLat: form.roi.maxLat as number
      }
    : undefined;

  return {
    schemaVersion: "1",
    operation: "STANDARDIZE_L2A",
    bands: [...form.bands],
    grid: {
      targetCrs: form.grid.targetCrs.trim(),
      resolutionMeters: form.grid.resolutionMeters,
      scienceResampling: "nearest"
    },
    ...(roiWgs84 ? { roiWgs84 } : {}),
    quality: { policy: "default" },
    algorithms: {
      features: {
        enabled: form.algorithms.features.enabled,
        metrics: [...form.algorithms.features.metrics],
        windowSize: form.algorithms.features.windowSize
      },
      fusion: {
        enabled: form.algorithms.fusion.enabled,
        red: form.algorithms.fusion.red,
        green: form.algorithms.fusion.green,
        blue: form.algorithms.fusion.blue,
        lowPercentile: form.algorithms.fusion.lowPercentile,
        highPercentile: form.algorithms.fusion.highPercentile
      },
      saliency: {
        enabled: form.algorithms.saliency.enabled,
        source: form.algorithms.saliency.source,
        threshold: form.algorithms.saliency.threshold,
        windowSize: form.algorithms.saliency.windowSize
      }
    }
  };
}

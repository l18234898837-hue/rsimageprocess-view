export const HY2D_QUALITY_POLICY = "hy2d-idr-2mc-baseline-v1" as const;

export interface Hy2dAltimeterForm {
  qualityPolicyVersion: typeof HY2D_QUALITY_POLICY;
  featureWindowSize: number;
  anomaly: {
    madThreshold: number;
    jumpThresholdMeters: number;
  };
  grid: {
    enabled: boolean;
    spacingDegrees: number;
  };
}

export interface Hy2dAltimeterSnapshot {
  qualityPolicyVersion: typeof HY2D_QUALITY_POLICY;
  featureWindowSize: number;
  anomaly: {
    madThreshold: number;
    jumpThresholdMeters: number;
  };
  grid: {
    enabled: boolean;
    spacingDegrees: number;
  };
}

export function defaultHy2dAltimeterForm(): Hy2dAltimeterForm {
  return {
    qualityPolicyVersion: HY2D_QUALITY_POLICY,
    featureWindowSize: 21,
    anomaly: {
      madThreshold: 5.0,
      jumpThresholdMeters: 0.5
    },
    grid: {
      enabled: true,
      spacingDegrees: 0.25
    }
  };
}

export function validateHy2dAltimeterForm(form: Hy2dAltimeterForm) {
  const issues: { field: string; message: string }[] = [];
  if (form.qualityPolicyVersion !== HY2D_QUALITY_POLICY) {
    issues.push({
      field: "qualityPolicyVersion",
      message: "HY-2D 质量策略版本不受支持"
    });
  }
  if (
    !Number.isInteger(form.featureWindowSize) ||
    form.featureWindowSize <= 0 ||
    form.featureWindowSize % 2 === 0
  ) {
    issues.push({
      field: "featureWindowSize",
      message: "特征窗口必须为正奇数"
    });
  }
  if (
    !Number.isFinite(form.anomaly.madThreshold) ||
    form.anomaly.madThreshold <= 0
  ) {
    issues.push({
      field: "anomaly.madThreshold",
      message: "MAD 阈值必须为正数"
    });
  }
  if (
    !Number.isFinite(form.anomaly.jumpThresholdMeters) ||
    form.anomaly.jumpThresholdMeters <= 0
  ) {
    issues.push({
      field: "anomaly.jumpThresholdMeters",
      message: "跳变阈值必须为正数"
    });
  }
  if (
    !Number.isFinite(form.grid.spacingDegrees) ||
    form.grid.spacingDegrees < 0.1 ||
    form.grid.spacingDegrees > 5
  ) {
    issues.push({
      field: "grid.spacingDegrees",
      message: "网格间距必须在 0.1 至 5 度之间"
    });
  }
  return { valid: issues.length === 0, issues };
}

export function buildHy2dAltimeterSnapshot(
  form: Hy2dAltimeterForm
): Hy2dAltimeterSnapshot {
  const validation = validateHy2dAltimeterForm(form);
  if (!validation.valid) {
    throw new Error(validation.issues.map(issue => issue.message).join("；"));
  }
  return {
    qualityPolicyVersion: HY2D_QUALITY_POLICY,
    featureWindowSize: form.featureWindowSize,
    anomaly: {
      madThreshold: form.anomaly.madThreshold,
      jumpThresholdMeters: form.anomaly.jumpThresholdMeters
    },
    grid: {
      enabled: form.grid.enabled,
      spacingDegrees: form.grid.spacingDegrees
    }
  };
}

export function buildHy2dAltimeterPanelSummary(form: Hy2dAltimeterForm) {
  return {
    window: `${form.featureWindowSize} 点滑动窗口`,
    anomaly: `MAD ${form.anomaly.madThreshold} · 跳变 ${form.anomaly.jumpThresholdMeters} m`,
    grid: form.grid.enabled
      ? `${form.grid.spacingDegrees}° 可选网格`
      : "沿轨输出，不生成网格"
  };
}

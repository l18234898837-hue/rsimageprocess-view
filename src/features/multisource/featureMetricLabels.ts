const FEATURE_METRIC_LABELS: Readonly<Record<string, string>> = {
  statistics: "统计特征",
  gradient: "梯度特征",
  local_variance: "局部方差",
  toa_nir_red_nd: "近红外与红光归一化差异",
  btd_c13_c14: "C13 与 C14 亮温差"
};

export function featureMetricLabel(metric: string): string {
  return FEATURE_METRIC_LABELS[metric] ?? metric;
}

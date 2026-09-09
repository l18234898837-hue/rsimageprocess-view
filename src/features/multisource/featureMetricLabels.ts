export interface FeatureMetricOption {
  value: string;
  label: string;
  description: string;
  output: string;
  detail: string;
}

const FEATURE_METRIC_OPTIONS: Readonly<Record<string, FeatureMetricOption>> = {
  statistics: {
    value: "statistics",
    label: "影像质量统计",
    description: "判断数据质量",
    output: "输出：统计摘要 JSON",
    detail:
      "计算每个已选波段的最小值、最大值、均值、标准差及有效像元比例。适合先判断数据质量，不生成新的可视化特征图。"
  },
  gradient: {
    value: "gradient",
    label: "边界与变化",
    description: "突出边界与变化",
    output: "输出：梯度特征栅格",
    detail:
      "计算相邻像元的变化强度，值越高表示边界或局部变化越明显。适用于轮廓提取，以及作为显著性检测的输入。"
  },
  local_variance: {
    value: "local_variance",
    label: "纹理复杂度",
    description: "识别纹理复杂地表",
    output: "输出：局部方差特征栅格",
    detail:
      "计算每个像元周围窗口内的数值离散程度。值越高表示纹理或局部变化越复杂；窗口越大，结果越平滑。"
  },
  toa_nir_red_nd: {
    value: "toa_nir_red_nd",
    label: "近红外-红光差异",
    description: "识别植被反射差异",
    output: "输出：归一化差异特征栅格",
    detail:
      "使用 FY-4B 的近红外与红光通道计算归一化差异，适合观察植被及反射率变化。仅适用于具备对应通道的 FY-4B 产品。"
  },
  btd_c13_c14: {
    value: "btd_c13_c14",
    label: "C13-C14 亮温差",
    description: "比较热红外温度差",
    output: "输出：亮温差特征栅格",
    detail:
      "计算 FY-4B C13 与 C14 的亮温差，适合辅助观察云体和热红外温度差异。仅适用于具备对应通道的 FY-4B 产品。"
  }
};

export function featureMetricLabel(metric: string): string {
  return FEATURE_METRIC_OPTIONS[metric]?.label ?? metric;
}

export function featureMetricOptions(
  metrics: readonly string[]
): FeatureMetricOption[] {
  return metrics.map(
    metric =>
      FEATURE_METRIC_OPTIONS[metric] ?? {
        value: metric,
        label: metric,
        description: "生成对应的特征结果。",
        output: "输出：特征结果",
        detail: "该特征由当前产品的处理服务生成。"
      }
  );
}

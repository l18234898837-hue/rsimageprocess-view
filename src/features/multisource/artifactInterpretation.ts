import type { ExecutionProgressArtifact } from "@/api/multiSourceSatellite";

export interface ArtifactInterpretationParameter {
  key: string;
  group: "空间" | "时间" | "质量" | "算法";
  name: string;
  value: string;
  effect: string;
}

export interface ArtifactInterpretation {
  purpose: string;
  parameters: ArtifactInterpretationParameter[];
}

const PARAMETER_METADATA: Array<{
  match: RegExp;
  group: ArtifactInterpretationParameter["group"];
  name: string;
  effect: string;
}> = [
  {
    match: /(^|[_.-])(crs|epsg|projection|output_crs)([_.-]|$)/i,
    group: "空间",
    name: "输出坐标系",
    effect: "决定结果的位置参考和地图叠加方式。"
  },
  {
    match: /(resolution|grid|pixel_size|cell_size)/i,
    group: "空间",
    name: "空间分辨率",
    effect: "决定结果的空间细节、统计单元与文件大小。"
  },
  {
    match: /(roi|extent|bbox|bounds|region|crop)/i,
    group: "空间",
    name: "处理范围",
    effect: "仅在设定范围内计算和输出结果。"
  },
  {
    match: /(start.*time|end.*time|time_range|date|period)/i,
    group: "时间",
    name: "时间范围",
    effect: "决定纳入处理或统计的观测时段。"
  },
  {
    match: /(quality|valid|mask|nodata|cloud)/i,
    group: "质量",
    name: "质量筛选",
    effect: "不满足筛选条件的数据不会进入当前结果。"
  },
  {
    match:
      /(threshold|window|kernel|method|algorithm|aggregation|statistic|fusion|band|stretch)/i,
    group: "算法",
    name: "算法设置",
    effect: "决定特征提取、汇总或显示的计算方式。"
  }
];

export function artifactInterpretation(
  artifact: ExecutionProgressArtifact,
  fallbackDescription = "本阶段生成的处理产物。",
  parameterSnapshot?: string
): ArtifactInterpretation {
  const label =
    `${artifact.displayName || ""} ${artifact.type} ${artifact.uri}`.toLowerCase();
  const parameters = snapshotParameters(parameterSnapshot);
  if (/saliency|显著|anomaly|异常/.test(label)) {
    return {
      purpose:
        "用于定位局部异常或显著变化的空间线索，可结合原始影像和质量结果进一步核查。",
      parameters
    };
  }
  if (/fusion|rgb|合成/.test(label)) {
    return {
      purpose:
        "按本次任务选择的波段组合生成，便于快速观察目标的色彩和纹理，可作为后续判读的可视化底图。",
      parameters
    };
  }
  if (/grid|网格|track|沿轨/.test(label)) {
    return {
      purpose:
        "将有效观测整理到统一空间网格或沿轨位置，用于查看覆盖和空间分布，也便于后续统计分析。",
      parameters
    };
  }
  return { purpose: fallbackDescription, parameters };
}

function snapshotParameters(
  snapshot?: string
): ArtifactInterpretationParameter[] {
  if (!snapshot) return [];
  try {
    const values = flatten(JSON.parse(snapshot));
    return values
      .flatMap(({ key, value }) => {
        const metadata = PARAMETER_METADATA.find(item => item.match.test(key));
        if (
          !metadata ||
          value === "" ||
          value === "undefined" ||
          value === "null"
        )
          return [];
        return [
          {
            key,
            group: metadata.group,
            name: metadata.name,
            value,
            effect: metadata.effect
          }
        ];
      })
      .filter(
        (item, index, values) =>
          values.findIndex(candidate => candidate.name === item.name) === index
      )
      .slice(0, 6);
  } catch {
    return [];
  }
}

function flatten(
  value: unknown,
  prefix = ""
): Array<{ key: string; value: string }> {
  if (value === null || value === undefined) return [];
  if (Array.isArray(value))
    return value.flatMap((item, index) => flatten(item, `${prefix}[${index}]`));
  if (typeof value === "object")
    return Object.entries(value as Record<string, unknown>).flatMap(
      ([key, item]) => flatten(item, prefix ? `${prefix}.${key}` : key)
    );
  return [{ key: prefix, value: String(value) }];
}

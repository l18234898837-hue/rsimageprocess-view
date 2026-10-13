import type { ExecutionProgressArtifact } from "@/api/multiSourceSatellite";
import {
  featureMetricLabel,
  featureMetricOptions
} from "./featureMetricLabels";
import {
  FY3H_OUTPUT_BANDS,
  FY4B_SOURCE_DESCRIPTIONS,
  GF6_OUTPUT_BANDS,
  HY1C_OUTPUT_BANDS
} from "./outputBandOptions";
import {
  interpretationCatalog,
  interpretationCategory,
  type ArtifactInterpretationCategory,
  type InterpretationContent,
  type InterpretationLegend
} from "./artifactInterpretationCatalog";

export interface ArtifactInterpretationParameter {
  key: string;
  group: "空间" | "时间" | "质量" | "算法";
  name: string;
  value: string;
  effect: string;
}

export interface ArtifactInterpretation extends InterpretationContent {
  category: ArtifactInterpretationCategory;
  presentation: "image" | "data";
  parameters: ArtifactInterpretationParameter[];
}

type Snapshot = Record<string, unknown>;

function object(value: unknown): Snapshot {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Snapshot)
    : {};
}

function snapshotObject(snapshot?: string): Snapshot {
  try {
    return object(snapshot ? JSON.parse(snapshot) : undefined);
  } catch {
    return {};
  }
}

function text(value: unknown): string {
  return typeof value === "string" ||
    (typeof value === "number" && Number.isFinite(value))
    ? String(value)
    : "";
}

function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function bandLabel(value: unknown, type: string): string {
  const raw = text(value);
  if (!raw) return "";
  if (raw.includes(":")) {
    const [metric, source] = raw.split(":");
    return `${featureMetricLabel(metric)} · ${bandLabel(source, type)}`;
  }
  if (FY4B_SOURCE_DESCRIPTIONS[raw]) return FY4B_SOURCE_DESCRIPTIONS[raw].label;
  const channel = raw.match(
    /^CH(\d+)(?:_(REFLECTANCE|BRIGHTNESS_TEMPERATURE))?$/
  );
  const options =
    /MERSI|FY3H/.test(type) || channel
      ? FY3H_OUTPUT_BANDS
      : type.startsWith("GF6_")
        ? GF6_OUTPUT_BANDS
        : HY1C_OUTPUT_BANDS;
  const valueToMatch = channel
    ? Number(channel[1])
    : /^B\d{1,2}$/.test(raw) && type.startsWith("GF6_")
      ? Number(raw.slice(1))
      : value;
  const option = options.find(
    candidate => String(candidate.value) === String(valueToMatch)
  );
  if (!option) return raw;
  const unitLabel =
    channel?.[2] === "REFLECTANCE"
      ? " · 反射率"
      : channel?.[2] === "BRIGHTNESS_TEMPERATURE"
        ? " · 亮温"
        : "";
  return `${option.label}${unitLabel}`;
}

function algorithm(snapshot: Snapshot, name: string): Snapshot {
  return object(snapshot[name] ?? object(snapshot.algorithms)[name]);
}

function algorithmPath(snapshot: Snapshot, name: string): string {
  return snapshot[name] !== undefined ? name : `algorithms.${name}`;
}

function fusionLegend(
  snapshot: Snapshot,
  type: string
): InterpretationLegend | undefined {
  const fusion = algorithm(snapshot, "fusion");
  const channels =
    fusion.mode === "NIR_RED_BLUE" && type.startsWith("FY4B_")
      ? ["C03 · 近红外反射率", "C02 · 红光反射率", "C01 · 蓝光反射率"]
      : [fusion.red, fusion.green, fusion.blue].map(value =>
          bandLabel(value, type)
        );
  if (channels.some(channel => !channel)) return undefined;
  return {
    title: "显示通道与输入波段",
    kind: "items",
    items: [
      { color: "#dc4848", label: "红色显示通道", description: channels[0] },
      { color: "#329660", label: "绿色显示通道", description: channels[1] },
      { color: "#3d74d4", label: "蓝色显示通道", description: channels[2] }
    ],
    note: "色块说明显示通道的输入，不是地物分类图例。近红外等不可见波段也可放入可见显示通道；组合后的颜色反映这次映射和拉伸。"
  };
}

export function artifactInterpretation(
  artifact: ExecutionProgressArtifact,
  fallbackDescription = "本阶段生成的处理产物。",
  parameterSnapshot?: string
): ArtifactInterpretation {
  const type = artifact.type.toUpperCase();
  const category = interpretationCategory(type);
  const snapshot = snapshotObject(parameterSnapshot);
  const base = interpretationCatalog[category];
  const presentation =
    /(?:COG|RASTER|PNG|VRT|MASK)$/.test(type) ||
    type === "BROWSE_IMAGE" ||
    type === "CROPPED_CZI"
      ? "image"
      : "data";
  const result: ArtifactInterpretation = {
    ...base,
    category,
    presentation,
    reading: base.reading.map(item => ({ ...item })),
    generation: [...base.generation],
    uses: [...base.uses],
    parameters: snapshotParameters(snapshot, category, type)
  };
  if (category === "generic")
    result.purpose = artifact.description || fallbackDescription;
  if (category === "fusion")
    result.legend =
      presentation === "image" ? fusionLegend(snapshot, type) : undefined;
  if (category === "saliencyMask") {
    const threshold = text(algorithm(snapshot, "saliency").threshold);
    if (threshold)
      result.reading[0].text = `黄色表示显著性分数大于等于本次阈值 ${threshold} 的有效像元，存储值为 1。边缘、细线和斑块表示通过筛选的局部差异。`;
  }
  if (category === "feature") {
    const metrics = array(algorithm(snapshot, "features").metrics)
      .map(text)
      .filter(Boolean);
    if (metrics.length) {
      result.reading[0] = {
        label: "本次特征",
        text: metrics
          .map(
            metric =>
              `${featureMetricLabel(metric)}：${featureMetricOptions([metric])[0].detail}`
          )
          .join("\n")
      };
    }
  }
  if (
    presentation === "data" &&
    ["standard", "feature", "fusion", "quality", "trackGrid"].includes(category)
  ) {
    result.reading.unshift({
      label: "这份文件怎么看",
      text: "这份文件保存阶段数据或结构化记录，不是彩色预览图。下方说明对应配套观测或图像的含义；字段、单位、波段顺序和统计内容以文件记录为准。"
    });
  }
  return result;
}

function snapshotParameters(
  snapshot: Snapshot,
  category: ArtifactInterpretationCategory,
  type: string
): ArtifactInterpretationParameter[] {
  const parameters: ArtifactInterpretationParameter[] = [];
  const add = (
    key: string,
    group: ArtifactInterpretationParameter["group"],
    name: string,
    value: string,
    effect: string
  ) => {
    if (value) parameters.push({ key, group, name, value, effect });
  };
  if (
    [
      "generic",
      "validation",
      "footprint",
      "browse",
      "browseReport",
      "georeference"
    ].includes(category)
  )
    return parameters;
  const grid = object(snapshot.grid);
  const crs = text(snapshot.targetCrs ?? grid.targetCrs);
  add(
    snapshot.targetCrs !== undefined ? "targetCrs" : "grid.targetCrs",
    "空间",
    "输出坐标系",
    crs === "AUTO_UTM" ? "按覆盖范围自动选择 UTM 投影" : crs,
    "决定结果的位置参考和地图叠加方式，不改变观测的物理含义。"
  );
  if (snapshot.resolutionDegrees !== undefined)
    add(
      "resolutionDegrees",
      "空间",
      "网格分辨率",
      withUnit(snapshot.resolutionDegrees, "°"),
      "经纬度角度间隔；同一角度对应的实际地面距离随纬度变化。"
    );
  else if (
    snapshot.resolutionMeters !== undefined ||
    grid.resolutionMeters !== undefined
  )
    add(
      snapshot.resolutionMeters !== undefined
        ? "resolutionMeters"
        : "grid.resolutionMeters",
      "空间",
      "网格分辨率",
      withUnit(snapshot.resolutionMeters ?? grid.resolutionMeters, "m"),
      "决定输出像元的网格间距；更小网格不会新增传感器没有观测到的细节。"
    );
  else if (snapshot.resolution !== undefined)
    add(
      "resolution",
      "空间",
      "网格分辨率",
      withUnit(
        snapshot.resolution,
        ["EPSG:4326", "EPSG:4490"].includes(crs.toUpperCase())
          ? "°"
          : crs
            ? "m"
            : "（任务记录值）"
      ),
      "决定输出网格间距和数据量；显示网格不等于新增空间信息。"
    );
  const roi = snapshot.roi ?? snapshot.roiWgs84;
  const bounds = Array.isArray(roi)
    ? roi
    : [
        object(roi).minLon,
        object(roi).minLat,
        object(roi).maxLon,
        object(roi).maxLat
      ];
  if (bounds.length === 4 && bounds.every(value => text(value)))
    add(
      snapshot.roi !== undefined ? "roi" : "roiWgs84",
      "空间",
      "处理范围",
      `西 ${bounds[0]}° · 南 ${bounds[1]}° · 东 ${bounds[2]}° · 北 ${bounds[3]}°`,
      "只保留范围内的观测；矩形边缘来自裁剪设置，不是地物边界。"
    );
  else if (snapshot.roi === null)
    add(
      "roi",
      "空间",
      "处理范围",
      "全部覆盖范围",
      "本次未设置额外的矩形裁剪范围。"
    );
  const bands = array(snapshot.bands)
    .map(value => bandLabel(value, type))
    .filter(Boolean);
  add(
    "bands",
    "算法",
    "输出波段",
    bands.join("、"),
    "列出本次保留的全部波段，通道顺序及科学单位以输出文件元数据为准。"
  );
  const resampling = text(
    snapshot.continuousResampling ?? grid.scienceResampling
  );
  add(
    snapshot.continuousResampling !== undefined
      ? "continuousResampling"
      : "grid.scienceResampling",
    "空间",
    "重采样方法",
    resampling === "nearest" ? "最近邻" : resampling,
    "将原始观测放到目标网格；最近邻取附近样本，不做平滑插值。"
  );
  add(
    "qualityPolicyVersion",
    "质量",
    "沿轨质量规则",
    text(snapshot.qualityPolicyVersion) === "hy2d-idr-2mc-baseline-v1"
      ? "HY-2D 基线质量规则（hy2d-idr-2mc-baseline-v1）"
      : text(snapshot.qualityPolicyVersion),
    "决定哪些沿轨观测可用于高度、特征和网格统计。"
  );
  if (category === "quality")
    add(
      "quality.policy",
      "质量",
      "质量筛选策略",
      text(object(snapshot.quality).policy) === "default"
        ? "产品默认质量规则"
        : text(object(snapshot.quality).policy),
      "按产品规则标记和排除不可用观测；颜色本身不定义质量等级。"
    );
  if (category === "standard" && snapshot.rpcHeight !== undefined)
    add(
      "rpcHeight",
      "空间",
      "RPC 定位参考高度",
      withUnit(snapshot.rpcHeight, "m"),
      "GF-6 几何定位使用的参考高度，不是自动反演的地表高程。"
    );
  if (category === "feature") {
    const features = algorithm(snapshot, "features");
    if (features.enabled !== false) {
      const path = algorithmPath(snapshot, "features");
      const metrics = array(features.metrics).map(text).filter(Boolean);
      add(
        `${path}.metrics`,
        "算法",
        "特征指标",
        metrics.map(featureMetricLabel).join("、"),
        "梯度突出边界，局部方差突出纹理，统计指标输出数值摘要；通道差异指标使用指定波段计算。"
      );
      if (metrics.includes("local_variance"))
        add(
          `${path}.windowSize`,
          "算法",
          "纹理邻域窗口",
          pixelWindow(features.windowSize),
          "局部方差的统计邻域；大窗口汇总更大范围的数值差异。"
        );
    }
  }
  if (category === "fusion") {
    const fusion = algorithm(snapshot, "fusion");
    if (fusion.enabled !== false) {
      const path = algorithmPath(snapshot, "fusion");
      const legend = fusionLegend(snapshot, type);
      legend?.items.forEach((item, index) =>
        add(
          `${path}.${["red", "green", "blue"][index]}`,
          "算法",
          item.label,
          item.description,
          "将该输入放到对应显示通道；画面颜色由三个通道共同决定。"
        )
      );
      const percentiles = array(fusion.percentiles).length
        ? array(fusion.percentiles)
        : [fusion.lowPercentile, fusion.highPercentile];
      if (percentiles.length === 2 && percentiles.every(value => text(value)))
        add(
          `${path}.percentiles`,
          "算法",
          "显示拉伸范围",
          `${percentiles[0]}%～${percentiles[1]}% 分位数`,
          "控制显示对比度和饱和范围，不表示地物比例或分类阈值。"
        );
    }
  }
  if (category.startsWith("saliency")) {
    const saliency = algorithm(snapshot, "saliency");
    if (saliency.enabled !== false) {
      const path = algorithmPath(snapshot, "saliency");
      add(
        `${path}.source`,
        "算法",
        "显著性输入",
        bandLabel(saliency.source, type),
        "局部对比从这个波段或特征计算；输入不同，突出的空间结构也不同。"
      );
      add(
        `${path}.windowSize`,
        "算法",
        "对比邻域窗口",
        pixelWindow(saliency.windowSize),
        "计算每个像元周围的局部均值，决定对比所参照的邻域范围。"
      );
      add(
        `${path}.threshold`,
        "算法",
        "候选筛选阈值",
        text(saliency.threshold),
        "有效像元分数大于等于阈值时进入候选掩膜；阈值升高会减少或保持候选范围，不改变分数图。"
      );
    }
  }
  if (["trackFeature", "trackAnomaly", "track"].includes(category))
    add(
      "featureWindowSize",
      "算法",
      "沿轨窗口",
      withUnit(snapshot.featureWindowSize, "个观测点"),
      "特征按连续有效观测分窗统计；异常检测用窗口内的中位数和 MAD 对照当前观测。"
    );
  if (category === "trackAnomaly") {
    const anomaly = object(snapshot.anomaly);
    add(
      "anomaly.madThreshold",
      "算法",
      "MAD 阈值",
      text(anomaly.madThreshold),
      "标准化偏离量超过阈值时标记局部离群；提高阈值使离群筛选更严格。"
    );
    add(
      "anomaly.jumpThresholdMeters",
      "算法",
      "相邻跳变阈值",
      withUnit(anomaly.jumpThresholdMeters, "m"),
      "相邻有效点海面高度差绝对值超过该值时标记跳变。"
    );
  }
  if (category === "trackGrid")
    add(
      "grid.spacingDegrees",
      "空间",
      "统计网格间隔",
      withUnit(grid.spacingDegrees, "°"),
      "按此经纬度间隔分箱统计，不在未观测网格间进行插值。"
    );
  return parameters;
}

function withUnit(value: unknown, unit: string): string {
  const formatted = text(value);
  return formatted ? `${formatted} ${unit}` : "";
}

function pixelWindow(value: unknown): string {
  const formatted = text(value);
  return formatted ? `${formatted} × ${formatted} 像元` : "";
}

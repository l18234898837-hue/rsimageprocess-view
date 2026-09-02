export type PipelineType = "image" | "altimeter";
export type StepKind = "system" | "target";

export interface StepDefinition {
  readonly key: string;
  readonly title: string;
  readonly productTitle?: string;
  readonly kind: StepKind;
  readonly selectable?: boolean;
  readonly dependsOn: readonly string[];
  readonly configurable: boolean;
  readonly parallelGroup?: string;
}

export interface PipelineDefinition {
  readonly productId: string;
  readonly pipelineType: PipelineType;
  readonly steps: readonly StepDefinition[];
}

const imageSystemSteps: readonly StepDefinition[] = [
  {
    key: "upload-validation",
    title: "上传与文件校验",
    kind: "system",
    dependsOn: [],
    configurable: false
  },
  {
    key: "preprocess",
    title: "预处理",
    kind: "system",
    selectable: true,
    dependsOn: ["upload-validation"],
    configurable: true
  },
  {
    key: "quality-control",
    title: "质量控制",
    kind: "system",
    dependsOn: ["preprocess"],
    configurable: true
  },
  {
    key: "spatial-standardization",
    title: "定位、投影与网格化",
    kind: "system",
    dependsOn: ["quality-control"],
    configurable: true
  },
  {
    key: "standard-product",
    title: "标准产品",
    kind: "system",
    dependsOn: ["spatial-standardization"],
    configurable: false
  }
];

function imagePipeline(
  productId: string,
  titles: Pick<
    Record<"feature" | "rgb" | "anomaly", string>,
    "feature" | "rgb" | "anomaly"
  >
): PipelineDefinition {
  return {
    productId,
    pipelineType: "image",
    steps: [
      ...imageSystemSteps,
      {
        key: "feature-extraction",
        title: "特征提取",
        productTitle: titles.feature,
        kind: "target",
        dependsOn: ["standard-product"],
        configurable: true,
        parallelGroup: "image-analysis"
      },
      {
        key: "rgb-fusion",
        title: "RGB 融合",
        productTitle: titles.rgb,
        kind: "target",
        dependsOn: ["standard-product"],
        configurable: true,
        parallelGroup: "image-analysis"
      },
      {
        key: "anomaly-detection",
        title: "显著性检测",
        productTitle: titles.anomaly,
        kind: "target",
        dependsOn: ["standard-product"],
        configurable: true,
        parallelGroup: "image-analysis"
      }
    ]
  };
}

const PIPELINES: readonly PipelineDefinition[] = [
  imagePipeline("gf6-wfv-l1a-v1", {
    feature: "WFV 影像空间特征",
    rgb: "WFV 多波段融合",
    anomaly: "WFV 显著性检测"
  }),
  imagePipeline("fy4b-agri-v1", {
    feature: "AGRI 通道特征",
    rgb: "AGRI 假彩色融合",
    anomaly: "AGRI 显著性检测"
  }),
  imagePipeline("hy1c-czi-l2a-v1", {
    feature: "CZI 水色特征",
    rgb: "CZI RGB 融合",
    anomaly: "CZI 显著性检测"
  }),
  imagePipeline("fy3h-mersi-l1-1000m-geo1k-v1", {
    feature: "MERSI 通道特征",
    rgb: "MERSI RGB 融合",
    anomaly: "MERSI 显著性检测"
  }),
  {
    productId: "hy2d-altimeter-v1",
    pipelineType: "altimeter",
    steps: [
      {
        key: "upload-validation",
        title: "上传与文件校验",
        kind: "system",
        dependsOn: [],
        configurable: false
      },
      {
        key: "along-track-decode",
        title: "沿轨解码",
        kind: "system",
        selectable: true,
        dependsOn: ["upload-validation"],
        configurable: false
      },
      {
        key: "quality-control",
        title: "质量过滤",
        kind: "system",
        dependsOn: ["along-track-decode"],
        configurable: true
      },
      {
        key: "ssh-baseline",
        title: "海面高度基线计算",
        kind: "system",
        dependsOn: ["quality-control"],
        configurable: true
      },
      {
        key: "along-track-feature-extraction",
        title: "沿轨特征提取",
        productTitle: "高度计沿轨特征",
        kind: "target",
        dependsOn: ["ssh-baseline"],
        configurable: true
      },
      {
        key: "anomaly-detection",
        title: "异常检测",
        productTitle: "沿轨异常检测",
        kind: "target",
        dependsOn: ["along-track-feature-extraction"],
        configurable: true,
        parallelGroup: "altimeter-analysis"
      },
      {
        key: "track-gridding",
        title: "轨迹网格化",
        productTitle: "沿轨轨迹网格化",
        kind: "target",
        dependsOn: ["along-track-feature-extraction"],
        configurable: true,
        parallelGroup: "altimeter-analysis"
      },
      {
        key: "map-preview",
        title: "地图展示",
        productTitle: "沿轨地图展示",
        kind: "target",
        dependsOn: ["along-track-feature-extraction"],
        configurable: true,
        parallelGroup: "altimeter-analysis"
      }
    ]
  }
];

export function getPipelineDefinition(productId: string): PipelineDefinition {
  const definition = PIPELINES.find(item => item.productId === productId);
  if (!definition) {
    throw new Error(`Unsupported multisource product pipeline: ${productId}`);
  }
  return definition;
}

export function getTargetSteps(productId: string): readonly StepDefinition[] {
  return getPipelineDefinition(productId).steps.filter(
    step => step.kind === "target" || step.selectable === true
  );
}

export function assertValidPipelineDefinition(
  definition: PipelineDefinition
): void {
  const stepsByKey = new Map(definition.steps.map(step => [step.key, step]));
  if (stepsByKey.size !== definition.steps.length) {
    throw new Error(
      `Pipeline ${definition.productId} contains duplicate step keys`
    );
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (stepKey: string) => {
    if (visited.has(stepKey)) return;
    if (visiting.has(stepKey)) {
      throw new Error(
        `Pipeline ${definition.productId} contains circular dependencies`
      );
    }
    const step = stepsByKey.get(stepKey);
    if (!step) {
      throw new Error(
        `Pipeline ${definition.productId} references missing step: ${stepKey}`
      );
    }
    visiting.add(stepKey);
    step.dependsOn.forEach(visit);
    visiting.delete(stepKey);
    visited.add(stepKey);
  };

  definition.steps.forEach(step => visit(step.key));
}

PIPELINES.forEach(assertValidPipelineDefinition);

export type ArtifactInterpretationCategory =
  | "validation"
  | "footprint"
  | "browse"
  | "georeference"
  | "browseReport"
  | "standard"
  | "quality"
  | "feature"
  | "fusion"
  | "saliencyScore"
  | "saliencyMask"
  | "saliencyPreview"
  | "saliencyReport"
  | "track"
  | "trackFeature"
  | "trackAnomaly"
  | "trackGrid"
  | "generic";

export interface InterpretationDetail {
  label: string;
  text: string;
}

export interface InterpretationLegend {
  title: string;
  kind: "ramp" | "items";
  items: Array<{ color: string; label: string; description: string }>;
  note: string;
}

export interface InterpretationContent {
  purpose: string;
  reading: InterpretationDetail[];
  generation: string[];
  uses: string[];
  legend?: InterpretationLegend;
}

const saliencyGeneration = [
  "读取指定波段或特征，计算每个有效像元与周围窗口局部均值的绝对差。",
  "将差值按本幅影像的最大差值归一化到 0～1；均匀影像的有效像元分数为 0。阈值用于筛选候选区域，不改变分数图。"
];

const saliencyReading: InterpretationDetail[] = [
  {
    label: "亮线与边缘",
    text: "亮线表示选定输入在相邻位置存在较强差异。区域交界、观测条带及有效数据边缘都会产生局部对比，亮线不是自动提取的地物边界。"
  },
  {
    label: "亮点与斑块",
    text: "亮点和亮斑表示像元偏离附近平均水平；纹理、孤立高低值及噪声都会贡献这种对比。分数不是识别概率，也不是地物分类标签。"
  },
  {
    label: "平坦与空白",
    text: "低分区域表示选定输入的局部差异小。无效像元不参加计算并以透明显示；透明背景不代表水体。"
  }
];

export const interpretationCatalog: Record<
  ArtifactInterpretationCategory,
  InterpretationContent
> = {
  saliencyScore: {
    purpose:
      "展示选定波段或特征的局部对比强度，用来快速寻找值得放大检查的边缘、亮点和纹理区域。",
    reading: saliencyReading,
    generation: saliencyGeneration,
    uses: [
      "快速定位局部变化强烈的区域，缩小人工核查范围。",
      "与原始影像、候选掩膜和质量结果对照，区分真实观测差异与边缘、条带或噪声。"
    ],
    legend: {
      title: "地图色带 · 局部对比由低到高",
      kind: "ramp",
      items: [
        { color: "#440154", label: "紫色", description: "局部对比低" },
        { color: "#3b528b", label: "蓝色", description: "局部对比较低" },
        { color: "#21918c", label: "青色", description: "局部对比中等" },
        { color: "#5ec962", label: "绿色", description: "局部对比较高" },
        { color: "#fde725", label: "黄色", description: "局部对比高" }
      ],
      note: "地图按当前瓦片的 2%～98% 分位数拉伸颜色，色带表示当前瓦片内的相对高低，不是固定分数刻度。不同瓦片或任务的同色不能直接比较数值；原始分数仍为 0～1。"
    }
  },
  saliencyMask: {
    purpose:
      "将达到显著性阈值的有效像元单独标出，形成便于叠加到原始影像上的候选区域。",
    reading: [
      {
        label: "高亮区域",
        text: "黄色表示显著性分数大于等于本次阈值的候选像元，存储值为 1。边缘、细线和斑块表示通过阈值筛选的局部差异。"
      },
      {
        label: "透明区域",
        text: "未达到阈值的像元与无效像元都不高亮。两者在地图上均透明，需要结合分数图和质量结果区分。"
      },
      {
        label: "区域含义",
        text: "候选区表示局部对比达到筛选条件，不是植被、水体、云或灾害分类。"
      }
    ],
    generation: [
      ...saliencyGeneration,
      "仅对有效像元执行“分数大于等于阈值”的二值判断，输出候选掩膜。"
    ],
    uses: [
      "叠加原始影像，逐块检查候选区域。",
      "统计候选像元的数量与比例，比较不同阈值的筛选范围。"
    ],
    legend: {
      title: "地图图例 · 阈值筛选结果",
      kind: "items",
      items: [
        {
          color: "#f4d03f",
          label: "黄色 · 候选区",
          description: "有效像元分数达到阈值，值为 1"
        },
        {
          color: "transparent",
          label: "透明 · 未高亮",
          description: "未达到阈值的像元或无效像元"
        }
      ],
      note: "掩膜只有候选与未高亮两种显示状态，不表示差异强度；查看强度请打开显著性分数图。"
    }
  },
  saliencyPreview: {
    purpose:
      "用热力色带和透明度突出显著性强的区域，便于在地图底图或原始影像上快速浏览。",
    reading: [
      ...saliencyReading.slice(0, 2),
      {
        label: "透明度",
        text: "低分区域逐渐透明，高分区域更不透明；无效像元透明。预览的透明截止值与二值掩膜的检测阈值不同，显示出的颜色不等于已通过候选筛选。"
      }
    ],
    generation: [
      ...saliencyGeneration,
      "预览图将分数映射到青—绿—黄—橙—红热力色带，并按分数设置透明度；预览缩小用于浏览，不替代原始分数栅格。"
    ],
    uses: [
      "快速查看局部差异集中在哪里。",
      "作为叠加浏览图定位重点，再用分数图和掩膜核查数值及阈值。"
    ],
    legend: {
      title: "预览图色带 · 局部对比由低到高",
      kind: "ramp",
      items: [
        { color: "#00c8ff", label: "青色", description: "较低对比" },
        { color: "#00ffaa", label: "绿色", description: "偏低对比" },
        { color: "#ffeb00", label: "黄色", description: "中等对比" },
        { color: "#ff7800", label: "橙色", description: "较高对比" },
        { color: "#ff0000", label: "红色", description: "高对比" }
      ],
      note: "这是浏览预览的热力色带，与分数图地图瓦片的紫—黄配色不同。颜色只表示局部对比，不代表地物类别。"
    }
  },
  saliencyReport: {
    purpose:
      "记录显著性计算的输入、窗口、阈值和统计结果，用来解释候选区域是如何筛选出来的。",
    reading: [
      {
        label: "分数与掩膜",
        text: "分数栅格保存局部对比强度，掩膜保存达到阈值的候选像元；摘要用于追溯这两类结果的生成依据。"
      },
      {
        label: "数量与比例",
        text: "候选像元数统计通过阈值的像元，有效像元数统计可参与计算的像元，候选比例按有效像元计算；这些不是地物面积分类统计。"
      }
    ],
    generation: [
      ...saliencyGeneration,
      "汇总计算配置、有效性和候选统计，写入结构化说明文件。"
    ],
    uses: [
      "核对输入来源、阈值和候选比例是否符合本次任务设置。",
      "留存处理依据，为复现任务和解释候选图提供参考。"
    ]
  },
  fusion: {
    purpose:
      "把三个指定波段分别放入红、绿、蓝显示通道，形成便于观察色彩差异、纹理和轮廓的多波段融合图。",
    reading: [
      {
        label: "颜色怎么读",
        text: "红、绿、蓝分别表示对应输入在显示通道中的相对强弱；黄色是红与绿共同较强，青色是绿与蓝共同较强，白色是三个通道共同较强。颜色不是地物分类标签。"
      },
      {
        label: "边缘与纹理",
        text: "连续边缘表示相邻区域的输入光谱或亮度有差别，细碎纹理表示局部差异丰富；影像拼接、重采样和无效数据边缘也会留下线状结构。"
      },
      {
        label: "明暗与空白",
        text: "亮暗经过分位数拉伸以增强视觉对比，不是直接的物理量刻度。地图中的无效像元透明。"
      }
    ],
    generation: [
      "读取本次选择的三个输入波段，按红、绿、蓝通道分别排列。",
      "按设置的低、高分位数拉伸各通道，映射为可显示的色彩；这是显示合成，不是新增地物分类。"
    ],
    uses: [
      "作为地图浏览底图，观察空间轮廓、光谱差异和观测覆盖。",
      "与单波段、特征和显著性结果对照，定位需要进一步检查的区域。"
    ]
  },
  feature: {
    purpose:
      "把原始波段中的数值变化转成可比较的特征或统计指标，突出边界、纹理以及指定通道之间的差异。",
    reading: [
      {
        label: "特征含义",
        text: "梯度表示相邻像元变化强度，局部方差表示窗口内的离散程度；高值分别对应强边界和复杂纹理。统计指标汇总波段数值，不生成新的分类图。"
      },
      {
        label: "显示颜色",
        text: "不足三个波段时，地图用第一波段显示灰度，黑到白对应显示范围内的低到高；三个及以上波段时，将文件前三个特征波段映射到红、绿、蓝。混合颜色表示不同特征共同贡献，不对应地物类别。"
      },
      {
        label: "细线与斑块",
        text: "梯度图的亮线突出数值突变；方差图的高值斑块突出局部数值不均匀。噪声、条带和输入边缘同样会影响这些特征。"
      }
    ],
    generation: [
      "从标准化观测中提取本次启用的特征，保留与原始观测的空间对应关系。",
      "按所选指标计算邻域变化或通道间差异，输出特征栅格及统计摘要；窗口只影响需要邻域的特征。"
    ],
    uses: [
      "辅助观察边界、纹理复杂度及通道差异。",
      "作为显著性检测或后续专业分析的输入，并结合统计摘要检查输入数据质量。"
    ]
  },
  standard: {
    purpose:
      "保存读取、质量处理、定位或标准化后的观测数据，为地图叠加以及后续特征、融合和显著性分析提供输入。",
    reading: [
      {
        label: "数值与颜色",
        text: "不足三个波段时，地图用第一波段以灰度展示低到高的数值；三个及以上波段时，将文件前三个波段映射到红、绿、蓝。显示通道顺序由文件波段顺序决定，彩色显示不自动等于自然彩色。"
      },
      {
        label: "边缘与覆盖",
        text: "覆盖轮廓、裁剪边界和条带表示观测范围或网格处理结构。地图中的无效像元透明，背景底图不是本产物的观测值。"
      },
      {
        label: "物理含义",
        text: "原始数值的含义由处理阶段和波段单位决定：解码值、反射率、辐亮度和亮温不能混用。热红外亮温表示辐射对应温度，不是直接反演的地表温度。"
      }
    ],
    generation: [
      "依照当前处理阶段，执行文件解码、质量筛选、空间定位、重投影或输出整理。",
      "将观测保存为该阶段声明的数据格式；地图额外进行显示拉伸，显示亮度不会替换文件中的原始数值。"
    ],
    uses: [
      "在地图上检查覆盖范围、空间位置和波段间差异。",
      "供后续算法读取或导入专业遥感软件，结合波段单位做定量分析。"
    ]
  },
  quality: {
    purpose:
      "记录观测是否有效以及质量处理的筛选结果，帮助解释影像中的空白、边界和被排除的数据。",
    reading: [
      {
        label: "质量标志",
        text: "质量栅格保存有效性或质量标志，标志值的含义由产品质量规则及摘要定义；位编码不表示连续强度，也不是地物类别。"
      },
      {
        label: "显示与空白",
        text: "单波段 QUALITY_COG 默认以灰度展示标志数值；名称含 MASK 的单波段地图将非零值高亮、零值或无效值透明。显示明暗或颜色不能代替质量标志定义。"
      },
      {
        label: "有效比例",
        text: "质量摘要记录有效与剔除数据的统计信息。质量处理后的影像空白表示没有可用观测，不代表某种地物。"
      }
    ],
    generation: [
      "依据产品有效值范围、缺测标记及质量规则检查观测。",
      "输出质量标记或有效性栅格，并汇总筛选计数；后续科学结果仅使用符合条件的数据。"
    ],
    uses: [
      "判断观测覆盖是否足够，排查地图空白与异常显示。",
      "核查特征或显著性高值附近的数据质量，避免把无效数据结构当作目标。"
    ]
  },
  track: {
    purpose:
      "按卫星沿轨观测顺序保存位置和测量数据，便于查看轨迹覆盖、海面高度及其质量状态。",
    reading: [
      {
        label: "点与轨迹",
        text: "地图中的点对应有经纬度的观测记录，排列形状表示卫星采样轨迹，不是连续铺满的海面图。"
      },
      {
        label: "高度与缺口",
        text: "标准轨迹的海面高度以米为单位；质量筛选会保留状态或排除不可用测量。轨迹缺口表示没有展示的有效记录，不能按空白推断海面状态。"
      },
      {
        label: "文件差异",
        text: "解码、质量过滤和基准海面高度文件是中间结果；CSV、GeoJSON、NetCDF 和 Parquet 是标准记录的不同存储形式，摘要用于核对字段、记录数和处理依据。"
      }
    ],
    generation: [
      "解析高度计观测并按质量规则筛选，保留观测顺序与位置。",
      "基准海面高度步骤计算高度值，标准化步骤整理字段与关联结果；中间产物只保存所在阶段的内容。"
    ],
    uses: [
      "查看轨迹覆盖、观测位置及海面高度沿轨变化。",
      "导入 GIS 或分析软件，进行逐点检查、沿轨统计及异常核查。"
    ]
  },
  trackFeature: {
    purpose:
      "按连续有效沿轨观测窗口汇总海面高度的平均水平、波动和趋势，便于检查一段轨迹的稳定性。",
    reading: [
      {
        label: "均值与波动",
        text: "sshMean 是窗口平均海面高度，sshStd 是窗口标准差，单位为米；标准差高表示该窗口内的高度差异较大。"
      },
      {
        label: "趋势与变化",
        text: "sshTrend 是对观测序号拟合的斜率，单位为米/观测点，不是每公里坡度；sshGradientMean 是相邻点高度差绝对值的平均。"
      },
      {
        label: "窗口与比例",
        text: "startIndex/endIndex 给出原始观测序号范围；validRatio 是窗口有效点数除以设定窗口点数，末尾不足整窗时小于 1。"
      }
    ],
    generation: [
      "将连续有效观测段按设定观测点数分窗，不跨越无效数据断点。",
      "逐窗计算均值、标准差、线性趋势和相邻变化，输出窗口表与摘要。"
    ],
    uses: [
      "定位海面高度波动或趋势突出的沿轨区段。",
      "比较窗口统计与异常点分布，为逐点核查提供上下文。"
    ]
  },
  trackAnomaly: {
    purpose:
      "按沿轨高度偏离和相邻跳变规则标记待核查观测点，明确每个标记对应的异常触发原因。",
    reading: [
      {
        label: "局部离群 · MAD_OUTLIER",
        text: "点的高度偏离局部中位数，标准化偏离量超过本次 MAD 阈值。局部 MAD 为 0 时不生成该标准化分数。"
      },
      {
        label: "相邻跳变 · ADJACENT_JUMP",
        text: "当前有效点与前一个连续有效点的海面高度差绝对值超过跳变阈值。同一点可以同时触发多个原因。"
      },
      {
        label: "工程限值 · ABSOLUTE_SSH_LIMIT",
        text: "海面高度绝对值超过工程基线 100 m。此限值不是官方质量阈值；标记是待核查记录，不是灾害或海洋现象识别结论。"
      }
    ],
    generation: [
      "在连续有效沿轨观测段内计算局部中位数与 MAD，用绝对偏离除以 1.4826 × MAD 得到离群分数。",
      "分别检查局部离群、相邻跳变和工程绝对限值，保存原因代码、位置及统计摘要。"
    ],
    uses: [
      "沿轨定位测量跳变、离群记录和需要人工复核的观测点。",
      "结合质量标记、原始高度及窗口统计排查异常原因，再决定后续使用或剔除。"
    ]
  },
  trackGrid: {
    purpose:
      "把有效沿轨海面高度按经纬度网格分箱统计，展示每个有观测网格的平均海面高度和采样数量。",
    reading: [
      {
        label: "网格值与颜色",
        text: "COG 文件包含四个统计波段，默认地图将前三个波段映射为红色—平均海面高度、绿色—高度标准差、蓝色—有效观测数；第四波段保存有效比例，不参与默认配色。高度与标准差单位为米，混合颜色不代表单一高度值或地物类别。"
      },
      {
        label: "空白与采样",
        text: "没有有效观测的网格为空白；结果不做插值、不填补轨迹间空缺，不是连续完整的海面场。"
      },
      {
        label: "配套字段",
        text: "NetCDF 和 COG 均保存平均海面高度、高度标准差、有效观测数和有效比例。方块边界是统计网格边界，不是海洋现象边界；少量采样的网格统计稳定性有限，需要同时检查观测数。"
      }
    ],
    generation: [
      "按设定经纬度间隔划分网格，将有效观测点分配到对应网格。",
      "逐格统计平均海面高度、标准差、观测数量和有效比例；只做分箱统计，不做空间插值。"
    ],
    uses: [
      "汇总沿轨观测覆盖及网格内平均高度。",
      "结合观测数量评价统计支撑程度，与其他同单位观测进行网格对照。"
    ]
  },
  validation: {
    purpose:
      "记录输入文件、必需字段和产品适配检查结果，用来判断本次处理的数据是否满足读取与执行要求。",
    reading: [
      {
        label: "通过与不通过",
        text: "验证状态表示文件和字段是否满足当前处理流程的要求，不等于全部观测质量合格。"
      },
      {
        label: "元数据",
        text: "产品标识、尺寸、输入证据和检查信息用于确认数据来源及结构；这是结构化记录，不是影像或分类结果。"
      }
    ],
    generation: [
      "检查输入文件及当前产品要求的字段、维度和配套数据。",
      "将检查状态与读取到的证据信息写入验证记录。"
    ],
    uses: [
      "确认数据是否选对、缺少哪些输入。",
      "排查解码或后续处理失败的输入原因，留存任务可追溯信息。"
    ]
  },
  footprint: {
    purpose:
      "以矢量边界与属性描述数据覆盖范围，方便在地图上定位产品及判断处理区域与观测范围的关系。",
    reading: [
      {
        label: "边界含义",
        text: "轮廓线描述产品覆盖范围，不是云、植被、水体或目标轮廓；内部区域不保证每个位置都有有效观测。"
      },
      {
        label: "配套文件",
        text: "SHP 保存几何，SHX 保存索引，DBF 保存属性。这些文件属于同一套矢量数据，需要一起保留以供 GIS 读取。"
      }
    ],
    generation: [
      "根据产品空间信息生成或整理覆盖边界与属性。",
      "将边界、几何索引和属性写为 Shapefile 配套文件。"
    ],
    uses: [
      "快速定位产品覆盖，与处理范围或其他数据相交检查。",
      "用于 GIS 的覆盖检索、范围叠加与数据目录管理。"
    ]
  },
  browse: {
    purpose:
      "提供产品自带的快速浏览图，用于查看整体轮廓、纹理和覆盖，不作为定量科学波段结果。",
    reading: [
      {
        label: "颜色与轮廓",
        text: "颜色来自产品已有浏览图的显示处理，表示浏览外观；单独的 JPG 不包含可追溯的科学通道数值。图中边缘和纹理用于视觉观察，不是自动分类。"
      },
      {
        label: "位置与清晰度",
        text: "浏览图分辨率和显示拉伸不同于原始科学观测；配套定位信息用于近似位置叠加，不能替代精确定位产品。"
      }
    ],
    generation: [
      "读取输入产品提供的浏览影像，不重新执行科学波段定标或地物识别。",
      "读取配套元数据和定位信息，供快速展示与视觉检查使用。"
    ],
    uses: [
      "快速确认数据覆盖、场景外观和文件选择。",
      "辅助定位需要进一步打开科学波段检查的区域。"
    ]
  },
  browseReport: {
    purpose:
      "汇总快速浏览图的尺寸、颜色通道统计与定位检查信息，帮助检查浏览数据的显示结构。",
    reading: [
      {
        label: "通道统计",
        text: "红、绿、蓝统计的是浏览图的显示像素数值，表示整体亮暗及分布，不是定标后的反射率、辐亮度或亮温。"
      },
      {
        label: "尺寸与定位",
        text: "尺寸记录浏览图像素范围，定位记录说明近似地图叠加依据；统计摘要不输出地物类别或面积。"
      }
    ],
    generation: [
      "读取已有浏览图与配套定位文件，检查图像尺寸。",
      "统计显示通道数值并整理为浏览特征或报告，不执行科学反演。"
    ],
    uses: [
      "发现浏览图异常尺寸、整体亮暗及显示通道问题。",
      "留存浏览检查记录，并确认后续应读取的科学观测产品。"
    ]
  },
  georeference: {
    purpose:
      "保存图像像素与地理位置之间的对应依据，用来解释影像如何定位、投影并叠加到地图。",
    reading: [
      {
        label: "像素与坐标",
        text: "定位网格、投影和范围信息描述像素对应的地图位置；这些是空间参考，不是光谱值、地物类别或识别结果。"
      },
      {
        label: "方法差异",
        text: "GF-6 RPC 网格记录几何定位依据，FY-4B 标称网格描述卫星投影，浏览图世界文件给出仿射近似定位；三者的几何含义不能互换。"
      }
    ],
    generation: [
      "解析当前产品的几何模型、导航信息或浏览图配套世界文件。",
      "记录输出坐标、空间范围和网格定位关系，供后续重投影或显示使用。"
    ],
    uses: [
      "核对地图偏移、坐标系和覆盖范围。",
      "追溯重投影和影像叠加所使用的几何依据。"
    ]
  },
  generic: {
    purpose: "本阶段生成的处理产物，内容和数值含义以产物描述及文件记录为准。",
    reading: [
      {
        label: "内容依据",
        text: "当前类型没有专用显示规则，请查看产物说明、格式及文件字段定义；不从文件名或显示颜色推断地物类别。"
      },
      {
        label: "文件与显示",
        text: "影像的显示色彩、矢量的样式和结构化文件的数值是不同内容；定量解释需要对应的单位与字段记录。"
      }
    ],
    generation: [
      "由当前处理阶段按任务配置生成。",
      "处理依据可从下方参数记录和处理链路追溯；未记录的设置不补写默认值。"
    ],
    uses: [
      "确认当前阶段输出了哪些文件与数据。",
      "结合产物描述及处理依据决定后续查看或导出方式。"
    ]
  }
};

export function interpretationCategory(
  type: string
): ArtifactInterpretationCategory {
  const normalized = type.toUpperCase();
  if (/^(?:GF6_|MERSI_|FY4B_)?SALIENCY_SCORE_COG$/.test(normalized))
    return "saliencyScore";
  if (/^(?:GF6_|MERSI_|FY4B_)?SALIENCY_MASK_COG$/.test(normalized))
    return "saliencyMask";
  if (normalized === "SALIENCY_PREVIEW_PNG") return "saliencyPreview";
  if (
    /^(?:GF6_|MERSI_|FY4B_)?SALIENCY_(?:METADATA|SUMMARY)_JSON$/.test(
      normalized
    )
  )
    return "saliencyReport";
  if (
    /^(?:STANDARD_)?TRACK_ANOMAL(?:IES_GEOJSON|Y_SUMMARY_JSON)$/.test(
      normalized
    )
  )
    return "trackAnomaly";
  if (/^TRACK_GRID_(?:COG|NETCDF|SUMMARY_JSON)$/.test(normalized))
    return "trackGrid";
  if (/^TRACK_FEATURE(?:S_JSON|_WINDOWS_PARQUET)$/.test(normalized))
    return "trackFeature";
  if (
    /^(?:VALIDATION_METADATA|(?:HY1C|GF6|FY3H|FY4B)_INPUT_VALIDATION|BROWSE_VALIDATION)_JSON$/.test(
      normalized
    )
  )
    return "validation";
  if (/^FOOTPRINT_(?:SHP|SHX|DBF)$/.test(normalized)) return "footprint";
  if (normalized === "BROWSE_IMAGE") return "browse";
  if (
    /^(?:BROWSE_GEOREFERENCE|GF6_RPC_GRID|FY4B_NOMINAL_GRID)_JSON$/.test(
      normalized
    )
  )
    return "georeference";
  if (/^BROWSE_(?:FEATURES|REPORT)_JSON$/.test(normalized))
    return "browseReport";
  if (
    /^(?:(?:MERSI|TRACK)_QUALITY_SUMMARY_JSON|GRIDDED_MERSI_QUALITY_MASK|STANDARD_MERSI_QUALITY_COG|FY4B_(?:RED_500M|VIS_NIR_1000M|SPECTRAL_2000M|MULTISPECTRAL_4000M)_QUALITY_COG)$/.test(
      normalized
    )
  )
    return "quality";
  if (
    /^(?:(?:GF6|MERSI|FY4B)_)?(?:FEATURES?|FUSION)_(?:COG|METADATA_JSON|SUMMARY_JSON|PREVIEW_PNG)$/.test(
      normalized
    )
  )
    return normalized.includes("FUSION") ? "fusion" : "feature";
  if (/^(?:GF6_RGB_FUSION|FY4B_FALSE_COLOR)_COG$/.test(normalized))
    return "fusion";
  if (
    /^(?:(?:DECODED|QUALITY_FILTERED)_ALTIMETER_TRACK|BASELINE_SSH_TRACK|STANDARD_TRACK_(?:CSV|GEOJSON|NETCDF|PARQUET|SUMMARY_JSON))$/.test(
      normalized
    )
  )
    return "track";
  if (
    /^(?:(?:DECODED|QUALITY_MASKED|GEOLOCATED)_CZI_RASTER|CROPPED_CZI|STANDARD_(?:COG|METADATA_JSON)|GF6_(?:TILE_MOSAIC_VRT|PROJECTED_RASTER|STANDARD_COG|PROCESSING_SUMMARY_JSON)|DECODED_MERSI_L1|(?:CALIBRATED|QUALITY|GRIDDED)_MERSI_RASTER|STANDARD_MERSI_(?:COG|SUMMARY_JSON)|FY4B_(?:(?:CALIBRATION|STANDARD)_SUMMARY_JSON|(?:RED_500M|VIS_NIR_1000M|SPECTRAL_2000M|MULTISPECTRAL_4000M)_COG))$/.test(
      normalized
    )
  )
    return "standard";
  return "generic";
}

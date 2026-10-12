export interface OutputBandOption {
  value: string | number;
  label: string;
  category: string;
  description: string;
  wavelength: string;
  pairing: string;
  tone?: "blue" | "green" | "red" | "infrared" | "thermal" | "standard";
  group?: string;
}

export interface OutputBandPreset {
  label: string;
  description: string;
  bands: readonly (string | number)[];
}

export const GF6_OUTPUT_BANDS: OutputBandOption[] = [
  {
    value: 1,
    label: "B1 · 蓝光",
    category: "自然彩色",
    description: "提供蓝光观测信息，用于自然彩色合成及水面、地表观察。",
    wavelength: "450～520 nm",
    pairing: "与 B2、B3 一起保留；自然彩色融合使用红=B3、绿=B2、蓝=B1。",
    tone: "blue"
  },
  {
    value: 2,
    label: "B2 · 绿光",
    category: "自然彩色",
    description: "提供绿光观测信息，补充植被和水面的光谱差异。",
    wavelength: "520～590 nm",
    pairing: "与 B1、B3 配合生成自然彩色；与 B4 配合分析水陆差异。",
    tone: "green"
  },
  {
    value: 3,
    label: "B3 · 红光",
    category: "彩色与植被分析",
    description: "提供红光观测信息，用于自然彩色合成，也用于植被相关分析。",
    wavelength: "630～690 nm",
    pairing: "自然彩色搭配 B1、B2；植被分析搭配 B4。",
    tone: "red"
  },
  {
    value: 4,
    label: "B4 · 近红外",
    category: "植被与水陆差异",
    description: "补充近红外观测信息，用于观察植被、岸线及水陆差异。",
    wavelength: "770～890 nm",
    pairing: "与 B3 红光配合；近红外假彩色融合使用红=B4、绿=B3、蓝=B2。",
    tone: "infrared"
  },
  {
    value: 5,
    label: "B5 · 红边Ⅰ",
    category: "植被与作物分析",
    description: "提供红光到近红外过渡区的观测信息，补充植被和农作物光谱特征。",
    wavelength: "690～730 nm",
    pairing: "搭配 B3、B4、B6，用于植被和作物多波段分析。",
    tone: "infrared"
  },
  {
    value: 6,
    label: "B6 · 红边Ⅱ",
    category: "植被与作物分析",
    description: "与红边Ⅰ共同描述植被的红边光谱变化。",
    wavelength: "730～770 nm",
    pairing: "搭配 B4、B5，保留更完整的植被光谱信息。",
    tone: "infrared"
  },
  {
    value: 7,
    label: "B7 · 紫光",
    category: "补充短波可见光",
    description: "提供短波可见光观测信息，适合需要完整光谱信息的专业分析。",
    wavelength: "400～450 nm",
    pairing: "专业多波段分析时与其他波段一起保留；自然彩色不需要此波段。",
    tone: "blue"
  },
  {
    value: 8,
    label: "B8 · 黄光",
    category: "补充地表光谱",
    description: "补充绿光与红光之间的观测信息，用于地表和植被多波段分析。",
    wavelength: "590～630 nm",
    pairing: "搭配可见光、红边及近红外波段，补充光谱特征。",
    tone: "standard"
  }
];

export const HY1C_OUTPUT_BANDS: OutputBandOption[] = [
  {
    value: "B460",
    label: "B460 · 蓝光",
    category: "自然彩色与水色",
    description: "提供蓝光观测信息，用于近岸水色观察及自然彩色合成。",
    wavelength: "中心波长 460 nm",
    pairing: "自然彩色融合使用红=B650、绿=B560、蓝=B460。",
    tone: "blue"
  },
  {
    value: "B560",
    label: "B560 · 绿光",
    category: "自然彩色与水色",
    description: "提供绿光观测信息，补充水面和地表的光谱差异。",
    wavelength: "中心波长 560 nm",
    pairing: "与 B460、B650 配合生成自然彩色；与 B825 配合观察水陆差异。",
    tone: "green"
  },
  {
    value: "B650",
    label: "B650 · 红光",
    category: "自然彩色",
    description: "提供红光观测信息，用于彩色合成及地表光谱分析。",
    wavelength: "中心波长 650 nm",
    pairing: "自然彩色搭配 B460、B560；植被相关分析搭配 B825。",
    tone: "red"
  },
  {
    value: "B825",
    label: "B825 · 近红外",
    category: "植被与水陆差异",
    description: "补充近红外信息，用于观察植被、岸线及水陆差异。",
    wavelength: "中心波长 825 nm",
    pairing: "搭配 B650 红光和 B560 绿光；普通用户可保留全部四个波段。",
    tone: "infrared"
  }
];

function mersiBand(
  value: number,
  name: string,
  purpose: string,
  wavelength: string,
  group: string,
  pairing: string
): OutputBandOption {
  return {
    value,
    label: `CH${String(value).padStart(2, "0")} · ${name}`,
    category: purpose,
    description: `用于${purpose}。`,
    wavelength: `中心波长 ${wavelength} μm`,
    pairing,
    group,
    tone:
      value >= 20
        ? "thermal"
        : value === 2
          ? "green"
          : value === 3
            ? "red"
            : value === 4
              ? "infrared"
              : "blue"
  };
}
const MERSI_WATER_COLOR_GUIDANCE =
  "配合 CH08～CH15 保留水色光谱信息；水色参数需专门算法计算。";
const MERSI_WATER_VAPOR_GUIDANCE =
  "结合其他水汽及云通道分析；输出通道不等于已反演水汽含量。";
const MERSI_THERMAL_GUIDANCE =
  "结合热红外通道分析；亮温不等于直接反演的地表或海表温度。";

export const FY3H_OUTPUT_BANDS: OutputBandOption[] = [
  mersiBand(
    1,
    "蓝光",
    "自然彩色与气溶胶",
    "0.470",
    "自然彩色与植被",
    "自然彩色融合使用红=CH03、绿=CH02、蓝=CH01。"
  ),
  mersiBand(
    2,
    "绿光",
    "自然彩色与气溶胶",
    "0.550",
    "自然彩色与植被",
    "搭配 CH01、CH03，生成自然彩色。"
  ),
  mersiBand(
    3,
    "红光",
    "自然彩色与植被",
    "0.650",
    "自然彩色与植被",
    "自然彩色搭配 CH01、CH02；植被分析搭配 CH04。"
  ),
  mersiBand(
    4,
    "近红外",
    "植被与边界观察",
    "0.865",
    "自然彩色与植被",
    "搭配 CH03 红光；近红外假彩色使用 CH04/CH03/CH02。"
  ),
  mersiBand(
    5,
    "卷云",
    "卷云观察",
    "1.38",
    "云与冰雪",
    "与可见光、热红外通道结合分析云。"
  ),
  mersiBand(
    6,
    "短波红外",
    "冰雪观察",
    "1.64",
    "云与冰雪",
    "结合可见光与近红外通道分析冰雪。"
  ),
  mersiBand(
    7,
    "短波红外",
    "气溶胶与地表观察",
    "2.13",
    "气溶胶与地表",
    "结合可见光通道分析气溶胶及地表光谱。"
  ),
  mersiBand(
    8,
    "紫光",
    "海洋水色分析",
    "0.412",
    "海洋水色",
    MERSI_WATER_COLOR_GUIDANCE
  ),
  mersiBand(
    9,
    "蓝光",
    "海洋水色分析",
    "0.443",
    "海洋水色",
    MERSI_WATER_COLOR_GUIDANCE
  ),
  mersiBand(
    10,
    "蓝光",
    "海洋水色分析",
    "0.490",
    "海洋水色",
    MERSI_WATER_COLOR_GUIDANCE
  ),
  mersiBand(
    11,
    "绿光",
    "海洋水色分析",
    "0.555",
    "海洋水色",
    MERSI_WATER_COLOR_GUIDANCE
  ),
  mersiBand(
    12,
    "红光",
    "海洋水色分析",
    "0.670",
    "海洋水色",
    MERSI_WATER_COLOR_GUIDANCE
  ),
  mersiBand(
    13,
    "红边",
    "海洋水色分析",
    "0.709",
    "海洋水色",
    MERSI_WATER_COLOR_GUIDANCE
  ),
  mersiBand(
    14,
    "红边",
    "海洋水色分析",
    "0.746",
    "海洋水色",
    MERSI_WATER_COLOR_GUIDANCE
  ),
  mersiBand(
    15,
    "近红外",
    "海洋水色分析",
    "0.865",
    "海洋水色",
    MERSI_WATER_COLOR_GUIDANCE
  ),
  mersiBand(
    16,
    "水汽",
    "大气水汽观察",
    "0.905",
    "大气水汽",
    MERSI_WATER_VAPOR_GUIDANCE
  ),
  mersiBand(
    17,
    "水汽",
    "大气水汽观察",
    "0.936",
    "大气水汽",
    MERSI_WATER_VAPOR_GUIDANCE
  ),
  mersiBand(
    18,
    "水汽",
    "大气水汽观察",
    "0.940",
    "大气水汽",
    MERSI_WATER_VAPOR_GUIDANCE
  ),
  mersiBand(
    19,
    "近红外",
    "陆地与云边界观察",
    "1.03",
    "云与冰雪",
    "结合可见光、近红外通道观察边界。"
  ),
  mersiBand(
    20,
    "中波红外",
    "地表、海表与云观察",
    "3.80",
    "热红外与火点",
    MERSI_THERMAL_GUIDANCE
  ),
  mersiBand(
    21,
    "中波红外",
    "火点观察",
    "4.05",
    "热红外与火点",
    "结合其他热红外通道分析热异常；火点识别需专门算法。"
  ),
  mersiBand(
    22,
    "红外水汽",
    "大气水汽观察",
    "7.20",
    "大气水汽",
    MERSI_WATER_VAPOR_GUIDANCE
  ),
  mersiBand(
    23,
    "热红外",
    "卷云与云辐射观察",
    "8.55",
    "云与冰雪",
    "与 CH24、CH25 配合分析云的热红外特征。"
  ),
  mersiBand(
    24,
    "热红外",
    "地表、海表与云观察",
    "10.8",
    "热红外与火点",
    MERSI_THERMAL_GUIDANCE
  ),
  mersiBand(
    25,
    "热红外",
    "地表、海表与云观察",
    "12.0",
    "热红外与火点",
    MERSI_THERMAL_GUIDANCE
  )
];

export const GF6_BAND_PRESETS: OutputBandPreset[] = [
  {
    label: "自然彩色",
    description:
      "保留蓝、绿、红三个可见光波段，用于接近人眼视觉的彩色合成和地表观察。",
    bands: [1, 2, 3]
  },
  {
    label: "基础地表观察",
    description:
      "在自然彩色波段基础上增加近红外，用于植被、岸线及水陆差异观察。",
    bands: [1, 2, 3, 4]
  },
  {
    label: "全部波段",
    description:
      "保留全部八个波段，包含红边、紫光和黄光，用于完整光谱及植被、作物多波段分析。",
    bands: GF6_OUTPUT_BANDS.map(band => band.value)
  }
];
export const HY1C_BAND_PRESETS: OutputBandPreset[] = [
  {
    label: "自然彩色",
    description:
      "保留蓝、绿、红三个可见光波段，用于自然彩色合成及近岸水面、地表观察。",
    bands: ["B460", "B560", "B650"]
  },
  {
    label: "全部波段",
    description:
      "保留全部四个波段，在自然彩色基础上补充近红外，用于植被、岸线及水陆差异观察。",
    bands: HY1C_OUTPUT_BANDS.map(band => band.value)
  }
];
export const FY3H_BAND_PRESETS: OutputBandPreset[] = [
  {
    label: "自然彩色",
    description:
      "保留蓝、绿、红三个可见光通道，用于自然彩色合成和地表、云系观察。",
    bands: [1, 2, 3]
  },
  {
    label: "植被观察",
    description:
      "在自然彩色通道基础上增加近红外，用于植被、岸线观察及近红外假彩色合成。",
    bands: [1, 2, 3, 4]
  },
  {
    label: "海洋水色",
    description:
      "保留海洋水色专用的可见光通道，用于海面水色和近岸水体光谱差异分析。",
    bands: [8, 9, 10, 11, 12, 13, 14, 15]
  },
  {
    label: "云与水汽",
    description:
      "保留卷云、水汽和热红外相关通道，用于云系、大气水汽及云顶热辐射差异观察。",
    bands: [5, 16, 17, 18, 19, 22, 23, 24, 25]
  },
  {
    label: "热红外",
    description: "保留中长波红外通道，用于地表与云的热辐射差异及火点相关分析。",
    bands: [20, 21, 22, 23, 24, 25]
  },
  {
    label: "全部通道",
    description:
      "保留全部二十五个通道，覆盖可见光、近红外、水汽和热红外，适合综合多光谱分析。",
    bands: FY3H_OUTPUT_BANDS.map(band => band.value)
  }
];

export const FY4B_SOURCE_DESCRIPTIONS: Record<
  string,
  { label: string; description: string }
> = {
  C02_REFLECTANCE_500M: {
    label: "C02 · 红光反射率 · 500 m",
    description:
      "观察地表、植被及云的可见光差异，适合白天影像的局部对比度检测。"
  },
  C03_REFLECTANCE_1000M: {
    label: "C03 · 近红外反射率 · 1 km",
    description: "补充植被及水陆差异信息，检测近红外观测中的局部变化。"
  },
  C13_BRIGHTNESS_TEMPERATURE_4000M: {
    label: "C13 · 热红外亮温 · 4 km",
    description: "观察地表与云的热辐射差异。亮温不是直接反演的地表温度。"
  },
  toa_nir_red_nd: {
    label: "近红外—红光归一化差异",
    description:
      "由 C03 与 C02 计算的差异指标。需要先启用对应特征；不是地物分类结果。"
  },
  btd_c13_c14: {
    label: "C13—C14 · 热红外亮温差",
    description:
      "比较两个热红外通道的亮温差异。需要先启用对应特征；不是直接的温度变化量。"
  }
};

export function bandsForPreset(
  preset: OutputBandPreset,
  bands: readonly OutputBandOption[]
) {
  return preset.bands.filter(value => bands.some(band => band.value === value));
}

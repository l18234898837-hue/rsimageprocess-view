export const MOD_TYPE = {
  ORIGINAL: 1, //原始数据
  ALGORITHM: 2, //算法计算过后的数据
  ONLINE: 3 //在线数据
};
export const DATA_TYPE = {
  Grid: 1, //栅格
  Vec: 2, //矢量
  Windy: 3, //风场
  Image: 4 //叠图
};

export interface Data {
  /**
   * 资源ID
   */
  id: string;
  /**
   * 资源名称
   */
  name: string;
  /**
   * 资源类型：1-栅格，2-矢量，3-流场，4-贴图
   */
  type: number;
  /**
   * 数据生产日期
   */
  productTime: Date;
  /**
   * 最小经度
   */
  lngMin: number;
  /**
   * 最大经度
   */
  lngMax: number;
  /**
   * 最小纬度
   */
  latMin: number;
  /**
   * 最大纬度
   */
  latMax: number;
  dataType: number;
  checked?: boolean;
  fields?: string;
  collection: any;
  startTime?: string;
  endTime?: string;
  featureCount?: number;
  metaData: string;
}

export interface Algorithm {
  id: number;
  name: string;
  aliasName?: string;
  supportTypes?: string;
  copyright?: string;
  deployDate?: Date;
  icon?: string;
  count: number;
  keyWord1?: string;
  keyWord2?: string;
  status?: string;
  tilePath?: string;
  formId?: number;
  minZoom: number;
  maxZoom: number;
}

export interface FormInfo {
  formId: number;
  formName: string;
  content: string;
}
export interface Style {
  name: string;
  type: string;
  value: number;
  defaultValue: number;
  minValue: number;
  maxValue: number;
}
export interface Layer {
  /**
   * 图层ID
   */
  id: string;
  /**
   * 图层类型：1-栅格，2-矢量，3-流场，4-贴图
   */
  type: number;
  dataType?: number;
  /**
   * 图层名称
   */
  name: string;
  /**
   * 是否显示
   */
  show: boolean;
  /**
   * 图层索引顺序
   */
  idx: number;
  /**
   * 添加到地图的图层
   */
  layer: object;
  /**
   * 模式：1-原始数据，2-算法计算后的数据
   */
  mod: number;
  /**
   * 当模式为算法计算后的数据时，对应的算法ID
   */
  algorithm?: Algorithm;
  /**
   * 资源数据数组
   */
  dataList: Array<Data>;
  /**
   * 额外参数
   */
  params: any;
  styles?: Array<Style>;
  legend?: Legend;
  lngMin: number;
  lngMax: number;
  latMin: number;
  latMax: number;
  url?: string;
  onlineType?: string;
  collectionLayers?: any[];
  checkedLayerName?: string;
  minZoom?: number;
  maxZoom?: number;
}

export interface Legend {
  field: string;
  hasTwoField: boolean;
  twoField?: string;
  type: number; //配色类型：1-栅格波段组合,2-栅格单波段唯一值,3-栅格单波段分级,4-矢量属性唯一值,5-矢量属性分级
  bands?: Array<string>; //波段组合数组
  legendList?: Array<{
    value: string;
    label: string;
    color: string;
    active: boolean;
    expand: boolean;
    children: Array<{ label: string; value: string; active: boolean }>;
    field: string;
  }>; //配色列表
}

export const EVENT_TYPE = {
  addOriginalLayer: "1",
  addSingleAlgorithmLayer: "2",
  addComparisonAlgorithmLayer: "3",
  addOnlineLayer: "4"
};

import tdtmap from "@/libs/tdtmap";
import { nextTick } from "vue";
import * as Cesium from "cesium";
import dayjs from "dayjs";
import {
  type Layer,
  type Data,
  DATA_TYPE,
  MOD_TYPE,
  type Legend
} from "@/components/LayerList/layers";
import { getEnabledLegend } from "@/api/dataSource/legend";
import { ElMessage } from "element-plus";
import { cloneDeep } from "@pureadmin/utils";
import { useLayerStore } from "@/store/modules/layer";
import { imageProxy } from "@/api/imageProxy";
import { wgs84ToGcj20 } from "@/api/dataSource/panel/loal";
import CesiumWind from "@/components/Map/utils/cesium-wind.esm.js";
// import { storeToRefs } from "pinia";

const store = useLayerStore();
// const { layerList } = storeToRefs(store);
const { VITE_API_PATH, VITE_MAPSOURE_PATH } = import.meta.env;
/** 当前帧高亮（Cesium rectangle outlineWidth>1 会渲染成双线） */
export const ONLINE_FRAME_HIGHLIGHT = {
  height: 0,
  selectedOutlineWidth: 1
};

const isOnlineImageOnMap = (id: string | number) =>
  tdtmap.getOnlineImageLayers().some((item: any) => item.id == id);

const isLocalImageOnMap = (id: string | number) =>
  tdtmap.getLocalImageLayers().some((item: any) => item.id == id);
const styleTools = [
  {
    name: "透明度",
    type: "alpha",
    value: 100,
    defaultValue: 100,
    minValue: 0,
    maxValue: 100
  },
  {
    name: "对比度",
    type: "contrast",
    value: 100,
    defaultValue: 100,
    minValue: 0,
    maxValue: 200
  },
  {
    name: "亮度",
    type: "brightness",
    value: 100,
    defaultValue: 100,
    minValue: 0,
    maxValue: 200
  },
  {
    name: "色调",
    type: "hue",
    value: 0,
    defaultValue: 0,
    minValue: 0,
    maxValue: 360
  },
  {
    name: "饱和度",
    type: "saturation",
    value: 100,
    defaultValue: 100,
    minValue: 0,
    maxValue: 200
  },
  {
    name: "伽马值",
    type: "gamma",
    value: 100,
    defaultValue: 100,
    minValue: 0,
    maxValue: 200
  }
];

//使图片背景透明
const removeBackground = async (url: string) => {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  const img = new Image();
  img.crossOrigin = "Anonymous"; //
  img.src = url;

  //检查设备支持的最大纹理大小，防止因设备性能问题导致的页面崩溃
  const driverCanvas = document.createElement("canvas");
  const gl = driverCanvas.getContext("webgl");
  const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
  // console.log(maxTextureSize);

  //需要去除的背景颜色
  const rgba = [0, 0, 0, 255];
  // const rgba = [255, 255, 255, 255];
  // 容差大小
  const tolerance = 60;
  const [r0, g0, b0, a0] = rgba;
  let r, g, b, a;
  return await new Promise(resolve => {
    img.onload = () => {
      canvas.width = img.width <= maxTextureSize ? img.width : maxTextureSize;
      canvas.height =
        img.height <= maxTextureSize ? img.height : maxTextureSize;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      // console.log("imgData", imgData);

      for (let i = 0; i < imgData.data.length; i += 4) {
        r = imgData.data[i];
        g = imgData.data[i + 1];
        b = imgData.data[i + 2];
        a = imgData.data[i + 3];
        const t = Math.sqrt(
          (r - r0) ** 2 + (g - g0) ** 2 + (b - b0) ** 2 + (a - a0) ** 2
        );
        if (t <= tolerance) {
          imgData.data[i] = 0;
          imgData.data[i + 1] = 0;
          imgData.data[i + 2] = 0;
          imgData.data[i + 3] = 0;
        }
      }
      ctx.putImageData(imgData, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
  });
};

/**
 * 查询对应的配色方案
 * @param layer
 * @private
 */
const showLegend = async (layer: Layer): Promise<Legend | undefined> => {
  const res = await getEnabledLegend({
    type: layer.mod,
    id:
      layer.mod === MOD_TYPE.ORIGINAL
        ? layer.dataList[0].id
        : layer.algorithm.id
  });
  if (!res.data) {
    ElMessage.warning({
      message:
        "【" +
        (layer.mod === MOD_TYPE.ORIGINAL
          ? layer.dataList[0].name + "资源"
          : layer.algorithm.name + "算法") +
        "】还没配色，请先配色"
    });
    return null;
  } else {
    const legend: Legend = res.data;
    /*bus.emit("showLegend", {
      layer,
      legend
    });*/
    return legend;
  }
};
export const focusOnlineFrameLayer = (data: any) => {
  const selectedHeight = data.height ?? ONLINE_FRAME_HIGHLIGHT.height;
  const selectedOutlineWidth =
    data.outlineWidth ?? ONLINE_FRAME_HIGHLIGHT.selectedOutlineWidth;
  tdtmap.applyOnlineFootprintStyle(data.id, {
    selectedHeight,
    selectedOutlineWidth
  });
  tdtmap.bringOnlineImageLayerToTop(data.id);
};
let layer = null;
const addMapMarker = async (data: any) => {
  // console.log(data);
  await nextTick();

  const isSeclet = data.isSeclet || false;
  const viewer = tdtmap.getViewer();
  const isOnlineThumb = !data.type && data.mod === MOD_TYPE.ONLINE;
  const isLocalThumb = !!data.type;
  if (isOnlineThumb && isSeclet) {
    focusOnlineFrameLayer(data);
  } else if (isLocalThumb && isSeclet) {
    focusLocalFrameLayer(data);
  }
  // if (layer) viewer.imageryLayers.remove(layer, false);
  // 清除绘制的矩形，圆形，多边形
  // debugger;
  tdtmap.clearDrawEntity();
  if (isOnlineImageOnMap(data.id)) {
    if (isSeclet) focusOnlineFrameLayer(data);
    return;
  }
  if (isLocalImageOnMap(data.id)) {
    if (isSeclet) focusLocalFrameLayer(data);
    return;
  }

  const gcj20Min: any = await wgs84ToGcj20({
    lng: Number(data.lngMin),
    lat: Number(data.latMin)
  });
  const gcj20Max: any = await wgs84ToGcj20({
    lng: Number(data.lngMax),
    lat: Number(data.latMax)
  });

  // data.onlineType
  //   ? false
  //   : viewer.camera.flyTo({
  //       destination: Cesium.Rectangle.fromDegrees(
  //         Number(gcj20Min.data.lng),
  //         Number(gcj20Min.data.lat),
  //         Number(gcj20Max.data.lng),
  //         Number(gcj20Max.data.lat)
  //       ),
  //       duration: 1
  //     });

  const url = data.type
    ? data.url
    : data.onlineType && data.onlineType == "Landsat"
      ? data.url
      : ((await imageProxy(data.url)) as any);
  layer = viewer.imageryLayers.addImageryProvider(
    new Cesium.SingleTileImageryProvider({
      url: (await removeBackground(url)) as string,
      // url: url,
      rectangle: Cesium.Rectangle.fromDegrees(
        Number(gcj20Min.data.lng),
        Number(gcj20Min.data.lat),
        Number(gcj20Max.data.lng),
        Number(gcj20Max.data.lat)
      )
    })
  );
  if (data.type) {
    tdtmap.addLocalImageLayers({
      layerInfo: layer,
      id: data.id,
      level: data.dataList[0].level,
      productTime: dayjs(data.dataList[0].productTime).format("YYYY-MM-DD")
    });
    if (isSeclet) {
      focusLocalFrameLayer(data);
    }
  } else {
    tdtmap.addImageLayers({ layer, id: data.id, name: data.name });
    if (isOnlineThumb && isSeclet) {
      focusOnlineFrameLayer(data);
    }
  }
};

const addLayer = async (
  layer: Layer,
  url?: any,
  type?: string,
  isSeclet?: boolean
) => {
  // debugger;
  if (layer.mod == MOD_TYPE.ORIGINAL || layer.mod == MOD_TYPE.ALGORITHM) {
    // console.log(url)
    if (url) {
      addMapMarker({ ...layer, url, type, isSeclet });
      return;
    }
    const legend = await showLegend(layer);
    if (legend) {
      layer.styles = cloneDeep(styleTools);
      layer.legend = legend;
      store.legendData = legend;
      await store.addLayer(layer);
    }
  } else {
    if (url) {
      addMapMarker({ ...layer, url, type, isSeclet });
      return;
    }
    layer.styles = cloneDeep(styleTools);
    await store.addLayer(layer);
  }
};

const setUrlByLayer = (layer: any, url?: string) => {
  if (url) {
  }
  if (layer.mod == MOD_TYPE.ONLINE) {
    const collectionLayer = layer.collectionLayers.filter(
      ly => ly.name == layer.checkedLayerName
    )[0];
    const data = layer.dataList[0];
    const datetime = data.productTime;
    const startTime = dayjs(datetime.getTime() - 24 * 3600 * 1000).format(
      "YYYY-MM-DD"
    );
    const endTime = dayjs(datetime.getTime() + 24 * 3600 * 1000).format(
      "YYYY-MM-DD"
    );
    data.startTime = startTime;
    data.endTime = endTime;
    //查询配置的图层
    layer.url = `${VITE_API_PATH}/algorithm/sentinel/wmts?id=${layer.id}&api=${collectionLayer.api}&instanceId=66c66680-ecbe-480b-83a2-e9ea92e41c74&layerId=${collectionLayer.layerId}&tileMatrix={z}&tileRow={y}&tileCol={x}&startTime=${startTime}&endTime=${endTime}&format=${collectionLayer.imageType}`;
  } else {
    layer.params.dataList = layer.dataList;
    // const pm = Base64.encode(JSON.stringify(layer.params));
    // layer.url = `${VITE_API_PATH}/algorithm/grid/tile?id=${layer.id}&zoom={z}&row={y}&col={x}`;
    layer.url = `${VITE_MAPSOURE_PATH}/tile/{z}/{y}/{x}?id=${layer.id}&algorithm=single`;
    // layer.url = `${VITE_API_PATH}/algorithm/grid/tile?id=${layer.id}&zoom={z}&row={y}&col={x}&pm=${pm}`;
  }
};
/**
 * 检查图层是否已经添加
 * @param id 图层id
 */
// const checkRepeat = (id: string) => {
//   for (let i = 0; i < layerList.value.length; i++) {
//     if (layerList.value[i].id === id) {
//       // ElMessage({
//       //   message:
//       //     "图层【" + layerList.value[i].name + "】已经存在，请勿重复添加",
//       //   type: "warning",
//       //   duration: 5 * 1000
//       // });
//       return false;
//     }
//   }
//   return true;
// };

/**
 * 添加本地资源图层
 * @param data
 */
const addOriginalLayer = async (
  data: any,
  url?: any,
  type?: string,
  isSeclet?: boolean
) => {
  // debugger;
  // console.log(data);
  // tdtmap.removeAllLayer();
  const layerId = data.id;
  // if (!checkRepeat(layerId)) return;
  // layerShow.value = true;
  const layer: any = {
    id: layerId,
    name: data.name,
    type: data.type,
    dataType: data.dataType,
    show: true,
    minLevel: data.minLevel,
    maxLevel: data.maxLevel,
    metaData: JSON.parse(data.metaData),
    dataList: [data],
    params: {},
    mod: MOD_TYPE.ORIGINAL,
    lngMin: data.lngMin,
    lngMax: data.lngMax,
    latMin: data.latMin,
    latMax: data.latMax
  };
  setUrlByLayer(layer, url);
  await addLayer(layer, url, type, isSeclet);
  store.registerLayer(layer);
  store.setRemoteThematicRows([
    {
      id: data.id,
      name: data.name,
      thumbUrl: url,
      productTime: data.productTime
    }
  ]);
  // console.log("layer", layer);
  // console.log("legendList", store.legendData.legendList);
};

const defaultParticleParams: any = {
  lineWidth: 3,
  velocityScale: 1 / 200, // maxAge: 90,
  paths: 5000
};

/** 本地选中帧：抬高 footprint + 高亮 + 影像置顶 */
export const focusLocalFrameLayer = (data: any) => {
  // debugger;
  const selectedHeight = data.height ?? ONLINE_FRAME_HIGHLIGHT.height;
  const selectedOutlineWidth =
    data.outlineWidth ?? ONLINE_FRAME_HIGHLIGHT.selectedOutlineWidth;
  tdtmap.applyLocalFootprintStyle(data.id, {
    selectedHeight,
    selectedOutlineWidth
  });
  tdtmap.bringLocalImageLayerToTop(data.id);
};
/**
 * 添加风场图层
 * @param data 风场数据
 */
const addWindLayer = async (data: any) => {
  tdtmap.removeWindLayer();
  // debugger
  // const res = await $http.getUVJSON({
  //   file_path: config.geojson
  // });
  // let windData = eval(res);
  console.log("windData", data); // // const res = await axios.get(
  // //   "/testData/NFP_HY_4_2025053003_20250602_3h_500m_003-uv_uv_0_geojson.json",
  // // );
  // // debugger;
  // // let windData = eval(res.data);
  let windLayer: any;
  let windOptions = {
    colorScale: [
      // "rgb(4,14,216)",
      // "rgb(32,80,255)",
      // "rgb(65,150,255)",
      // "rgb(109,193,255)",
      // "rgb(134,217,255)",
      // "rgb(156,238,255)",
      // "rgb(175,245,255)",
      // "rgb(206,255,255)",
      // "rgb(255,254,71)",
      // "rgb(255,235,0)",

      // "rgb(255,196,0)",
      // "rgb(255,144,0)",
      // "rgb(255,72,0)",
      // "rgb(255,0,0)",
      // "rgb(213,0,0)",
      // "rgb(158,0,0)",

      "rgb(255, 255,255)"
    ], // 粒子颜色配置 海流速度慢 过度效果要好
    frameRate: 16, //帧率（ms）
    maxAge: 90, //粒子路径能够生成的最大帧数
    globalAlpha: 0.9, //全局透明度，主要影响粒子路径拖尾效果
    // lineWidth: 3, //粒子路径宽度
    lineWidth: defaultParticleParams.lineWidth, // velocityScale: 1 / 90, //   速度级别
    // velocityScale: 1 / 200, //   速度级别

    velocityScale: defaultParticleParams.velocityScale, // paths: 5000, //生成的粒子路径数量

    paths: defaultParticleParams.paths, // paths: 8000, //生成的粒子路径数量
    generateParticleOption: true,
    minVelocity: 0, // 最小风速  单位 m/s
    maxVelocity: 10 // 最大风速  单位 m/s
  };
  windLayer = new CesiumWind([data[0], data[1]], { windOptions });
  windLayer.addTo(tdtmap.getViewer());
};

/**
 * 添加在线资源图层
 * @param data
 */
const addOnlineLayer = async (
  data,
  collection,
  url?: any,
  isSeclet?: boolean
) => {
  const layerId = data.id;
  data.collection = collection;
  // if (!checkRepeat(layerId)) return;
  const layer: Layer = {
    id: layerId,
    type: DATA_TYPE.Grid,
    onlineType: data.sensor,
    // dataType: collection.dataType,
    name: data.id,
    show: true,
    layer: undefined,
    mod: MOD_TYPE.ONLINE,
    dataList: [
      {
        id: data.id,
        name: data.id,
        type: DATA_TYPE.Grid,
        // productTime: new Date(data.properties.datetime),
        lngMin: Number(data.bbox[0]),
        lngMax: Number(data.bbox[1]),
        latMin: Number(data.bbox[2]),
        latMax: Number(data.bbox[3]),
        // dataType: collection.dataType,
        collection: collection
      }
    ] as Data[],
    params: {},
    idx: 0,
    lngMin: Number(data.bbox[0]),
    lngMax: Number(data.bbox[1]),
    latMin: Number(data.bbox[2]),
    latMax: Number(data.bbox[3])
    // collectionLayers: layers,
    // checkedLayerName: layers[0].name
  };
  // setUrlByLayer(layer, url);
  await addLayer(layer, url, undefined, isSeclet);
};

export { addOriginalLayer, addWindLayer, addOnlineLayer, removeBackground };

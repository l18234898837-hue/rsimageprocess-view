<template>
  <div class="map-container rounded-[5px]">
    <div class="map-inner rounded-[5px]">
      <!--<CesiumViewer />-->
      <div
        id="cesiumMap"
        class="map rounded-[5px]"
        :style="{
          display: userToken ? 'flex' : 'none'
        }"
      >
        <rolling-drag />
        <map-toolbar />
        <map-analysis-context-menu
          ref="analysisMenuRef"
          @select="handleAnalysisPick"
          @close="onAnalysisMenuClose"
        />
        <time-seq-chart-bubble
          :visible="analysisChartVisible"
          :lng="pickedLng"
          :lat="pickedLat"
          :analysis-data="analysisData"
          @close="onAnalysisChartClose"
        />
      </div>
    </div>
    <div
      v-if="layerName"
      :class="[
        'absolute left-[50%] top-[100px]',
        'bg-[#000] p-[5px] px-[10px] rounded-md',
        'bg-opacity-25 text-white text-[16px] translate-x-[-50%]',
        'cursor-pointer select-none',
        'hover:bg-opacity-40 transition-all duration-300 ease-in-out'
      ]"
    >
      {{ layerName }}
    </div>
    <map-legend />
    <time-sequence />

    <!-- <time-line /> -->
    <!-- <echarts-dom
      v-model="analysisDialogVisible"
      :lng="pickedLng"
      :lat="pickedLat"
      :analysis-data="analysisData"
    /> -->
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from "vue";
import * as Cesium from "cesium";
import MapLegend from "@/components/Map/mapLegend.vue";
import MapToolbar from "@/components/Map/mapToolbar.vue";
import RollingDrag from "@/components/Map/rollingDrag.vue";
import {
  getThumbJpg,
  wgs84ToGcj20,
  gcj20ToWgs84
} from "@/api/dataSource/panel/loal";
import { getTimeSeqPoint, getTimeSeqRect } from "@/api/dataSource/instrument";
import map from "@/libs/tdtmap";
import { useNav } from "@/layout/hooks/useNav";
import { useLayerStoreHook } from "@/store/modules/layer";
import { addOriginalLayer } from "@/utils/addOriginalLayer";
import bus from "@/utils/bus";
import { imgStreamToBase64 } from "@/utils/imgToBase64";
import { message } from "@/utils/message";
import EchartsDom from "./echartsDom.vue";
import TimeSequence from "./TimeSequence.vue";
import MapAnalysisContextMenu from "./MapAnalysisContextMenu.vue";
import TimeSeqChartBubble from "./TimeSeqChartBubble.vue";
const analysisMenuRef = ref<InstanceType<typeof MapAnalysisContextMenu> | null>(
  null
);
const analysisChartVisible = ref(false);
let geometry: {
  type: string;
  wkt?: string;
  center?: { wkt: string };
  radius?: number;
  rectanglePoints?: { lng: number; lat: number }[];
} | null = null;
const layerStore = useLayerStoreHook();
const { userToken } = useNav();

const layerName = ref("");
const pickedLng = ref<number | null>(null);
const pickedLat = ref<number | null>(null);
const pickedRectanglePoints = ref<Array<{ lng: number; lat: number }>>([]);
const analysisDialogVisible = ref(false);
const analysisModeVisible = ref(false);
const analysisData = ref<any[]>([]);
const analysisPickMode = ref<"point" | "rectangle">("point");

const stopPickPointMode = () => {
  map.cancelActiveDraw();
  const viewer = map.getViewer();
  const el = viewer?.container as HTMLElement | undefined;
  if (el) {
    el.style.cursor = "";
  }
  viewer.scene.screenSpaceCameraController.enableRotate = true;
  viewer.scene.screenSpaceCameraController.enableTranslate = true;
};
const getLayerIds = () => {
  return layerStore.layerList
    .map(item => String(item.id ?? ""))
    .filter(id => !!id);
};
// const startPickPointMode = () => {
//   stopPickPointMode();
//   map.cancelActiveDraw();
//   pickedLng.value = null;
//   pickedLat.value = null;
//   pickedRectanglePoints.value = [];
//   message("请点击数据区域获取经纬度", { type: "info" });

//   const viewer = map.getViewer();
//   if (!viewer?.scene?.canvas) return;

//   (viewer.container as HTMLElement).style.cursor = "crosshair";
//   map.pickPoint(
//     point => {
//       pickedLng.value = point.lng;
//       pickedLat.value = point.lat;

//       stopPickPointMode();
//       const params = {
//         ids: layerStore.layerList.map(i => i.id).join(","),
//         lat: pickedLat.value,
//         lon: pickedLng.value
//       };
//       const res = getTimeSeqPoint(params);
//       if (res.code === 200) {
//         console.log(res, 555);
//       }

//       analysisDialogVisible.value = true;
//     },
//     {
//       onCancel: () => {
//         const el = viewer?.container as HTMLElement | undefined;
//         if (el) {
//           el.style.cursor = "";
//         }
//       }
//     }
//   );
// };

watch(analysisDialogVisible, visible => {
  if (!visible) {
    map.cancelActiveDraw();
  }
});

// const startPickRectangleMode = () => {
//   stopPickPointMode();
//   map.cancelActiveDraw();
//   pickedLng.value = null;
//   pickedLat.value = null;
//   pickedRectanglePoints.value = [];
//   message("请先点击矩形左上角，再移动鼠标实时预览，最后点击右下角完成", {
//     type: "info"
//   });

//   const viewer = map.getViewer();
//   if (!viewer?.scene?.canvas) return;

//   (viewer.container as HTMLElement).style.cursor = "crosshair";
//   map.drawRectangle(
//     (_wkt, _geojson, rectanglePoints = []) => {
//       pickedRectanglePoints.value = rectanglePoints;
//       const el = viewer?.container as HTMLElement | undefined;
//       if (el) {
//         el.style.cursor = "";
//       }
//       analysisDialogVisible.value = true;
//     },
//     {
//       onCancel: () => {
//         const el = viewer?.container as HTMLElement | undefined;
//         if (el) {
//           el.style.cursor = "";
//         }
//       }
//     }
//   );
// };
const clearHandle = () => {
  map.clearDrawEntity();
  if (geometry) {
    geometry = null;
  }
};
const onAnalysisMenuClose = () => {
  analysisChartVisible.value = false;
  clearHandle();
  pickedLng.value = null;
  pickedLat.value = null;
};
// 写一个转换坐标的方法
const convertCoordinates = async (lng: number, lat: number) => {
  const wgs84: any = await gcj20ToWgs84({
    lng: Number(lng),
    lat: Number(lat)
  });
  return {
    lng: Number(wgs84.data.lng),
    lat: Number(wgs84.data.lat)
  };
};
const onAnalysisChartClose = () => {
  analysisChartVisible.value = false;
  analysisData.value = [];
  clearHandle();
};
const hideAnalysisMenu = () => {
  analysisMenuRef.value?.hide();
};

const resetMapAnalysisUI = () => {
  hideAnalysisMenu();
  analysisChartVisible.value = false;
  analysisData.value = [];
  pickedLng.value = null;
  pickedLat.value = null;
  map.cancelActiveDraw();
  clearHandle();
};
const handleAnalysisPick = (mode: "point" | "rectangle") => {
  if (layerStore.layerList.length <= 0) {
    message("请先加载数据", { type: "warning" });
    hideAnalysisMenu();
    return;
  }
  map.clearDrawEntity();
  const pickDone = () => {
    hideAnalysisMenu();
  };
  if (mode === "point") {
    analysisChartVisible.value = false;
    pickedLng.value = null;
    pickedLat.value = null;
    message("请选择数据点位，右键取消", { type: "info" });
    map.drawPoint(
      async ({ lng, lat }) => {
        pickedLng.value = lng;
        pickedLat.value = lat;

        analysisDialogVisible.value = false;
        const { lng: convertedLng, lat: convertedLat } =
          await convertCoordinates(lng, lat);
        await requestTimeSeqByPoint(convertedLng, convertedLat);
        analysisChartVisible.value = true;
      },
      {
        onInvalidPick: () => {
          message("请点击地图有效区域", { type: "warning" });
        },
        onCancel: pickDone,
        onComplete: pickDone
      }
    );
    return;
  } else {
    message("左键拖对角线画矩形，再次左键确认，右键取消", { type: "info" });
    map.drawRectangle(
      async (wkt, _geojson, rectanglePoints) => {
        const convertedPoints = await Promise.all(
          rectanglePoints.map(({ lng, lat }) => convertCoordinates(lng, lat))
        );
        geometry = {
          type: "rectangle",
          wkt,
          rectanglePoints: convertedPoints
        };
        requestTimeSeqByRect(convertedPoints);
      },
      {
        onCancel: pickDone,
        onComplete: pickDone
      }
    );
  }
};
const requestTimeSeqByPoint = (lon: number, lat: number) => {
  const ids = getLayerIds();
  const data = ids.map(id => ({
    ids: [id],
    lon,
    lat
  }));
  if (!data.length) {
    message("未找到图层ID", { type: "warning" });
    return;
  }
  getTimeSeqPoint({ ids, lon, lat }).then(res => {
    analysisData.value = Array.isArray(res?.data) ? res.data : [];
    analysisChartVisible.value = true;
    analysisDialogVisible.value = false;
  });
};
const requestTimeSeqByRect = (
  rectanglePoints: { lng: number; lat: number }[]
) => {
  const ids = getLayerIds();
  if (!ids.length) {
    message("未找到图层ID", { type: "warning" });
    return;
  }
  if (!rectanglePoints?.length) {
    message("矩形坐标为空", { type: "warning" });
    return;
  }
  const lons = rectanglePoints.map(item => item.lng);
  const lats = rectanglePoints.map(item => item.lat);
  getTimeSeqRect({
    ids,
    minLon: Math.min(...lons),
    maxLon: Math.max(...lons),
    minLat: Math.min(...lats),
    maxLat: Math.max(...lats)
  }).then(res => {
    analysisData.value = Array.isArray(res?.data) ? res.data : [];
    analysisDialogVisible.value = true;
  });
};
// const onHandlePick = (type: unknown) => {
//   const pickType = type as "point" | "rectangle";
//   if (pickType !== "point" && pickType !== "rectangle") return;
//   handleAnalysisPick(pickType);
// };

const onHandleAnalysis = (checked?: boolean) => {
  if (layerStore.layerList.length <= 0) {
    message("请先加载数据", { type: "warning" });
    return;
  }
  analysisModeVisible.value = !checked;
  if (!analysisModeVisible.value) {
    stopPickPointMode();
    map.cancelActiveDraw();
  }
};

const mapInfo = ref<{ level: number; lng: number; lat: number }>({
  level: 0,
  lng: 0,
  lat: 0
});

const loadData = async () => {
  const st = history.state as Record<string, unknown>;

  let list: unknown[] = [];
  const rawList = st.layerList;
  if (rawList && rawList !== "undefined") {
    try {
      list = JSON.parse(String(rawList));
    } catch {
      list = [];
    }
  }

  const isRoll = st.isRoll === true;
  if (Array.isArray(list) && list.length === 2 && isRoll) {
    bus.emit("showLeftPanel", false);
    layerName.value = "";
    bus.emit("openRollingCompare", {
      left: list[0],
      right: list[1]
    });
    return;
  }

  const viewer = map.getViewer();

  if (Array.isArray(list) && list.length >= 2) {
    bus.emit("showLeftPanel", false);
    layerName.value = list
      .map(raw => {
        const d = raw as Record<string, unknown>;
        const n = d.name ?? d.layerName;
        return typeof n === "string" ? n.trim() : "";
      })
      .filter(Boolean)
      .join("、");
    let west = Infinity;
    let south = Infinity;
    let east = -Infinity;
    let north = -Infinity;
    for (const raw of list) {
      const data = raw as Record<string, unknown>;
      let thumb = data.thumbUrl as string | undefined;
      if (!thumb) {
        const res = await getThumbJpg(data.id);
        thumb = await imgStreamToBase64(res.data);
      }
      addOriginalLayer(data, thumb, "local");
      const gcj20Min: any = await wgs84ToGcj20({
        lng: Number(data.lngMin),
        lat: Number(data.latMin)
      });
      const gcj20Max: any = await wgs84ToGcj20({
        lng: Number(data.lngMax),
        lat: Number(data.latMax)
      });
      const w = Math.min(Number(gcj20Min.data.lng), Number(gcj20Max.data.lng));
      const e = Math.max(Number(gcj20Min.data.lng), Number(gcj20Max.data.lng));
      const s = Math.min(Number(gcj20Min.data.lat), Number(gcj20Max.data.lat));
      const n = Math.max(Number(gcj20Min.data.lat), Number(gcj20Max.data.lat));
      west = Math.min(west, w);
      east = Math.max(east, e);
      south = Math.min(south, s);
      north = Math.max(north, n);
    }
    viewer.camera.flyTo({
      destination: Cesium.Rectangle.fromDegrees(west, south, east, north),
      duration: 1
    });
    return;
  }

  if (!st.layer || st.layer == "undefined") return;
  bus.emit("showLeftPanel", false);
  const data = JSON.parse(String(st.layer));
  layerName.value = data.name;

  if (data.thumbUrl) {
    addOriginalLayer(data, data.thumbUrl, "local");
  } else {
    const res = await getThumbJpg(data.id);
    const url = await imgStreamToBase64(res.data);
    addOriginalLayer(data, url, "local");
  }

  const gcj20Min: any = await wgs84ToGcj20({
    lng: Number(data.lngMin),
    lat: Number(data.latMin)
  });
  const gcj20Max: any = await wgs84ToGcj20({
    lng: Number(data.lngMax),
    lat: Number(data.latMax)
  });

  viewer.camera.flyTo({
    destination: Cesium.Rectangle.fromDegrees(
      Number(gcj20Min.data.lng),
      Number(gcj20Min.data.lat),
      Number(gcj20Max.data.lng),
      Number(gcj20Max.data.lat)
    ),
    duration: 1
  });
};

onMounted(async () => {
  map.init({
    eleId: "cesiumMap",
    type: "img",
    showAnnotation: true,
    info: (level, lng, lat) => {
      if (level) {
        mapInfo.value.level = level;
      }
      if (lng) {
        mapInfo.value.lng = lng;
      }
      if (lat) {
        mapInfo.value.lat = lat;
      }
    }
  });
  loadData();
  // bus.on("handlePick", onHandlePick);
  bus.on("hideMapAnalysis", resetMapAnalysisUI);
});

onUnmounted(() => {
  stopPickPointMode();
  map.cancelActiveDraw();
  // bus.off("handlePick", onHandlePick);
  bus.off("hideMapAnalysis", resetMapAnalysisUI);
  layerStore.clearAllLayers();
});
</script>

<style lang="less" scoped>
#cesiumMap {
  position: relative;
}

.map-container {
  position: relative;
  overflow: hidden;
  flex: 1;

  .map-inner {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    overflow: hidden;
    display: flex;
    justify-content: center;
    align-items: center;

    .map {
      width: 100%;
      height: 100%;
    }

    img {
      max-width: 100%;
    }
  }
}
</style>

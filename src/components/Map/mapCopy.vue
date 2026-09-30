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
    <echarts-dom
      v-model="analysisDialogVisible"
      :lng="pickedLng"
      :lat="pickedLat"
      :rectangle-points="pickedRectanglePoints"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, onUnmounted, watch } from "vue";
import MapToolbar from "@/components/Map/mapToolbar.vue";
import MapLegend from "@/components/Map/mapLegend.vue";
import RollingDrag from "@/components/Map/rollingDrag.vue";
import TimeSequence from "./TimeSequence.vue";
import EchartsDom from "./echartsDom.vue";
import * as Cesium from "cesium";
import map from "@/libs/tdtmap";
import bus from "@/utils/bus";
import { getThumbJpg } from "@/api/dataSource/panel/loal";
import { imgStreamToBase64 } from "@/utils/imgToBase64";
import { addOriginalLayer } from "@/utils/addOriginalLayer";
import { wgs84ToGcj20 } from "@/api/dataSource/panel/loal";
import { useLayerStoreHook } from "@/store/modules/layer";
import { getTimeSeqPoint, getTimeSeqRect } from "@/api/dataSource/instrument";
const layerStore = useLayerStoreHook();

import { useNav } from "@/layout/hooks/useNav";
const { userToken } = useNav();
import { message } from "@/utils/message";
const layerName = ref("");
const pickedLng = ref<number | null>(null);
const pickedLat = ref<number | null>(null);
const pickedRectanglePoints = ref<Array<{ lng: number; lat: number }>>([]);
const analysisDialogVisible = ref(false);
const analysisModeVisible = ref(false);
const analysisPickMode = ref<"point" | "rectangle">("point");
let pickHandler: Cesium.ScreenSpaceEventHandler | null = null;
let rectangleEntity: Cesium.Entity | null = null;

const clearAnalysisShape = () => {
  const viewer = map.getViewer();
  if (rectangleEntity) {
    viewer.entities.remove(rectangleEntity);
    rectangleEntity = null;
  }
};

const stopPickPointMode = () => {
  if (pickHandler) {
    pickHandler.destroy();
    pickHandler = null;
  }
  const viewer = map.getViewer();
  const el = viewer?.container as HTMLElement | undefined;
  if (el) {
    el.style.cursor = "";
  }
  viewer.scene.screenSpaceCameraController.enableRotate = true;
  viewer.scene.screenSpaceCameraController.enableTranslate = true;
};

const cartesian3toWGS84 = (point: Cesium.Cartesian3) => {
  const cartographic = Cesium.Cartographic.fromCartesian(point);
  return {
    lng: Cesium.Math.toDegrees(cartographic.longitude),
    lat: Cesium.Math.toDegrees(cartographic.latitude),
    alt: cartographic.height
  };
};

const getPointFromWindowPoint = (
  viewer: Cesium.Viewer,
  point: Cesium.Cartesian2
) => {
  if (viewer.scene.mode === Cesium.SceneMode.SCENE3D) {
    return viewer.camera.pickEllipsoid(point, viewer.scene.globe.ellipsoid);
  }
  const ray = viewer.scene.camera.getPickRay(point);
  return ray ? viewer.scene.globe.pick(ray, viewer.scene) : null;
};

const startPickPointMode = () => {
  stopPickPointMode();
  clearAnalysisShape();
  pickedLng.value = null;
  pickedLat.value = null;
  pickedRectanglePoints.value = [];
  message("请点击数据区域获取经纬度", { type: "info" });
  const viewer = map.getViewer();
  if (!viewer?.scene?.canvas) return;
  (viewer.container as HTMLElement).style.cursor = "crosshair";
  pickHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
  pickHandler.setInputAction(
    async (click: Cesium.ScreenSpaceEventHandler.PositionedEvent) => {
      const cartesian = getPointFromWindowPoint(viewer, click.position);
      if (!cartesian) {
        message("请点击地图有效区域", { type: "warning" });
        return;
      }
      const point = cartesian3toWGS84(cartesian);
      pickedLng.value = point.lng;
      pickedLat.value = point.lat;

      stopPickPointMode();
      console.log(9, layerStore.layerList.map(i => i.id).join(","));

      let params = {
        ids: layerStore.layerList.map(i => i.id).join(","),
        lat: pickedLat.value,
        lon: pickedLng.value
      };
      const res = await getTimeSeqPoint(params);
      if (res.code === 200) {
        console.log(res, 555);
      }

      analysisDialogVisible.value = true;
    },
    Cesium.ScreenSpaceEventType.LEFT_CLICK
  );
};

// 关闭分析弹窗时，清理框选残留矩形
watch(analysisDialogVisible, visible => {
  if (!visible) {
    clearAnalysisShape();
  }
});

// 监听analysisDialogVisible,如果analysisDialogVisible为false,那么就清除刚才画矩形而残留的红色矩形

/*
const onHandleAnalysis = () => {
  if (layerStore.layerList.length <= 0) {
    message("请先加载数据", { type: "warning" });
    return;
  }
  startPickPointMode();
};
*/
const startPickRectangleMode = () => {
  stopPickPointMode();
  clearAnalysisShape();
  pickedLng.value = null;
  pickedLat.value = null;
  pickedRectanglePoints.value = [];
  message("请先点击矩形左上角，再移动鼠标实时预览，最后点击右下角完成", {
    type: "info"
  });

  const viewer = map.getViewer();
  if (!viewer?.scene?.canvas) return;

  (viewer.container as HTMLElement).style.cursor = "crosshair";

  const pointsArr: Cesium.Cartesian3[] = [];
  let shapeRect: Cesium.Rectangle | null = null;
  let isPreviewing = false;

  pickHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);

  pickHandler.setInputAction(
    (event: Cesium.ScreenSpaceEventHandler.PositionedEvent) => {
      const tempPosition = getPointFromWindowPoint(viewer, event.position);
      if (!tempPosition) {
        message("请在地图有效区域内框选", { type: "warning" });
        return;
      }

      if (pointsArr.length === 0) {
        pointsArr.push(tempPosition, tempPosition);
        isPreviewing = true;

        const pointA = cartesian3toWGS84(pointsArr[0]);
        shapeRect = Cesium.Rectangle.fromDegrees(
          pointA.lng,
          pointA.lat,
          pointA.lng + 0.000001,
          pointA.lat + 0.000001
        );

        rectangleEntity = viewer.entities.add({
          rectangle: {
            coordinates: new Cesium.CallbackProperty(() => shapeRect, false),
            material: Cesium.Color.BLUE.withAlpha(0.2),
            outline: true,
            outlineColor: Cesium.Color.RED,
            outlineWidth: 2
          }
        });

        message("请移动鼠标预览矩形，并点击右下角完成", { type: "info" });
        return;
      }

      pointsArr[1] = tempPosition;

      const pointA = cartesian3toWGS84(pointsArr[0]);
      const pointB = cartesian3toWGS84(pointsArr[1]);
      const west = Math.min(pointA.lng, pointB.lng);
      const east = Math.max(pointA.lng, pointB.lng);
      const south = Math.min(pointA.lat, pointB.lat);
      const north = Math.max(pointA.lat, pointB.lat);

      pickedRectanglePoints.value = [
        { lng: west, lat: north },
        { lng: east, lat: north },
        { lng: east, lat: south },
        { lng: west, lat: south }
      ];

      isPreviewing = false;
      stopPickPointMode();
      analysisDialogVisible.value = true;
    },
    Cesium.ScreenSpaceEventType.LEFT_CLICK
  );

  pickHandler.setInputAction(
    (event: Cesium.ScreenSpaceEventHandler.MotionEvent) => {
      if (!isPreviewing || pointsArr.length < 2) return;

      const movePosition = getPointFromWindowPoint(viewer, event.endPosition);
      if (!movePosition) return;

      pointsArr[1] = movePosition;

      const pointA = cartesian3toWGS84(pointsArr[0]);
      const pointB = cartesian3toWGS84(pointsArr[1]);
      const west = Math.min(pointA.lng, pointB.lng);
      const east = Math.max(pointA.lng, pointB.lng);
      const south = Math.min(pointA.lat, pointB.lat);
      const north = Math.max(pointA.lat, pointB.lat);

      shapeRect = Cesium.Rectangle.fromDegrees(west, south, east, north);
    },
    Cesium.ScreenSpaceEventType.MOUSE_MOVE
  );
};

const handleAnalysisPick = (mode: "point" | "rectangle") => {
  analysisPickMode.value = mode;
  if (layerStore.layerList.length <= 0) {
    message("请先加载数据", { type: "warning" });
    return;
  }
  if (mode === "point") {
    startPickPointMode();
    return;
  }
  startPickRectangleMode();
};

const onHandlePick = (type: unknown) => {
  const pickType = type as "point" | "rectangle";
  if (pickType !== "point" && pickType !== "rectangle") return;
  handleAnalysisPick(pickType);
};

const onHandleAnalysis = (checked?: boolean) => {
  if (layerStore.layerList.length <= 0) {
    message("请先加载数据", { type: "warning" });
    return;
  }
  analysisModeVisible.value = !checked;
  if (!analysisModeVisible.value) {
    stopPickPointMode();
    clearAnalysisShape();
    return;
  }
};

const mapInfo = ref<{ level: number; lng: number; lat: number }>({
  level: 0,
  lng: 0,
  lat: 0
});

/** 卷帘：layerList 两条 + isRoll；融合：layerList≥2；单条：layer */
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
    layerName.value = list
      .map(raw => {
        const d = raw as Record<string, unknown>;
        const n = d.name ?? d.layerName;
        return typeof n === "string" ? n.trim() : "";
      })
      .filter(Boolean)
      .join("、");
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
  // bus.on("handleAnalysis", onHandleAnalysis);
  bus.on("handlePick", onHandlePick);
});
// 地图卸载的事件;
onUnmounted(() => {
  stopPickPointMode();
  clearAnalysisShape();
  // bus.off("handleAnalysis", onHandleAnalysis);
  bus.off("handlePick", onHandlePick);
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
  // background-color: rgb(130, 206, 184);
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
    // background: rgba(0, 0, 0, 0.8);

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

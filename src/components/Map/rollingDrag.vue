<template>
  <div v-show="rollingShow" class="map-layer-sel">
    <!-- <div class="item">
      <el-select
        v-model="selLayer1"
        placeholder="请选择图层"
        clearable
        size="small"
        style="width: 120px"
      >
        <el-option
          v-for="(layer, idx) in layerList"
          :key="idx"
          :label="layer.name"
          :value="layer.id"
          @click="changeHandler('LEFT', layer)"
        />
      </el-select>
      <el-button size="small" @click="stopRolling">结束对比</el-button>
    </div> -->
    <!-- <div class="item">
      <el-select
        v-model="selLayer2"
        placeholder="请选择图层"
        clearable
        size="small"
        @change="changeHandler('RIGHT')"
      >
        <el-option
          v-for="(layer, idx) in layerList"
          :key="idx"
          :label="layer.name"
          :value="layer.id"
        />
      </el-select>
    </div> -->
  </div>
  <div v-show="rollingShow && layerList.length >= 2" class="map-layer-names">
    <div class="layer-name-side layer-name-side-left">
      <div class="layer-name layer-name-left">
        {{ getLayerDisplayName(layerList[0]) }}
      </div>
    </div>
    <div class="layer-name-side layer-name-side-right">
      <div class="layer-name layer-name-right">
        {{ getLayerDisplayName(layerList[1]) }}
      </div>
    </div>
  </div>
  <div v-show="rollingShow" ref="rollingRef" class="map-drag">
    <div class="mid-line" />
    <div class="mid-circle" />
  </div>
</template>

<script lang="ts" setup>
import { computed, nextTick, onMounted, ref, onUnmounted } from "vue";
import map from "@/libs/tdtmap";
import * as Cesium from "cesium";
import { useLayerStoreHook } from "@/store/modules/layer";
import bus from "@/utils/bus";
import {
  getThumbJpgByColorRampId,
  getThumbJpg
} from "@/api/dataSource/panel/loal";
import { imgStreamToBase64 } from "@/utils/imgToBase64";
import { addOriginalLayer, removeBackground } from "@/utils/addOriginalLayer";
import { wgs84ToGcj20 } from "@/api/dataSource/panel/loal";

const layerStore = useLayerStoreHook();
const layerList = ref([]);
// const layerList = computed(() =>
//   layerStore.layerList.filter(layer => layer.show)
// );
const allLayerList = computed(() => layerStore.layerList);
const rollingRef = ref();
const rollingShow = ref<Boolean>(false);
const selLayer1 = ref<string>();
const selLayer2 = ref<string>();
let leftLayer = null;
let rightLayer = null;
let colorId = null;
let handler: Cesium.ScreenSpaceEventHandler = null;

/** 绑定可拖拽分割线 */
const bindSplitSlider = (viewer: Cesium.Viewer) => {
  nextTick(() => {
    const slider = rollingRef.value;
    if (!slider?.parentElement) return;
    if (handler) {
      handler.destroy();
      handler = null;
    }
    slider.style.left = "50%";
    viewer.scene.splitPosition =
      slider.offsetLeft / slider.parentElement.offsetWidth;
    handler = new Cesium.ScreenSpaceEventHandler(slider);
    let moveActive = false;
    const move = movement => {
      if (!moveActive) {
        return;
      }
      const relativeOffset = movement.endPosition.x;
      if (slider.offsetLeft + relativeOffset < 0) return;
      const splitPosition =
        (slider.offsetLeft + relativeOffset) / slider.parentElement.offsetWidth;
      slider.style.left = `${100.0 * splitPosition}%`;
      viewer.scene.splitPosition = splitPosition;
    };
    handler.setInputAction(
      () => (moveActive = true),
      Cesium.ScreenSpaceEventType.LEFT_DOWN
    );
    handler.setInputAction(
      () => (moveActive = true),
      Cesium.ScreenSpaceEventType.PINCH_START
    );
    handler.setInputAction(move, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
    handler.setInputAction(move, Cesium.ScreenSpaceEventType.PINCH_MOVE);
    handler.setInputAction(
      () => (moveActive = false),
      Cesium.ScreenSpaceEventType.LEFT_UP
    );
    handler.setInputAction(
      () => (moveActive = false),
      Cesium.ScreenSpaceEventType.PINCH_END
    );
  });
};

const ensureThumbUrl = async (data: Record<string, unknown>) => {
  if (data.thumbUrl) return String(data.thumbUrl);
  const res = await getThumbJpg(data.id);
  return imgStreamToBase64(res.data);
};

const getLayerDisplayName = (layer?: Record<string, unknown>) => {
  if (!layer) return "";
  const n = layer.name ?? layer.layerName;
  return typeof n === "string" ? n.trim() : "";
};

/** 第一条左侧底图，第二条右侧卷帘对比 */
const openCompareRolling = async (payload: {
  left: Record<string, unknown>;
  right: Record<string, unknown>;
}) => {
  const leftData = payload.left;
  const rightData = payload.right;
  await map.readyPromise;
  const viewer = map.getViewer();
  map.removeAllLayer();
  leftLayer = null;
  rightLayer = null;
  colorId = null;

  const leftThumb = await ensureThumbUrl(leftData);
  const rightThumb = await ensureThumbUrl(rightData);

  const gcjLMin: any = await wgs84ToGcj20({
    lng: Number(leftData.lngMin),
    lat: Number(leftData.latMin)
  });
  const gcjLMax: any = await wgs84ToGcj20({
    lng: Number(leftData.lngMax),
    lat: Number(leftData.latMax)
  });
  const gcjRMin: any = await wgs84ToGcj20({
    lng: Number(rightData.lngMin),
    lat: Number(rightData.latMin)
  });
  const gcjRMax: any = await wgs84ToGcj20({
    lng: Number(rightData.lngMax),
    lat: Number(rightData.latMax)
  });

  const foldBounds = (gMin: any, gMax: any) => {
    const w = Math.min(Number(gMin.data.lng), Number(gMax.data.lng));
    const e = Math.max(Number(gMin.data.lng), Number(gMax.data.lng));
    const s = Math.min(Number(gMin.data.lat), Number(gMax.data.lat));
    const n = Math.max(Number(gMin.data.lat), Number(gMax.data.lat));
    return { w, e, s, n };
  };
  const b1 = foldBounds(gcjLMin, gcjLMax);
  const b2 = foldBounds(gcjRMin, gcjRMax);
  const west = Math.min(b1.w, b2.w);
  const east = Math.max(b1.e, b2.e);
  const south = Math.min(b1.s, b2.s);
  const north = Math.max(b1.n, b2.n);

  viewer.camera.flyTo({
    destination: Cesium.Rectangle.fromDegrees(west, south, east, north),
    duration: 1
  });

  leftLayer = viewer.imageryLayers.addImageryProvider(
    new Cesium.SingleTileImageryProvider({
      url: (await removeBackground(leftThumb)) as string,
      rectangle: Cesium.Rectangle.fromDegrees(
        Number(gcjLMin.data.lng),
        Number(gcjLMin.data.lat),
        Number(gcjLMax.data.lng),
        Number(gcjLMax.data.lat)
      )
    })
  );
  leftLayer.splitDirection = Cesium.SplitDirection.LEFT;

  rightLayer = viewer.imageryLayers.addImageryProvider(
    new Cesium.SingleTileImageryProvider({
      url: (await removeBackground(rightThumb)) as string,
      rectangle: Cesium.Rectangle.fromDegrees(
        Number(gcjRMin.data.lng),
        Number(gcjRMin.data.lat),
        Number(gcjRMax.data.lng),
        Number(gcjRMax.data.lat)
      )
    })
  );
  rightLayer.splitDirection = Cesium.SplitDirection.RIGHT;

  layerList.value = [
    { ...leftData, thumbUrl: leftThumb },
    { ...rightData, thumbUrl: rightThumb }
  ];
  rollingShow.value = true;
  setTimeout(() => bindSplitSlider(viewer), 10);
};

/**
 * 显示卷帘
 */
const startRolling = () => {
  rollingShow.value = true;
  setTimeout(() => {
    selLayer1.value = undefined;
    selLayer2.value = undefined;
    map.readyPromise.then(viewer => {
      map.removeAllLayer();
      nextTick(() => bindSplitSlider(viewer));
    });
  }, 10);
};

/**
 * 退出卷帘模式
 */
const stopRolling = () => {
  // let viewer = map.viewer;
  // let layerList = [];
  // for (let i = 0; i < viewer.imageryLayers.length; i++) {
  //   let layer = viewer.imageryLayers.get(i);
  //   layerList.push(layer);
  // }
  // layerList.forEach(layer => {
  //   if (
  //     layer.splitDirection === Cesium.SplitDirection.LEFT ||
  //     layer.splitDirection === Cesium.SplitDirection.RIGHT
  //   ) {
  //     viewer.imageryLayers.remove(layer);
  //   }
  // });
  //退出卷帘模式后，需要将图层按顺序添加回来
  // map.removeAllLayer();
  // map.reAddAllLayer(allLayerList.value);
  map.removeLocalImageLayers();
  if (leftLayer) {
    map.viewer.imageryLayers.remove(leftLayer);
    leftLayer = null;
  }
  if (rightLayer) {
    map.viewer.imageryLayers.remove(rightLayer);
    rightLayer = null;
  }
  if (handler) {
    handler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_DOWN);
    handler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_UP);
    handler.removeInputAction(Cesium.ScreenSpaceEventType.MOUSE_MOVE);
    handler.removeInputAction(Cesium.ScreenSpaceEventType.PINCH_START);
    handler.removeInputAction(Cesium.ScreenSpaceEventType.PINCH_END);
    handler.removeInputAction(Cesium.ScreenSpaceEventType.PINCH_MOVE);
    handler = null;
  }
  rollingShow.value = false;
  layerList.value.forEach(layer => {
    addOriginalLayer(layer, layer.thumbUrl, "local");
  });
  map.viewer.entities.values.forEach((entity: any) => {
    entity.show = true;
  });
};

const changeHandler = async (direction: string, data?: any) => {
  // const layerId = direction === "LEFT" ? selLayer1.value : selLayer2.value;
  map.viewer.imageryLayers.remove(leftLayer);
  map.viewer.imageryLayers.remove(rightLayer);

  const gcj20Min: any = await wgs84ToGcj20({
    lng: Number(data.lngMin),
    lat: Number(data.latMin)
  });
  const gcj20Max: any = await wgs84ToGcj20({
    lng: Number(data.lngMax),
    lat: Number(data.latMax)
  });
  map.viewer.camera.flyTo({
    destination: Cesium.Rectangle.fromDegrees(
      Number(gcj20Min.data.lng),
      Number(gcj20Min.data.lat),
      Number(gcj20Max.data.lng),
      Number(gcj20Max.data.lat)
    ),
    duration: 1
  });
  leftLayer = map.viewer.imageryLayers.addImageryProvider(
    new Cesium.SingleTileImageryProvider({
      url: (await removeBackground(data.thumbUrl)) as string,
      rectangle: Cesium.Rectangle.fromDegrees(
        Number(gcj20Min.data.lng),
        Number(gcj20Min.data.lat),
        Number(gcj20Max.data.lng),
        Number(gcj20Max.data.lat)
      )
    })
  );
  leftLayer.splitDirection = Cesium.SplitDirection.LEFT;

  const res = await getThumbJpgByColorRampId(data.id, colorId);
  const url = await imgStreamToBase64(res.data);

  rightLayer = map.viewer.imageryLayers.addImageryProvider(
    new Cesium.SingleTileImageryProvider({
      url: (await removeBackground(url)) as string,
      rectangle: Cesium.Rectangle.fromDegrees(
        Number(gcj20Min.data.lng),
        Number(gcj20Min.data.lat),
        Number(gcj20Max.data.lng),
        Number(gcj20Max.data.lat)
      )
    })
  );
  rightLayer.splitDirection = Cesium.SplitDirection.RIGHT;
};

const splitLayerData = (data: any[]) => {
  layerList.value = data;
};

onMounted(() => {
  bus.on("startRolling", colorData => {
    startRolling();
    colorId = colorData;
  });
  bus.on("stopRolling", () => {
    stopRolling();
  });
  bus.on("getSplitLayerData", (data: any[]) => {
    splitLayerData(data);
  });
  bus.on(
    "openRollingCompare",
    (payload: {
      left: Record<string, unknown>;
      right: Record<string, unknown>;
    }) => {
      openCompareRolling(payload);
    }
  );
});

// onUnmounted(() => {
//   stopRolling();
//   bus.off("startRolling");
//   bus.off("stopRolling");
//   bus.off("getSplitLayerData");
// });
</script>

<style lang="less" scoped>
.map-layer-sel {
  position: absolute;
  top: 80px;
  width: 49%;
  display: flex;
  z-index: 3;
  justify-content: center;
  left: 50%;
  transform: translateX(-50%);
  .item {
    // min-width: 100px;
    display: flex;
    justify-content: center;
    align-items: center;
    margin-top: 20px;
  }
}
.map-layer-names {
  position: absolute;
  top: 100px;
  left: 0;
  right: 0;
  z-index: 3;
  pointer-events: none;
  display: flex;
  padding: 0 20px;
  box-sizing: border-box;

  .layer-name-side {
    display: flex;
    width: 50%;
  }

  .layer-name-side-left {
    justify-content: flex-start;
    padding-right: 40px;
  }

  .layer-name-side-right {
    justify-content: flex-end;
    padding-left: 40px;
  }

  .layer-name {
    max-width: 100%;
    padding: 5px 10px;
    border-radius: 6px;
    background: rgba(0, 0, 0, 0.25);
    color: #fff;
    font-size: 16px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .layer-name-left {
    text-align: left;
  }

  .layer-name-right {
    text-align: right;
  }
}
.map-drag {
  position: absolute;
  z-index: 2;
  height: 100%;

  .mid-line {
    position: relative;
    height: 100%;
    width: 1px;
    // background: rgba(255, 255, 255, 0.85);

    &:before {
      position: absolute;
      top: 0;
    }

    &:after {
      position: absolute;
      bottom: 0;
    }

    &:before,
    &:after {
      content: "";
      height: calc(50% - 25px);
      width: 1.5px;
      background: white;
    }
  }

  .mid-circle {
    position: absolute;
    top: calc(50% - 23px);
    left: -22px;
    width: 46px;
    height: 46px;
    background: rgba(0, 0, 0, 0.75);
    border: 2px solid rgba(255, 255, 255, 0.85);
    border-radius: 50%;
    cursor: col-resize;

    &:after,
    &:before {
      position: absolute;
      top: calc(50% - 5px);
      content: "";
      width: 10px;
      height: 10px;
      background: url("../../assets/icon_arrow.svg") no-repeat;
      filter: grayscale(100%) brightness(200%);
    }

    &:after {
      left: 10px;
      transform: scale(2) rotate(90deg);
    }

    &:before {
      right: 10px;
      transform: scale(2) rotate(-90deg);
    }
  }
}
</style>

<template>
  <div id="map-div" />
</template>
<script setup lang="ts">
import * as Cesium from "cesium";
import { onMounted } from "vue";
let viewer = null;
let entity = null;
const initMap = () => {
  viewer = new Cesium.Viewer("map-div", {
    imageryProvider: new Cesium.WebMapTileServiceImageryProvider({
      url: "https://t0.tianditu.gov.cn/vec_w/wmts?from=baselayer&tk=4ab17d302219828dd62d85cb3066426e",
      layer: "vec",
      style: "default",
      tileMatrixSetID: "w",
      format: "tiles",
      maximumLevel: 18
    }),
    selectionIndicator: false, //自带的选中框
    baseLayerPicker: false, //是否显示图层选择控件
    geocoder: false, //是否显示地名查找控件
    timeline: false, //是否显示时间线控件
    homeButton: false, //是否显示Home按钮
    sceneModePicker: false, //是否显示投影方式控件(右上角地球小图标)
    navigationHelpButton: false, //是否显示帮助信息控件
    infoBox: false, //是否显示点击要素之后显示的信息
    animation: false // 隐藏左下角的仪表盘播放动画按钮
  });
  viewer.cesiumWidget.creditContainer.style.display = "none";
};

const showCoordinates = coordinates => {
  // debugger;
  if (viewer) {
    if (entity) {
      viewer.entities.remove(entity);
    }
    entity = viewer.entities.add({
      id: "extent",
      show: true,
      polygon: {
        hierarchy: Cesium.Cartesian3.fromDegreesArray([
          coordinates[0][0],
          coordinates[0][1],
          coordinates[1][0],
          coordinates[1][1],
          coordinates[2][0],
          coordinates[2][1],
          coordinates[3][0],
          coordinates[3][1]
        ]),
        material: Cesium.Color.BLUE.withAlpha(0.4)
      }
    });
    viewer.zoomTo(entity);
  }
};
onMounted(() => {
  initMap();
});
defineExpose({ showCoordinates });
</script>
<style lang="scss" scoped>
#map-div {
  width: 100%;
  height: 100%;
}
</style>

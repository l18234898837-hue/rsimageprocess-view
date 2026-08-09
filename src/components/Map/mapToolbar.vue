<template>
  <div class="map-toolbar">
    <div
      class="toolbar-top bg-[rgb(255,255,255)] bg-opacity-[100%] flex overflow-hidden items-center rounded-[3px]"
    >
      <div class="toolbar-group">
        <el-tooltip
          v-for="(tool, idx) in toolList"
          :key="idx"
          :disabled="tool.type != 'setting'"
          :content="tool.content"
          popper-class="tooltip_class"
          placement="bottom"
          effect="light"
          :show-arrow="false"
          :show-after="0"
          :popper-style="
            tool.type == 'setting'
              ? {
                  background: 'rgb(19, 140, 239, 0.5)',
                  padding: '0',
                  marginTop: '-5px'
                }
              : {}
          "
        >
          <template v-if="tool.type == 'setting'" #content>
            <div class="text-center">
              <div
                v-for="item in tool.children"
                :key="item.type"
                class="tool_box"
              >
                <div
                  :class="[
                    'text-[#ffffff] font-[YouSheBiaoTiHei] cursor-pointer',
                    'flex items-center justify-start p-2 py-0.5 border-b-[1px] border-[rgb(255,255,255)] last:border-0',
                    'transition-all duration-200 ease-in-out hover:text-[#0095DA]'
                  ]"
                  @click="item.itemClick(item)"
                >
                  <i :class="['iconfont', item.icon, 'pr-2']" />
                  <div>{{ item.content }}</div>
                </div>
              </div>
              <!-- <div v-if="showBtn" class="analysis-mode-panel z-[999] flex">
                <div
                  class="analysis-mode-btn"
                  :class="{ active: analysisPickMode === 'point' }"
                  @click="startAnalysisPick('point')"
                >
                  点
                </div>
                <div
                  class="analysis-mode-btn"
                  :class="{ active: analysisPickMode === 'rectangle' }"
                  @click="startAnalysisPick('rectangle')"
                >
                  矩形
                </div>
              </div> -->
            </div>
          </template>
          <div
            v-if="tool.show"
            class="icon"
            :class="{ active: tool.checked }"
            @click="tool.itemClick(tool)"
          >
            <i :class="['iconfont', tool.icon]" />
            <div class="text">{{ tool.content }}</div>
          </div>
        </el-tooltip>
      </div>
    </div>
    <div
      class="toolbar-bottom flex items-center rounded-[3px] overflow-hidden bg-[#ffffff] bg-opacity-[100%]"
    >
      <div class="toolbar-group">
        <el-tooltip content="" placement="left" effect="light" disabled>
          <div class="icon" @click="zoom(1)">
            <i class="iconfont icon-zengjia" />
            <div class="text">放大</div>
          </div>
        </el-tooltip>
        <el-tooltip content="" placement="left" effect="light" disabled>
          <div class="icon" @click="toLocation">
            <i class="iconfont icon-dingwei" />
            <div class="text">复位</div>
          </div>
        </el-tooltip>
        <el-tooltip content="" placement="left" effect="light" disabled>
          <div class="icon" @click="zoom(0)">
            <i class="iconfont icon-jian_sekuai" />
            <div class="text">缩小</div>
          </div>
        </el-tooltip>
      </div>
    </div>

    <div
      class="toolbar-bottom flex items-center overflow-hidden bg-[#ffffff] bg-opacity-[100%] rounded-[3px]"
    >
      <div class="toolbar-group">
        <div class="icon" @click="toggleTerrain">
          <i class="iconfont icon-gis_dixing" />
          <div class="text">地形</div>
        </div>
      </div>
      <div class="toolbar-group border-r-[1px]">
        <el-tooltip
          placement="bottom"
          effect="light"
          popper-class="tooltip_class"
          :show-arrow="false"
          :popper-style="{
            background: 'rgb(19, 140, 239, 0.5)',
            border: '1px solid #fff',
            borderRadius: '5px',
            marginTop: '-5px'
          }"
        >
          <template #content>
            <div class="map-layer">
              <div
                v-for="(item, index) in baseLayers"
                :key="index"
                class="item"
                :class="{ active: item.active }"
                @click="switchBaseMap(item)"
              >
                <img :src="`./images/${item.img}.png`" alt="" />
                <div class="txt bg-[#0095DA] bg-opacity-[68%]">
                  {{ item.name }}
                </div>
              </div>
            </div>
          </template>
          <div class="icon">
            <i class="iconfont icon-diqiu" />
            <div class="text">底图</div>
          </div>
        </el-tooltip>
      </div>
      <div class="toolbar-group">
        <el-tooltip content="全屏" placement="bottom" effect="light" disabled>
          <div class="icon" @click="handleScreenfull">
            <i class="iconfont icon-full-screen" />
            <div class="text">全屏</div>
          </div>
        </el-tooltip>
      </div>
      <div class="toolbar-group">
        <el-tooltip
          ref="starAnalysisTooltipRef"
          placement="bottom"
          effect="light"
          trigger="click"
          :show-after="0"
          popper-class="tooltip_class"
          :popper-style="{ padding: '0' }"
        >
          <div class="icon" @click="handleGenerateThematic">
            <i class="iconfont icon-yubao" />
            <div class="text">生成专题图</div>
          </div>
        </el-tooltip>
      </div>
    </div>
  </div>

  <el-dialog v-model="centerDialogVisible" :show-close="false" width="500">
    <div :class="['']">
      <el-form :model="labelForm" label-position="top">
        <el-form-item label="标题">
          <el-input v-model="labelForm.title" number />
        </el-form-item>
        <el-form-item label="标注类型">
          <el-radio-group v-model="labelForm.icon">
            <el-radio
              v-for="(item, index) in mapLabels"
              :key="index"
              :label="item.icon"
            >
              <el-image style="width: 30px" :src="item.icon" fit="cover" />
            </el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="标题大小">
          <el-input-number v-model="labelForm.fontSize" :min="10" :max="30" />
        </el-form-item>
        <el-form-item label="标题颜色">
          <el-color-picker v-model="labelForm.color" />
        </el-form-item>
      </el-form>
    </div>
    <template #footer>
      <div class="dialog-footer">
        <el-button @click="closeDialog">取消</el-button>
        <el-button type="primary" @click="enterSetLabel"> 确定 </el-button>
      </div>
    </template>
  </el-dialog>
  <Timer ref="timerRef" />
</template>

<script lang="ts" setup>
import { onMounted, ref, reactive } from "vue";
import * as Cesium from "cesium";
import map from "@/libs/tdtmap";
import bus from "@/utils/bus";
import { useLayerStoreHook } from "@/store/modules/layer";
import screenfull from "screenfull";
import { message } from "@/utils/message";
import { ElMessageBox } from "element-plus";

import map_label_1 from "/images/map_label/map_label_1.png";
import map_label_2 from "/images/map_label/map_label_2.png";
import map_label_3 from "/images/map_label/map_label_3.png";
import map_label_4 from "/images/map_label/map_label_4.png";

import Timer from "@/views/timer/index.vue";
import { emit } from "process";
const analysisPickMode = ref<"point" | "rectangle">("point");

const timerRef = ref();

const layerStore = useLayerStoreHook();

const centerDialogVisible = ref(false);
const mapLabels = ref([
  {
    icon: map_label_1
  },
  {
    icon: map_label_2
  },
  {
    icon: map_label_3
  },
  {
    icon: map_label_4
  }
]);

const labelForm = reactive({
  title: "",
  color: "#FFFFFF",
  icon: null,
  scale: 0.2,
  fontSize: 16,
  animation: null
});

const handleScreenfull = () => {
  screenfull.toggle();
};

const onSearch = () => {};

const resetForm = formEl => {
  if (!formEl) return;
  formEl.resetFields();
  onSearch();
};

let terrainInfoHandler: Cesium.ScreenSpaceEventHandler | null = null;

const handleGenerateThematic = async () => {
  // 获取当前的缩略图
  const rows = (layerStore.remoteThematicRows || []).filter(
    item => item?.thumbUrl
  );
  if (!rows.length) {
    message("请先载入数据并勾选带缩略图的数据后再生成专题图。", {
      type: "warning"
    });
    return;
  }

  await ElMessageBox.confirm(
    "生成时不会对地图做任何飞行或自动缩放，只会截取当前这一刻的画布。请先手动把地图缩放到您需要的视角与层级，再点击生成。",
    "提示",
    {
      confirmButtonText: "已调整好，生成专题图",
      cancelButtonText: "取消",
      type: "info",
      closeOnClickModal: false
    }
  );

  await map.buildThematicImageAndDownload(rows);
  message("专题图已生成并开始下载", { type: "success" });
};

const clearTerrainInfoHandler = () => {
  if (terrainInfoHandler) {
    terrainInfoHandler.destroy();
    terrainInfoHandler = null;
  }
  const viewer = map.getViewer();
  // @ts-ignore
  viewer.container.style.cursor = "default";
};

const enableTerrainInfoPick = () => {
  const viewer = map.getViewer();
  clearTerrainInfoHandler();
  terrainInfoHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
  // @ts-ignore
  viewer.container.style.cursor = "crosshair";

  terrainInfoHandler.setInputAction(click => {
    const ray = viewer.camera.getPickRay(click.position);
    const pickedPosition = viewer.scene.pickPositionSupported
      ? viewer.scene.pickPosition(click.position)
      : viewer.scene.globe.pick(ray, viewer.scene);
    if (!pickedPosition) {
      message("未获取到地形信息，请在地形区域重试", { type: "warning" });
      return;
    }
    const point = cartesian3toWGS84(pickedPosition);
    message(
      `地形信息：经度 ${point.lng.toFixed(6)}，纬度 ${point.lat.toFixed(6)}，高程 ${point.alt.toFixed(2)} 米`,
      { type: "info", duration: 3500 }
    );
    clearTerrainInfoHandler();
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
};
const startAnalysisPick = (mode: "point" | "rectangle") => {
  analysisPickMode.value = mode;
  if (mode === "point") {
    bus.emit("handlePick", "point");
    return;
  }
  bus.emit("handlePick", "rectangle");
};

const toggleTerrain = () => {
  const viewer = map.getViewer();
  const terrainEnabled =
    viewer.terrainProvider &&
    !(viewer.terrainProvider instanceof Cesium.EllipsoidTerrainProvider);

  if (terrainEnabled) {
    map.removeTerrain();
    clearTerrainInfoHandler();
    return;
  }

  const activeBase = baseLayers.value.find(layer => layer.active);
  const isVectorBase = activeBase?.type === "vec";
  map.addTerrain({
    // 矢量底图下关闭水面高光与法线光照，避免出现“曝光发白”
    requestWaterMask: !isVectorBase,
    requestVertexNormals: !isVectorBase,
    enableLighting: !isVectorBase
  });
  enableTerrainInfoPick();
};
/**
 * 笛卡尔坐标系转WGS84坐标系
 * @param point
 */
const cartesian3toWGS84 = (point: Cesium.Cartesian3) => {
  const cartographic = Cesium.Cartographic.fromCartesian(point);
  const lat = Cesium.Math.toDegrees(cartographic.latitude);
  const lng = Cesium.Math.toDegrees(cartographic.longitude);
  const alt = cartographic.height;
  return { lat, lng, alt };
};

//画的entity
let entity: any = null;
let entities: any[] = [];
let handler = null;

const closeDialog = () => {
  centerDialogVisible.value = false;
  labelForm.title = "";
  labelForm.color = "#FFFFFF";
  labelForm.scale = 0.2;
  labelForm.fontSize = 16;
};

const addMapMarker = (index?: any) => {
  if (handler) {
    handler.destroy();
    handler = null;
  }
  centerDialogVisible.value = false;
  const viewer = map.getViewer();
  let position;
  handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
  //@ts-ignore
  viewer.container.style.cursor = "crosshair";
  // 设置鼠标点击事件处理程序
  handler.setInputAction(click => {
    position = viewer.camera.pickEllipsoid(
      click.position,
      viewer.scene.globe.ellipsoid
    );
    // const point = cartesian3toWGS84(position);
    entity = viewer.entities.add({
      position: position,
      billboard: {
        image: mapLabels.value[index]?.icon || map_label_2,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        // heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        scale: 0.2,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        pixelOffset: new Cesium.Cartesian2(0, 0)
      },
      label: new Cesium.LabelGraphics({
        text: "",
        font: `16px Arial`,
        fillColor: Cesium.Color.fromCssColorString("#FFFFFF"),
        pixelOffset: new Cesium.Cartesian2(0, -50), // 动态偏移
        horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM
      })
    });
    entities.push(entity);
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

  //长按鼠标左键移动标注
  handler.setInputAction(click => {
    const pick = viewer.scene.pick(click.position);
    if (Cesium.defined(pick) && entities.includes(pick.id)) {
      //禁止鼠标左键拖动底图
      viewer.scene.screenSpaceCameraController.enableRotate = false; //禁止旋转
      viewer.scene.screenSpaceCameraController.enableTranslate = false; //禁止平移

      entity = pick.id;
      handler.setInputAction(movement => {
        if (entity) {
          const pixelPosition = movement.endPosition;
          const cartesianPosition = viewer.scene.globe.pick(
            viewer.camera.getPickRay(pixelPosition),
            viewer.scene
          );
          if (cartesianPosition) {
            entity.position = cartesianPosition;
            entity.label.pixelOffset = new Cesium.Cartesian2(0, -50); // 动态偏移
          }
        }
      }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
    }
  }, Cesium.ScreenSpaceEventType.LEFT_DOWN);

  // 监听鼠标松开事件，结束标注移动
  handler.setInputAction(() => {
    // 允许鼠标左键拖动底图
    viewer.scene.screenSpaceCameraController.enableRotate = true;
    viewer.scene.screenSpaceCameraController.enableTranslate = true;
    handler.removeInputAction(Cesium.ScreenSpaceEventType.MOUSE_MOVE);
  }, Cesium.ScreenSpaceEventType.LEFT_UP);

  handler.setInputAction(() => {
    // handler.destroy();
    //结束左键标注，重新设置左键单击事件
    handler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK);
    handler.setInputAction(click => {
      const pick = viewer.scene.pick(click.position);
      if (Cesium.defined(pick) && entities.includes(pick.id)) {
        entity = pick.id;
        centerDialogVisible.value = true;
        //设置当前选中的entity的label
        labelForm.title = pick.id.label.text;
        labelForm.color = pick.id.label.fillColor.getValue().toCssHexString();
        // labelForm.scale = pick.id.billboard.scale.getValue();
        labelForm.fontSize = Number(pick.id.label.font._value.split("px")[0]);
        labelForm.icon = pick.id.billboard.image._value;
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    //@ts-ignore
    viewer.container.style.cursor = "default";
  }, Cesium.ScreenSpaceEventType.RIGHT_CLICK);
};

const enterSetLabel = () => {
  if (entity) {
    entity.label.text = labelForm.title;
    entity.label.fillColor = Cesium.Color.fromCssColorString(labelForm.color);
    entity.label.font = `${labelForm.fontSize}px Arial`;
    entity.billboard.image = labelForm.icon;
    closeDialog();
  }
};

/**
 * 修改地图样式
 * @param options - 地图样式选项
 * @param brightness - 亮度，默认 0.65
 * @param contrast - 对比度，默认 1.6
 * @param gamma - 伽马值，默认 0.4
 * @param hue - 色调，默认 0
 * @param saturation - 饱和度，默认 0
 * @param invertColor - 是否反色，默认 false
 * @param filterRGB - RGB 滤镜值，默认 []
 */
const modifyMap = (options: {
  brightness?: number;
  contrast?: number;
  gamma?: number;
  hue?: number;
  saturation?: number;
  invertColor?: boolean;
  filterRGB?: number[];
}) => {
  const viewer = map.getViewer();
  const baseLayer = viewer.imageryLayers.get(0);
  baseLayer.brightness = options.brightness || 0.65;
  baseLayer.contrast = options.contrast || 1.6;
  baseLayer.gamma = options.gamma || 0.4;
  baseLayer.hue = options.hue || 0;
  baseLayer.saturation = options.saturation || 0;
  const baseFragShader =
    //@ts-ignore
    viewer.scene.globe._surfaceShaderSet.baseFragmentShaderSource.sources;
  for (let i = 0; i < baseFragShader.length; i++) {
    const strS = "color = czm_saturation(color, textureSaturation);\n#endif\n";
    let strT = "color = czm_saturation(color, textureSaturation);\n#endif\n";
    if (options.invertColor) {
      strT += `
      color.r = 1.0 - color.r;
      color.g = 1.0 - color.g;
      color.b = 1.0 - color.b;
      `;
    }
    if (options.filterRGB.length > 0) {
      strT += `
      color.r = color.r * ${options.filterRGB[0]}.0/255.0;
      color.g = color.g * ${options.filterRGB[1]}.0/255.0;
      color.b = color.b * ${options.filterRGB[2]}.0/255.0;
      `;
    }
    baseFragShader[i] = baseFragShader[i].replace(strS, strT);
  }
};

const { VITE_MAPSOURE_PATH } = import.meta.env;
const token = "90337e832b82376dbe9021d3409af096";
const baseLayers = ref([
  {
    type: "vec",
    name: "矢量底图",
    active: false,
    img: "bg_map2",
    modifyMap: false,
    urls: [
      {
        layer: "vec",
        template: true,
        // mapSource: true,
        // 开发环境使用 /gdMap 代理访问本地 GaoDe 瓦片目录。
        url: `${VITE_MAPSOURE_PATH}/{z}/{x}/{y}.png`
        // url: `https://t0.tianditu.gov.cn/vec_w/wmts?from=baselayer&tk=${token}` //底图
      }
    ]
  },
  {
    type: "img",
    name: "天地图影像",
    active: false,
    img: "bg_map1",
    urls: [
      {
        layer: "img",
        template: false,
        url: `https://t0.tianditu.gov.cn/img_w/wmts?from=baselayer&tk=${token}` //底图
      },
      {
        layer: "cia",
        template: false,
        url: `https://t0.tianditu.gov.cn/cia_w/wmts?from=baselayer&tk=${token}` //注记
      }
    ]
  },
  {
    type: "ter",
    name: "天地图地形",
    active: false,
    img: "bg_map3",
    urls: [
      {
        layer: "ter",
        template: false,
        url: `https://t0.tianditu.gov.cn/ter_w/wmts?from=baselayer&tk=${token}` //底图
      },
      {
        layer: "cta",
        template: false,
        url: `https://t0.tianditu.gov.cn/cta_w/wmts?from=baselayer&tk=${token}` //注记
      }
    ]
  }
]);
let showBtn = ref(false);
const toolList = ref<any[]>([
  {
    type: "setting",
    content: "工具",
    icon: "icon-shezhi",
    checked: false,
    show: true,
    children: [
      {
        type: "marking",
        content: "标注",
        icon: "icon-dot",
        checked: false,
        itemClick: () => {
          addMapMarker();
          showBtn.value = false;
        }
      },
      {
        type: "timeout",
        content: "定时器",
        icon: "icon-shezhi",
        checked: false,
        itemClick: () => {
          timerRef.value.showDialog();
          showBtn.value = false;
        }
      },
      // {
      //   type: "timeline",
      //   content: "时序",
      //   icon: "icon-paixu",
      //   checked: false,
      //   itemClick: (tool?: any) => {
      //     bus.emit("showTimeSequence", tool.checked);
      //     tool.checked = !tool.checked;
      //   }
      // },
      // {
      //   type: "timeline",
      //   content: "时序",
      //   icon: "icon-paixu",
      //   checked: false,
      //   itemClick: (tool?: any) => {
      //     // bus.emit("handleAnalysis", tool.checked);
      //     tool.checked = !tool.checked;
      //     showBtn.value = !showBtn.value;
      //     // message("请先选择分析方式，点或框选区域", { type: "warning" });
      //   }
      // },
      {
        type: "delete",
        content: "清除",
        icon: "icon-shanchu",
        checked: false,
        itemClick: () => {
          const viewer = map.getViewer();
          map.removeLocalImageLayers();
          layerStore.cleaLoadEntitys();
          if (entity) {
            viewer.entities.removeAll();
            entity = null;
            showBtn.value = false;
          }
        }
      }
    ],
    itemClick: tool => {
      tool.checked = !tool.checked;
      showBtn.value = false;
    }
  },
  {
    type: "legend",
    content: "图例",
    icon: "icon-tuli",
    checked: false,
    show: true,
    itemClick: tool => {
      bus.emit("showOrHideLegend", tool.checked);
      tool.checked = !tool.checked;
    }
  }
]);

const toLocation = () => {
  map.toLocation();
};

const switchBaseMap = m => {
  baseLayers.value.forEach(layer => (layer.active = layer.type === m.type));
  map.switchLayer(m);
  if (m.modifyMap) {
    modifyMap({
      brightness: 0.65,
      contrast: -2,
      gamma: 3,
      hue: 0,
      saturation: 0,
      invertColor: false,
      filterRGB: [] //滤镜值
    });
  }
};

const zoom = dir => {
  const viewer = map.getViewer();
  const position = viewer.camera.positionCartographic;
  if (dir) {
    viewer.camera.moveForward(position.height * 0.5);
  } else {
    viewer.camera.moveBackward(position.height * 0.5);
  }
};

bus.on("switchBaseMap", () => {
  switchBaseMap(baseLayers.value[0]);
});

onMounted(() => {
  map.readyPromise.then(() => {
    switchBaseMap(baseLayers.value[0]);
  });
});
</script>

<style lang="less" scoped>
.map-toolbar {
  position: absolute;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  bottom: 15px;
  height: 30px;
  display: flex;
  width: 40vw;
  justify-content: space-around;
  z-index: 99;

  // .toolbar-top,
  // .toolbar-bottom {
  //   border: 0.5px solid rgba(210, 210, 212);
  //   // padding: 0 5px;
  // }

  .toolbar-group {
    overflow: hidden;
    background: linear-gradient(
      180deg,
      rgba(145, 200, 239, 0.6),
      rgb(129, 193, 239),
      rgb(19, 140, 239)
    );
    color: #fff;
    display: flex;

    .icon {
      position: relative;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 30px;
      line-height: 30px;
      min-width: 60px;
      text-align: center;
      text-wrap: nowrap;
      cursor: pointer;
      // color: #545353;
      // border: 0.5px solid rgba(254, 254, 255, 0.8);

      .iconfont {
        // color: #545353;
        padding: 0 10px;
        padding-right: 0;
      }

      .text {
        padding: 0 10px;
        font-size: 14px;
        font-weight: 100;
        // font-family: YouSheBiaoTiHei;
        // color: #545353;
      }

      &:hover,
      &.active {
        background: rgb(145, 200, 239, 0.3);
        // color: #545353;
        // .text {
        // color: #545353;
        // }

        .iconfont {
          color: var(--color-primary);
        }
      }

      &:after {
        content: "";
        position: absolute;
        left: 8px;
        bottom: 0;
        width: 20px;
        height: 1px;
        background: var(--color-border);
      }
    }
  }
}
.text-center {
  position: relative;
  .tool_box {
    display: flex;
    flex-wrap: nowrap;
  }
}
.map-layer {
  display: flex;
  padding: 10px;
  padding-right: 0;

  .item {
    position: relative;
    margin: 0 12px 0 0;
    width: 80px;
    height: 80px;
    overflow: hidden;
    cursor: pointer;
    border-radius: 4px;
    border: 2px solid rgba(0, 0, 0, 0.2);

    &:hover,
    &.active {
      // border: 1px solid rgba(255, 255, 255, 0.6);

      .txt {
        background: rgba(4, 66, 205, 0.8);
        color: aliceblue;
      }
    }

    img {
      width: 100%;
      height: 100%;
    }

    .txt {
      position: absolute;
      right: 0;
      bottom: 0;
      padding: 0 2px;
      line-height: 16px;
      color: #ffffff;
      background: rgba(0, 0, 0, 0.6);
      border-radius: 2px 0 0 0;
    }
  }
}
.analysis-mode-panel {
  position: absolute;
  left: 100%;
  top: 50%;
  // border: 2px solid rgba(255, 255, 255, 0.6);
  background: linear-gradient(
    180deg,
    rgba(145, 200, 239, 0.6),
    rgb(129, 193, 239),
    rgb(19, 140, 239)
  );
  color: #fff;
}

.analysis-mode-btn {
  min-width: 60px;
  padding: 6px 14px;
  color: aliceblue;
  font-size: 14px;
  line-height: 1;
  cursor: pointer;
  user-select: none;
  border: 1px solid rgba(255, 255, 255, 0.6);
}

.analysis-mode-btn:last-child {
  border-right: 0;
}

.analysis-mode-btn.active {
  color: #fff;
  background: linear-gradient(
    180deg,
    rgba(145, 200, 239, 0.6),
    rgb(129, 193, 239),
    rgb(19, 140, 239)
  );
  color: #fff;
}
:deep(.tooltip_class.is-light) {
  /* Set padding to ensure the height is 32px */
  padding: 6px 12px;
  // background: #008ada;
}
// .el-popper.is-light .el-popper__arrow:before
:deep(.tooltip_class.is-light .el-popper__arrow) {
  &:before {
    // background: #008ada;
    right: 0;
  }
}

:deep(.el-tooltip__trigger) {
  border-right: #fff solid 1px;
  &:last-child {
    border-width: 0;
  }
}
</style>

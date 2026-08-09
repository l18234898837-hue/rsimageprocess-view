<template>
  <div>
    <div class="item-row">
      <el-select v-model="localType" placeholder="请选择">
        <el-option
          v-for="item in options"
          :key="item.value"
          :label="item.label"
          :value="item.value"
        />
      </el-select>
    </div>
    <div v-if="localType === 1" class="item-row map-select mt-[10px]">
      <div
        v-for="(tool, idx) in drawTools"
        :key="idx"
        class="tool-item item"
        @click="draw(tool)"
      >
        <span class="tool-name">{{ tool.name }}</span>
        <div :class="['icon', tool.active ? 'active' : '']">
          <i :class="['iconfont', tool.icon, 'hover:text-[#5cdcff]']" />
        </div>
      </div>
    </div>
    <div v-else-if="localType === 2" class="item-row">
      <el-row>
        <el-col :span="11">
          <el-select v-model="prov" placeholder="省" style="width: 100%">
            <el-option
              v-for="(region, idx) in regionList"
              :key="idx"
              :label="region.name"
              :value="region.code"
            />
          </el-select>
        </el-col>
        <el-col :span="2" />
        <el-col :span="11">
          <el-select v-model="city" placeholder="市" style="width: 100%">
            <el-option
              v-for="(city, idx) in cityList"
              :key="idx"
              :label="city.name"
              :value="city.code"
            />
          </el-select>
        </el-col>
      </el-row>
    </div>
    <div v-else-if="localType === 3" class="item-row">
      <el-row>
        <el-col :span="4">经度</el-col>
        <el-col :span="9">
          <el-input v-model="minLon" placeholder="请输入" />
        </el-col>
        <el-col class="line" :span="2">-</el-col>
        <el-col :span="9">
          <el-input v-model="maxLon" placeholder="请输入" />
        </el-col>
      </el-row>
      <el-row>
        <el-col :span="4">纬度</el-col>
        <el-col :span="9">
          <el-input v-model="minLat" placeholder="请输入" />
        </el-col>
        <el-col class="line" :span="2">-</el-col>
        <el-col :span="9">
          <el-input v-model="maxLat" placeholder="请输入" />
        </el-col>
      </el-row>
    </div>
    <div v-else-if="localType === 5" class="item-row">
      <el-tree-select
        ref="islandTreeRef"
        v-model="islands"
        :data="selectTree"
        :show-checkbox="true"
        :multiple="true"
        default-expand-all
        check-on-click-node
        :expand-on-click-node="false"
        node-key="id"
        clearable
        :props="{ children: 'children', label: 'standardName', value: 'id' }"
        style="width: 100%"
        @check-change="onTreeNode"
      />
    </div>
    <div v-else class="item-row">
      <el-row>
        <el-col :span="4">path</el-col>
        <el-col :span="9">
          <el-input v-model="minPath" placeholder="请输入" />
        </el-col>
        <el-col class="line" :span="1" />
        <el-col :span="10">
          <el-input v-model="maxPath" placeholder="请输入" />
        </el-col>
      </el-row>
      <el-row>
        <el-col :span="4">row</el-col>
        <el-col :span="9">
          <el-input v-model="minRow" placeholder="请输入" />
        </el-col>
        <el-col class="line" :span="1" />
        <el-col :span="10">
          <el-input v-model="maxRow" placeholder="请输入" />
        </el-col>
      </el-row>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { computed, onBeforeMount, onBeforeUnmount, ref } from "vue";
import { getRegionTree, getStIslandInfoTree } from "@/api/dataSource/legend";
import { toCircleWkt4326 } from "@/api/dataSource/panel/online";
import map from "@/libs/tdtmap";
import * as Cesium from "cesium";
import { message } from "@/utils/message";
import bus from "@/utils/bus";

const emit = defineEmits<{ spatialClear: [] }>();

interface Point {
  lng: number;
  lat: number;
  alt: number;
}
const islandTreeRef = ref();
const localType = ref(1);
const options = [
  { value: 1, label: "地图选择" },
  // { value: 5, label: "岛礁" },
  // { value: 2, label: "行政区" },
  { value: 3, label: "经纬度" }
  // { value: 4, label: "带条号" }
];

const drawTools = ref([
  // {
  //   type: 1,
  //   name: "点",
  //   mode: "point",
  //   icon: "icon-dot",
  //   active: false
  // },
  // {
  //   type: 2,
  //   name: "线",
  //   mode: "linestring",
  //   icon: "icon-huaxian",
  //   active: false
  // },
  {
    type: 3,
    name: "矩形",
    mode: "rectangle",
    icon: "icon-rect",
    active: false
  },
  {
    type: 4,
    name: "圆形",
    mode: "circle",
    icon: "icon-huayuan",
    active: false
  },
  {
    type: 5,
    name: "多边形",
    mode: "polygon",
    icon: "icon-polygon",
    active: false
  },
  {
    type: 6,
    name: "清除",
    mode: "clear",
    icon: "icon-shanchu",
    active: false
  }
]);
//经纬度范围
const minLon = ref<number>();
const maxLon = ref<number>();
const minLat = ref<number>();
const maxLat = ref<number>();

//条带号范围
const minPath = ref<number>();
const maxPath = ref<number>();
const minRow = ref<number>();
const maxRow = ref<number>();

const prov = ref("0");
const islands = ref();
const city = ref("0");
const regionList = ref([]);
const selectTree = ref([]);

bus.on("resetLocalType", () => {
  localType.value = 1;
  clearHandle();
  drawTools.value.forEach(t => {
    t.active = false;
  });
  islands.value = null;

  minLon.value = null;
  maxLon.value = null;
  minLat.value = null;
  maxLat.value = null;

  minPath.value = null;
  maxPath.value = null;
  minRow.value = null;
  maxRow.value = null;
});

const onTreeNode = val => {
  const checkedNodes = islandTreeRef.value
    .getCheckedNodes()
    .filter(node => !node.children.length);

  console.log(checkedNodes);

  if (checkedNodes.length === 1) {
    geometry = {
      type: "point",
      wkt: `POINT(${val.longitude} ${val.latitude})`
    };
  } else if (checkedNodes.length > 1) {
    let wkt = "LINESTRING(";
    checkedNodes.forEach(node => {
      wkt += node.longitude + " " + node.latitude + ",";
    });
    if (wkt.endsWith(",")) {
      wkt = wkt.substring(0, wkt.length - 1);
    }
    wkt += ")";

    geometry = {
      type: "linestring",
      wkt
    };
  }
};

const cityList = computed(() => {
  return computeCityList();
});

const computeCityList = () => {
  if (prov.value && prov.value != "") {
    for (let i = 0; i < regionList.value.length; i++) {
      if (regionList.value[i].code === prov.value) {
        city.value = "0";
        return regionList.value[i].children;
      }
    }
  }
};
const initRegionTree = async () => {
  await getStIslandInfoTree().then(res => {
    // console.log(117, res.data);
    if (res?.data?.[0]?.children) {
      selectTree.value = res.data[0].children;
    } else {
      selectTree.value = [];
    }
  });
  await getRegionTree().then(res => {
    res.data.unshift({
      code: "0",
      name: "全部",
      children: [{ code: "0", name: "全部" }]
    });
    for (let i = 0; i < res.data.length; i++) {
      if (res.data[i].level === 1) {
        res.data[i].children.unshift({ code: "0", name: "全部" });
      }
    }
    regionList.value = res.data;
  });
};

//画的entity
let entity: Cesium.Entity = null;
let geometry: {
  type: string;
  wkt?: string;
  center?: { wkt: string };
  radius?: number;
} = null;

const handlerActive = ref("");

const draw = tool => {
  drawTools.value.some(t => t.active) ? bus.emit("formReset") : false;
  drawTools.value.forEach(t => {
    if (tool.type !== 6) {
      t.active = tool.type === t.type;
    } else {
      t.active = false;
      bus.emit("formReset");
    }
  });
  clearHandle();
  switch (tool.mode) {
    case "point":
      drawPoint(wkt => {
        geometry = { type: "point", wkt };
      });
      break;
    case "linestring":
      drawLineString(wkt => {
        geometry = { type: "linestring", wkt };
      });
      break;
    case "circle":
      drawCircle(async geo => {
        const wkt = await toCircleWkt4326({
          centerWkt: geo.center.wkt,
          radius: geo.radius
        }).then(res => res.data);

        geometry = {
          type: "circle",
          wkt,
          center: geo.center,
          radius: geo.radius
        };
      });
      break;
    case "polygon":
      drawPolygon(wkt => {
        geometry = { type: "polygon", wkt };
      });
      break;
    case "rectangle":
      drawRect(wkt => {
        geometry = {
          type: "rectangle",
          wkt
        };
      });
      break;
  }
};

/**
 * 画点
 */
const drawPoint = (callback: (wkt: string) => void) => {
  const viewer = map.getViewer();
  let position;
  const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
  //单击鼠标左键画点
  handler.setInputAction(event => {
    position = viewer.camera.pickEllipsoid(
      event.position,
      viewer.scene.globe.ellipsoid
    );
    if (!entity) {
      entity = viewer.entities.add({
        position: position,
        point: {
          color: Cesium.Color.BLUE,
          pixelSize: 6,
          show: true,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
        }
      });
    } else {
      (entity.position as Cesium.ConstantPositionProperty).setValue(position);
    }
    const point = cartesian3toWGS84(position);
    callback(`POINT(${point.lng} ${point.lat})`);
    handler.destroy();
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
  //单击鼠标右键结束画点
  /*handler.setInputAction(() => {
    handler.destroy();
  }, Cesium.ScreenSpaceEventType.RIGHT_CLICK);*/
};

/**
 * 画线
 * @param callback
 */
const drawLineString = (callback: (wkt: string) => void) => {
  const viewer = map.getViewer();

  class PolyLinePrimitive {
    private readonly positions;
    private readonly options;

    constructor(positions) {
      this.options = {
        polyline: {
          clampToGround: true,
          positions: [],
          material: Cesium.Color.BLUE,
          width: 2
        }
      };
      this.positions = positions;
      this.init();
    }

    init() {
      const _update = () => {
        return this.positions;
      };
      this.options.polyline.positions = new Cesium.CallbackProperty(
        _update,
        false
      );
      entity = viewer.entities.add(this.options);
    }
  }

  const handler = new Cesium.ScreenSpaceEventHandler(
    map.getViewer().scene.canvas
  );
  const positions = [];
  let poly = undefined;
  //鼠标左键单击画点
  handler.setInputAction(event => {
    const cartesian = viewer.scene.camera.pickEllipsoid(
      event.position,
      viewer.scene.globe.ellipsoid
    );
    if (positions.length == 0) {
      positions.push(cartesian.clone());
    }
    positions.push(cartesian);
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
  //鼠标移动
  handler.setInputAction(event => {
    const cartesian = viewer.scene.camera.pickEllipsoid(
      event.endPosition,
      viewer.scene.globe.ellipsoid
    );
    if (positions.length >= 2) {
      if (!Cesium.defined(poly)) {
        poly = new PolyLinePrimitive(positions);
      } else {
        if (cartesian != undefined) {
          positions.pop();
          cartesian.y += 1 + Math.random();
          positions.push(cartesian);
        }
      }
    }
  }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
  //单击鼠标右键结束画线
  handler.setInputAction(() => {
    handler.destroy();
    let wkt = "LINESTRING(";
    positions.forEach(position => {
      const point = cartesian3toWGS84(position);
      wkt += point.lng + " " + point.lat + ",";
    });
    if (wkt.endsWith(",")) {
      wkt = wkt.substring(0, wkt.length - 1);
    }
    wkt += ")";
    callback(wkt);
  }, Cesium.ScreenSpaceEventType.RIGHT_CLICK);
};

/**
 * 画面
 * @param callback
 */
const drawPolygon = (callback: (wkt: string) => void) => {
  if (handlerActive.value) {
    message("请先鼠标右键结束当前绘制！", { type: "warning" });
    drawTools.value.forEach(t => {
      t.active = false;
      if (t.mode == handlerActive.value) {
        t.active = true;
      }
    });
    return;
  }
  handlerActive.value = "polygon";
  const viewer = map.getViewer();

  class PolygonPrimitive {
    private readonly options;
    private readonly hierarchy;

    constructor(positions) {
      this.options = {
        id: "drawEntity",
        name: "多边形",
        polygon: {
          hierarchy: new Cesium.PolygonHierarchy([]),
          show: true,
          material: Cesium.Color.BLUE.withAlpha(0.5),
          outline: true,
          outlineColor: Cesium.Color.BLUE,
          outlineWidth: 3,
          height: 0,
          extrudedHeight: 0
        }
      };
      this.hierarchy = new Cesium.PolygonHierarchy(positions);
      this.init();
    }

    init() {
      const _update = () => {
        return this.hierarchy;
      };
      //实时更新polygon.hierarchy
      this.options.polygon.hierarchy = new Cesium.CallbackProperty(
        _update,
        false
      );
      entity = viewer.entities.add(this.options);
    }
  }

  const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
  const positions = [];
  let poly = undefined;
  //鼠标左键单击画点
  handler.setInputAction(event => {
    const cartesian = viewer.scene.camera.pickEllipsoid(
      event.position,
      viewer.scene.globe.ellipsoid
    );
    if (positions.length == 0) {
      positions.push(cartesian.clone());
    }
    positions.push(cartesian);
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
  //鼠标移动
  handler.setInputAction(event => {
    const cartesian = viewer.scene.camera.pickEllipsoid(
      event.endPosition,
      viewer.scene.globe.ellipsoid
    );
    if (positions.length >= 2) {
      if (!Cesium.defined(poly)) {
        poly = new PolygonPrimitive(positions);
      } else {
        if (cartesian != undefined) {
          positions.pop();
          cartesian.y += 1 + Math.random();
          positions.push(cartesian);
        }
      }
    }
  }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
  //单击鼠标右键结束画线
  handler.setInputAction(() => {
    handler.destroy();
    handlerActive.value = "";
    if (positions.length < 3) {
      message("请至少绘制3个点！", { type: "warning" });
      drawTools.value.forEach(t => {
        t.active = false;
      });
      return;
    }
    //往数组后面加入第一个点，让面首尾相连
    positions.push(positions[0]);
    console.log(positions);
    let wkt = "POLYGON((";
    positions.forEach(position => {
      const point = cartesian3toWGS84(position);
      wkt += point.lng + " " + point.lat + ",";
    });
    if (wkt.endsWith(",")) {
      wkt = wkt.substring(0, wkt.length - 1);
    }
    wkt += "))";
    callback(wkt);
  }, Cesium.ScreenSpaceEventType.RIGHT_CLICK);
};
/**
 * 画圆
 * @param callback
 */
const drawCircle = (
  callback: (geo: { center: { wkt: string }; radius: number }) => void
) => {
  if (handlerActive.value) {
    message("请先鼠标右键结束当前绘制！", { type: "warning" });
    drawTools.value.forEach(t => {
      t.active = false;
      if (t.mode == handlerActive.value) {
        t.active = true;
      }
    });
    return;
  }
  handlerActive.value = "circle";
  const viewer = map.getViewer();
  // viewer.scene.globe.depthTestAgainstTerrain = true; //添加边框，就不要设置此项（深度检测），以免导致实体显示异常
  const circle = {
    points: [],
    rect: null,
    r: 1
  };
  const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
  let tempPosition, cartographic1, tempLon, tempLat;
  handler.setInputAction(event => {
    tempPosition = getPointFromWindowPoint(event.position);
    //选择的点在球面上
    if (tempPosition) {
      const callBackPos = () => {
        const minLon = Cesium.Math.toDegrees(circle.points[0].longitude);
        const minLat = Cesium.Math.toDegrees(circle.points[0].latitude);
        const maxLon = Cesium.Math.toDegrees(circle.points[1].longitude);
        const maxLat = Cesium.Math.toDegrees(circle.points[1].latitude);
        const r = getFlatternDistance(minLat, minLon, maxLat, maxLon);
        if (r) {
          return r;
        }
        return 1;
      };
      if (circle.points.length == 0) {
        cartographic1 =
          Cesium.Ellipsoid.WGS84.cartesianToCartographic(tempPosition);
        circle.points.push(
          viewer.scene.globe.ellipsoid.cartesianToCartographic(tempPosition)
        );
        circle.points.push(
          viewer.scene.globe.ellipsoid.cartesianToCartographic(tempPosition)
        );
        tempLon = Cesium.Math.toDegrees(cartographic1.longitude);
        tempLat = Cesium.Math.toDegrees(cartographic1.latitude);
        entity = viewer.entities.add({
          id: "drawEntity",
          position: Cesium.Cartesian3.fromDegrees(tempLon, tempLat),
          ellipse: {
            semiMinorAxis: new Cesium.CallbackProperty(callBackPos, false),
            semiMajorAxis: new Cesium.CallbackProperty(callBackPos, false),
            material: Cesium.Color.BLUE.withAlpha(0.5),
            outline: true,
            outlineColor: Cesium.Color.BLUE,
            outlineWidth: 1,
            height: 0
          }
        });
      } else {
        handler.destroy();
        handlerActive.value = "";
        // const tempCircle = new Cesium.CircleOutlineGeometry({
        //   center: Cesium.Cartesian3.fromDegrees(tempLon, tempLat),
        //   radius: callBackPos(),
        //   granularity: Math.PI / 2
        // });
        // const geometry =
        //   Cesium.CircleOutlineGeometry.createGeometry(tempCircle);
        // const float64ArrayPositionsIn = geometry.attributes.position.values;
        // const positionsIn = [].slice.call(float64ArrayPositionsIn);
        callback({
          center: { wkt: `POINT(${tempLon} ${tempLat})` },
          radius: callBackPos()
        });
      }
    }
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

  //鼠标右键结束
  handler.setInputAction(event => {
    handler.destroy();
    handlerActive.value = "";
    drawTools.value.forEach(t => {
      t.active = false;
    });
    clearHandle();
  }, Cesium.ScreenSpaceEventType.RIGHT_CLICK);

  handler.setInputAction(event => {
    if (circle.points.length == 0) return;
    const moveEndPosition = getPointFromWindowPoint(event.endPosition);
    //选择的点在球面上
    if (moveEndPosition) {
      circle.points.pop();
      circle.points.push(
        viewer.scene.globe.ellipsoid.cartesianToCartographic(moveEndPosition)
      );
    }
  }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
};

/**
 * 画矩形
 * @param callback
 */
const drawRect = (callback: (wkt: string) => void) => {
  if (handlerActive.value) {
    message("请先鼠标右键结束当前绘制！", { type: "warning" });
    drawTools.value.forEach(t => {
      t.active = false;
      if (t.mode == handlerActive.value) {
        t.active = true;
      }
    });
    return;
  }
  handlerActive.value = "rectangle";
  const viewer = map.getViewer();
  const pointsArr = [];
  const shape = {
    points: [],
    rect: null
  };
  const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
  //鼠标左键单击画点
  handler.setInputAction(event => {
    const tempPosition = getPointFromWindowPoint(event.position);
    //选择的点在球面上
    if (tempPosition) {
      if (shape.points.length == 0) {
        pointsArr.push(tempPosition);
        shape.points.push(
          viewer.scene.globe.ellipsoid.cartesianToCartographic(tempPosition)
        );
        shape.rect = Cesium.Rectangle.fromCartographicArray(shape.points);
        shape.rect.east += 0.000001;
        shape.rect.north += 0.000001;
        entity = viewer.entities.add({
          id: "drawEntity",
          rectangle: {
            coordinates: new Cesium.CallbackProperty(() => shape.rect, false),
            material: Cesium.Color.BLUE.withAlpha(0.5),
            show: true,
            outline: true,
            outlineColor: Cesium.Color.BLUE,
            outlineWidth: 3,
            height: 0,
            extrudedHeight: 0
          }
        });
      } else {
        handler.destroy();
        handlerActive.value = "";
        const points: Array<Point> = pointsArr.map(p => cartesian3toWGS84(p));
        callback(
          `POLYGON((${points[0].lng} ${points[0].lat},${points[0].lng} ${points[1].lat},${points[1].lng} ${points[1].lat},${points[1].lng} ${points[0].lat},${points[0].lng} ${points[0].lat}))`
        );
      }
    }
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

  //鼠标右键结束
  handler.setInputAction(event => {
    handler.destroy();
    handlerActive.value = "";
    drawTools.value.forEach(t => {
      t.active = false;
    });
    clearHandle();
  }, Cesium.ScreenSpaceEventType.RIGHT_CLICK);

  //鼠标移动
  handler.setInputAction(event => {
    if (shape.points.length == 0) return;
    const moveEndPosition = getPointFromWindowPoint(event.endPosition);
    //选择的点在球面上
    if (moveEndPosition) {
      pointsArr[1] = moveEndPosition;
      shape.points[1] =
        viewer.scene.globe.ellipsoid.cartesianToCartographic(moveEndPosition);
      shape.rect = Cesium.Rectangle.fromCartographicArray(shape.points);
      if (shape.rect.west == shape.rect.east) {
        shape.rect.east += 0.000001;
      }
      if (shape.rect.south == shape.rect.north) {
        shape.rect.north += 0.000001;
      }
    }
  }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
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

/*const WGS84toCartesian3 = (point: {
  lat: number;
  lng: number;
  alt: number;
}) => {
  const cartesian3 = Cesium.Cartesian3.fromDegrees(
    point.lng,
    point.lat,
    point.alt
  );
  return cartesian3;
};*/
const clearHandle = () => {
  console.log("进入clearHandle");

  const viewer = map.getViewer();
  //移除所有实体Entity
  if (entity) {
    viewer.entities.remove(entity);
    // viewer.entities.removeAll();
    entity = null;
  }
  if (geometry) {
    geometry = null;
  }
  // 卫星轨道页等：由父组件监听，同步清除过境多边形（useRightHook polygonEntityArr）等
  emit("spatialClear");
};

const getPointFromWindowPoint = (point: Cesium.Cartesian3) => {
  const viewer = map.getViewer();
  if (
    viewer.scene.terrainProvider.constructor.name === "EllipsoidTerrainProvider"
  ) {
    return viewer.camera.pickEllipsoid(point, viewer.scene.globe.ellipsoid);
  } else {
    const ray = viewer.scene.camera.getPickRay(point);
    return viewer.scene.globe.pick(ray, viewer.scene);
  }
};

/**
 * 计算两点间的距离
 * @param lat1
 * @param lng1
 * @param lat2
 * @param lng2
 */
const getFlatternDistance = (lat1, lng1, lat2, lng2) => {
  const EARTH_RADIUS = 6378137.0; //单位M
  const PI = Math.PI;
  const getRad = d => {
    return (d * PI) / 180.0;
  };
  const f = getRad((lat1 + lat2) / 2);
  const g = getRad((lat1 - lat2) / 2);
  const l = getRad((lng1 - lng2) / 2);
  let sg = Math.sin(g);
  let sl = Math.sin(l);
  let sf = Math.sin(f);
  const a = EARTH_RADIUS;
  const fl = 1 / 298.257;
  sg = sg * sg;
  sl = sl * sl;
  sf = sf * sf;
  const s = sg * (1 - sl) + (1 - sf) * sl;
  const c = (1 - sg) * (1 - sl) + sf * sl;
  const w = Math.atan(Math.sqrt(s / c));
  const r = Math.sqrt(s * c) / w;
  const d = 2 * w * a;
  const h1 = (3 * r - 1) / 2 / c;
  const h2 = (3 * r + 1) / 2 / s;
  return d * (1 + fl * (h1 * sf * (1 - sg) - h2 * (1 - sf) * sg));
};

/**
 * 得到选中的空间位置
 */
const getSpatial = () => {
  const local = {
    type: localType.value,
    value: undefined
  };
  if (localType.value === 1) {
    //地图选择
    if (entity && geometry) {
      //得到当前是哪种选中方式
      local.value = geometry;
    } else {
      local.value = {
        type: "no"
      };
      // message("没有选中任何图形", { type: "error" });
      // return;
    }
  } else if (localType.value === 2) {
    //行政区划
    if (!prov.value || !city.value) {
      message("没有选中省市", { type: "error" });
      return;
    }
    local.value = {
      prov: prov.value,
      city: city.value
    };
  } else if (localType.value === 3) {
    //经纬度
    if (
      !(
        isNumber(minLon.value) &&
        isNumber(maxLon.value) &&
        isNumber(minLat.value) &&
        isNumber(maxLat.value)
      )
    ) {
      message("请检查经纬度填写是否正确", { type: "error" });
      return;
    }
    local.value = {
      type: "lngLat",
      wkt: `POLYGON((${minLon.value} ${minLat.value},${minLon.value} ${maxLat.value},${maxLon.value} ${maxLat.value},${maxLon.value} ${minLat.value},${minLon.value} ${minLat.value}))`
    };
  } else if (localType.value === 4) {
    //条带号
    if (
      !(
        isNumber(minPath.value) &&
        isNumber(maxPath.value) &&
        isNumber(minRow.value) &&
        isNumber(maxRow.value)
      )
    ) {
      message("请检查条带号填写是否正确", { type: "error" });
      return;
    }
    local.value = {
      minPath: minPath.value,
      maxPath: maxPath.value,
      minRow: minRow.value,
      maxRow: maxRow.value
    };
  } else if (localType.value === 5) {
    local.value = geometry;
    local.type = 1;
  }
  return local;
};

defineExpose({ getSpatial });
const isNumber = val => {
  if (!val || val == "") {
    return false;
  }
  return true;
};
onBeforeMount(() => {
  initRegionTree();
});

onBeforeUnmount(() => {
  clearHandle();
});
</script>
<style lang="scss" scoped>
.map-select {
  display: flex;
  flex-flow: row wrap;
  // position: relative;
  // left: -20px;
  // width: calc(100% + 30px) !important;

  .tool-item {
    display: flex;
    align-items: center;
    margin-left: 10px;

    .tool-name {
      white-space: nowrap;
    }

    .icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      margin-left: 2px;
      cursor: pointer;

      .iconfont {
        font-size: 22px;
      }

      &.active,
      &:hover {
        color: #5cdcff;
      }
    }
  }
}

.add-data {
  display: flex;
  align-items: center;

  .icon {
    display: flex;
    align-items: center;
    cursor: pointer;

    .iconfont {
      font-size: 14px;
      color: var(--color-primary);
    }
  }

  .txt {
    padding: 0 6px;
    color: var(--color-gray-txt3);

    &.active {
      color: var(--color-gray-txt4);
    }
  }
}

.item-row {
  width: 100%;
  line-height: 36px;
  color: var(--color-gray-txt4);

  .el-row {
    &:first-child {
      margin: 10px 0 0;
    }

    &:last-child {
      margin-top: 10px;
    }
  }
}
</style>

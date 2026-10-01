import * as Cesium from "cesium";
import UrlTemplateMapboxVectorTileImageryProvider from "@/libs/MapboxVectorTileImageryProvider";
import bus from "@/utils/bus";
import { message } from "@/utils/message";
import { type Layer, DATA_TYPE } from "@/components/LayerList/layers";
import type { VectorTileFeature } from "@mapbox/vector-tile";
import { useLayerStoreHook } from "@/store/modules/layer";
import dayjs from "dayjs";
import map_label_2 from "/images/map_label/map_label_2.png";

const getLayerStore = () => useLayerStoreHook();

/**
 * 地图属性
 */
interface Options {
  eleId?: string;
  type?: string;
  showAnnotation?: boolean;
  maximumLevel?: number;
  minimumLevel?: number;
  info?: (level?: number, lng?: number, lat?: number) => void;
}

export interface LayerInfo {
  /**
   * 图层类型：0-栅格，1-矢量
   */
  type: number;
  idx?: number;
  layer: Cesium.ImageryLayer;
  provider:
    | Cesium.UrlTemplateImageryProvider
    | UrlTemplateMapboxVectorTileImageryProvider;
  detail: Layer;
}

interface OnlineImageLayer {
  id: string | number;
  layer: Cesium.ImageryLayer;
  name?: string;
}

const defaultStyle = {
  outlineColor: Cesium.Color.RED,
  outlineWidth: 8,
  material: Cesium.Color.YELLOW.withAlpha(0.01)
};

const selectStyle = {
  outlineColor: Cesium.Color.RED,
  outlineWidth: 8,
  material: Cesium.Color.RED.withAlpha(0.01)
};
const THEMATIC_PRODUCTION_UNIT = "制作单位：中国科学院南海海洋研究所";

const loadThumbImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    if (src && !String(src).startsWith("data:")) {
      img.crossOrigin = "anonymous";
    }
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("缩略图加载失败"));
    img.src = src;
  });
/** 地图绘制产出的 GeoJSON Feature（Polygon / Point+半径） */
export type DrawGeoJsonFeature = {
  type: "Feature";
  geometry:
    | { type: "Polygon"; coordinates: number[][][] }
    | { type: "Point"; coordinates: number[] };
  properties?: Record<string, unknown>;
};

export type DrawShapeCallbackOptions = {
  beforeStart?: () => boolean;
  onCancel?: () => void;
  onComplete?: () => void;
};

class TDTMap {
  private options: Options = {
    eleId: "cesiumMap",
    type: "img",
    showAnnotation: true,
    maximumLevel: 21,
    minimumLevel: 1
  };
  //显示注记
  private showAnnotation: Boolean = true;
  public viewer: Cesium.Viewer;
  private layerMap: Map<string, LayerInfo> = new Map();
  private ready: any;
  public readyPromise: Promise<Cesium.Viewer> = new Promise<Cesium.Viewer>(
    r => (this.ready = r)
  );
  private onlineImageLayers: OnlineImageLayer[] = [];
  private localImageLayers: Array<any> = [];
  private baseLayers: Array<Cesium.ImageryLayer> = [];
  /** CesiumWind 粒子风场实例 */
  private windLayerInstance: any = null;
  private dataSource: Cesium.GeoJsonDataSource;
  private selectEntity: Cesium.Entity;
  private activeDrawHandler: Cesium.ScreenSpaceEventHandler | null = null;
  /** 最近一次绘制完成的图形 GeoJSON */
  public lastDrawGeojson: DrawGeoJsonFeature | null = null;
  private pointPickHandler: Cesium.ScreenSpaceEventHandler | null = null;
  private rectDrawHandler: Cesium.ScreenSpaceEventHandler | null = null;
  private drawHandler: Cesium.ScreenSpaceEventHandler | null = null;

  /**
   * 初始化地图
   */
  init(opts: Options) {
    Cesium.Ion.defaultAccessToken =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJkNjVmZDE4OC1jODUxLTQ4YzUtYWZmNi1kYzM2NTEwZmEyMmUiLCJpZCI6OTc2NzMsImlhdCI6MTY2MjYzMjMyM30.f3bVWbrmEijibyKTOacwePWwE2I5PQrmmbs-43C5n3k";
    this.options = Object.assign(this.options, opts);
    this.viewer = new Cesium.Viewer(this.options.eleId, {
      selectionIndicator: false, //自带的选中框
      baseLayerPicker: false, //是否显示图层选择控件
      geocoder: false, //是否显示地名查找控件
      timeline: false, //是否显示时间线控件
      homeButton: false, //是否显示Home按钮
      sceneModePicker: false, //是否显示投影方式控件(右上角地球小图标)
      navigationHelpButton: false, //是否显示帮助信息控件
      infoBox: false, //是否显示点击要素之后显示的信息
      animation: false, // 隐藏左下角的仪表盘播放动画按钮
      imageryProvider: false
      // sceneMode: Cesium.SceneMode.SCENE2D,
      // mapProjection: new Cesium.WebMercatorProjection() //2D模式下需要设置该属性
    });

    if (this.viewer.imageryLayers.length > 0) {
      this.viewer.imageryLayers.removeAll(true);
    }
    // @ts-ignore
    this.viewer.cesiumWidget.creditContainer.style.display = "none";
    this.ready(this.viewer);
    this.dataSource = new Cesium.GeoJsonDataSource();
    this.viewer.dataSources.add(this.dataSource).then(() => {});
    this.viewer.scene.backgroundColor =
      Cesium.Color.fromCssColorString("#a3ccff");
    this.toLocation();

    //限制缩放大小
    // this.viewer.scene.screenSpaceCameraController.minimumZoomDistance = 100;
    this.viewer.scene.screenSpaceCameraController.maximumZoomDistance = 30000000;

    // this.addListener();
    // this.setAction();
  }

  /**
   * 移除所有在线数据快视图
   */
  public removeImageLayers() {
    this.onlineImageLayers.forEach(({ layer }) => {
      this.viewer.imageryLayers.remove(layer, true);
    });
    this.onlineImageLayers = [];
  }

  /**
   * 移除所有本地数据快视图
   */
  public removeLocalImageLayers() {
    if (this.localImageLayers.length > 0) {
      this.localImageLayers.forEach(layer => {
        this.viewer.imageryLayers.remove(layer.layerInfo, true);
      });
    }
    this.localImageLayers = [];
    this.removeWindLayer();
    getLayerStore().clearAllLayers();
    getLayerStore().clearAllRemoteThematicRows();
    this.clearDrawEntity();
    bus.emit("hideMapAnalysis");
  }
  /**
   * 隐藏所有本地数据快视图
   */
  public hidenLocalImageLayers() {
    if (this.localImageLayers.length > 0) {
      this.localImageLayers.forEach(layer => {
        layer.layerInfo.show = false;
      });
    }
    this.localImageLayers = [];
  }

  /**
   * 将在线数据快视图添加到数组
   */
  public addImageLayers(layer: OnlineImageLayer) {
    this.onlineImageLayers.push(layer);
  }

  /**
   * 将本地数据快视图添加到数组
   */
  public addLocalImageLayers(layer) {
    this.localImageLayers.push(layer);
  }

  /**
   * 获取本地数据快视图数组
   */
  public getLocalImageLayers() {
    return this.localImageLayers;
  }

  /**
   * 获取在线数据快视图数组
   */
  public getOnlineImageLayers() {
    return this.onlineImageLayers;
  }

  public toLocation() {
    this.viewer.camera.setView({
      destination: Cesium.Rectangle.fromDegrees(109, 5, 120, 23)
    });
  }

  /**
   * 保存专题图
   */
  public saveImage() {
    this.viewer.scene.render();
    const canvas = this.viewer.scene.canvas;
    const image = canvas
      .toDataURL("image/png")
      .replace("image/png", "image/octet-stream");
    const link = document.createElement("a");
    const blob = this.dataURL2Blob(image);
    const objUrl = URL.createObjectURL(blob);
    link.download = "image.png";
    link.href = objUrl;
    link.click();
  }

  private dataURL2Blob(url: string): Blob {
    const arr = url.split(","),
      mime = arr[0].match(/:(.*?);/)[1],
      bStr = atob(arr[1]);
    let n = bStr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bStr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  }

  public hideOrShow(layerId: string, show: boolean) {
    this.removeAllHighlightAndHoverLayer();
    const layerInfo: LayerInfo = this.layerMap.get(layerId);
    if (layerInfo) {
      layerInfo.layer.show = show;
      if (layerInfo.type === 2) {
        (
          layerInfo.provider as UrlTemplateMapboxVectorTileImageryProvider
        ).show = show;
      }
    }
  }

  public removeLayer(layerId: string) {
    this.removeAllHighlightAndHoverLayer();
    return new Promise<void>(resolve => {
      const layerInfo: LayerInfo = this.layerMap.get(layerId);
      if (layerInfo) {
        this.viewer.imageryLayers.remove(layerInfo.layer, true);
        if (this.layerMap.delete(layerId)) {
          resolve();
        }
      }
    });
  }

  /**
   * 将图层向上或向下移动
   * @param idx
   * @private
   */
  private moveLayer(layer: Cesium.ImageryLayer, idx: number) {
    for (let i = 0; i < Math.abs(idx); i++) {
      idx > 0
        ? this.viewer.imageryLayers.raise(layer)
        : this.viewer.imageryLayers.lower(layer);
    }
  }

  /**
   * 对图层进行重排序
   * @param layerList
   */
  public sortLayers(layerList: Array<Layer>) {
    //重排序前，对于矢量图层需要先清理掉highlight和hover图层和隐藏属性面板
    this.removeAllHighlightAndHoverLayer();
    layerList.forEach((layer, idx) => {
      const imageLayer = this.layerMap.get(layer.id).layer;
      const layerIdx: number = this.viewer.imageryLayers.indexOf(imageLayer);
      if (layerIdx > 0) {
        //对比图层的层级，移动图层
        this.moveLayer(
          imageLayer,
          layerList.length + (this.baseLayers.length - 1) - layerIdx - idx
        );
      }
    });
  }

  /**
   * 移除地形
   */
  removeTerrain() {
    this.viewer.terrainProvider = new Cesium.EllipsoidTerrainProvider();
  }

  /**
   * 添加地形
   */
  addTerrain(options?: {
    requestWaterMask?: boolean;
    requestVertexNormals?: boolean;
    enableLighting?: boolean;
  }) {
    /*const terrainProvider = new Cesium.CesiumTerrainProvider({
      url: Cesium.IonResource.fromAssetId(3956),
      requestWaterMask: false
    });*/
    const terrainProvider = Cesium.createWorldTerrain({
      requestWaterMask: options?.requestWaterMask ?? true, // 添加水面波浪效果
      requestVertexNormals: options?.requestVertexNormals ?? true // 添加地形光照
    });
    this.viewer.terrainProvider = terrainProvider;
    this.viewer.scene.globe.enableLighting = options?.enableLighting ?? true;
  }

  removeBaseLayer() {
    if (this.baseLayers.length > 0) {
      this.baseLayers.forEach(layer => {
        this.viewer.imageryLayers.remove(layer);
      });
    }
    this.baseLayers = [];
  }

  getViewer() {
    return this.viewer;
  }

  /**
   * 添加栅格图层
   * @param layer
   * @private
   */
  private addImageLayer(layer: Layer) {
    console.log(layer.lngMin, layer.latMin, layer.lngMax, layer.latMax);
    const rectangle: Cesium.Rectangle = Cesium.Rectangle.fromDegrees(
      layer.lngMin,
      layer.latMin,
      layer.lngMax,
      layer.latMax
    );
    const provider = new Cesium.UrlTemplateImageryProvider({
      url: layer.url,
      // url: `/grid?id=${layer.id}&zoom={z}&row={y}&col={x}&pm=${JSON.stringify(
      //   layer.params
      // )}`,
      rectangle,
      minimumLevel: layer.minZoom ? layer.minZoom : this.options.minimumLevel,
      maximumLevel: layer.maxZoom ? layer.maxZoom : this.options.maximumLevel
    });
    const imageLayer = this.viewer.imageryLayers.addImageryProvider(provider);
    this.layerMap.set(layer.id, {
      detail: layer,
      type: layer.type,
      layer: imageLayer,
      provider
    });
    this.setStyles(layer);
    this.flyTo(layer.id);
  }

  /**
   * 添加矢量切片图层
   * @param layer
   * @param filter
   * @param flyTo
   * @private
   */
  private addVectorLayer(
    layer: Layer,
    filter?: (feature: VectorTileFeature) => boolean,
    notFlyTo?: boolean
  ) {
    const rectangle: Cesium.Rectangle = Cesium.Rectangle.fromDegrees(
      layer.lngMin,
      layer.latMin,
      layer.lngMax,
      layer.latMax
    );
    const provider = new UrlTemplateMapboxVectorTileImageryProvider({
      layerName: layer.name,
      url: layer.url,
      minimumLevel: layer.minZoom ? layer.minZoom : this.options.minimumLevel,
      maximumLevel: layer.maxZoom ? layer.maxZoom : this.options.maximumLevel,
      featureCount: layer.dataList[0].featureCount,
      filter: (feature: VectorTileFeature) => {
        if (filter) {
          return filter(feature);
        }
        return true;
      },
      style: (feature: VectorTileFeature) => {
        const gridCode = feature.properties[layer.legend.field];
        for (let i = 0; i < layer.legend.legendList.length; i++) {
          if (layer.legend.type === 4) {
            //矢量唯一值配色
            if (String(gridCode) === layer.legend.legendList[i].value) {
              return {
                marker: {
                  color: layer.legend.legendList[i].color
                },
                fill: {
                  color: layer.legend.legendList[i].color
                },
                line: {
                  color: layer.legend.legendList[i].color
                }
              };
            }
          } else if (layer.legend.type === 5) {
            //矢量分级配色
            if (Number(gridCode) <= Number(layer.legend.legendList[i].value)) {
              return {
                marker: {
                  color: layer.legend.legendList[i].color
                },
                fill: {
                  color: layer.legend.legendList[i].color
                },
                line: {
                  color: layer.legend.legendList[i].color
                }
              };
            }
          }
        }
      },
      highlight: () => {
        return undefined;
      },
      hover: () => {
        return undefined;
      },
      // onFeaturePicked: features => {
      //   //显示矢量的属性
      //   if (features.length > 0) {
      //     //查询矢量的字段配置，重新生成
      //     getFieldList(layer.id).then(res => {
      //       const props = [];
      //       for (let i = 0; i < res.data.length; i++) {
      //         if (res.data[i].isShow) {
      //           Object.keys(features[0].properties).forEach(key => {
      //             if (res.data[i].field === key) {
      //               const map = res.data[i].map;
      //               let value = features[0].properties[key];
      //               if (map) {
      //                 try {
      //                   const mapObj: object = JSON.parse(map);
      //                   value = Object.hasOwn(mapObj, value)
      //                     ? mapObj[value]
      //                     : value;
      //                 } catch (e) {
      //                   /* empty */
      //                 }
      //               }
      //               props.push({
      //                 field: res.data[i].label,
      //                 value: value,
      //                 unit: res.data[i].unit,
      //                 fixed: res.data[i].fixed,
      //                 fieldType: res.data[i].fieldType
      //               });
      //             }
      //           });
      //         }
      //       }
      //       bus.emit("showProperties", props);
      //     });
      //   } else {
      //     bus.emit("hideProperties");
      //   }
      // },
      rectangle
    });
    const imageryLayer = provider.addToMap(this.viewer);
    this.layerMap.set(layer.id, {
      detail: layer,
      type: layer.type,
      layer: imageryLayer,
      provider
    });
    this.setStyles(layer);
    if (!notFlyTo) {
      this.flyTo(layer.id);
    }
  }

  public flyTo(layerId: string) {
    const layerInfo: LayerInfo = this.layerMap.get(layerId);
    // console.log(layerInfo);
    if (layerInfo) {
      // debugger;
      this.viewer.camera.flyTo({
        destination: layerInfo.layer.getImageryRectangle()
      });
    }
  }

  /**
   * 设置图层样式
   * @param layer
   */
  setStyles(layer: Layer) {
    const imageryLayer = this.layerMap.get(layer.id).layer;
    layer.styles.forEach(style => {
      if (Object.hasOwn(imageryLayer, style.type)) {
        imageryLayer[style.type] = style.value / 100;
      }
    });
  }

  /**
   * 添加图层
   * @param layer
   */
  public async addLayer(layer: Layer) {
    this.removeAllHighlightAndHoverLayer();
    switch (layer.type) {
      case DATA_TYPE.Grid:
        this.addImageLayer(layer);
        break;
      case DATA_TYPE.Image:
        this.addImageLayer(layer);
        break;
      case DATA_TYPE.Vec:
        this.addVectorLayer(layer);
        break;
      case DATA_TYPE.Windy:
        break;
      default:
        throw new Error("未知的图层类型");
    }
  }

  /**
   * 切换底图
   */
  public switchLayer(map) {
    //首先移除原来的底图
    this.removeBaseLayer();
    for (let i = map.urls.length - 1; i >= 0; i--) {
      let provider = null;
      if (map.urls[i].template) {
        provider = new Cesium.UrlTemplateImageryProvider({
          url: map.urls[i].url,
          subdomains: ["a", "b", "c", "d"]
        });
      } else {
        provider = new Cesium.WebMapTileServiceImageryProvider({
          url: map.urls[i].url,
          layer: map.urls[i].layer,
          style: "default",
          tileMatrixSetID: "w",
          format: "tiles"
        });
      }
      //添加图层
      const baseLayer = this.viewer.imageryLayers.addImageryProvider(provider);
      if (map.urls[i].setFilter) {
        map.urls[i].setFilter();
      } else {
        document.getElementById("cesiumMap").style.filter = "";
      }
      if (map.urls[i].hue) {
        baseLayer.hue = map.urls[i].hue;
      }
      if (map.urls[i].contrast) {
        baseLayer.contrast = map.urls[i].contrast;
      }
      this.viewer.imageryLayers.lowerToBottom(baseLayer);
      this.baseLayers.push(baseLayer);
    }
  }

  /**
   * 移除所有矢量图层中的highlight和hover图层
   * 在对图层进行添加、移除、排序等操作前，先移除矢量图层中的highlight和hover图层
   * @private
   */
  private removeAllHighlightAndHoverLayer() {
    this.layerMap.forEach(info => {
      if (info.type === DATA_TYPE.Vec) {
        //如果类型为矢量图层
        const provider =
          info.provider as UrlTemplateMapboxVectorTileImageryProvider;
        provider.removeHighlightAndHoverLayer();
      }
    });
    //隐藏属性显示框
    bus.emit("hideProperties");
  }

  /**
   * 移除所有除底图外的图层
   */
  public removeAllLayer() {
    this.removeAllHighlightAndHoverLayer();
    this.layerMap.forEach(info => {
      this.viewer.imageryLayers.remove(info.layer, false);
    });
  }

  /**
   * 将移除的图层重新添加回来
   */
  public reAddAllLayer(layerList: Array<Layer>) {
    for (let i = layerList.length - 1; i >= 0; i--) {
      const info = this.layerMap.get(layerList[i].id);
      info.layer.splitDirection = Cesium.SplitDirection.NONE;
      info.layer.show = layerList[i].show;
      this.viewer.imageryLayers.add(info.layer);
      if (info.type === DATA_TYPE.Vec) {
        const provider =
          info.provider as UrlTemplateMapboxVectorTileImageryProvider;
        //关闭卷帘模式
        provider.setSplitMode(false);
      }
    }
  }

  /**
   * 添加卷帘的图层
   * @param layer
   */
  public addSplitLayer(layerId: string, direction: string) {
    this.removeSplitLayer(direction);
    if (layerId) {
      const info = this.layerMap.get(layerId);
      if (info) {
        if (direction == "LEFT") {
          info.layer.splitDirection = Cesium.SplitDirection.LEFT;
        } else {
          info.layer.splitDirection = Cesium.SplitDirection.RIGHT;
        }
        this.viewer.imageryLayers.add(info.layer);
        if (info.type === DATA_TYPE.Vec) {
          //如果类型为矢量图层
          const provider =
            info.provider as UrlTemplateMapboxVectorTileImageryProvider;
          //开启卷帘模式
          provider.setSplitMode(true);
        }
      }
    }
  }

  /**
   * 移除卷帘图层
   * @param direction
   */
  removeSplitLayer(direction: string) {
    this.layerMap.forEach(info => {
      if (this.viewer.imageryLayers.contains(info.layer)) {
        if (
          direction === "LEFT"
            ? info.layer.splitDirection == Cesium.SplitDirection.LEFT
            : info.layer.splitDirection == Cesium.SplitDirection.RIGHT
        ) {
          this.viewer.imageryLayers.remove(info.layer, false);
        }
      }
    });
  }
  clearGeoJSON() {
    if (this.dataSource) {
      this.dataSource.entities.removeAll();
    }
  }
  flyToEntity(item) {
    const entity = this.dataSource.entities.getById(item.id);
    if (entity) {
      this.viewer.flyTo(entity).then(() => {});
    }
  }
  /**
   * 添加geoJSON图层
   * @param json
   */
  loadGeoJSON(json) {
    // console.log(json);
    // if (!json.features || json.features.length == 0) {
    //   return;
    // }
    return new Promise(resolve => {
      if (this.dataSource) {
        this.dataSource.entities.removeAll();
        if (
          !json ||
          typeof json !== "object" ||
          !("type" in json) ||
          (json.type === "FeatureCollection" &&
            (!Array.isArray(json.features) || json.features.length === 0))
        ) {
          resolve([]);
          return;
        }
        this.dataSource
          .load(json, {
            stroke: defaultStyle.outlineColor,
            fill: defaultStyle.material,
            strokeWidth: 3
          })
          .then(r => {
            this.viewer.flyTo(r).then(() => {});
            r.entities.values.forEach(entity => {
              entity.show = false;
              entity.name = "online data";
            });
            resolve(r.entities.values);
          });
      }
    });
  }
  entitySelected(item) {
    if (this.dataSource) {
      if (this.selectEntity) {
        this.applyPolygonStyle(this.selectEntity, defaultStyle);
        this.selectEntity = undefined;
      }
      const entity = this.dataSource.entities.getById(item.id);
      if (entity) {
        this.selectEntity = entity;
        this.applyPolygonStyle(this.selectEntity, selectStyle);
      }
    }
  }

  entityUnSelected(item) {
    const entity = this.dataSource.entities.getById(item.id);
    if (entity && this.selectEntity && entity == this.selectEntity) {
      this.applyPolygonStyle(entity, defaultStyle);
      this.selectEntity = undefined;
    }
  }

  private applyPolygonStyle(
    entity: Cesium.Entity,
    style: typeof defaultStyle
  ): void {
    const polygon = entity.polygon;
    if (!polygon) return;
    polygon.outlineColor = new Cesium.ConstantProperty(style.outlineColor);
    polygon.outlineWidth = new Cesium.ConstantProperty(style.outlineWidth);
    polygon.material = new Cesium.ColorMaterialProperty(style.material);
  }
  /**
   * 截取当前视野画布，不 fly、不改相机
   */
  public async captureCurrentSceneThumbnailDataUrl(
    waitMs = 120
  ): Promise<string | undefined> {
    if (!this.viewer?.scene?.canvas) {
      return undefined;
    }
    await new Promise<void>(resolve =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
    );
    await new Promise<void>(resolve => setTimeout(resolve, waitMs));
    this.viewer.scene.render();
    return this.viewer.scene.canvas.toDataURL("image/png");
  }
  /**
   * 添加时序的图层
   * @param layer
   */
  public addTimingLayer(layerId: string) {
    if (layerId) {
      const info = this.layerMap.get(layerId);
      if (info) {
        this.viewer.imageryLayers.add(info.layer);
        if (info.type === DATA_TYPE.Vec) {
          //如果类型为矢量图层
          const provider =
            info.provider as UrlTemplateMapboxVectorTileImageryProvider;
          //开启卷帘模式
          provider.setSplitMode(true);
        }
      }
    }
  }

  /** 是否处于点/矩形等拾取绘制中 */
  public isDrawPickActive(): boolean {
    return !!(
      this.pointPickHandler ||
      this.rectDrawHandler ||
      this.drawHandler
    );
  }

  /** 中止当前交互绘制并移除 drawEntity */
  public cancelActiveDraw(): void {
    if (this.activeDrawHandler) {
      this.activeDrawHandler.destroy();
      this.activeDrawHandler = null;
    }
    const ent = this.viewer.entities.getById("drawEntity");
    if (ent) this.viewer.entities.remove(ent);
  }

  private pickGlobePosition(
    viewer: Cesium.Viewer,
    windowPosition: Cesium.Cartesian2
  ): Cesium.Cartesian3 | undefined {
    if (
      viewer.scene.terrainProvider.constructor.name ===
      "EllipsoidTerrainProvider"
    ) {
      return viewer.camera.pickEllipsoid(
        windowPosition,
        viewer.scene.globe.ellipsoid
      );
    }
    const ray = viewer.scene.camera.getPickRay(windowPosition);
    return ray ? viewer.scene.globe.pick(ray, viewer.scene) : undefined;
  }

  private cartesianToWgs84(point: Cesium.Cartesian3) {
    const c = Cesium.Cartographic.fromCartesian(point);
    return {
      lng: Cesium.Math.toDegrees(c.longitude),
      lat: Cesium.Math.toDegrees(c.latitude),
      alt: c.height
    };
  }

  /*
    点击地图获取经纬度
    @param callback 回调函数
    @param options 选项
  */
  public pickPoint(
    callback: (point: { lng: number; lat: number; alt: number }) => void,
    options?: DrawShapeCallbackOptions
  ): void {
    if (options?.beforeStart && options.beforeStart() === false) return;
    const viewer = this.viewer;
    if (!viewer?.scene?.canvas) return;

    this.lastDrawGeojson = null;
    this.cancelActiveDraw();

    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
    this.activeDrawHandler = handler;

    handler.setInputAction(event => {
      const cartesian = this.pickGlobePosition(viewer, event.position);
      if (!cartesian) return;
      const point = this.cartesianToWgs84(cartesian);
      handler.destroy();
      this.activeDrawHandler = null;
      callback(point);
      options?.onComplete?.();
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    handler.setInputAction(() => {
      handler.destroy();
      this.activeDrawHandler = null;
      options?.onCancel?.();
    }, Cesium.ScreenSpaceEventType.RIGHT_CLICK);
  }

  private flatDistanceM(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ) {
    const EARTH_RADIUS = 6378137.0;
    const PI = Math.PI;
    const getRad = (d: number) => (d * PI) / 180.0;
    const f = getRad((lat1 + lat2) / 2);
    const g = getRad((lat1 - lat2) / 2);
    const l = getRad((lng1 - lng2) / 2);
    let sg = Math.sin(g);
    let sl = Math.sin(l);
    let sf = Math.sin(f);
    const a = EARTH_RADIUS;
    const fl = 1 / 298.257;
    sg *= sg;
    sl *= sl;
    sf *= sf;
    const s = sg * (1 - sl) + (1 - sf) * sl;
    const c = (1 - sg) * (1 - sl) + sf * sl;
    const w = Math.atan(Math.sqrt(s / c));
    const r = Math.sqrt(s * c) / w;
    const d = 2 * w * a;
    const h1 = (3 * r - 1) / 2 / c;
    const h2 = (3 * r + 1) / 2 / s;
    return d * (1 + fl * (h1 * sf * (1 - sg) - h2 * (1 - sf) * sg));
  }

  private rectangleCornersToGeoJson(
    corners: { lng: number; lat: number }[]
  ): DrawGeoJsonFeature {
    const ring = corners.map(p => [p.lng, p.lat] as [number, number]);
    const [a, b] = [ring[0], ring[ring.length - 1]];
    if (a[0] !== b[0] || a[1] !== b[1]) ring.push([a[0], a[1]]);
    return {
      type: "Feature",
      geometry: { type: "Polygon", coordinates: [ring] },
      properties: {}
    };
  }
  /**
   * 左键落点并拖动调整，再左键确认；右键取消。
   * 完成后写入 lastDrawGeojson，并通过回调传出 wkt、geojson、点。
   */
  /**
   * 左键单击选点并显示标注；右键取消。
   */
  public drawPoint(
    callback: (point: { lng: number; lat: number }) => void,
    options?: {
      beforeStart?: () => boolean;
      onInvalidPick?: () => void;
      onCancel?: () => void;
      onComplete?: () => void;
      markerImage?: string;
    }
  ): void {
    if (options?.beforeStart && options.beforeStart() === false) {
      return;
    }

    const viewer = this.viewer;
    if (!viewer?.scene?.canvas) return;

    this.clearDrawEntity();
    (viewer.container as HTMLElement).style.cursor = "crosshair";

    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
    this.pointPickHandler = handler;
    const markerImage = options?.markerImage || map_label_2;

    handler.setInputAction(event => {
      const position = this.pickGlobePosition(viewer, event.position);
      if (!position) {
        options?.onInvalidPick?.();
        return;
      }
      const { lng, lat } = this.cartesianToWgs84(position);

      const existed = viewer.entities.getById("drawEntityPoint");
      if (existed) viewer.entities.remove(existed);
      viewer.entities.add({
        id: "drawEntityPoint",
        position,
        billboard: {
          image: markerImage,
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          scale: 0.2,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          pixelOffset: new Cesium.Cartesian2(0, 0)
        }
      });

      if (this.pointPickHandler) {
        this.pointPickHandler.destroy();
        this.pointPickHandler = null;
      }
      (viewer.container as HTMLElement).style.cursor = "";
      callback({ lng, lat });
      options?.onComplete?.();
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    handler.setInputAction(() => {
      this.clearDrawEntity();
      options?.onCancel?.();
    }, Cesium.ScreenSpaceEventType.RIGHT_CLICK);
  }
  /**
   * 矩形：左键起点 → 拖动 → 左键确认；右键取消
   */
  public drawRectangle(
    callback: (
      wkt: string,
      geojson: DrawGeoJsonFeature,
      rectanglePoints?: { lng: number; lat: number }[]
    ) => void,
    options?: DrawShapeCallbackOptions
  ): void {
    if (options?.beforeStart && options.beforeStart() === false) return;
    const viewer = this.viewer;
    if (!viewer?.scene?.canvas) return;

    this.lastDrawGeojson = null;
    this.cancelActiveDraw();

    const pointsArr: Cesium.Cartesian3[] = [];
    const shape: {
      points: Cesium.Cartographic[];
      rect: Cesium.Rectangle | null;
    } = { points: [], rect: null };

    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
    this.activeDrawHandler = handler;

    handler.setInputAction(event => {
      const tempPosition = this.pickGlobePosition(viewer, event.position);
      if (!tempPosition) return;

      if (shape.points.length === 0) {
        pointsArr.push(tempPosition);
        shape.points.push(
          viewer.scene.globe.ellipsoid.cartesianToCartographic(tempPosition)
        );
        shape.rect = Cesium.Rectangle.fromCartographicArray(shape.points);
        shape.rect.east += 0.000001;
        shape.rect.north += 0.000001;
        viewer.entities.add({
          id: "drawEntity",
          rectangle: {
            coordinates: new Cesium.CallbackProperty(() => shape.rect!, false),
            material: Cesium.Color.BLUE.withAlpha(0.5),
            show: true,
            outline: true,
            outlineColor: Cesium.Color.BLUE,
            outlineWidth: 3,
            height: 0,
            extrudedHeight: 0
          } as any
        });
      } else {
        handler.destroy();
        this.activeDrawHandler = null;
        const pts = pointsArr.map(p => this.cartesianToWgs84(p));
        const wkt = `POLYGON((${pts[0].lng} ${pts[0].lat},${pts[0].lng} ${pts[1].lat},${pts[1].lng} ${pts[1].lat},${pts[1].lng} ${pts[0].lat},${pts[0].lng} ${pts[0].lat}))`;
        const r = shape.rect!;
        const rectanglePoints = [
          {
            lng: Cesium.Math.toDegrees(r.west),
            lat: Cesium.Math.toDegrees(r.north)
          },
          {
            lng: Cesium.Math.toDegrees(r.east),
            lat: Cesium.Math.toDegrees(r.north)
          },
          {
            lng: Cesium.Math.toDegrees(r.east),
            lat: Cesium.Math.toDegrees(r.south)
          },
          {
            lng: Cesium.Math.toDegrees(r.west),
            lat: Cesium.Math.toDegrees(r.south)
          }
        ];
        const geojson = this.rectangleCornersToGeoJson(rectanglePoints);
        this.lastDrawGeojson = geojson;
        callback(wkt, geojson, rectanglePoints);
        options?.onComplete?.();
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    handler.setInputAction(() => {
      handler.destroy();
      this.activeDrawHandler = null;
      this.lastDrawGeojson = null;
      const ent = viewer.entities.getById("drawEntity");
      if (ent) viewer.entities.remove(ent);
      options?.onCancel?.();
    }, Cesium.ScreenSpaceEventType.RIGHT_CLICK);

    handler.setInputAction(event => {
      if (shape.points.length === 0) return;
      const moveEndPosition = this.pickGlobePosition(viewer, event.endPosition);
      if (!moveEndPosition) return;
      pointsArr[1] = moveEndPosition;
      shape.points[1] =
        viewer.scene.globe.ellipsoid.cartesianToCartographic(moveEndPosition);
      shape.rect = Cesium.Rectangle.fromCartographicArray(shape.points);
      if (shape.rect.west === shape.rect.east) shape.rect.east += 0.000001;
      if (shape.rect.south === shape.rect.north) shape.rect.north += 0.000001;
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
  }

  /**
   * 多边形：左键加点，右键闭合；右键取消仅销毁（未完成）
   */
  public drawPolygon(
    callback: (wkt: string, geojson: DrawGeoJsonFeature) => void,
    options?: DrawShapeCallbackOptions
  ): void {
    if (options?.beforeStart && options.beforeStart() === false) return;
    const viewer = this.viewer;
    if (!viewer?.scene?.canvas) return;

    this.lastDrawGeojson = null;
    this.cancelActiveDraw();

    const positions: Cesium.Cartesian3[] = [];
    let polygonEntityAdded = false;
    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
    this.activeDrawHandler = handler;

    handler.setInputAction(event => {
      const cartesian = viewer.camera.pickEllipsoid(
        event.position,
        viewer.scene.globe.ellipsoid
      );
      if (!cartesian) return;
      if (positions.length === 0) positions.push(cartesian.clone());
      positions.push(cartesian);
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    handler.setInputAction(event => {
      const cartesian = viewer.camera.pickEllipsoid(
        event.endPosition,
        viewer.scene.globe.ellipsoid
      );
      if (positions.length >= 2) {
        if (!polygonEntityAdded) {
          viewer.entities.add({
            id: "drawEntity",
            polygon: {
              hierarchy: new Cesium.CallbackProperty(
                () => new Cesium.PolygonHierarchy(positions),
                false
              ),
              material: Cesium.Color.BLUE.withAlpha(0.5),
              outline: true,
              outlineColor: Cesium.Color.BLUE,
              outlineWidth: 3,
              height: 0,
              extrudedHeight: 0
            } as any
          });
          polygonEntityAdded = true;
        } else if (cartesian) {
          positions.pop();
          positions.push(cartesian);
        }
      }
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

    handler.setInputAction(() => {
      handler.destroy();
      this.activeDrawHandler = null;
      if (positions.length < 3) {
        message("请至少绘制3个点！", { type: "warning" });
        const ent = viewer.entities.getById("drawEntity");
        if (ent) viewer.entities.remove(ent);
        options?.onCancel?.();
        return;
      }
      positions.push(positions[0]);
      let wkt = "POLYGON((";
      positions.forEach(p => {
        const pt = this.cartesianToWgs84(p);
        wkt += `${pt.lng} ${pt.lat},`;
      });
      wkt = wkt.replace(/,$/, "") + "))";
      positions.pop();

      const ring = positions.map(p => {
        const pt = this.cartesianToWgs84(p);
        return [pt.lng, pt.lat] as [number, number];
      });
      const first = ring[0];
      const last = ring[ring.length - 1];
      if (first[0] !== last[0] || first[1] !== last[1]) {
        ring.push([first[0], first[1]]);
      }
      const geojson: DrawGeoJsonFeature = {
        type: "Feature",
        geometry: { type: "Polygon", coordinates: [ring] },
        properties: {}
      };
      this.lastDrawGeojson = geojson;
      callback(wkt, geojson);
      options?.onComplete?.();
    }, Cesium.ScreenSpaceEventType.RIGHT_CLICK);
  }
  /** 本地 footprint 选中高亮（仅选中项一条贴地红边） */
  public applyLocalFootprintStyle(
    selectedId: string | number,
    options?: {
      selectedHeight?: number;
      selectedOutlineWidth?: number;
    }
  ) {
    const selectedHeight = options?.selectedHeight ?? 0;
    const selectedOutlineWidth = options?.selectedOutlineWidth ?? 1;
    this.viewer.entities.values.forEach((entity: any) => {
      if (!entity.rectangle?.coordinates) return;
      const isSel = entity.id == selectedId;
      entity.rectangle.outline = isSel;
      if (isSel) {
        entity.rectangle.outlineColor = Cesium.Color.RED;
        entity.rectangle.outlineWidth = selectedOutlineWidth;
        entity.rectangle.height = selectedHeight;
      } else {
        entity.rectangle.height = 0;
      }
      entity.rectangle.heightReference =
        Cesium.HeightReference.RELATIVE_TO_GROUND;
    });
  }
  /** 将指定本地快视图影像置于最上层 */
  public bringLocalImageLayerToTop(id: string | number) {
    const item = this.localImageLayers.find((x: any) => x.id == id);
    if (item?.layerInfo) {
      this.viewer.imageryLayers.raiseToTop(item.layerInfo);
    }
  }
  /** 在线 footprint 选中抬高与高亮 */
  public applyOnlineFootprintStyle(
    selectedId: string | number,
    options?: {
      selectedHeight?: number;
      selectedOutlineWidth?: number;
      defaultOutlineWidth?: number;
    }
  ) {
    if (!this.dataSource) return;
    const selectedHeight = options?.selectedHeight ?? 200;
    const selectedOutlineWidth = options?.selectedOutlineWidth ?? 36;
    const defaultOutlineWidth = options?.defaultOutlineWidth ?? 2;
    this.dataSource.entities.values.forEach((entity: any) => {
      if (!entity.polygon || entity.name !== "online data") return;
      const isSel = entity.id == selectedId;
      entity.polygon.outline = true;
      entity.polygon.outlineColor = isSel
        ? Cesium.Color.RED
        : Cesium.Color.TRANSPARENT;
      entity.polygon.outlineWidth = isSel
        ? selectedOutlineWidth
        : defaultOutlineWidth;
      entity.polygon.height = isSel ? selectedHeight : 0;
      entity.polygon.heightReference =
        Cesium.HeightReference.RELATIVE_TO_GROUND;
      entity.polygon.clampToGround = false;
      entity.polygon.zIndex = isSel ? 1 : 0;
      entity.polygon.disableDepthTestDistance = isSel
        ? Number.POSITIVE_INFINITY
        : 0;
    });
  }

  /** 将指定在线快视图影像置于最上层 */
  public bringOnlineImageLayerToTop(id: string | number) {
    const item = this.onlineImageLayers.find(x => x.id == id);
    if (item?.layer) {
      this.viewer.imageryLayers.raiseToTop(item.layer);
    }
  }
  /**
   * 圆形：左键圆心 → 拖动半径 → 左键确认；右键取消
   */
  public drawCircle(
    callback: (payload: {
      geojson: DrawGeoJsonFeature;
      center: { wkt: string };
      radius: number;
    }) => void,
    options?: DrawShapeCallbackOptions
  ): void {
    if (options?.beforeStart && options.beforeStart() === false) return;
    const viewer = this.viewer;
    if (!viewer?.scene?.canvas) return;

    this.lastDrawGeojson = null;
    this.cancelActiveDraw();

    const circle = {
      points: [] as Cesium.Cartographic[],
      rect: null as Cesium.Rectangle | null,
      r: 1
    };
    let tempLon = 0;
    let tempLat = 0;
    let cartographic1: Cesium.Cartographic | undefined;

    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
    this.activeDrawHandler = handler;

    handler.setInputAction(event => {
      const tempPosition = this.pickGlobePosition(viewer, event.position);
      if (!tempPosition) return;

      const callBackPos = () => {
        const minLon = Cesium.Math.toDegrees(circle.points[0].longitude);
        const minLat = Cesium.Math.toDegrees(circle.points[0].latitude);
        const maxLon = Cesium.Math.toDegrees(circle.points[1].longitude);
        const maxLat = Cesium.Math.toDegrees(circle.points[1].latitude);
        const r = this.flatDistanceM(minLat, minLon, maxLat, maxLon);
        return r || 1;
      };

      if (circle.points.length === 0) {
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
        viewer.entities.add({
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
          } as any
        });
      } else {
        handler.destroy();
        this.activeDrawHandler = null;
        const radius = callBackPos();
        const geojson: DrawGeoJsonFeature = {
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [tempLon, tempLat]
          },
          properties: {
            radiusMeters: radius,
            shape: "circle"
          }
        };
        this.lastDrawGeojson = geojson;
        callback({
          geojson,
          center: { wkt: `POINT(${tempLon} ${tempLat})` },
          radius
        });
        options?.onComplete?.();
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    handler.setInputAction(() => {
      handler.destroy();
      this.activeDrawHandler = null;
      this.lastDrawGeojson = null;
      const ent = viewer.entities.getById("drawEntity");
      if (ent) viewer.entities.remove(ent);
      options?.onCancel?.();
    }, Cesium.ScreenSpaceEventType.RIGHT_CLICK);

    handler.setInputAction(event => {
      if (circle.points.length === 0) return;
      const moveEndPosition = this.pickGlobePosition(viewer, event.endPosition);
      if (!moveEndPosition) return;
      circle.points.pop();
      circle.points.push(
        viewer.scene.globe.ellipsoid.cartesianToCartographic(moveEndPosition)
      );
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
  }
  /**
   * 清除绘制的矩形，圆形，多边形实体
   */
  public clearDrawEntity() {
    const viewer = this.viewer;
    if (this.pointPickHandler) {
      this.pointPickHandler.destroy();
      this.pointPickHandler = null;
    }
    if (this.activeDrawHandler) {
      this.activeDrawHandler.destroy();
      this.activeDrawHandler = null;
    }
    const entPoint = viewer.entities.getById("drawEntityPoint");
    if (entPoint) viewer.entities.remove(entPoint);
    const ent = viewer.entities.getById("drawEntity");
    if (ent) viewer.entities.remove(ent);
    const entCircle = viewer.entities.getById("drawEntityCircle");
    if (entCircle) viewer.entities.remove(entCircle);
    const entPolygon = viewer.entities.getById("drawEntityPolygon");
    if (entPolygon) viewer.entities.remove(entPolygon);
    this.lastDrawGeojson = null;
    (viewer.container as HTMLElement).style.cursor = "";
  }

  /** 保存风场实例，供清除时调用 */
  public setWindLayer(layer: any) {
    this.windLayerInstance = layer;
  }

  /** 清除 CesiumWind 粒子风场图层 */
  public removeWindLayer() {
    if (this.windLayerInstance) {
      this.windLayerInstance.remove?.();
      this.windLayerInstance.removeLayer?.();
      this.windLayerInstance = null;
    }
    const windCanvas =
      this.viewer?.canvas?.parentNode?.querySelector?.(".cesium-wind-j");
    windCanvas?.remove();
  }

  /** 合成专题图：抓取当前地图画布的中间半屏，右侧放名称与当前色带并下载 */
  public async buildThematicImageAndDownload(rows?: any[]) {
    const layerStore = getLayerStore();
    const thematicRows = (
      rows?.length ? rows : layerStore.remoteThematicRows || []
    ).filter((item: any) => item?.thumbUrl);
    if (!thematicRows.length) {
      message("请先在左侧勾选带缩略图的数据后再生成专题图。", {
        type: "warning"
      });
      return;
    }

    const legendSrc = layerStore.legendImageDataUrl;
    if (!legendSrc) {
      message("地图图例尚未生成，请先确保右下角图例已正常显示。", {
        type: "warning"
      });
      return;
    }

    const first = thematicRows[0];
    const titleText = String(first?.name || "专题图").trim();
    const timeText =
      first?.productTime || dayjs().format("YYYY-MM-DD HH:mm:ss");

    const captured = await this.captureCurrentSceneThumbnailDataUrl();
    if (!captured) {
      message("未获取到当前地图截图。", { type: "warning" });
      return;
    }

    const screenshotImg = await loadThumbImage(captured);
    const legendImg = await loadThumbImage(legendSrc);

    const cropX = screenshotImg.width / 4;
    const cropY = 0;
    const cropW = screenshotImg.width / 2;
    const cropH = screenshotImg.height;

    const canvas = document.createElement("canvas");
    canvas.width = 900;
    canvas.height = 900;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const pad = 36;
    const headerH = 110;
    const mapDrawW = canvas.width - pad * 2 - 110;
    const mapDrawH = canvas.height - headerH - pad * 2 - 40;
    const mapScale = Math.min(mapDrawW / cropW, mapDrawH / cropH);
    const mapW = cropW * mapScale;
    const mapH = cropH * mapScale;
    const mapX = pad;
    const mapY = headerH + pad + 10;

    const legendMaxW = 64;
    const legendMaxH = 170;
    const legendScale = Math.min(
      legendMaxW / legendImg.width,
      legendMaxH / legendImg.height,
      1
    );
    const legendW = legendImg.width * legendScale;
    const legendH = legendImg.height * legendScale;
    const legendX = mapX + mapW - legendW - 18 + 150;
    const legendTitleY = mapY + mapH - legendH - 20;
    const legendY = legendTitleY + 38;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#1a1a1a";
    ctx.font = "bold 28px Microsoft YaHei, PingFang SC, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(titleText, canvas.width / 2, pad, canvas.width - pad * 2);

    ctx.fillStyle = "#666666";
    ctx.font = "16px Microsoft YaHei, PingFang SC, sans-serif";
    ctx.fillText(timeText, canvas.width / 2, pad + 42, canvas.width - pad * 2);
    ctx.textAlign = "left";

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(mapX, mapY, mapW, mapH);
    ctx.drawImage(
      screenshotImg,
      cropX,
      cropY,
      cropW,
      cropH,
      mapX,
      mapY,
      mapW,
      mapH
    );
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2;
    ctx.strokeRect(mapX, mapY, mapW, mapH);

    ctx.fillStyle = "#1a1a1a";
    ctx.font = "bold 18px Microsoft YaHei, PingFang SC, sans-serif";
    ctx.fillText("图例", legendX, legendTitleY);

    ctx.drawImage(legendImg, legendX, legendY, legendW, legendH);

    ctx.fillStyle = "#666666";
    ctx.font = "14px Microsoft YaHei, PingFang SC, sans-serif";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(
      THEMATIC_PRODUCTION_UNIT,
      canvas.width - 270,
      canvas.height - pad + 1,
      250
    );

    await new Promise<void>(resolve => {
      canvas.toBlob(blob => {
        if (!blob) {
          resolve();
          return;
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `专题图_${dayjs().format("YYYYMMDD_HHmmss")}.png`;
        a.click();
        URL.revokeObjectURL(url);
        resolve();
      }, "image/png");
    });
  }
}

export default new TDTMap();

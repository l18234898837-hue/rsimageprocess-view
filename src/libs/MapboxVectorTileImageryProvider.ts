import * as Cesium from "cesium";
import { VectorTile, VectorTileFeature } from "@mapbox/vector-tile";
import Point from "@mapbox/point-geometry";
import URITemplate from "urijs/src/URITemplate";
import { Resource } from "cesium";
import Protobuf from "pbf";
import { cloneDeep } from "@pureadmin/utils";

export interface MarkerSymbol {
  //填充颜色
  color?: string;
  //半径
  size?: number;
  //外部线条颜色和宽度
  outline?: { color?: string; width?: number };
}

export interface LineSymbol {
  //线条颜色
  color?: string;
  //线条宽度
  width?: number;
}

export interface FillSymbol {
  //填充颜色
  color?: string;
  //外部线条的颜色和宽度
  outline?: { color?: string; width?: number };
}

export interface Style {
  marker?: MarkerSymbol;
  line?: LineSymbol;
  fill?: FillSymbol;
  /**
   * 线转角处接合方式，内部默认用miter
   */
  lineJoin?: CanvasLineJoin;
}

//默认选中高亮显示样式
const defaultHighlightStyle: Style = {
  marker: {
    color: "#0000FF",
    size: 6,
    outline: {
      color: "#fff",
      width: 1
    }
  },
  line: {
    color: "#0000FF"
  },
  fill: {
    outline: {
      color: "#fff",
      width: 3
    }
  }
};
//默认鼠标覆盖显示样式
const defaultHoverStyle: Style = {
  marker: {
    outline: {
      color: "#fff",
      width: 1
    }
  },
  line: {
    color: "#0000FF"
  },
  fill: {
    outline: {
      color: "#fff",
      width: 2
    }
  }
};

//默认选中高亮样式
const defaultSimpleStyle: Style = {
  marker: {
    color: "#E47833",
    size: 5,
    outline: {
      color: "#fff",
      width: 1
    }
  },
  line: {
    color: "#E47833",
    width: 4
  },
  fill: {
    color: "#E47833"
  },
  lineJoin: "miter"
};

export interface UrlTemplateMapboxVectorTileImageryProviderOptions
  extends Cesium.UrlTemplateImageryProvider.ConstructorOptions {
  layerName: string;
  filter?: (feature: VectorTileFeature) => boolean;
  style?: (feature: VectorTileFeature) => Style | undefined;
  onFeaturePicked?: (
    features: Array<VectorTileFeature>,
    longitude?: number,
    latitude?: number
  ) => void;
  highlight?: (feature: VectorTileFeature) => Style | undefined;
  hover?: (feature: VectorTileFeature) => Style | undefined;
  modal?: boolean;
  tileCache?: Map<string, VectorTile | undefined>;
  featureCount?: number;
}

export default class UrlTemplateMapboxVectorTileImageryProvider extends Cesium.UrlTemplateImageryProvider {
  private readonly layerName: string;
  private readonly uriTemplate: URITemplate;
  private readonly subdomains: string | string[];
  private readonly tileCache: Map<string, VectorTile | undefined> = undefined;
  //过滤器
  private readonly filter: (feature: VectorTileFeature) => boolean;
  //样式
  private readonly style?: (feature: VectorTileFeature) => Style | undefined;
  //要素选中回调函数
  private readonly onFeaturePicked?: (
    features: Array<VectorTileFeature>,
    longitude?: number,
    latitude?: number
  ) => void;
  //选中高亮回调函数，设置了就相当于启用了选中高亮
  private readonly highlight?: (
    feature: VectorTileFeature
  ) => Style | undefined;
  //鼠标覆盖回调函数，设置了就相当于启用了鼠标覆盖
  private readonly hover?: (feature: VectorTileFeature) => Style | undefined;
  private highlightLayer?: Cesium.ImageryLayer;
  private highlightFeatureList: Array<VectorTileFeature> = [];
  private hoverLayer?: Cesium.ImageryLayer;
  private hoverFeatureList: Array<VectorTileFeature> = [];
  private hoverEventHandler: Cesium.ScreenSpaceEventHandler;
  private viewer: Cesium.Viewer;
  private mainLayer: Cesium.ImageryLayer;
  private readonly modal: Boolean = false;
  //是否是卷帘模式
  private splitMode: Boolean = false;
  public show: Boolean = true;
  public propertiesCache: Map<string, object> = new Map();
  public tileReady = false;
  private readonly featureCount: number = 0;

  constructor(options: UrlTemplateMapboxVectorTileImageryProviderOptions) {
    super(options);
    this.layerName = options.layerName;
    this.uriTemplate = new URITemplate(this.url);
    this.subdomains = options.subdomains;
    this.filter = options.filter;
    this.style = options.style;
    this.onFeaturePicked = options.onFeaturePicked;
    this.highlight = options.highlight;
    this.hover = options.hover;
    this.modal = options.modal;
    if (options.tileCache) {
      this.tileCache = options.tileCache;
    } else {
      this.tileCache = new Map();
    }
    if (options.featureCount) {
      this.featureCount = options.featureCount;
    }
  }

  requestImage(
    x: number,
    y: number,
    level: number
    // request?: Cesium.Request
  ): Promise<Cesium.ImageryTypes> | undefined {
    // 针对点要做特殊处理，因为在切片临近边界的点，如果加上半径后超出切片范围，会造成切片绘制不完整的情况
    //这里我们需要请求切片周围的切片，如果存在上述的情况，需要将点添加到相邻的切片中。。。
    return new Promise(resolve => {
      this.getVectorTile(x, y, level).then(tile => {
        if (tile) {
          const canvas: HTMLCanvasElement = document.createElement("canvas");
          canvas.width = this.tileWidth;
          canvas.height = this.tileHeight;
          const context: CanvasRenderingContext2D = canvas.getContext("2d");
          //如果需要遮罩，则给canvas添加半透明的背景色
          if (this.modal) {
            context.fillStyle = "#00000055";
            context.fillRect(0, 0, canvas.width, canvas.height);
          }
          //先绘制主切片上的图形
          const mainResult = this.getFeaturesFromTile(tile);
          this.drawFeatures(
            x,
            y,
            level,
            context,
            canvas.width / mainResult.extent,
            mainResult.features
          );
          resolve(canvas);
        } else {
          resolve(undefined);
        }
      });
    });
  }

  /**
   * 获取切片，首先从缓存中取，如果缓存中不存在，则去请求切片
   * @param x
   * @param y
   * @param level
   */
  private getVectorTile(
    x: number,
    y: number,
    level: number
  ): Promise<VectorTile | undefined> {
    return new Promise(resolve => {
      //如果命中缓存就直接取缓存，包括之前已经404的
      const cacheKey: string = this.genCacheKey(level, x, y);

      if (this.tileCache.has(cacheKey)) {
        const cacheTile: VectorTile | undefined = this.tileCache.get(cacheKey);
        if (cacheTile) {
          resolve(cacheTile);
        } else {
          resolve(undefined);
        }
      } else {
        //如果缓存中不存在，则去请求切片
        const url = this.buildUrl(x, y, level);
        this.loadArrayBuffer(url.toString())
          .then((data: ArrayBuffer | undefined) => {
            //把pbf解析成VectorTile
            if (data) {
              const vectorTile: VectorTile = new VectorTile(new Protobuf(data));
              this.tileCache.set(cacheKey, vectorTile);
              resolve(vectorTile);
            } else {
              this.tileCache.set(cacheKey, undefined);
              resolve(undefined);
            }
          })
          .catch(() => {
            this.tileCache.set(cacheKey, undefined);
            resolve(undefined);
          });
      }
    });
  }

  /**
   * 绘制切片中的一个feature
   * @idx 方位索引，0-自己，1-左上，2-上，3-右上，4-右，5-右下，6-下，7-左下，8-左
   * @param vectorTile
   * @param canvas
   */
  private drawFeatures(
    x: number,
    y: number,
    level: number,
    context: CanvasRenderingContext2D,
    extentFactor: number,
    features: Array<VectorTileFeature>
  ) {
    features.forEach(feature => {
      if (this.filter && !this.filter(feature)) {
        return;
      }
      const style: Style = this.getFeatureStyle(feature);
      context.lineJoin = style.lineJoin;
      const coordinates = feature.loadGeometry();
      const featureType: string = VectorTileFeature.types[feature.type];
      if (featureType === "Polygon") {
        this.drawPolygon(context, coordinates, style, extentFactor);
      } else if (featureType === "Point") {
        this.drawPoint(context, coordinates, style, extentFactor);
      } else if (featureType === "LineString") {
        this.drawLine(context, coordinates, style, extentFactor);
      } else {
        throw new Error("暂不支持此类型渲染:" + featureType);
      }
    });
  }

  /**
   * 得到要素样式，将回调样式和默认样式深度合并
   * @param feature
   */
  private getFeatureStyle(feature: VectorTileFeature) {
    const style: Style = cloneDeep(defaultSimpleStyle);
    if (this.style) {
      const settingStyle = this.style(feature);
      if (settingStyle) {
        this.deepMerge(style, settingStyle);
      }
    }
    return style;
  }

  /**
   * 得到选中高亮样式，将回调样式和默认样式深度合并
   * @param feature
   */
  private getHighlightStyle(feature: VectorTileFeature) {
    const style: Style = cloneDeep(this.getFeatureStyle(feature));
    if (this.highlight) {
      const settingStyle = this.highlight(feature);
      if (settingStyle) {
        this.deepMerge(style, settingStyle);
        return style;
      }
    }
    this.deepMerge(style, defaultHighlightStyle);
    return style;
  }

  /**
   * 得到鼠标覆盖样式，将回调样式和默认样式深度合并
   * @param feature
   */
  private getHoverStyle(feature: VectorTileFeature) {
    const style: Style = cloneDeep(this.getFeatureStyle(feature));
    if (this.hover) {
      const settingStyle = this.hover(feature);
      if (settingStyle) {
        this.deepMerge(style, settingStyle);
        return style;
      }
    }
    this.deepMerge(style, defaultHoverStyle);
    return style;
  }

  private getFeaturesFromTile(
    tile: VectorTile
  ): { extent: number; features: Array<VectorTileFeature> } | undefined {
    const layer = tile.layers[Object.keys(tile.layers)[0]];
    if (!layer) {
      return undefined;
    }
    const features: Array<VectorTileFeature> = [];
    for (let i = 0; i < layer.length; i++) {
      const feature = layer.feature(i);
      if (this.filter && !this.filter(feature)) {
        continue;
      }
      //将properties缓存起来，以id做key，properties作为value
      const properties = feature.properties;
      this.propertiesCache.set(feature.id, properties);
      if (
        this.featureCount > 0 &&
        this.featureCount == this.propertiesCache.size
      ) {
        this.tileReady = true;
      }
      features.push(feature);
    }
    return { extent: layer.extent, features };
  }

  /**
   * 画面
   * @param context
   * @param coordinates
   */
  private drawPolygon(
    context: CanvasRenderingContext2D,
    coordinates: Point[][],
    style: Style,
    extentFactor: number
  ) {
    context.fillStyle = style.fill.color;
    if (style.fill.outline) {
      context.strokeStyle = style.fill.outline.color;
      context.lineWidth = style.fill.outline.width;
    }
    context.beginPath();

    let point: Point = null;
    for (let i = 0; i < coordinates.length; i++) {
      point = coordinates[i][0];
      //每个环的开始
      context.moveTo(point.x * extentFactor, point.y * extentFactor);
      //画每个环上的线
      for (let j = 1; j < coordinates[i].length; j++) {
        point = coordinates[i][j];
        context.lineTo(point.x * extentFactor, point.y * extentFactor);
      }
    }
    if (style.fill.outline) context.stroke();
    context.fill();
  }

  /**
   * 画点
   * @param context
   * @param coordinates
   * @param style
   * @param extentFactor
   */
  private drawPoint(
    context: CanvasRenderingContext2D,
    coordinates: Point[][],
    style: Style,
    extentFactor: number
  ) {
    context.fillStyle = style.marker.color;
    if (style.marker.outline) {
      context.strokeStyle = style.marker.outline.color;
      context.lineWidth = style.marker.outline.width;
    }
    for (let i = 0; i < coordinates.length; i++) {
      const center: Point = coordinates[i][0];
      context.beginPath();
      context.arc(
        center.x * extentFactor,
        center.y * extentFactor,
        style.marker.size,
        0,
        2 * Math.PI
      );
      //这里设置了外部线条才画线
      if (style.marker.outline) context.stroke();
      context.fill();
    }
  }

  /**
   * 画线
   * @param context
   * @param coordinates
   * @param style
   * @param extentFactor
   */
  private drawLine(
    context: CanvasRenderingContext2D,
    coordinates: Point[][],
    style: Style,
    extentFactor: number
  ) {
    context.strokeStyle = style.line.color;
    context.lineWidth = style.line.width;
    context.beginPath();
    for (let i = 0; i < coordinates.length; i++) {
      const start: Point = coordinates[i][0];
      context.moveTo(start.x * extentFactor, start.y * extentFactor);
      for (let j = 1; j < coordinates[i].length; j++) {
        const to: Point = coordinates[i][j];
        context.lineTo(to.x * extentFactor, to.y * extentFactor);
      }
    }
    context.stroke();
  }

  /**
   * 生成缓存键值
   * @param level
   * @param x
   * @param y
   */
  private genCacheKey(level: number, x: number, y: number) {
    return `${level}/${x}/${y}`;
  }

  private buildUrl(x: number, y: number, level: number) {
    const subdomain = this.getSubdomain();
    return this.uriTemplate.expand({
      z: level.toString(),
      x: x.toString(),
      y: y.toString(),
      s: subdomain
    });
  }

  /**
   * 生成subdomain
   */
  private getSubdomain() {
    if (this.subdomains == undefined) {
      return "0";
    }
    if (this.subdomains instanceof Array) {
      return Math.floor(Math.random() * this.subdomains.length);
    } else {
      return this.subdomains;
    }
  }

  /**
   * 请求切片二进制数组
   * @param url
   * @param headers
   */
  private loadArrayBuffer(
    url: string,
    headers?: any
  ): Promise<ArrayBuffer> | undefined {
    return Resource.fetchArrayBuffer({ url, headers: headers });
  }

  /**
   * 对象属性深度合并
   * @param target
   * @param source
   */
  private deepMerge(target: Object, source: Object) {
    if (target instanceof Object && source instanceof Object) {
      //遍历源对象，将源对象存在但目标对象不存在的属性赋值给目标对象
      for (const key in source) {
        if (!Object.prototype.hasOwnProperty.call(target, key)) {
          target[key] = cloneDeep(source[key]);
        }
      }
      //遍历目标对象
      for (const key in target) {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
          //判断属性值数据类型，若不是对象类型则赋值给目标对象
          if (!(source[key] instanceof Object)) {
            target[key] = source[key];
          } else {
            //是对象类型则递归调用
            this.deepMerge(target[key], cloneDeep(source[key]));
          }
        }
      }
    }
  }

  /**
   *
   * @param x
   * @param y
   * @param level
   * @param longitude
   * @param latitude
   */
  pickFeatures(
    x: number,
    y: number,
    level: number,
    longitude: number,
    latitude: number
  ): Promise<Cesium.ImageryLayerFeatureInfo[]> | undefined {
    if (!this.enablePickFeatures) return undefined;
    const featureList = this.detectFeatures(x, y, level, longitude, latitude);
    //将选中的要素高亮显示，其实就是在图层上又加上了一个图层，然后设置filter和style来过滤
    if (this.highlight) {
      this.highlightFeatures(featureList);
    }
    //调用要素选中回调函数
    if (this.onFeaturePicked && this.highlightLayer) {
      this.onFeaturePicked(featureList, longitude, latitude);
    }
  }

  /**
   * 根据切片索引和经纬度发现要素集合
   * @param x
   * @param y
   * @param level
   * @param longitude
   * @param latitude
   */
  private detectFeatures(
    x: number,
    y: number,
    level: number,
    longitude: number,
    latitude: number
  ): Array<VectorTileFeature> {
    if (!this.show) return [];
    //获取选中的缓存的切片
    const { nativeX, nativeY, nativeLevel } = this.getNativeTile(x, y, level);
    const cacheKey = this.genCacheKey(nativeLevel, nativeX, nativeY);
    const featureList: Array<VectorTileFeature> = [];
    if (this.tileCache.has(cacheKey)) {
      const vectorTile: VectorTile = this.tileCache.get(cacheKey);
      if (!vectorTile) return undefined;
      const layer = vectorTile.layers[Object.keys(vectorTile.layers)[0]];
      if (!layer) return undefined;
      const extentFactor = this.tileWidth / layer.extent;
      //计算点击的点在切片中的坐标
      //当前点击切片的坐标范围
      const tileRectangle = this.tilingScheme.tileXYToNativeRectangle(
        x,
        y,
        level
      );
      //经纬度坐标转投影坐标
      const pos = this.tilingScheme.projection.project(
        new Cesium.Cartographic(longitude, latitude)
      );
      //点击点的投影坐标转切片坐标
      const point: Point = new Point(
        ((pos.x - tileRectangle.west) /
          (tileRectangle.east - tileRectangle.west)) *
          layer.extent,
        ((pos.y - tileRectangle.north) /
          (tileRectangle.south - tileRectangle.north)) *
          layer.extent
      );
      for (let i = 0; i < layer.length; i++) {
        const feature = layer.feature(i);
        if (
          this.filter(feature) &&
          this.isFeatureClick(feature, point, extentFactor)
        ) {
          featureList.push(feature);
        }
      }
    }
    return featureList;
  }

  /**
   * 高亮显示要素
   * @param features
   */
  private highlightFeatures(features: Array<VectorTileFeature>) {
    if (this.isSameFeatures(features, this.highlightFeatureList)) return;
    //每次在添加高亮图层前先清除图层以达到刷新的效果
    this.removeHighlightLayer();
    //判断当前图层是不是层级最高的图层，如果不是就不触发highlight事件了
    if (!this.isTheTopLayer() || this.splitMode) return;
    const provider = new UrlTemplateMapboxVectorTileImageryProvider({
      layerName: this.layerName,
      url: this.url,
      rectangle: this.rectangle,
      modal: features.length > 0,
      filter: feature => {
        const ids = features.map(item => item.id);
        return this.filter(feature) && ids.indexOf(feature.id) > -1;
      },
      style: feature => {
        const style = this.getHighlightStyle(feature);
        return style;
      },
      tileCache: this.tileCache
    });
    this.highlightLayer =
      this.viewer.imageryLayers.addImageryProvider(provider);
    this.highlightFeatureList = features;
  }

  /**
   * 判断图层是否是最高图层
   */
  private isTheTopLayer(): Boolean {
    if (this.mainLayer) {
      const index = this.viewer.imageryLayers.indexOf(this.mainLayer);
      let length = this.viewer.imageryLayers.length;
      if (this.hoverLayer) {
        length -= 1;
      }
      if (this.highlightLayer) {
        length -= 1;
      }
      return index === length - 1;
    }
    return false;
  }

  /**
   * 要素是否被点击
   * @param feature 要素
   * @param point 点击的点
   */
  private isFeatureClick(
    feature: VectorTileFeature,
    point: Point,
    extentFactor: number
  ) {
    const type = VectorTileFeature.types[feature.type];
    const coordinates = feature.loadGeometry();
    const style: Style = this.getFeatureStyle(feature);
    if (
      type === "Point" &&
      this.isPointClick(point, coordinates, style.marker.size, extentFactor)
    )
      return true;
    if (
      type === "LineString" &&
      this.isLineClick(point, coordinates, style.line.width, extentFactor)
    )
      return true;
    if (type === "Polygon" && this.isPolygonClick(point, coordinates))
      return true;
    return false;
  }

  /**
   * 得到实际请求的切片，如果层级小于最小层级或大于最大层级，会请求最小最大层级的切片并进行缩小放大
   * @param x
   * @param y
   * @param level
   */
  private getNativeTile(x: number, y: number, level: number) {
    let delta = 0;
    if (level < this.minimumLevel) {
      delta = level - this.minimumLevel;
    } else if (level > this.maximumLevel) {
      delta = level - this.maximumLevel;
    }
    return {
      nativeX: x >> delta,
      nativeY: y >> delta,
      nativeLevel: level - delta
    };
  }

  public addToMap(viewer: Cesium.Viewer) {
    this.viewer = viewer;
    this.mainLayer = viewer.imageryLayers.addImageryProvider(this);
    if (this.hover) {
      this.setHoverListener();
    }
    return this.mainLayer;
  }

  /**
   * 设置鼠标覆盖监听
   */
  private setHoverListener() {
    const { scene, camera } = this.viewer;
    this.hoverEventHandler = new Cesium.ScreenSpaceEventHandler(scene.canvas);
    this.hoverEventHandler.setInputAction(event => {
      //获取浮标覆盖位置的坐标
      const cartesian = camera.pickEllipsoid(
        event.endPosition,
        scene.globe.ellipsoid
      );
      if (cartesian) {
        //投影坐标转经纬度坐标
        const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
        const currentLevel = this.getCurrentLevel(camera);
        const tileXY = this.tilingScheme.positionToTileXY(
          cartographic,
          currentLevel
        );
        const features = this.detectFeatures(
          tileXY.x,
          tileXY.y,
          currentLevel,
          cartographic.longitude,
          cartographic.latitude
        );
        this.hoverFeatures(features);
      }
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
  }

  /**
   * 高亮显示要素
   * @param features
   */
  private hoverFeatures(features: Array<VectorTileFeature>) {
    //判断是否和上次选中的features是同一批，如果是就不需要刷新了
    if (this.isSameFeatures(features, this.hoverFeatureList)) return;
    //每次在添加高亮图层前先清除图层以达到刷新的效果
    this.removeHoverLayer();
    //判断当前图层是不是层级最高的图层，如果不是或者开启了卷帘模式就不触发hover事件了
    if (!this.isTheTopLayer() || this.splitMode) return;
    const provider = new UrlTemplateMapboxVectorTileImageryProvider({
      layerName: this.layerName,
      url: this.url,
      rectangle: this.rectangle,
      filter: feature => {
        const ids = features.map(item => item.id);
        return this.filter(feature) && ids.indexOf(feature.id) > -1;
      },
      style: feature => {
        const style = this.getHoverStyle(feature);
        return style;
      },
      tileCache: this.tileCache
    });
    this.hoverLayer = this.viewer.imageryLayers.addImageryProvider(provider);
    //如果此时有选中高亮图层，则需要将覆盖图层移到高亮图层下面
    if (this.highlightLayer) {
      this.viewer.imageryLayers.lower(this.hoverLayer);
    }
    this.hoverFeatureList = features;
  }

  /**
   * 两个要素集合是否是相同
   * @param newFeatures
   * @param oldFeatures
   */
  private isSameFeatures(
    newFeatures: Array<VectorTileFeature>,
    oldFeatures: Array<VectorTileFeature>
  ) {
    const newIds = newFeatures.map(item => item.id);
    const oldIds = oldFeatures.map(item => item.id);
    return (
      newIds.length === oldIds.length &&
      newIds.sort().toString() === oldIds.sort().toString()
    );
  }

  /**
   * 获取当前的层级，因为cesium没有提供获取层级的API
   * 这里我们通过相机高度来计算
   */
  private getCurrentLevel(camera: Cesium.Camera) {
    const height = Math.ceil(camera.positionCartographic.height);
    const A = 40487.57;
    const B = 0.00007096758;
    const C = 91610.74;
    const D = -40467.74;
    return Math.round(D + (A - D) / (1 + Math.pow(height / C, B)));
  }

  /**
   * 计算向量叉乘
   * @param v1
   * @param v2
   */
  private crossMul(v1: Point, v2: Point) {
    return v1.x * v2.y - v1.y * v2.x;
  }

  /**
   * 判断两条线段是否相交
   * @param p1
   * @param p2
   * @param p3
   * @param p4
   */
  private lineCross(p1: Point, p2: Point, p3: Point, p4: Point) {
    let v1 = { x: p1.x - p3.x, y: p1.y - p3.y },
      v2 = { x: p2.x - p3.x, y: p2.y - p3.y },
      v3 = { x: p4.x - p3.x, y: p4.y - p3.y };
    const v = this.crossMul(v1, v3) * this.crossMul(v2, v3);
    v1 = { x: p3.x - p1.x, y: p3.y - p1.y };
    v2 = { x: p4.x - p1.x, y: p4.y - p1.y };
    v3 = { x: p2.x - p1.x, y: p2.y - p1.y };
    return v <= 0 && this.crossMul(v1, v3) * this.crossMul(v2, v3) <= 0
      ? true
      : false;
  }

  /**
   * 判断点是否在面内，从点向左边画一条射线，然后统计射线和面的各条边相交的次数
   * 若相交次数为偶数则点在面外面，为奇数则在里面
   * 这里切片的最左边坐标为-80，我们取-100
   * @param p
   * @param coordinates
   */
  private isPolygonClick(p: Point, coordinates: Point[][]) {
    const p1 = p,
      p2 = { x: -100, y: p.y };
    //相交的次数
    let count = 0;
    for (let i = 0; i < coordinates.length; i++) {
      let p3, p4;
      for (let j = 0; j < coordinates[i].length - 1; j++) {
        p3 = coordinates[i][j];
        p4 = coordinates[i][j + 1];
        if (this.lineCross(p1, p2, p3, p4)) {
          count++;
        }
      }
      //计算面最后一个点和起点的线是否和射线相交
      p3 = coordinates[i][coordinates[i].length - 1];
      p4 = coordinates[i][0];
      if (this.lineCross(p1, p2, p3, p4)) {
        count++;
      }
    }
    return count % 2 != 0;
  }

  /**
   * 判断点是否在圆内
   * @param p
   * @param coordinates
   * @param radius
   */
  private isPointClick(
    p: Point,
    coordinates: Point[][],
    radius: number,
    extentFactor: number
  ) {
    for (let i = 0; i < coordinates.length; i++) {
      const center = coordinates[i][0];
      const distance = Math.sqrt(
        Math.pow(p.x - center.x, 2) + Math.pow(p.y - center.y, 2)
      );
      if (distance < radius / extentFactor) {
        return true;
      }
    }
    return false;
  }

  /**
   * 判断点是否在线上
   * @param p 点
   * @param coordinates 线
   * @param width 线宽
   */
  private isLineClick(
    p: Point,
    coordinates: Point[][],
    width: number,
    extentFactor: number
  ) {
    for (let i = 0; i < coordinates.length; i++) {
      for (let j = 0; j < coordinates[i].length - 1; j++) {
        const sp = coordinates[i][j];
        const ep = coordinates[i][j + 1];
        //计算直线L方程L=Ax+By+C的常参A,B,C
        const A = ep.y - sp.y;
        const B = sp.x - ep.x;
        const C = sp.x * (sp.y - ep.y) + sp.y * (ep.x - sp.x);
        //判断点是否在线段起始点为对角的矩形内，这里因为有线宽，所以不能简单的用最大最小坐标来计算
        const w = width / extentFactor;
        const temp = w / (2 * Math.sqrt(Math.pow(-A / B, 2) + 1));
        if (
          p.x >=
            Math.min(
              sp.x + (A / B) * temp,
              sp.x - (A / B) * temp,
              ep.x + (A / B) * temp,
              ep.x - (A / B) * temp
            ) &&
          p.x <=
            Math.max(
              sp.x + (A / B) * temp,
              sp.x - (A / B) * temp,
              ep.x + (A / B) * temp,
              ep.x - (A / B) * temp
            ) &&
          p.y >= Math.min(sp.y + temp, sp.y - temp, ep.y + temp, ep.y - temp) &&
          p.y <= Math.max(sp.y + temp, sp.y - temp, ep.y + temp, ep.y - temp)
        ) {
          //计算点到直线的距离
          const distance =
            Math.abs(A * p.x + B * p.y + C) /
            Math.sqrt(Math.pow(A, 2) + Math.pow(B, 2));
          //如果点到线的距离小于线宽的二分之一，则点在线上
          if (distance <= w / 2) {
            return true;
          }
        }
      }
    }
    return false;
  }

  private removeHighlightLayer() {
    if (this.highlightLayer) {
      this.viewer.imageryLayers.remove(this.highlightLayer);
      this.highlightFeatureList = [];
      this.highlightLayer = undefined;
    }
  }

  private removeHoverLayer() {
    if (this.hoverLayer) {
      this.viewer.imageryLayers.remove(this.hoverLayer);
      this.hoverFeatureList = [];
      this.hoverLayer = undefined;
    }
  }

  /**
   * 移除highlight和hover图层
   */
  public removeHighlightAndHoverLayer() {
    this.removeHighlightLayer();
    this.removeHoverLayer();
  }

  /**
   * 关闭或打开卷帘模式
   */
  public setSplitMode(mode: boolean) {
    this.splitMode = mode;
  }

  public getSplitMode() {
    return this.splitMode;
  }
}

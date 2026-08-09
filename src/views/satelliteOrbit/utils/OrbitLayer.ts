import {
  type Entity,
  JulianDate,
  Cartesian3,
  SampledPositionProperty,
  TimeIntervalCollection,
  TimeInterval,
  HeadingPitchRoll,
  Transforms,
  Math as CesiumMath,
  Ellipsoid,
  GeometryInstance,
  EllipsoidOutlineGeometry,
  Color,
  Cartesian2,
  DistanceDisplayCondition,
  VerticalOrigin,
  PathGraphics,
  LagrangePolynomialApproximation,
  CallbackProperty,
  Primitive,
  ReferenceFrame,
  PerInstanceColorAppearance,
  PolygonHierarchy,
  ColorGeometryInstanceAttribute,
  PrimitiveCollection,
  HeightReference,
  type HeadingPitchRange,
  type Viewer,
  HorizontalOrigin
} from "cesium";
import { twoline2satrec, propagate } from "satellite.js";
import * as Cesium from "cesium";

export type Listener = (e: any) => void;

// import { BaseLayer, type LayerOptions } from "./BaseLayer";

export declare type FlyOptions = {
  duration?: number;
  height?: number;
  maximumHeight?: number;
  offset?: HeadingPitchRange;
  orientation?: {
    heading: number;
    pitch: number;
    range: number;
  };
};

export interface OrbitOptions {
  viewer: Viewer;
  id?: string;
  type?: string;

  startTime: Date; // 轨道图层用（当为轨道图层时必传）
  endTime: Date; // 轨道图层用（当为轨道图层时必传）
  stepSeconds: number;
  name: string;
  tle1: string;
  tle2: string;
  clothWidth: number; // 地面幅宽（扫描图层用）当为扫描图层时，该参数必传
  showPath?: boolean;
  billboard?: any;
  cylinderShow?: boolean; // 扫描模拟（扫描图层用）
  forecastStateDtos?: Array<any>; // 扫描区域数据（扫描图层用）当为扫描图层时，该参数必传
  forecastStateDtosOrigin?: Array<any>; // 未调整侧摆角之前的足迹
  orbitAltitude?: number;
  satelliteName?: string;
  satelliteType?: string;
  satelliteSource?: string;
  satelliteSeries?: string;
  model?: {
    url: string;
    scale?: number;
    minimumPixelSize?: number;
  };
  satelliteInfoId: number;
}

const defaultBillboard = {
  // horizontalOrigin: "CENTER",
  image:
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAADJSURBVDhPnZHRDcMgEEMZjVEYpaNklIzSEfLfD4qNnXAJSFWfhO7w2Zc0Tf9QG2rXrEzSUeZLOGm47WoH95x3Hl3jEgilvDgsOQUTqsNl68ezEwn1vae6lceSEEYvvWNT/Rxc4CXQNGadho1NXoJ+9iaqc2xi2xbt23PJCDIB6TQjOC6Bho/sDy3fBQT8PrVhibU7yBFcEPaRxOoeTwbwByCOYf9VGp1BYI1BA+EeHhmfzKbBoJEQwn1yzUZtyspIQUha85MpkNIXB7GizqDEECsAAAAASUVORK5CYII=",
  scale: 1.5,
  show: true
};

/**
 * 卫星轨道图层
 */
export class OrbitLayer {
  private readonly totalSeconds: number;
  private readonly stepSeconds: number;

  private satrec: any;
  private positionProperty: any;
  private positionPropertyOrigin: any;
  private orbitEntity!: Entity;
  private triangleEntity: Entity;
  private crossTrackCallbacks = [];

  protected viewer!: Viewer;
  protected _show: boolean = true;
  protected options: OrbitOptions;
  protected readonly satelliteInfoId: number;

  constructor(options: OrbitOptions) {
    this.satelliteInfoId = options.satelliteInfoId;
    this.viewer = options.viewer;
    this.options = options || ({} as OrbitOptions);
    // 运行一周需要的秒数
    this.totalSeconds =
      (options.endTime.getTime() - options.startTime.getTime()) / 1000;
    // 每一步的秒数，单位为秒，影响轨道的segment分段数量
    this.stepSeconds = options.stepSeconds;
    // 卫星的图标
    if (!options.billboard) {
      options.billboard = defaultBillboard;
    }
    // 是否展示卫星路径
    if (options.showPath == undefined) {
      options.showPath = true;
    }
    this.init();
  }

  /**
   * @description 初始化轨道实体图层初始化扫描图层
   * @param resolve
   * @param reject
   */
  protected init(
    resolve?: (value: Entity) => void,
    reject?: (reason?: any) => void
  ): void {
    try {
      let entity = this.initOrbitEntity(this.options);
      this.orbitEntity = this.viewer.entities.add(entity);
      this.orbitEntity.show = this._show;

      resolve?.(this.orbitEntity);
    } catch (e) {
      reject?.(e);
    }
  }

  /**
   * @description 将日期转换为儒略日
   * @param date 日期
   * @returns 儒略日
   */
  toJulianDate(date: Date) {
    // 从 JavaScript 日期创建一个新实例。
    return JulianDate.fromDate(date);
  }

  /**
   * @description 将儒略日转换为日期
   * @param date 儒略日
   * @returns 日期
   */
  toDate(date: JulianDate) {
    return JulianDate.toDate(date);
  }

  /**
   * @description 偏移儒略日
   * @param start 儒略日
   * @param offsetSeconds 偏移秒数
   * @returns 偏移后的儒略日
   */
  offsetJulianDate(start: JulianDate, offsetSeconds: number) {
    return JulianDate.addSeconds(start, offsetSeconds, new JulianDate());
  }

  /**
   * @description 初始化轨道试图图层或者扫描图层
   * @param options 轨道选项
   * @returns 轨道实体
   */
  private initOrbitEntity(options: OrbitOptions) {
    // circle 14.80721655 为卫星每天绕地球运行的圈数
    let circle = options.tle2?.slice(52, 64);
    // 初始化卫星记录
    this.satrec = twoline2satrec(options.tle1, options.tle2);
    // 求出卫星绕地球一圈需要的秒数，一开始设置为前进方向的秒数为leadTime为完整的一周的时间，已经走过的秒数trailTime为0
    const leadTime = Math.floor((24 * 3600) / parseFloat(circle));
    const trailTime = 0;

    let start = this.toJulianDate(options.startTime);
    let stop = this.toJulianDate(options.endTime);
    this.positionProperty = null;
    if (!options.cylinderShow) {
      // 轨道图层的采样位置
      this.positionProperty = this.getPositionProperty();
    } else {
      // 扫描图层的采样位置
      const stateDtos = options.forecastStateDtos;
      start = this.toJulianDate(new Date(stateDtos[0].forecastStamp));
      stop = this.toJulianDate(new Date(stateDtos[1].forecastStamp));
      this.positionProperty = this.getPositionProperty2(stateDtos, start, stop);
      this.positionPropertyOrigin = this.getPositionProperty2(
        options.forecastStateDtosOrigin,
        start,
        stop
      );
    }

    let satelliteEntity: any = {
      name: options.name,
      description: options.name,
      // 与此对象关联的可用性（如果有）。如果可用性未定义，则假定此对象的其他属性将返回任何提供时间的有效数据。如果存在可用性，则对象其他属性将仅在给定时间间隔内查询时提供有效数据。
      availability: new TimeIntervalCollection([
        new TimeInterval({ start: start, stop: stop })
      ]),
      // 采样位置属性
      position: options.cylinderShow
        ? this.positionPropertyOrigin
        : this.positionProperty,
      // 轨道图层/扫描图层
      label: {
        text: options.name,
        font: "15px 楷体",
        showBackground: true,
        backgroundColor: Color.fromCssColorString("#000000"),
        backgroundPadding: new Cartesian2(4, 4),
        outlineWidth: 3,
        outlineColor: Color.fromCssColorString("#000000"),
        verticalOrigin: VerticalOrigin.TOP,
        horizontalOrigin: HorizontalOrigin.LEFT,
        backgroundOpacity: 0.5,
        pixelOffset: new Cartesian2(0, 18),
        fillColor: Color.WHITE,
        distanceDisplayCondition: new DistanceDisplayCondition(0.4, 100000000),
        scaleByDistance_near: 100000,
        scaleByDistance_nearValue: 1,
        zIndex: 2,
        disableDepthTestDistance: 0
      }
    };
    // 轨道图层
    if (options.showPath) {
      // PathGraphics 用于绘制路径
      satelliteEntity.path = new PathGraphics({
        width: 1,
        show: true,
        // 获取或设置属性，指定要显示的对象前面的秒数。卫星即将走过的路径，前进方向，单位为秒
        // 系统会根据卫星的运动速度，自动计算在这段时间内卫星实际走过的物理距离
        leadTime: leadTime,
        // 获取或设置属性，指定要显示的对象后面的秒数。卫星已经走过的路径
        // 例如，如果设置 trailTime: 3600 （1小时），引擎会：
        // 1.计算卫星在过去1小时内的位置数据
        // 2.根据这些位置数据生成轨迹点
        // 3. 连接这些点形成可见的历史轨迹线「轨迹长度]
        trailTime: trailTime,
        material: Color.BLUE,
        // @ts-ignore
        zIndex: 1
      });
    }

    // 扫描区域
    this.drawTriangleSurface(options);

    // 轨道图层/扫描图层 使用模型或者广告牌
    if (options.model) {
      satelliteEntity.model = {
        url: options.model.url,
        scale: options.model.scale || 1,
        minimumPixelSize: options.model.scale || 90
      };
    } else {
      satelliteEntity.billboard = options.billboard;
    }
    //插值器 轨道图层/扫描图层
    satelliteEntity.position.setInterpolationOptions({
      interpolationDegree: 1,
      // 给定所需的次数，返回插值所需的数据点数。
      interpolationAlgorithm: LagrangePolynomialApproximation
    });
    this.setClockEvent(start, stop);
    // 把options数据挂载到实体上
    satelliteEntity.data = options;
    return satelliteEntity;
  }

  /**
   * @description 计算扫描的三角区域，根据卫星当前的位置，以及地面上的两个点确定一个三角形
   * @param satellitePosition 卫星当前的位置
   * @param clothWidth 卫星传感器画幅宽度
   * @param startPoint 地面上的一个点
   * @param endPoint 地面上的另一个点
   * @returns 三角形的两个底部的点
   */
  private computeTriangleBaseEndpoints(
    satellitePosition: Cartesian3,
    clothWidth: number,
    startPoint: Cartesian3,
    endPoint: Cartesian3
  ): { left: Cartesian3; right: Cartesian3 } {
    const viewer = this.viewer;
    // 获取地球椭球体对象
    const ellipsoid = viewer.scene.globe.ellipsoid;

    // 1. 计算线段方向向量
    const segmentVector = Cartesian3.subtract(
      endPoint,
      startPoint,
      new Cartesian3()
    );
    const segmentDirection = Cartesian3.normalize(
      segmentVector,
      new Cartesian3()
    );

    // 2. 构造垂直向量（叉乘）
    const up = ellipsoid.geodeticSurfaceNormal(startPoint, new Cartesian3());
    const perpendicularVector = Cartesian3.cross(
      segmentDirection,
      up,
      new Cartesian3()
    );
    Cartesian3.normalize(perpendicularVector, perpendicularVector);

    // 3. 将单位向量 × 实际宽度（单位：米）
    const halfWidth = clothWidth / 2;
    const offsetLeft = Cartesian3.multiplyByScalar(
      perpendicularVector,
      -halfWidth,
      new Cartesian3()
    );
    const offsetRight = Cartesian3.multiplyByScalar(
      perpendicularVector,
      halfWidth,
      new Cartesian3()
    );

    // 5. 投影到底面（高度为0）
    function projectToGround(cartesian: Cartesian3): Cartesian3 {
      const cartographic = ellipsoid.cartesianToCartographic(cartesian);
      cartographic.height = 0;
      return ellipsoid.cartographicToCartesian(cartographic);
    }

    // 获取卫星当前位置的地面投影点
    const sateGroudPoint = projectToGround(satellitePosition);
    // 4. 加上卫星坐标得到左右点
    const leftPoint = Cartesian3.add(
      // satellitePosition,
      sateGroudPoint,
      offsetLeft,
      new Cartesian3()
    );
    const rightPoint = Cartesian3.add(
      // satellitePosition,
      sateGroudPoint,
      offsetRight,
      new Cartesian3()
    );

    return {
      // left: projectToGround(leftPoint),
      // right: projectToGround(rightPoint)
      left: leftPoint,
      right: rightPoint
    };
  }

  /**
   * @description 轨道图层/扫描图层，将JulianDate转换为字符串
   * @param julianDate JulianDate对象
   * @param format 日期格式，默认"YYYY-MM-DD HH:mm:ss"
   * @returns 格式化后的日期字符串
   */
  private julianDateToString(
    julianDate: JulianDate,
    format: string = "YYYY-MM-DD HH:mm:ss"
  ): string {
    // 步骤1: 将JulianDate转换为JavaScript Date对象
    const jsDate = JulianDate.toDate(julianDate);

    // 步骤2: 格式化Date对象为所需字符串
    const year = jsDate.getFullYear();
    const month = String(jsDate.getMonth() + 1).padStart(2, "0");
    const day = String(jsDate.getDate()).padStart(2, "0");
    const hours = String(jsDate.getHours()).padStart(2, "0");
    const minutes = String(jsDate.getMinutes()).padStart(2, "0");
    const seconds = String(jsDate.getSeconds()).padStart(2, "0");

    // 根据format参数返回不同格式
    return format
      .replace("YYYY", String(year))
      .replace("MM", month)
      .replace("DD", day)
      .replace("HH", hours)
      .replace("mm", minutes)
      .replace("ss", seconds);
  }

  /**
   * @description 扫描图层，扫描区域三角形
   * @param options
   */
  private drawTriangleSurface(options: any) {
    // 计算垂直方向的底边
    if (options.cylinderShow) {
      // 获取地面线段的两个点（例如来自 options.forecastStateDtos）
      const stateDtos = options.forecastStateDtos;
      const startLatLng = stateDtos[0];
      const endLatLng = stateDtos[1];
      // 转换为 Cartesian3（高度设为0）
      const startPoint = Cartesian3.fromDegrees(
        startLatLng.lon,
        startLatLng.lat,
        0
      );
      const endPoint = Cartesian3.fromDegrees(endLatLng.lon, endLatLng.lat, 0);
      this.crossTrackCallbacks.forEach(callback => callback({ type: "start" }));
      const entity = this.viewer.entities.add({
        polygon: {
          // 接收callback函数作为参数
          hierarchy: new CallbackProperty(time => {
            console.log("hierarchy time", time);
            console.log("时间", this.julianDateToString(time));
            // 获取对应时间的位置信息
            const satellitePosition = this.positionProperty.getValue(time); // 当前卫星位置
            const satellitePositionOrigin =
              this.positionPropertyOrigin.getValue(time); // 未调整侧摆角卫星位置
            console.log("satellitePosition", satellitePosition);
            if (!satellitePosition) {
              this.viewer.entities.remove(entity);
              this.triangleEntity = null;
              this.crossTrackCallbacks.forEach(callback =>
                callback({ type: "end" })
              );
              return;
            }
            const { left, right } = this.computeTriangleBaseEndpoints(
              satellitePosition,
              options.clothWidth,
              startPoint,
              endPoint
            );
            // 卫星的位置为顶点，left和right为三角形的两个底部的点
            const positions = [satellitePositionOrigin, left, right];
            return new PolygonHierarchy([
              satellitePositionOrigin,
              ...positions
            ]);
          }, false),
          material: Color.fromCssColorString("#03c61d77"),
          perPositionHeight: true,
          fill: true,
          outline: true,
          outlineWidth: 4,
          outlineColor: Color.fromCssColorString("#8ffd95"),
          show: true
        }
      });
      this.triangleEntity = entity;
    }
  }

  private checkTle(tle: string) {
    let elements = tle.split("\n");
    if (elements.length !== 3) throw new Error("tle data error");
    return elements;
  }

  /**
   * 重访时间
   * @param tle2
   * @private
   */
  private getRevisitTime(tle2: string) {
    return tle2.slice(52, 64);
  }

  // 获取地心惯性坐标系坐标
  getPositionEci(time: Date): { x: number; y: number; z: number } {
    // 使用javacript 的Date 来传播卫星
    // The positionAndVelocity result is a pair of ECI coordinates.
    // 基于ECI坐标系的坐标
    // console.log(
    //   "propagate(this.satrec, time).position",
    //   propagate(this.satrec, time).position as any
    // );
    return propagate(this.satrec, time).position as any;
  }

  // 创建PositionProperty
  private getPositionProperty() {
    // 从参数中传入的开始时间
    let startTime = this.options.startTime;
    const start = this.toJulianDate(startTime);
    // 		Cesium.SampledPositionProperty 是 Cesium 库中的一个关键类，主要用于存储和管理随时间变化的位置数据。根据代码分析，它具有以下主要作用：
    // 1. 1.
    //    时间序列位置管理 ：存储与特定时间点关联的位置样本集合，特别适合表示移动物体（如卫星）的轨迹。
    // 2. 2.
    //    插值计算 ：能够在存储的时间样本之间进行插值计算，从而确定任意时间点的精确位置，即使该时间点没有对应的原始样本。
    // 3. 3.
    //    参考帧支持 ：可以指定位置数据的参考坐标系（如代码中的 ReferenceFrame.INERTIAL 惯性坐标系）。
    // 4. 4.
    //    动态轨迹生成 ：通过 addSample() 方法添加多个时间-位置点对，构建完整的运动轨迹
    // SampledPositionProperty 采样位置属性
    // 有两个参数
    // 参数1： referenceFrame 		ReferenceFrame.FIXED 	定义位置的参考系。
    // numberOfDerivatives 	每个位置伴随的导数数量;即速度、加速度等.....

    const positionProperty = new SampledPositionProperty(
      // ReferenceFrame.INERTIAL 	number  数 	The inertial frame.  惯性系。
      ReferenceFrame.INERTIAL
    );

    let now = startTime.getTime();
    let offsetSeconds = 0;
    let stepSeconds = this.stepSeconds;
    // 使用总秒数除以每一步的秒数，得到总步数
    let total = this.totalSeconds / stepSeconds;
    for (let i = 0; i < total; i++) {
      let sateTime = new Date(now + offsetSeconds * 1000);
      // 获取的ECI坐标，地心惯性坐标系，惯性参考系 ：ECI坐标系不随地球自转而旋转，是一个近似惯性参考系（虽然严格来说受地球公转和岁差章动影响并非完全惯性，但在短时间尺度的卫星轨道计算中可视为惯性系）
      let sateCoord = this.getPositionEci(sateTime);
      // 添加新样本。
      if (sateCoord) {
        // 				- 1.
        // satellite.js库的返回单位 ：satellite.js库的propagate函数（在getPositionEci方法中调用）返回的ECI（地心惯性坐标系）坐标值通常是以**公里(km)**为单位的。这是许多卫星轨道计算库（如SGP4实现）的标准输出单位。
        // - 2.
        // Cesium的坐标系统要求 ：从代码上下文可以看出，Cesium的Cartesian3坐标系统使用的是**米(m)**作为单位。例如，在第301-326行的computeTriangleBaseEndpoints方法中，有明确注释提到"单位：米"。
        // - 3.
        // 转换必要性 ：为了确保卫星轨道在Cesium中能够正确显示，需要将公里单位转换为米单位，因此需要将坐标值乘以1000。
        const cesiumPosition = {
          x: sateCoord.x * 1000,
          y: sateCoord.y * 1000,
          z: sateCoord.z * 1000
        };
        // @ts-ignore
        // 				Name  名字 	Type  类型 	Description  描述
        // time 	JulianDate  朱利安日期 	The sample time.  采样时间。
        // position 	Cartesian3  笛卡尔3 	The position at the provided time.
        // 提供时间的位置。
        // derivatives 	Array.<Cartesian3>
        // 数组.< 笛卡尔 3> 	optional  自选 The array of derivative values at the provided time.
        // 提供时间的导数值数组。
        // addSample 添加样本
        positionProperty.addSample(
          this.offsetJulianDate(start, offsetSeconds),
          cesiumPosition as Cartesian3
        );
      }
      offsetSeconds += stepSeconds;
    }
    return positionProperty;
  }

  private getPositionProperty2(item, startDate, endDate) {
    const positionProperty = new SampledPositionProperty();
    let start = item[0];
    let end = item[1];
    positionProperty.addSample(
      startDate,
      Cartesian3.fromDegrees(start.lon, start.lat, start.altitude)
    );
    positionProperty.addSample(
      endDate,
      Cartesian3.fromDegrees(end.lon, end.lat, end.altitude)
    );
    return positionProperty;
  }

  // private getPositionProperty2(item) {
  // 	const positionProperty = new SampledPositionProperty();
  // 	let points = [];
  // 	let startTime = [];
  // 	let rowPoints = [];
  // 	debugger
  // 	item.forEach((row) => {
  // 		rowPoints.push(row.lon);
  // 		rowPoints.push(row.lat);
  // 		rowPoints.push(row.altitude);
  // 		rowPoints.push(row.forecastStamp);
  // 	});
  //
  // 	let startPositionX,
  // 		startPositionY,
  // 		endPositionX,
  // 		endPositionY,
  // 		newStartPX,
  // 		newStartPY,
  // 		newEndPX,
  // 		newEndPY;
  // 	startPositionX = rowPoints[0];
  // 	startPositionY = rowPoints[1];
  // 	endPositionX = rowPoints[4];
  // 	endPositionY = rowPoints[5];
  // 	this.dx = endPositionX - startPositionX;
  // 	this.dy = endPositionY - startPositionY;
  // 	this.extendLength = Math.sqrt(this.dx * this.dx + this.dy * this.dy);
  // 	this.pyDistance = 0.3;
  //
  // 	newStartPX =
  // 		startPositionX - (this.dx * this.pyDistance) / this.extendLength;
  // 	newStartPY =
  // 		startPositionY - (this.dy * this.pyDistance) / this.extendLength;
  // 	newEndPX = endPositionX + (this.dx * this.pyDistance) / this.extendLength;
  // 	newEndPY = endPositionY + (this.dy * this.pyDistance) / this.extendLength;
  //
  // 	points.push(
  // 		Cartesian3.fromDegreesArrayHeights([
  // 			newStartPX,
  // 			newStartPY,
  // 			rowPoints[2],
  // 		])
  // 	);
  // 	startTime.push(this.toJulianDate(new Date(rowPoints[3])));
  // 	points.push(
  // 		Cartesian3.fromDegreesArrayHeights([
  // 			newEndPX,
  // 			newEndPY,
  // 			rowPoints[6],
  // 		])
  // 	);
  // 	startTime.push(this.toJulianDate(new Date(rowPoints[7])));
  //
  // 	// item.forEach((row) => {
  // 	//   points.push(
  // 	//     Cartesian3.fromDegreesArrayHeights([
  // 	//       row.lon,
  // 	//       row.lat,
  // 	//       row.altitude,
  // 	//     ])
  // 	//   );
  // 	//   startTime.push(this.toJulianDate(new Date(row.forecastStamp)));
  // 	// });
  // 	// points[0][0].x = startPositionX;
  // 	// points[0][0].y = startPositionY;
  // 	// points[1][0].x = endPositionX;
  // 	// points[1][0].y = endPositionY;
  //
  // 	if (points.length) {
  // 		for (let i = 0; i < points.length; i++) {
  // 			let sateCoord = points[i][0];
  // 			// @ts-ignore
  // 			positionProperty.addSample(startTime[i], sateCoord);
  // 		}
  // 	}
  // 	return {
  // 		positionProperty,
  // 		startTime: startTime[0],
  // 		endTime: startTime[startTime.length - 1],
  // 	};
  // }

  // 笛卡尔转经纬度
  private getPosition(positions: any) {
    if (positions) {
      let cartographic =
        this.viewer.scene.globe.ellipsoid.cartesianToCartographic(positions);
      let lat = CesiumMath.toDegrees(cartographic.latitude);
      let lng = CesiumMath.toDegrees(cartographic.longitude);
      let height = cartographic.height;
      return {
        position: Cartesian3.fromDegrees(lng, lat, height),
        lng,
        lat,
        height
      };
    }
  }

  // 位置更新
  private positionUpdate(satellite: any) {
    // this.viewer.clock.currentTime 获取时钟的当前时间
    let positions = satellite.position.getValue(this.viewer.clock.currentTime);
    if (positions) {
      return this.getPosition(positions)?.position;
    }
  }

  // 朝向更新
  private orientationUpdate(satellite: any) {
    let positions = satellite.position.getValue(this.viewer.clock.currentTime);
    if (positions) {
      // lat, height
      let { position, lng } = this.getPosition(positions) as any;
      // Transforms.headingPitchRollQuaternion从参考系计算四元数，其轴是根据以提供的原点为中心的航向-俯仰-滚动角度计算的。航向是从局部东方向向东的旋转，其中正角度向东增加。俯仰是从局部东西向平面旋转。正俯仰角位于平面上方。负俯仰角位于平面下方。滚动是围绕局部东轴应用的第一个旋转。
      return Transforms.headingPitchRollQuaternion(
        position,
        new HeadingPitchRoll(
          CesiumMath.toRadians(lng),
          CesiumMath.toRadians(-90),
          CesiumMath.toRadians(60)
        )
      );
    }
  }

  // 高度更新
  private heightUpdate(satellite: any) {
    let positions1 = satellite.position.getValue(this.viewer.clock.currentTime);
    if (positions1) {
      let { height } = this.getPosition(positions1) as any;
      return new Cartesian3(height, height, height);
    }
  }

  private cylinderHeight() {
    let positions = this.positionProperty.getValue(
      this.viewer.clock.currentTime
    );
    if (positions) {
      return this.getPosition(positions)?.height;
    }
  }

  private getGeoPosition() {
    let position = this.positionProperty.getValue(
      this.viewer.clock.currentTime
    );
    if (position) {
      return this.cartesian3ToLatLng(position);
    }
  }

  private cartesian3ToLatLng(position: Cartesian3) {
    const ellipsoid = Ellipsoid.WGS84;
    // 将提供的笛卡尔表示转换为制图表示。笛卡尔在椭球体的中心是未定义的。
    const cartographicPosition = ellipsoid.cartesianToCartographic(position);
    const longitude = CesiumMath.toDegrees(cartographicPosition.longitude);
    const latitude = CesiumMath.toDegrees(cartographicPosition.latitude);
    const height = cartographicPosition.height;
    return { longitude, latitude, height };
  }

  // 设置时钟事件，用于控制动画播放时间范围
  setClockEvent(start: JulianDate, stop: JulianDate) {
    let startTime = start.clone();
    this.viewer.clock.startTime = startTime;
    // @ts-ignore
    this.viewer.clock.endTime = stop.clone();
    this.viewer.clock.currentTime = startTime;
    this.viewer.clock.shouldAnimate = true;
    // @ts-ignore
    this.viewer.shouldAnimate = true;
    // this.viewer.scene.globe.depthTestAgainstTerrain = true;
  }

  // protected getEntity(data: EventData): any {
  //   let pickedFeature = data.pick;
  //   if (pickedFeature) {
  //     pickedFeature.id.cylinder.show = new ConstantProperty(true);
  //     pickedFeature.id.path.material = Color.YELLOW;
  //     pickedFeature.id.label.distanceDisplayCondition = undefined;
  //   }
  // }

  flyTo() {
    let geoPosition = this.getGeoPosition() as any;
    return this.viewer.camera.flyTo({
      destination: Cartesian3.fromDegrees(
        geoPosition.longitude,
        geoPosition.latitude,
        25000000
      )
    });
  }

  set show(show: boolean) {
    // if (super.show === show) {
    //   return;
    // }
    // super.show = show;
    if (!this.orbitEntity) {
      return;
    }
    this.orbitEntity.show = show;
  }

  remove(): any {
    // super.remove();
    this.viewer?.entities.remove(this.orbitEntity);
    this.orbitEntity = null;
    if (this.triangleEntity) {
      this.viewer?.entities.remove(this.triangleEntity);
      this.triangleEntity = null;
    }
  }

  get getSatelliteInfoId() {
    return this.satelliteInfoId;
  }

  get getOrbitEntity() {
    return this.orbitEntity;
  }

  // 雷达四凌锥体(朝向乱跑)
  createEntity(satellite) {
    // 确保启用深度测试以实现贴地效果
    // this.viewer.scene.globe.depthTestAgainstTerrain = true;
    Cartesian3.fromDegrees(112.1234, 22.4567, 0);
    console.log(satellite.position);
    this.viewer.entities.add({
      name: "雷达四凌锥体",
      // position:targetPosition,
      // orientation: Transforms.headingPitchRollQuaternion(targetPosition,
      //     new HeadingPitchRoll(     Math.toRadians(40),  Math.toRadians(180),
      //     Math.toRadians(90))),
      // orientation: Transforms.headingPitchRollQuaternion(targetPosition,
      //   new HeadingPitchRoll(     Math.toRadians(60),  Math.toRadians(-90),
      //   Math.toRadians(60))),// pitch(-90到90 上下) heading(0-360) roll(-180到180)
      orientation: new CallbackProperty(
        this.orientationUpdate.bind(this, satellite),
        false
      ),
      // orientation: new VelocityOrientationProperty(satellite.position),
      availability: satellite.availability,
      // position:satellite.position,
      position: new CallbackProperty(
        this.positionUpdate.bind(this, satellite),
        false
      ) as any,
      ellipsoid: {
        material: Color.fromCssColorString("#469810"),
        outline: false,
        radii: new Cartesian3(1.0, 1.0, 1.0), // 扇形半径
        // innerRadii: new Cartesian3(1100000.0, 1100000.0, 1100000.0), // 内半径
        innerRadii: new CallbackProperty(
          this.heightUpdate.bind(this, satellite),
          false
        ),
        minimumClock: CesiumMath.toRadians(75), // 左右偏角（底部矩形长度距离）
        maximumClock: CesiumMath.toRadians(105),
        minimumCone: CesiumMath.toRadians(80), // 上下偏角(底部矩形高度距离)
        maximumCone: CesiumMath.toRadians(90),
        heightReference: HeightReference.RELATIVE_TO_GROUND
      }
      // clampToGround: true,
    });
    Cartesian3.fromDegrees(112.1234, 22.4567, 1000);

    // 使用 flyTo 方法飞到指定位置
    // this.viewer.camera.flyTo({
    //     destination: targetPosition,
    //     orientation: {
    //         heading: Math.toRadians(0.0), // 朝向
    //         pitch: Math.toRadians(-45.0), // 俯仰角
    //         roll: 0.0                            // 滚转角
    //     },
    //     duration: 3.0 // 飞行持续时间（秒）
    // });
    // this.viewer.flyTo(entity)
  }

  // // 创建圆锥扫描锥体
  createCylinderEntity(satellite) {
    var cylinderEntity = {
      name: "Red cone",
      availability: satellite.availability,
      position: satellite.position,
      cylinder: {
        heightReference: HeightReference.CLAMP_TO_GROUND,
        length: 600000,
        topRadius: 0,
        bottomRadius: 600000 / 2,
        material: Color.RED.withAlpha(0.4),
        outline: !0,
        numberOfVerticalLines: 0,
        outlineColor: Color.RED.withAlpha(0.4)
      },
      show: false
    };
    return cylinderEntity;
  }

  // primitive 四凌锥体
  createHirarchyEntity() {
    let data = [
      {
        color: 1,
        latitude: 22.4567,
        longitude: 112.1234,
        aoa: 40
      }
    ];
    let labels = new PrimitiveCollection();
    labels["id"] = "labelPrimitive";
    this.viewer.scene.primitives.add(labels);

    let EllipsoidOutlineInstances = [];
    for (let index = 0; index < data.length; index++) {
      const entityI = data[index] as any;
      //根据type设置不同填充色
      let color = "";
      if (entityI.color === 1) {
        color = "rgba(0,191,255,1)";
      } else {
        if (entityI.type == "4G") {
          color = "rgba(0,128,0,1)";
        } else if (entityI.type == "5G") {
          color = "rgba(0,0,153,1)";
        }
      }
      console.log("color", color);
      let position = Cartesian3.fromDegrees(
        parseFloat(entityI.longitude),
        parseFloat(entityI.latitude),
        0
      );
      //entityI.aoa：弧度
      let hpRoll = new HeadingPitchRoll(
        CesiumMath.toRadians(parseFloat(entityI.aoa)),
        CesiumMath.toRadians(180),
        CesiumMath.toRadians(90)
      );
      EllipsoidOutlineInstances.push(
        new GeometryInstance({
          geometry: new EllipsoidOutlineGeometry({
            radii: new Cartesian3(1.0, 1.0, 1.0), // 扇形半径
            innerRadii: new Cartesian3(900.0, 900.0, 900.0), // 内半径
            minimumClock: CesiumMath.toRadians(75), // 左右偏角（底部矩形长度距离）
            maximumClock: CesiumMath.toRadians(105),
            minimumCone: CesiumMath.toRadians(80), // 上下偏角(底部矩形高度距离)
            maximumCone: CesiumMath.toRadians(90)
          }),
          modelMatrix: Transforms.headingPitchRollToFixedFrame(
            position,
            hpRoll
          ),
          attributes: {
            color: ColorGeometryInstanceAttribute.fromColor(Color.RED)
          }
        })
      );
    }
    labels.add(
      new Primitive({
        geometryInstances: EllipsoidOutlineInstances,
        appearance: new PerInstanceColorAppearance({
          flat: true, //EllipsoidOutlineGeometry类型必须设置该参数，不然会出现下图错误
          faceForward: true, // 确保面朝前
          translucent: false, // 关闭透明效果
          closed: true // 确保几何体是闭合的
        })
      })
    );
    var targetPosition = Cartesian3.fromDegrees(112.1234, 22.4567, 1000);

    // 使用 flyTo 方法飞到指定位置
    this.viewer.camera.flyTo({
      destination: targetPosition,
      orientation: {
        heading: CesiumMath.toRadians(0.0), // 朝向
        pitch: CesiumMath.toRadians(-45.0), // 俯仰角
        roll: 0.0 // 滚转角
      },
      duration: 3.0 // 飞行持续时间（秒）
    });
  }

  /**
   * 取消高亮
   */
  unhighlight() {
    // this.orbitEntity.path.material = this.overColor;
    // this.orbitEntity.path.show = false;
    this.orbitEntity.path.material = new Cesium.ColorMaterialProperty(
      this.overColor
    );
    this.orbitEntity.path.show = new Cesium.ConstantProperty(false);
    this.showPopup = false;
    this.viewer.trackedEntity = undefined;
  }

  selectColor = Color.RED.withAlpha(0.8);
  overColor = Color.YELLOW.withAlpha(0.8);
  showPopup = false;

  /**
   * 高亮
   * @param entity
   */
  highlight(entity: any) {
    console.log("entity", entity);
    // this.orbitEntity.path.material = this.selectColor;
    // this.orbitEntity.path.width = 2;
    // this.orbitEntity.path.show = true;
    this.orbitEntity.path.material = new Cesium.ColorMaterialProperty(
      this.selectColor
    );
    this.orbitEntity.path.width = new Cesium.ConstantProperty(2);
    this.orbitEntity.path.show = new Cesium.ConstantProperty(true);
    this.showPopup = true;
  }

  onMouseOver(entity: any): void {
    console.log("entity", entity);
    // super.onMouseOver(entity);
    if (!this.showPopup) {
      // this.orbitEntity.path.material = this.overColor;
      // this.orbitEntity.path.width = 2;
      // this.orbitEntity.path.show = true;
      this.orbitEntity.path.material = new Cesium.ColorMaterialProperty(
        this.overColor
      );
      this.orbitEntity.path.width = new Cesium.ConstantProperty(2);
      this.orbitEntity.path.show = new Cesium.ConstantProperty(true);
    }
  }

  onMouseOut() {
    if (!this.showPopup && this.orbitEntity.path) {
      // this.orbitEntity.path.show = false;
      this.orbitEntity.path.show = new Cesium.ConstantProperty(false);
    }
  }

  /**
   * 获取popup数据
   * @param entity
   */
  getPopupData(entity: any): any {
    console.log("entity", entity);
    return this.options;
  }

  track() {
    // 跟踪实体？
    this.viewer.trackedEntity = this.orbitEntity;
  }

  addCrossTrackCallback(callback: (entity: any) => void) {
    this.crossTrackCallbacks.push(callback);
  }

  removeCrossTrackCallback(callback: (entity: any) => void) {
    for (let i = 0; i < this.crossTrackCallbacks.length; i++) {
      if (this.crossTrackCallbacks[i] === callback) {
        this.crossTrackCallbacks.splice(i, 1);
        return;
      }
    }
  }
}

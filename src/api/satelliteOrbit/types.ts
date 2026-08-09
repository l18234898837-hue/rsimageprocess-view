export type getSatelliteTreeResponse = {
  id: string; //节点id
  name: string; // 卫星名称
  level: number; // 层级
  data?: IGetSatelliteTreeResponseData;
  children: getSatelliteTreeResponse[]; //子节点
};

export type IGetSatelliteTreeResponseData = {
  altitude: number;
  clothWidth: number;
  country: string;
  createBy: string;
  createTime: string;
  delFlag: string;
  id: number | string;
  launchDate: string;
  noradNumber: string;
  orbitalAltitude: number;
  remarks: string;
  resolution: number;
  satelliteCategory: string;
  satelliteCode: string;
  satelliteIdentityLine: string;
  satelliteName: string;
  satelliteSeries: string;
  satelliteSource: string;
  satelliteStatus: string;
  satelliteType: string;
  sideAngle: string;
  updateBy: string;
  updateTime: string;
};

export type getSatelliteTleListResponse = {
  id: number; //主键
  satelliteInfoId: number; //卫星ID
  tleLine1: string; //TLE行1
  tleLine2: string; //TLE行2
  epochTime: string; //历元时间
  inclination: string; // 轨道倾角(度)
  meanMotionDot: string; //平均运动的一阶时间导数(rev/day²)
  meanMotionDdot: string; //平均运动的二阶时间导数(rev/day³)
  bstarDragCoefficient: string; //BSTAR阻力系数(/地球半径)
  ephemerisType: string; //星历类型
  elementNumber: string; //元素编号
  rightAscension: string; //升交点赤经(度)
  eccentricity: string; //偏心率
  argumentOfPerigee: string; //近地点幅角(度)
  meanAnomaly: string; //平近点角(度)
  meanMotion: string; // 平均运动(rev/day)
  revolutionNumber: number; //轨道周期(分钟)
  delFlag: string; //删除标志（0代表存在 2代表删除）
  noradNumber: string; //可选
};

export type postOrbitForecastSatelliteOverZoneBody = {
  tleLine1: string;
  tleLine2: string;
  startTime: string; //预测日期时间区间开始
  endTime: string; //预测日期时间区间结束
  zone: object; //检测区域，WGS84坐标系
};

export type postOrbitForecastSatelliteOverZoneResponse = {
  satelliteInfoId: string | number;
  satelliteName: string | null;
  noradNumber: string | null;
  zoneDetectResult: [
    {
      entryTime: string;
      exitTime: string;
      footprints: Array<Array<any>>; //在区域内的足迹 [[经度,纬度，高度(米)],...]
      beforeEnter: object;
      afterExit: object;
    }
  ];
};

export type postOrbitForecastSatelliteOverCircleZoneBody = {
  tleLine1: string;
  tleLine2: string;
  startTime: string; //预测日期时间区间开始
  endTime: string; //预测日期时间区间结束
  centerLon: number; //圆心经度
  centerLat: number; //圆心纬度
  radiusKm: number; //圆半径(单位：千米)
  segments: number; //多边形边数(越多越接近圆形)
};

export type getSatelliteInfoDictResponse = {
  label: string;
  value: number | string;
};

export type postOrbitForecastSatelliteOverZoneBodyNew = {
  orbitForecastSpecs: OrbitForecastSpecs[];
  startTime: string;
  endTime: string;
  zone: Record<string, any>;
  periodStartTime?: string;
  periodEndTime?: string;
};

export type OrbitForecastSpecs = {
  tleLine1: string;
  tleLine2: string;
  orbitalAltitude: number;
  clothWidth: number;
  satelliteId: string;
  satelliteName: string;
  satelliteCode?: string;
  satelliteChineseName?: string;
  noradNumber?: string;
  satelliteIdentityLine?: string;
  satelliteType: string;
  satelliteSource?: string;
  satelliteSeries: string;
  forecastTime?: string;
  sensorId?: string;
  sensorCode?: string;
  maxSideAngle: number;
  minSideAngle: number;
  panGsd?: string;
  mulGsd?: string;
  gsd?: string;
  sensorType?: string;
};

export type postOrbitForecastSatelliteOverZoneNewResponse = {
  satelliteId: string;
  satelliteCode: string;
  satelliteNoradId: string;
  satelliteName: string;
  satelliteChineseName: string;
  satelliteType: string;
  satelliteSource: string;
  satelliteSeries: string;
  clothWidth: number;
  tleLine1: string;
  tleLine2: string;
  orbitAltitude: number;
  orbitalAltitude: number;
  minSideAngle: number;
  maxSideAngle: number;
  sensorId: string;
  sensorCode: string;
  sensorClothWidth: number;
  sensorSideAngle: number;
  entryTime: string;
  exitTime: string;
  geomLength: number;
  geomJson: string;
  forecastStateDtos: ForecastStateDto[];
  zoneDetectResultList: [
    {
      entryTime: string;
      exitTime: string;
      footprints: Array<Array<any>>; //在区域内的足迹 [[经度,纬度，高度(米)],...]
      beforeEnter: object;
      afterExit: object;
    }
  ];
};

export type ForecastStateDto = {
  lon: number;
  lat: number;
  altitude: number;
  geomJson: string;
  forecastStamp: string;
};

export type postOrbitForecastSatelliteOverCircleZoneBodyNew = {
  startTime: string;
  endTime: string;
  centerLon: number;
  centerLat: number;
  radiusKm: number;
  segments: number;
  orbitForecastSpecs: OrbitForecastSpecs[];
  periodStartTime?: string;
  periodEndTime?: string;
};

export type postOrbitForecastResultForSideAngleBody = {
  satelliteId?: string;
  satelliteName?: string;
  orbitalAltitude: number;
  clothWidth: number;
  tleLine1: string;
  tleLine2: string;
  wkt: string;
  sensorId?: string;
  forecastStartTime: string;
  forecastEndTime: string;
  sideAngle: string;
  // positionList: ForecastStateDto[];
  positionList: Array<[number, number]>;
};

export type postOrbitForecastResultForSideAngleCircleBody = {
  centerLon: number;
  centerLat: number;
  radiusKm: number;
  segments: number;
  satelliteId: string;
  satelliteName: string;
  orbitalAltitude: number;
  clothWidth: number;
  tleLine1: string;
  tleLine2: string;
  sensorId: string;
  forecastStartTime: string;
  forecastEndTime: string;
  sideAngle: string;
  positionList: Array<[number, number]>;
};

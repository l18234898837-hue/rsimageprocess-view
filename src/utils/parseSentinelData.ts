/** 解析Sentinel数据字符串 */
export const parseSentinelData = dataStr => {
  // 提取products数组内容
  const productsMatch = dataStr.match(/products=\[(.*?)\], currentPage/s);
  if (!productsMatch) return null;

  const productsStr = productsMatch[1];

  // 提取分页信息
  const currentPage = parseInt(dataStr.match(/currentPage=(\d+)/)?.[1] || "0");
  const pageSize = parseInt(dataStr.match(/pageSize=(\d+)/)?.[1] || "0");
  const totalCount = parseInt(dataStr.match(/totalCount=(\d+)/)?.[1] || "0");
  const totalPages = parseInt(dataStr.match(/totalPages=(\d+)/)?.[1] || "0");

  // 分割每个Product
  const productMatches = productsStr
    .split(/SentinelDataUtils\.Product\(/)
    .filter(s => s.trim());

  const products = productMatches.map(productStr => {
    const obj = {} as any;

    // 提取各个字段
    obj.productId = productStr.match(/productId=([^,]+)/)?.[1] || "";
    obj.name = productStr.match(/name=([^,]+)/)?.[1] || "";
    obj.acquisitionTime =
      productStr.match(/acquisitionTime=([^,]+)/)?.[1] || "";
    obj.s3Path = productStr.match(/s3Path=([^,]+)/)?.[1] || "";
    const geoMatch = productStr.match(/geoFootprint=(\{[^}]+\}|)/);
    if (geoMatch) {
      obj.geoFootprint = geoMatch[1] ? JSON.parse(geoMatch[1]) : "";
    } else {
      obj.geoFootprint = "";
    }
    obj.downloadUrl =
      productStr.match(/downloadUrl=(https?:\/\/[^,]+)/)?.[1] || "";
    obj.thumbnailUrl =
      productStr.match(/thumbnailUrl=(https?:\/\/[^,]+)/)?.[1] || "";
    obj.isOnline = productStr.match(/isOnline=(true|false)/)?.[1] === "true";
    obj.platform =
      productStr.match(/platform=(null|[^)]+)/)?.[1] === "null"
        ? null
        : productStr.match(/platform=([^)]+)/)?.[1];
    return obj;
  });

  return {
    products,
    pagination: {
      currentPage,
      pageSize,
      totalCount,
      totalPages
    }
  };
};

/** 计算边界框 [lngMin, lngMax, latMin, latMax] */
export const calculateBoundingBox = geoFootprint => {
  if (
    !geoFootprint ||
    !geoFootprint.coordinates ||
    !geoFootprint.coordinates[0]
  ) {
    return null;
  }

  const coordinates = geoFootprint.coordinates[0]; // 获取外环坐标

  let lngMin = Infinity;
  let lngMax = -Infinity;
  let latMin = Infinity;
  let latMax = -Infinity;

  coordinates.forEach(([lng, lat]) => {
    lngMin = Math.min(lngMin, lng);
    lngMax = Math.max(lngMax, lng);
    latMin = Math.min(latMin, lat);
    latMax = Math.max(latMax, lat);
  });

  return [lngMin, lngMax, latMin, latMax];
};

/** 转换为GeoJSON FeatureCollection */
export const convertToGeoJSON = parsedData => {
  const features = parsedData.products
    .filter(product => product.geoFootprint && product.geoFootprint.type) // 只保留有地理信息的产品
    .map(product => ({
      type: "Feature",
      id: product.productId,
      geometry: product.geoFootprint,
      properties: {
        productId: product.productId,
        name: product.name,
        acquisitionTime: product.acquisitionTime,
        s3Path: product.s3Path,
        downloadUrl: product.downloadUrl,
        thumbnailUrl: product.thumbnailUrl,
        isOnline: product.isOnline,
        platform: product.platform
      }
    }));

  return {
    type: "FeatureCollection",
    features: features,
    metadata: {
      totalFeatures: features.length,
      pagination: parsedData.pagination
    }
  };
};

/** 转换为GeoJSON FeatureCollection */
export const convertLandsatToGeoJSON = parsedData => {
  const features = parsedData.results
    .filter(result => result.spatialCoverage && result.spatialCoverage.type) // 只保留有地理信息的产品
    .map(result => ({
      type: "Feature",
      id: result.entityId,
      geometry: result.spatialCoverage
    }));

  return {
    type: "FeatureCollection",
    features: features,
    metadata: {
      totalFeatures: features.length
    }
  };
};

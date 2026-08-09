const WIND_SATELLITE_NAMES = ["高分辨率风速/风向", "海表风速/风向"];

export const isWindData = (item: any) =>
  WIND_SATELLITE_NAMES.includes(item?.satelliteName);
/** 按文件名前缀分组风场 spd / dir */
const groupWindFiles = (windList: any[]) => {
  const groupMap: Record<string, { spd?: any; dir?: any }> = {};
  windList.forEach(item => {
    const matched = String(item?.name ?? "").match(/^(.*?)(spd|dir)\.nc$/i);
    if (!matched) return;
    const basePrefix = matched[1];
    const suffix = matched[2].toLowerCase() as "spd" | "dir";
    if (!groupMap[basePrefix]) groupMap[basePrefix] = {};
    groupMap[basePrefix][suffix] = item;
  });
  return groupMap;
};
/** 校验风场数据 spd / dir 是否成对，缺一则返回 false */
export const validateWindFilePairs = (selectedData: any[]) => {
  const windList = selectedData.filter(isWindData);
  if (!windList.length) return true;
  return Object.values(groupWindFiles(windList)).every(g => g.spd && g.dir);
};

/** 构建风场接口 idList：同名前缀的 dir、spd 成对 */
export const buildWindIdList = (selectedData: any[]) => {
  const windList = selectedData.filter(isWindData);
  return Object.values(groupWindFiles(windList))
    .filter(g => g.spd && g.dir)
    .map(g => ({
      directionDataId: String(g.dir.id),
      speedDataId: String(g.spd.id)
    }));
};

// 过滤出非风场数据
export const filterNonWindData = (dataList: any[]) => {
  return dataList.filter(item => !isWindData(item));
};

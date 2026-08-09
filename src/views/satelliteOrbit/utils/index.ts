/**
 * @description 获取项目当前运行地址 .env中的配置为hash模式
 * @returns 返回项目当前运行地址
 */
export function getLocalPath() {
  return window.location.href + window.location.pathname;
}

/**
 * @description 获取public下的资源的路径
 * @param path 资源路径
 * @paran 资源类型 type images videos
 * @returns 完整的资源路径
 */
export function getPublicPath(path: string, type: string = "images") {
  return `${window.location.origin}/${type}/${path}`;
}

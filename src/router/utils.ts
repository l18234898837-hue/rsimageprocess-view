import {
  type RouterHistory,
  createWebHistory,
  createWebHashHistory
} from "vue-router";

function getHistoryMode(routerHistory): RouterHistory {
  // len为1 代表只有历史模式 为2 代表历史模式中存在base参数 https://next.router.vuejs.org/zh/api/#%E5%8F%82%E6%95%B0-1
  const historyMode = routerHistory.split(",");
  const leftMode = historyMode[0];
  const rightMode = historyMode[1];
  // no param
  if (historyMode.length === 1) {
    if (leftMode === "hash") {
      return createWebHashHistory("");
    } else if (leftMode === "h5") {
      return createWebHistory("");
    }
  } //has param
  else if (historyMode.length === 2) {
    if (leftMode === "hash") {
      return createWebHashHistory(rightMode);
    } else if (leftMode === "h5") {
      return createWebHistory(rightMode);
    }
  }
}

export function hasRequiredPermissions(
  permissions: readonly string[],
  required: string | readonly string[] | undefined
): boolean {
  const requiredPermissions =
    typeof required === "string" ? [required] : required ?? [];
  return requiredPermissions.every(permission =>
    permissions.includes(permission)
  );
}

export function hasRequiredRoles(
  roles: readonly string[],
  required: string | readonly string[] | undefined
): boolean {
  const requiredRoles =
    typeof required === "string" ? [required] : required ?? [];
  return requiredRoles.every(role => roles.includes(role));
}

export { getHistoryMode };

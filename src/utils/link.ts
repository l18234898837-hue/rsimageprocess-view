import { useRoute } from "vue-router";
import { router } from "@/router";

// 正常跳转
export const linkPush = url => {
  router.push(url);
};

// 重置history跳转
export const linkReplace = url => {
  router.replace(url);
};

// 获取vue-router meta参数
export const getMeta = () => {
  const route = useRoute();
  return route.meta;
};

// 获取vue-router path参数
export const getPath = () => {
  const route = useRoute();
  return route.path;
};

// 获取vue-router query参数
export const getQuery = () => {
  const route = useRoute();
  return route.query;
};

// 返回
export const historyBack = () => {
  history.back();
};

// 获取#前面外部query参数
export const getUrlParams = variable => {
  const query = window.location.search.substring(1);
  const vars = query.split("&");
  for (let i = 0; i < vars.length; i++) {
    const pair = vars[i].split("=");
    if (pair[0] == variable) {
      return pair[1];
    }
  }
  return false;
};

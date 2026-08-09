import { getConfig } from "@/config";
import { type Router, createRouter } from "vue-router";
import { getHistoryMode } from "./utils";
import { isUrl } from "@pureadmin/utils";

/** 自动导入全部静态路由，无需再手动引入！匹配 src/router/modules 目录（任何嵌套级别）中具有 .ts 扩展名的所有文件 */
const modules: Record<string, any> = import.meta.glob(["./modules/**/*.ts"], {
  eager: true
});

/** 原始静态路由（未做任何处理） */
const routes = [];

Object.keys(modules).forEach(key => {
  if (Array.isArray(modules[key].default)) {
    modules[key].default.forEach(item => {
      routes.push(item);
    });
  } else {
    routes.push(modules[key].default);
  }
});

/** 创建路由实例 */
export const router: Router = createRouter({
  history: getHistoryMode(import.meta.env.VITE_ROUTER_HISTORY),
  routes: routes,
  strict: true,
  scrollBehavior(to, from, savedPosition) {
    return new Promise(resolve => {
      if (savedPosition) {
        return savedPosition;
      } else {
        if (from.meta.saveSrollTop) {
          const top: number =
            document.documentElement.scrollTop || document.body.scrollTop;
          resolve({ left: 0, top });
        } else {
          resolve({ left: 0, top: 0 });
        }
      }
    });
  }
});

router.beforeEach((to: ToRouteType, _from, next) => {
  // const userInfo = storageLocal().getItem<DataInfo<number>>(sessionKey);
  const externalLink = isUrl(to?.name as string);
  if (!externalLink) {
    to.matched.some(item => {
      if (!item.meta.title) return "";
      const Title = getConfig().Title;
      if (Title) document.title = `${item.meta.title} | ${Title}`;
      else document.title = item.meta.title as string;
    });
  }
  next();
});

export default router;

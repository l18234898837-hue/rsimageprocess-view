import Axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type CustomParamsSerializer
} from "axios";
import type {
  PureHttpError,
  RequestMethods,
  PureHttpResponse,
  PureHttpRequestConfig
} from "./types.d";
import { stringify } from "qs";
import NProgress from "../progress";
import { formatToken } from "@/utils/auth";
import { useUserStoreHook } from "@/store/modules/user";
import { ElMessage, ElNotification } from "element-plus";
const { VITE_API_PATH } = import.meta.env;

// 相关配置请参考：www.axios-js.com/zh-cn/docs/#axios-request-config-1
const defaultConfig: AxiosRequestConfig = {
  baseURL: VITE_API_PATH,
  // baseURL: "/qhdxApi",
  // 请求超时时间
  timeout: 100000,
  // headers: {
  //   Accept: "application/json, text/plain, */*",
  //   "Content-Type": "application/json",
  //   "X-Requested-With": "XMLHttpRequest"
  // },
  headers: {
    // "content-language": "zh_CN"
  },
  // 数组格式参数序列化（https://github.com/axios/axios/issues/5142）
  paramsSerializer: {
    serialize: stringify as unknown as CustomParamsSerializer
  }
};

const errorCode = {
  "401": "认证失败，无法访问系统资源",
  "403": "当前操作没有权限",
  "404": "访问资源不存在",
  default: "系统未知错误，请反馈给管理员"
};

class PureHttp {
  constructor() {
    this.httpInterceptorsRequest();
    this.httpInterceptorsResponse();
  }

  /** `token`过期后，暂存待执行的请求 */
  private static requests = [];

  /** 防止重复刷新`token` */
  private static isRefreshing = false;

  /** 初始化配置对象 */
  private static initConfig: PureHttpRequestConfig = {};

  /** 保存当前`Axios`实例对象 */
  private static axiosInstance: AxiosInstance = Axios.create(defaultConfig);

  /** 重连原始请求 */
  private static retryOriginalRequest(config: PureHttpRequestConfig) {
    return new Promise(resolve => {
      PureHttp.requests.push((token: string) => {
        config.headers["Authorization"] = formatToken(token);
        resolve(config);
      });
    });
  }

  /** 请求拦截 */
  private httpInterceptorsRequest(): void {
    PureHttp.axiosInstance.interceptors.request.use(
      async (config: PureHttpRequestConfig): Promise<any> => {
        // 开启进度条动画
        NProgress.start();
        // 优先判断post/get等方法是否传入回调，否则执行初始化设置等回调
        if (typeof config.beforeRequestCallback === "function") {
          config.beforeRequestCallback(config);
          return config;
        }
        if (PureHttp.initConfig.beforeRequestCallback) {
          PureHttp.initConfig.beforeRequestCallback(config);
          return config;
        }
        /** 请求白名单，放置一些不需要`token`的接口（通过设置请求白名单，防止`token`过期后再请求造成的死循环问题） */
        const whiteList = ["/refresh-token", "/login"];
        // (url => config.url.endsWith(url))
        return whiteList.some(
          url =>
            config.url.indexOf(url) > -1 &&
            // 白名单去掉logininfor by xdp
            config.url.indexOf("logininfor") === -1
        )
          ? config
          : new Promise(resolve => {
              const token = useUserStoreHook().$state.token;
              if (token) {
                config.headers["Authorization"] = formatToken(token);
                resolve(config);
              } else {
                resolve(config);
              }
              // const data = getToken();
              // if (data) {
              //   const now = new Date().getTime();
              //   const expired = parseInt(data.expires) - now <= 0;
              //   if (expired) {
              //     if (!PureHttp.isRefreshing) {
              //       PureHttp.isRefreshing = true;
              //       // token过期刷新
              //       useUserStoreHook()
              //         .handRefreshToken({ refreshToken: data.refreshToken })
              //         .then(res => {
              //           const token = res.data.accessToken;
              //           config.headers["Authorization"] = formatToken(token);
              //           PureHttp.requests.forEach(cb => cb(token));
              //           PureHttp.requests = [];
              //         })
              //         .finally(() => {
              //           PureHttp.isRefreshing = false;
              //         });
              //     }
              //     resolve(PureHttp.retryOriginalRequest(config));
              //   } else {
              //     config.headers["Authorization"] = formatToken(
              //       data.accessToken
              //     );
              //     resolve(config);
              //   }
              // } else {
              //   resolve(config);
              // }
            });
      },
      error => {
        return Promise.reject(error);
      }
    );
  }

  /** 响应拦截 */
  private httpInterceptorsResponse(): void {
    const instance = PureHttp.axiosInstance;
    instance.interceptors.response.use(
      (response: PureHttpResponse) => {
        const $config = response.config;
        const code = response.data.code || 200;
        const msg =
          errorCode[code] || response.data.msg || errorCode["default"];
        const rejectWithBackendMessage = () => {
          const backendError = new Error(msg) as PureHttpError;
          backendError.response =
            response as unknown as PureHttpError["response"];
          return Promise.reject(backendError);
        };
        // 关闭进度条动画
        NProgress.done();

        // 产物本身可能就是 JSON，不能将其当作接口错误响应解析。
        if ($config.rawBlobResponse) return response;

        // 兼容blob、字节，主要用于报错显示json信息
        if (
          response.request.responseType === "blob" ||
          response.request.responseType === "arraybuffer"
        ) {
          if (response.data?.type === "application/json") {
            const reader = new FileReader();
            reader.readAsText(response.data);
            reader.onload = (event: any) => {
              const jsonData = JSON.parse(event.target.result);
              if (jsonData.code !== 200) {
                ElMessage({ message: jsonData.msg, type: "warning" });
                return Promise.reject("error");
              }
            };
          } else {
            return response;
          }
        }

        if (code === 401) {
          useUserStoreHook().logOut();
          return Promise.reject("无效的会话，或者会话已过期，请重新登录。");
        } else if (code === 500) {
          if (response.data?.msg?.indexOf("<br") > -1) {
            return response.data;
          } else {
            ElMessage({ message: msg, type: "warning" });
            return rejectWithBackendMessage();
          }
        } else if (code === 601) {
          ElMessage({ message: msg, type: "warning" });
          return rejectWithBackendMessage();
        } else if (code !== 200) {
          ElNotification.error({ title: msg });
          return rejectWithBackendMessage();
        }

        // 优先判断post/get等方法是否传入回调，否则执行初始化设置等回调
        if (typeof $config.beforeResponseCallback === "function") {
          $config.beforeResponseCallback(response);
          return response.data;
        }
        if (PureHttp.initConfig.beforeResponseCallback) {
          PureHttp.initConfig.beforeResponseCallback(response);
          return response.data;
        }
        return response.data;
      },
      (error: PureHttpError) => {
        const $error = error;
        $error.isCancelRequest = Axios.isCancel($error);

        console.log("err" + error);
        let { message } = error;
        const responseData = error.response?.data;
        const backendMessage =
          responseData &&
          typeof responseData === "object" &&
          "msg" in responseData &&
          typeof responseData.msg === "string" &&
          responseData.msg.trim()
            ? responseData.msg
            : "";
        if (backendMessage) {
          message = backendMessage;
        } else if (message == "Network Error") {
          message = "后端接口连接异常";
        } else if (message.includes("timeout")) {
          message = "系统接口请求超时";
        } else if (message.includes("Request failed with status code")) {
          message = "系统接口" + message.substr(message.length - 3) + "异常";
        }
        if (
          !($error.config as PureHttpRequestConfig | undefined)?.silentError
        ) {
          ElMessage({ message: message, type: "error", duration: 5 * 1000 });
        }

        // 关闭进度条动画
        NProgress.done();
        // 所有的响应异常 区分来源为取消请求/非取消请求
        return Promise.reject($error);
      }
    );
  }

  /** 通用请求工具函数 */
  public request<T>(
    method: RequestMethods,
    url: string,
    param?: PureHttpRequestConfig,
    axiosConfig?: PureHttpRequestConfig
  ): Promise<T> {
    const config = {
      method,
      url,
      ...param,
      ...axiosConfig
    } as PureHttpRequestConfig;

    // 单独处理自定义请求/响应回调
    return new Promise((resolve, reject) => {
      PureHttp.axiosInstance
        .request(config)
        .then((response: undefined) => {
          resolve(response);
        })
        .catch(error => {
          reject(error);
        });
    });
  }

  /** 单独抽离的`post`工具函数 */
  public post<T, P>(
    url: string,
    params?: AxiosRequestConfig<P>,
    config?: PureHttpRequestConfig
  ): Promise<T> {
    return this.request<T>("post", url, params, config);
  }

  /** 单独抽离的`get`工具函数 */
  public get<T, P>(
    url: string,
    params?: AxiosRequestConfig<P>,
    config?: PureHttpRequestConfig
  ): Promise<T> {
    return this.request<T>("get", url, params, config);
  }
}

export const http = new PureHttp();

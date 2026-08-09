import { defineStore } from "pinia";
import {
  type userType,
  type resData,
  store,
  router,
  storageLocal
} from "../utils";
import { type UserResult, getLogin, getInfo } from "@/api/user";
import {
  type DataInfo,
  setTokenNew,
  removeToken,
  userKey,
  TokenKey
} from "@/utils/auth";

export const useUserStore = defineStore({
  id: "pure-user",
  state: (): userType => ({
    token: storageLocal().getItem(TokenKey) ?? "",
    // 头像
    avatar: storageLocal().getItem<DataInfo<number>>(userKey)?.avatar ?? "",
    // 用户名
    username: storageLocal().getItem<DataInfo<number>>(userKey)?.username ?? "",
    // 昵称
    nickname: storageLocal().getItem<DataInfo<number>>(userKey)?.nickName ?? "",
    // 用户信息
    info: storageLocal().getItem<DataInfo<number>>(userKey)?.info ?? [],
    // 页面级别权限
    roles: storageLocal().getItem<DataInfo<number>>(userKey)?.roles ?? [],
    // 按钮级别权限
    permissions:
      storageLocal().getItem<DataInfo<number>>(userKey)?.permissions ?? []
  }),
  actions: {
    /** 存储token */
    SET_TOKEN(token) {
      this.token = token;
    },
    /** 存储头像 */
    SET_AVATAR(avatar: string) {
      this.avatar = avatar;
    },
    /** 存储用户名 */
    SET_USERNAME(username: string) {
      this.username = username;
    },
    /** 存储昵称 */
    SET_NICKNAME(nickname: string) {
      this.nickname = nickname;
    },
    /** 存储角色 */
    SET_ROLES(roles: Array<string>) {
      this.roles = roles;
    },
    /** 存储用户信息 */
    SET_INFO(info: Array<object>) {
      this.info = info;
    },
    /** 登入 */
    async loginByUsername(data) {
      return new Promise<UserResult>((resolve, reject) => {
        getLogin(data)
          .then(data => {
            // if (data?.success) setToken(data.data);
            // resolve(data);
            if (data) {
              setTokenNew(data.data);
              resolve(data);
            }
          })
          .catch(error => {
            reject(error);
          });
      });
    },
    // 获取用户信息
    getUserInfo() {
      return new Promise((resolve, reject) => {
        getInfo()
          .then((res: resData) => {
            const user = res.data.user;
            // const avatar = (user.avatar == "" || user.avatar == null) ? '' : user.avatar;

            if (res.data.roles && res.data.roles.length > 0) {
              // 验证返回的roles是否是一个非空数组
              this.roles = res.data.roles;
              this.permissions = res.data.permissions;
            } else {
              this.roles = ["ROLE_DEFAULT"];
            }
            this.username = user.userName;
            storageLocal().setItem(userKey, {
              info: user,
              username: this.username,
              permissions: this.permissions,
              roles: this.roles
            });
            this.SET_INFO(user);
            // this.avatar = avatar;
            resolve(res);
          })
          .catch(error => {
            reject(error);
          });
      });
    },
    /** 前端登出（不调用接口） */
    logOut() {
      this.token = "";
      this.username = "";
      this.roles = [];
      this.permissions = [];
      removeToken();
      router.push("/login");
    }
  }
});

export function useUserStoreHook() {
  return useUserStore(store);
}

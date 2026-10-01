import { http } from "@/utils/http";
import type { Result } from "@/api/api";

export type UserResult = {
  success: boolean;
  code: number;
  data: {
    /** 头像 */
    avatar: string;
    /** 用户名 */
    username: string;
    /** 当前登录用户的角色 */
    roles: Array<string>;
    /** `token` */
    accessToken: string;
    /** 用于调用刷新`accessToken`的接口时所需的`token` */
    refreshToken: string;
    /** `accessToken`的过期时间（格式'xxxx/xx/xx xx:xx:xx'） */
    expires: Date;
  };
};

/** 获取登录验证码 */
export const getCodeImg = (data?: object) => {
  return http.request("get", "/captchaImage", { data });
};

/** 登录 */
export const getLogin = (data?: object) => {
  return http.request<UserResult>("post", "/login", { data });
};

/** 注册 */
export const postRegister = (data?: object) => {
  return http.request<UserResult>("post", "/register", { data });
};

/** 获取用户信息 */
export const getInfo = () => {
  return http.request("get", "/getInfo");
};

/** 获取用户信息 */
export const getUserProfile = () => {
  return http.request("get", "/system/user/profile");
};

/** 修改用户密码 */
export const updatePwd = (data: object) => {
  return http.request("put", "/system/user/profile/updatePwd", {
    data
  });
};

/** 修改用户信息 */
export const updateProfile = (data: object) => {
  return http.request("put", "/system/user/profile", {
    data
  });
};

/** 发送重置密码邮件 */
export const sendResetPasswordEmail = (data: object) => {
  return http.request("get", "/emailResetPassword/send", {
    params: data
  });
};

/** 验证重置密码邮件 */
export const verifyResetPasswordEmail = (data: object) => {
  return http.request("post", "/emailResetPassword/verify", {
    data
  });
};

/** 用户密码重置 */
export const updateUserPwd = (oldPassword: string, newPassword: string) => {
  const data = {
    oldPassword,
    newPassword
  };
  return http.request<Result>("put", "/system/user/profile/updatePwd", {
    params: data
  });
};

/** 下载记录 */
export const getStDownloadLogPage = (data: {
  pageNum: number;
  pageSize: number;
  userId: string | number;
}) => {
  return http.request("get", "/stDownloadLog/page", {
    params: data
  });
};

/** 计算结果上传申请记录 */
export const getStCalculationResultApplyLogPage = (data: {
  pageNum: number;
  pageSize: number;
  userId: string | number;
}) => {
  return http.request("get", "/stCalculationResultApplyLog/page", {
    params: data
  });
};

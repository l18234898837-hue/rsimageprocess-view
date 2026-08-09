export type userType = {
  token?: string;
  avatar?: string;
  username?: string;
  nickname?: string;
  info?: Array<object>;
  roles?: Array<string>;
  permissions?: Array<string>;
};

export type resData = {
  data?: any;
  code?: string;
  msg?: string;
};

import smCrypto from "sm-crypto";

// 前端公钥
const publicKey =
  "049b15a76f28fecfcc2cf80c213982277e55ba6687d046b34570aec1afba5d3b77522458005f121083287cceb6137362e4b4dcfbc20c01944fdae81398dbc46a35";

export const sm2Encryption = (str: string) => {
  const sm2 = smCrypto.sm2;
  // 加密
  return sm2.doEncrypt(str, publicKey, 1);
};

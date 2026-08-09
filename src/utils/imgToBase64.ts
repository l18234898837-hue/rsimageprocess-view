/**
 * 将缩略图数据流转为base64
 */
export const imgStreamToBase64 = imgStream => {
  return new Promise<string>(resolve => {
    const base64Url =
      "data:image/png;base64," +
      btoa(
        new Uint8Array(imgStream).reduce(
          (data, byte) => data + String.fromCharCode(byte),
          ""
        )
      );
    resolve(base64Url);
  });
};

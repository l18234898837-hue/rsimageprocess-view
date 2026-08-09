import { downloadByData } from "@pureadmin/utils";

// 下载文件 name为空，则从从响应头中获取文件名称
export const downloadFile = (res, name?) => {
  let fileName = "";
  if (name) {
    fileName = name;
  } else {
    // 从响应头中获取文件名称
    let fileNameResponse;
    const contentDisposition = res.headers["content-disposition"];
    if (contentDisposition) {
      // 正则获取filename的值
      const filenameRegex = /file[Nn]ame[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
      const matches1 = filenameRegex.exec(contentDisposition);
      if (matches1 != null && matches1[1]) {
        fileNameResponse = matches1[1].replace(/['"]/g, "");
        fileNameResponse = decodeURI(fileNameResponse);
      }
      fileName = fileNameResponse;
    }
  }
  downloadByData(res.data, fileName);
};

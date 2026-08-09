import { http } from "@/utils/http";
import type { Result } from "@/api/api";

/** 获取可以计算的数据内容：信噪比、敏感性、信噪比和敏感性 */
export const getStarAnalysisData = (data?: object) => {
  return http.request<Result>("get", "satelliteCalculate");
};
/** SNR计算 */
export const getRunSNR = (data?: object) => {
  return http.request<Result>("post", "satelliteCalculate/runSNR", {
    data: data
  });
};
/** Sensitivity计算 */
export const getRunSensitivity = (data?: object) => {
  return http.request<Result>("post", "satelliteCalculate/runSensitivity", {
    data: data
  });
};
/** 获取SNR计算结果 */
export const getSNRData = (data?: object) => {
  return http.request<Result>("post", "satelliteCalculate/getSNRData", {
    data: data
  });
};
/** 获取Sensitivity计算结果 */
export const getSensitivityData = (data?: object) => {
  return http.request<Result>("post", "satelliteCalculate/getSensitivityData", {
    data: data
  });
};
/** 获取l2gen算法运行文件信息 */
export const getL2genData = () => {
  return http.request<Result>("get", "satelliteCalculate/l2gen");
};
/** 计算l2gen文件 */
export const runL2gen = (data?: object) => {
  return http.request<Result>("post", "satelliteCalculate/runL2gen", {
    data: data
  });
};
// 获取l2gen计算结果
export const getL2genResult = (data?: object) => {
  return http.request<Result>("get", "satelliteCalculate/getL2genData", {
    data: data
  });
};

// 运行sst
export const runSST = (data?: object) => {
  return http.request<Result>("post", "satelliteCalculate/runSST", {
    data: data
  });
};
// 获取sst计算结果
export const getSSTResult = () => {
  return http.request<Result>("get", "satelliteCalculate/getSSTData");
};
//获取ACL2gen文件夹
export const getACL2genData = () => {
  return http.request<Result>("get", "satelliteCalculate/ACL2gen");
};
//运行ACL2gen
export const runACL2gen = (data?: object) => {
  return http.request<Result>("post", "satelliteCalculate/ACL2gen", {
    data: data
  });
};
//获取ACL2gen计算结果
export const getACL2genResult = () => {
  return http.request<Result>("get", "satelliteCalculate/ACL2genData");
};
//运行sla算法程序
export const runSLA = (data?: object) => {
  return http.request<Result>("post", "satelliteCalculate/runSla", {
    data: data
  });
};
//获取SLA计算结果
export const getSLAResult = () => {
  return http.request<Result>("get", "satelliteCalculate/runSlaData");
};
//获取QA输入文件(无参数)
export const getQaInput = () => {
  return http.request<Result>("get", "satelliteCalculate/getQaInput");
};
//获取QA输出文件(无参数)
export const getQaOutput = () => {
  return http.request<Result>("get", "satelliteCalculate/qaOutput");
};
//运行QAPython1
export const runQaPython1 = () => {
  return http.request<Result>("post", "/satelliteCalculate/qaPython1");
};
//运行QAPython2
export const runQaPython2 = () => {
  return http.request<Result>("post", "/satelliteCalculate/qaPython2");
};
//运行QAPython3
export const runQaPython3 = () => {
  return http.request<Result>("post", "/satelliteCalculate/qaPython3");
};
//运行QAPython4
export const runQaPython4 = () => {
  return http.request<Result>("post", "/satelliteCalculate/qaPython4");
};
//运行QAPython5
export const runQaPython5 = () => {
  return http.request<Result>("post", "/satelliteCalculate/qaPython5");
};
//运行QAPython6
export const runQaPython6 = () => {
  return http.request<Result>("post", "/satelliteCalculate/qaPython6");
};

//runWindSh
export const runWindSh = () => {
  return http.request<Result>("post", "/satelliteCalculate/windSh");
};

//runWindPython1
export const runWindPython1 = () => {
  return http.request<Result>("post", "/satelliteCalculate/windPython1");
};
//runWindPython2
export const runWindPython2 = () => {
  return http.request<Result>("post", "/satelliteCalculate/windPython2");
};

//runSarwindPython
export const runSarwindPython = () => {
  return http.request<Result>("post", "/satelliteCalculate/sarwindPython");
};

//runSwhSh
export const runSwhSh = () => {
  return http.request<Result>("post", "/satelliteCalculate/swhSh");
};

//runSwhPython
export const runSwhPython = () => {
  return http.request<Result>("post", "/satelliteCalculate/swhPython");
};

//getWindInputShMul
export const getWindInputShMul = () => {
  return http.request<Result>("get", "/satelliteCalculate/windInputShMul");
};

//getWindInputShSy3e
export const getWindInputShSy3e = () => {
  return http.request<Result>("get", "/satelliteCalculate/windInputShSy3e");
};

//getWindInputShHy2b
export const getWindInputShHy2b = () => {
  return http.request<Result>("get", "/satelliteCalculate/windInputShHy2b");
};

//getWindInputShHy2c
export const getWindInputShHy2c = () => {
  return http.request<Result>("get", "/satelliteCalculate/windInputShHy2c");
};

//getWindInputPython1ccmp
export const getWindInputPython1ccmp = () => {
  return http.request<Result>(
    "get",
    "/satelliteCalculate/windInputPython1ccmp"
  );
};

// getWindInputPython1fusion
export const getWindInputPython1fusion = () => {
  return http.request<Result>(
    "get",
    "/satelliteCalculate/windInputPython1fusion"
  );
};

//getWindInputPython1land
export const getWindInputPython1land = () => {
  return http.request<Result>(
    "get",
    "/satelliteCalculate/windInputPython1land"
  );
};

//getWindInputPython2Fusion
export const getWindInputPython2Fusion = () => {
  return http.request<Result>(
    "get",
    "/satelliteCalculate/windInputPython2Fusion"
  );
};

// getWindInputPython2Buoy
export const getWindInputPython2Buoy = () => {
  return http.request<Result>(
    "get",
    "/satelliteCalculate/windInputPython2Buoy"
  );
};

//getWindMiddleShFy3e
export const getWindMiddleShFy3e = () => {
  return http.request<Result>("get", "/satelliteCalculate/windMiddleShFy3e");
};

//getWindMiddleShHy2b
export const getWindMiddleShHy2b = () => {
  return http.request<Result>("get", "/satelliteCalculate/windMiddleShHy2b");
};

//getWindMiddleShHy2c
export const getWindMiddleShHy2c = () => {
  return http.request<Result>("get", "/satelliteCalculate/windMiddleShHy2c");
};

// getWindOutputSh
export const getWindOutputSh = () => {
  return http.request<Result>("get", "/satelliteCalculate/windOutputSh");
};

// getWindOutputPython1
export const getWindOutputPython1 = () => {
  return http.request<Result>("get", "/satelliteCalculate/windOutputPython1");
};

// getWindOutputPython2
export const getWindOutputPython2 = () => {
  return http.request<Result>("get", "/satelliteCalculate/windOutputPython2");
};

// getSarwindInput
export const getSarwindInput = () => {
  return http.request<Result>("get", "/satelliteCalculate/sarwindInput");
};

// getSarwindOutput
export const getSarwindOutput = () => {
  return http.request<Result>("get", "/satelliteCalculate/sarwindOutput");
};

//getSwhInput
export const getSwhInput = () => {
  return http.request<Result>("get", "/satelliteCalculate/swhInput");
};

//getSwhOutput
export const getSwhOutput = () => {
  return http.request<Result>("get", "/satelliteCalculate/swhOutput");
};

// 测试接口
export const getScanFolder = () => {
  return http.request<Result>("get", "/download/scanFolder", {
    params: {
      filePath: "E:\\file\\卫星数据平台\\卫星项目沟通"
    }
  });
};

//下载文件
export const getDownloadFile = (data?: object) => {
  return http.request<Result>("get", "/download/download", {
    params: data,
    responseType: "blob"
  });
};
//上传文件
export const uploadFile = (data?: object) => {
  return http.request<Result>("post", "system/file/uploadStatic", {
    data: data,
    headers: {
      "Content-Type": "multipart/form-data"
    }
  });
};

//删除文件
export const deleteFile = (id: string) => {
  return http.request<Result>("delete", `system/file/delete/${id}`, {});
};

//获取算法库树结构
export const getAlgorithmLibraryTree = () => {
  return http.request<Result>("get", "/sd-algorithm-library-relation/tree");
};
///sd-algorithm-file/input/{id}
export const getAlgorithmFileInput = (id: string) => {
  return http.request<Result>("get", `/sd-algorithm-file/input/${id}`);
};
//sd-algorithm-file/output/{id}
export const getAlgorithmFileOutput = (id: string) => {
  return http.request<Result>("get", `/sd-algorithm-file/output/${id}`);
};
//计算接口
export const runAlgorithm = (data?: object) => {
  return http.request<Result>("post", `/sd-algorithm-file/algorithm`, {
    data: data
  });
};

// 获取计算记录
export const getAlgorithmRunRecord = (id: string, data: object) => {
  return http.request<Result>("get", `/sd-algorithm-run-record/page/${id}`, {
    params: data
  });
};

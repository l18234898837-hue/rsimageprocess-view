import * as Cesium from "cesium";
import axios from "axios";
import map from "@/libs/tdtmap";

// 色带数组
const defaultTemperature = [
  { value: 10, color: [0, 0, 255] },
  { value: 14, color: [0, 127, 255] },
  { value: 16, color: [0, 191, 255] },
  { value: 18, color: [0, 255, 255] },
  { value: 20, color: [0, 255, 127] },
  { value: 22, color: [127, 255, 0] },
  { value: 24, color: [255, 255, 0] },
  { value: 26, color: [255, 127, 0] },
  { value: 28, color: [255, 69, 0] },
  { value: 30, color: [255, 0, 0] },
  { value: 32, color: [191, 0, 0] },
  { value: 35, color: [128, 0, 0] }
];

/**
 * 获取网格值在哪些颜色区间内
 * @param gridValue 网格值
 * @returns 返回当前网格值在哪个颜色区间内
 */
const getMinAndMax = (currentPanelColorArr, gridValue) => {
  const index = currentPanelColorArr.findIndex(e => e.value > gridValue);
  let preColorItem = null;
  let nextColorItem = null;
  if (index == 0) {
    preColorItem = currentPanelColorArr[0];
    nextColorItem = currentPanelColorArr[0];
  } else if (index <= currentPanelColorArr.length - 1 && index !== -1) {
    preColorItem = currentPanelColorArr[index - 1];
    nextColorItem = currentPanelColorArr[index];
  } else if (index == -1) {
    preColorItem = currentPanelColorArr[currentPanelColorArr.length - 1];
    nextColorItem = currentPanelColorArr[currentPanelColorArr.length - 1];
  }
  return [preColorItem, nextColorItem];
};

const getGridValue = (gridValue, minValue, maxValue, minColor, maxColor) => {
  const a = 255;
  if (!gridValue) return [0, 0, 0, 0];

  if (minValue == maxValue) {
    return [minColor[0], minColor[1], minColor[2], a];
  }
  const ratio = (gridValue - minValue) / (maxValue - minValue); // 计算网格值在区间内的比例

  /**
   * 对每个RGB颜色通道值进行线性插值计算
   * value=𝑠𝑡𝑎𝑟𝑡+(𝑒𝑛𝑑−𝑠𝑡𝑎𝑟𝑡)⋅𝑡
   * 其中，start是最小值对应的颜色通道值，end是最大值对应的颜色通道值，t是计算得到的比例值
   * */
  const r = Math.round(minColor[0] + (maxColor[0] - minColor[0]) * ratio);
  const g = Math.round(minColor[1] + (maxColor[1] - minColor[1]) * ratio);
  const b = Math.round(minColor[2] + (maxColor[2] - minColor[2]) * ratio);

  return [r, g, b, a];
};

/**
 * @description 生成颜色数组
 * @param datas 网格值的二维数组
 * @param currentPanelColorArr 色带数组
 * @returns 返回颜色值一维数组，用于填充canvas
 */
const getColorData = (datas, currentPanelColorArr) => {
  let colors = [];
  // 给每个格点数据填充对应的颜色值
  if (datas && Array.isArray(datas)) {
    datas.forEach(outArr => {
      if (Array.isArray(outArr)) {
        outArr.forEach(gridValue => {
          // 获取网格值在哪些颜色区间内
          const result = getMinAndMax(currentPanelColorArr, gridValue);
          // console.log("result", result);
          // 根据区间颜色值获取当前网格值对应的颜色值
          const gridColor = getGridValue(
            gridValue,
            result[0].value,
            result[1].value,
            result[0].color,
            result[1].color
          );
          colors.push(...gridColor);
        });
      }
    });
  }
  return colors;
};

/**
 * 生成canvas元素
 * @param ctx canvas上下文
 * @param colors 生成的网格值颜色数组
 * @param nx 宽度
 * @param ny 高度
 */
const getCanvas = (ctx, colors, nx, ny) => {
  let imageData = ctx.createImageData(nx, ny); // 创建一个新的ImageData对象，宽度为nx，高度为ny
  // console.log("imageData", imageData.data);
  for (let i = 0; i < imageData.data.length; i += 4) {
    imageData.data[i + 0] = colors[i + 0];
    imageData.data[i + 1] = colors[i + 1];
    imageData.data[i + 2] = colors[i + 2];
    // 在Canvas API的ImageData对象中，透明度通道(A)的取值范围是0-255的整数
    imageData.data[i + 3] = colors[i + 3];
  }
  ctx.putImageData(imageData, 0, 0);
};

/**
 * @description 加载canvas元素到地图
 * @param {string} jsonUrl json数据地址
 */
export const addCanvasToMap = async (jsonUrl: string) => {
  const jsonData = await axios.get(jsonUrl).then(res => res.data);

  jsonData.datas.forEach(outArr => {
    if (Array.isArray(outArr)) {
      outArr.forEach((gridValue, gridIndex) => {
        if (gridValue == "NaN" || isNaN(gridValue)) outArr[gridIndex] = 0;
      });
    }
  });

  const canvas = document.createElement("canvas");
  canvas.width = jsonData.header.nx;
  canvas.height = jsonData.header.ny;
  const ctx = canvas.getContext("2d");
  const colorsData = getColorData(jsonData.datas, defaultTemperature);

  getCanvas(ctx, colorsData, canvas.width, canvas.height);
  const base64 = canvas.toDataURL("image/png");
  console.log(base64);
  map.getViewer().imageryLayers.addImageryProvider(
    new Cesium.SingleTileImageryProvider({
      url: base64,
      rectangle: Cesium.Rectangle.fromDegrees(
        jsonData.header.lo1,
        jsonData.header.la2,
        jsonData.header.lo2,
        jsonData.header.la1
      )
    })
  );
};

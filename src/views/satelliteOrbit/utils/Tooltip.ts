import { Cartesian2 } from "cesium";
import * as Cesium from "cesium";

class Tooltip {
  private container: any;
  private readonly tooltip: any;
  private lng: number;
  private lat: number;

  constructor(container: any) {
    // cesium.viewerContainer
    this.container = container;
    this.tooltip = document.createElement("div");
    // this.tooltip.className = tooltipClassName
    this.container.appendChild(this.tooltip);
    this.lng = 0;
    this.lat = 0;
  }

  show(
    position: Cartesian2,
    content: any,
    offset: Cartesian2 = new Cartesian2(0, 20)
  ) {
    this.tooltip.style.display = "block";
    this.tooltip.style.position = "absolute";
    this.tooltip.style.zIndex = 9999;
    // this.tooltip.style.transform = "translate(-50%, -100% )";
    this.tooltip.style.left = `${position.x + offset.x}px`;
    this.tooltip.style.top = `${position.y + offset.y}px`; // 20px offset to position above the cursor
    this.tooltip.innerHTML = content;
    // 存储该点的经纬度坐标
    // 使用正确的方法获取屏幕坐标对应的三维坐标
    const ray = window.viewer.camera.getPickRay(position);
    if (ray) {
      const cartesian = window.viewer.scene.globe.pick(
        ray,
        window.viewer.scene
      );
      if (cartesian) {
        const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
        const latitude = Cesium.Math.toDegrees(cartographic.latitude);
        const longitude = Cesium.Math.toDegrees(cartographic.longitude);
        this.lng = longitude;
        this.lat = latitude;
      }
    }
  }

  // 跟随鼠标移动
  followMouse() {
    // const pixelPosition = Cesium.SceneTransforms.worldToWindowCoordinates(
    const pixelPosition = Cesium.SceneTransforms.wgs84ToWindowCoordinates(
      window.viewer.scene,
      Cesium.Cartesian3.fromDegrees(this.lng as number, this.lat as number)
    );
    console.log("pixelPosition", pixelPosition);
    if (pixelPosition) {
      this.tooltip.style.left = `${pixelPosition.x}px`;
      this.tooltip.style.top = `${pixelPosition.y}px`;
    }
  }

  hide() {
    this.tooltip.style.display = "none";
  }

  remove() {
    this.container.removeChild(this.tooltip);
  }
}

export default Tooltip;

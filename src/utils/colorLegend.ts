/**
 * 生成透明背景 横向色带（无刻度、无文字、无白底）
 * @param colorRamp 颜色数组
 * @param width 宽度
 * @param height 高度
 */
export function generateHorizontalColorRamp(
  colorRamp: number[][],
  width = 400,
  height = 40
): Promise<string> {
  return new Promise(resolve => {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d")!;

    const padding = 0;
    const rampW = width - padding * 2;
    const rampH = height - padding * 2;

    const gradient = ctx.createLinearGradient(padding, 0, padding + rampW, 0);
    const step = 1 / (colorRamp.length - 1);

    colorRamp.forEach((rgb, i) => {
      gradient.addColorStop(i * step, `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`);
    });

    ctx.fillStyle = gradient;
    ctx.fillRect(padding, padding, rampW, rampH);

    const base64 = canvas.toDataURL("image/png");
    resolve(base64);
  });
}

/**
 * 生成竖向色带图例（自动刻度，自适应 min/max）
 * @param minValue 最小值
 * @param maxValue 最大值
 * @param colorRamp 颜色数组
 * @param width 宽度
 * @param height 高度
 */
export function generateColorLegend(
  minValue: number,
  maxValue: number,
  colorRamp: number[][],
  width = 130, // 保持总宽度不变
  height = 400
): Promise<string> {
  return new Promise(resolve => {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d")!;

    // 不再绘制白色背景，保持透明
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, width, height);

    // 调整边距：左侧色条区域缩小，右侧文字区域扩大
    const paddingX = 5; // 色条左侧边距
    const textPadding = 40; // 右侧文字区域宽度
    const paddingY = 15;
    const gradientWidth = width - paddingX - textPadding; // 色条宽度
    const gradientHeight = height - 2 * paddingY;

    // 绘制渐变条
    const gradient = ctx.createLinearGradient(
      0,
      paddingY + gradientHeight,
      0,
      paddingY
    );
    const step = 1 / (colorRamp.length - 1);
    colorRamp.forEach((rgb, i) => {
      gradient.addColorStop(i * step, `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`);
    });

    ctx.fillStyle = gradient;
    ctx.fillRect(paddingX, paddingY, gradientWidth, gradientHeight);

    // 文字样式调整
    ctx.fillStyle = "#000"; // 可根据背景改为 #fff
    ctx.font = "16px Arial"; // 增大字体，提升可读性
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";

    // 生成刻度值
    const tickCount = 7;
    const ticks: number[] = [];
    const range = maxValue - minValue;

    for (let i = 0; i < tickCount; i++) {
      const value = minValue + (range * i) / (tickCount - 1);
      ticks.push(Math.round(value));
    }

    // 绘制刻度和文字
    ticks.forEach(tick => {
      const ratio = (tick - minValue) / range;
      const y = paddingY + gradientHeight - ratio * gradientHeight;
      const textX = paddingX + gradientWidth + 8; // 文字起始位置右移

      // 刻度线
      ctx.beginPath();
      ctx.moveTo(textX - 10, y);
      ctx.lineTo(textX - 1, y);
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 1;
      ctx.stroke();

      // 文字（数字）
      ctx.fillText(tick.toString(), textX, y);
    });

    const base64 = canvas.toDataURL("image/png");
    resolve(base64);
  });
}

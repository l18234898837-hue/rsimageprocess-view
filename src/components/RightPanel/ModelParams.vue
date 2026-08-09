<template>
  <div
    v-if="isShow"
    class="w-full mb-[10px] text-[#545353] border-[1px] border-[#ccc]"
    style="background: rgb(255 255 255 / 90%); border-radius: 5px"
  >
    <div
      class="flex justify-center items-center w-full px-[15px] py-[5px]"
      style="
        /* background-image: linear-gradient(
          to right,
          #0080ff,
          rgb(255 255 255 / 0%)
        ); */
        background-color: gray;
      "
    >
      <div class="text-[#fff]">参数模型</div>
    </div>
    <div>
      <div class="box-border pt-[15px] px-[15px]">
        <el-form :model="form" label-width="auto" style="max-width: 450px">
          <!-- <el-form-item label="计算模型">
            <el-select v-model="form.region" placeholder="">
              <el-option label="潮汐预报模型" value="shanghai" />
            </el-select>
          </el-form-item> -->
        </el-form>
        <el-form :model="form" label-width="auto" style="max-width: 450px">
          <el-form-item label="目标选择">
            <el-upload
              ref="regionUploadRef"
              v-model:file-list="fileList"
              class="upload-demo"
              :show-file-list="false"
              accept=".shp"
              action=""
              :http-request="RegFileUpload"
              :on-change="handleChange"
            >
              <div
                :title="fileName"
                class="w-[286px] overflow-hidden text-center text-nowrap text-ellipsis rounded-sm border border-dashed border-[rgba(210,210,212,0.8)] hover:bg-[rgb(84,83,83,0.3)] cursor-pointer"
              >
                {{ fileName ? fileName : "上传文件" }}
              </div>
            </el-upload>
          </el-form-item>
        </el-form>
      </div>
      <!-- <div></div> -->
    </div>
    <div class="flex flex-wrap justify-between w-full px-[15px] py-[0px]">
      <div class="flex items-center w-full">
        <div
          :class="[
            'border-[2px] border-[rgba(210,210,212,0.8)]',
            'rounded h-[60%] mr-[5px]'
          ]"
        />
        <div :class="['text-[13px] mr-[10px]']">参数文件</div>
      </div>
      <div class="w-full flex overflow-x-auto">
        <el-radio-group v-model="form.resource" class="radio-group-inline">
          <el-radio
            value="Sponsor"
            style="color: #545353"
            @click="isUpload = false"
            >使用历史参数配置</el-radio
          >
          <!-- <el-radio
            value="Thematic"
            style="color: #545353"
            @click="handleGenerateThematic"
            >生成专题图</el-radio
          > -->
          <el-radio
            value="Venue"
            style="color: #545353"
            @click="isUpload = true"
            >文件上传</el-radio
          >
        </el-radio-group>
      </div>
      <!-- 空间选择 -->
      <div class="flex items-center w-full">
        <div
          :class="[
            'border-[2px] border-[rgba(210,210,212,0.8)]',
            'rounded h-[60%] mr-[5px]'
          ]"
        />
        <div :class="['text-[13px] mr-[10px]']">空间选择</div>
        <div
          v-for="(tool, idx) in drawTools"
          :key="idx"
          class="tool-item item"
          @click="draw(tool)"
        >
          <span class="tool-name">{{ tool.name }}</span>
          <div :class="['icon', tool.active ? 'active' : '']">
            <i :class="['iconfont', tool.icon, 'hover:text-[#5cdcff]']" />
          </div>
        </div>
      </div>
      <div class="flex items-center w-full">
        <div
          :class="[
            'border-[2px] border-[rgba(210,210,212,0.8)]',
            'rounded h-[60%] mr-[5px]'
          ]"
        />
        <div :class="['text-[13px] mr-[10px] mt-[5px]']">运算进程</div>
      </div>
      <div class="slider-block">
        <el-steps finish-status="success" :active="sliderValue" size="small">
          <el-step v-for="item in stepList" :key="item.id">
            <template #description>
              <div class="step-description">{{ item.subName }}</div>
            </template>
          </el-step>
        </el-steps>
      </div>
      <div v-if="isUpload" class="w-full mb-[0px]">
        <pure-table
          align-whole="center"
          :columns="columns"
          :data="dataList"
          size="small"
          show-overflow-tooltip
          :border="false"
          :max-height="120"
          row-key="index"
          :cell-style="{
            // backgroundColor: 'rgba(4, 44, 103, 0.9)',
            // borderTop: '2px solid rgba(4, 44, 103, 0.9)',
            // borderBottom: '2px solid rgba(4, 44, 103, 0.9)',
            // color: '#fff'
          }"
          :header-cell-style="{
            // backgroundColor: 'rgba(4, 44, 103, 0.9)',
            // borderBottom: '2px solid rgba(4, 44, 103, 0.9)',
            // color: '#fff'
          }"
        >
          <template #operation="{ row }">
            <div class="">
              <!-- <el-button type="primary" size="small" link> 替换 </el-button> -->
              <el-button type="primary" size="small" link @click="delData(row)">
                删除
              </el-button>
            </div>
          </template>
        </pure-table>
      </div>
      <div
        v-if="isUpload && form.resource == 'Venue'"
        class="w-full flex justify-center"
      >
        <el-upload
          ref="paramsUploadRef"
          class="w-full text-center h-[35px] leading-[35px] rounded-sm border border-dashed border-[#85c5f8] hover:bg-[rgb(102,151,190,0.3)] cursor-pointer"
          action=""
          accept=".txt"
          :show-file-list="false"
          :http-request="handleFileUpload"
          :on-change="handleChange_b"
        >
          <div class="text-[16px]">上传文件</div>
        </el-upload>
      </div>
      <div class="w-full flex justify-between py-[10px]">
        <el-button class="w-[45%]" type="">
          <!-- 重新运行 -->
          查看填写说明
        </el-button>
        <!-- <el-button
          class="w-[45%]"
          type=""
          :loading="thematicGenerating"
          @click="handleGenerateThematic"
        >
          生成专题图
        </el-button> -->
        <!-- <el-badge value="error" :offset="[-12, 0]" style="width: 45%;"> -->
        <el-button class="w-[45%]" type="" @click="dialogVisible = true">
          <!-- {{ runBtnText }} -->
          运行
        </el-button>
        <!-- </el-badge> -->
      </div>
    </div>
    <el-dialog
      v-model="dialogVisible"
      width="400"
      center
      :before-close="dialogHandleClose"
    >
      <div class="text-center text-[20px]">
        <div>遥感计算功能支持后台定时运行，</div>
        <div>请问是否需要进行定时运算？</div>
      </div>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="addToTimer">加入定时任务</el-button>
          <el-button type="primary" @click="runModel"> 现在运行 </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, nextTick, reactive, toRefs, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import bus from "@/utils/bus";
import { message } from "@/utils/message";
import dayjs from "dayjs";
import { removeBackground } from "@/utils/addOriginalLayer";

import {
  addSetting,
  stAlgorithmRecord,
  getAlgorithmRecordCatalog,
  getStAlgorithmRecord
} from "@/api/modelParams/index";
import { addTimerInfo } from "@/api/stTimer";
import { useUserStoreHook } from "@/store/modules/user";
import { ElNotification, ElMessageBox } from "element-plus";
import { storeToRefs } from "pinia";
import { useLayerStoreHook } from "@/store/modules/layer";
import map, { type DrawGeoJsonFeature } from "@/libs/tdtmap";
import { toCircleWkt4326 } from "@/api/dataSource/panel/online";

const layerStore = useLayerStoreHook();
const { remoteThematicRows, legendImageDataUrl } = storeToRefs(layerStore);
const userStore: any = useUserStoreHook();
const router = useRouter();
const isShow = ref(false);
const isUpload = ref(false);
const fileList = ref([]);
const fileList_b = ref([]);
const runModelIds = ref([]);
const dialogVisible = ref(false);
const thematicGenerating = ref(false);

const dialogHandleClose = () => {
  dialogVisible.value = false;
};
const sliderValue = ref(0);
let geometry: {
  type: string;
  wkt?: string;
  geojson?: DrawGeoJsonFeature;
  center?: { wkt: string };
  radius?: number;
} = null;
const stepList = ref([
  {
    id: 1,
    subName: "解压文件"
  },
  {
    id: 2,
    subName: "大气校正"
  },
  {
    id: 3,
    subName: "水深反演"
  },
  {
    id: 4,
    subName: "潮汐校正"
  }
]);
const drawTools = ref([
  {
    type: 3,
    name: "矩形",
    mode: "rectangle",
    icon: "icon-rect",
    active: false
  },
  {
    type: 4,
    name: "圆形",
    mode: "circle",
    icon: "icon-huayuan",
    active: false
  },
  {
    type: 5,
    name: "多边形",
    mode: "polygon",
    icon: "icon-polygon",
    active: false
  },
  {
    type: 6,
    name: "清除",
    mode: "clear",
    icon: "icon-shanchu",
    active: false
  }
]);
// 转换函数
const transformToArray = data => {
  const result = [];

  // 遍历每个卫星
  for (const satellite in data) {
    const satelliteData = {
      name: satellite,
      children: []
    };

    // 遍历每个产品类型
    for (const productType in data[satellite]) {
      const productTypeData = {
        name: productType,
        children: data[satellite][productType]
      };

      satelliteData.children.push(productTypeData);
    }

    result.push(satelliteData);
  }

  return result;
};

bus.on("ModelParams", async (data: any) => {
  isShow.value = data.isShow;
  bus.emit("legendRightWidth", data.isShow);
  if (data.dataIds) {
    if (data.dataIds.length === 0) {
      runModelIds.value = [];
    }
    data.dataIds.forEach(id => {
      if (runModelIds.value.indexOf(id) === -1) {
        runModelIds.value.push(id);
      }
    });
    if (runBtnStatus.value) return;
    const recordRes = await getAlgorithmRecordCatalog();
    bus.emit("RecordResults", {
      show: true,
      row: transformToArray(recordRes)
    });
  } else if (data.dataId) {
    if (runModelIds.value.indexOf(data.dataId) === -1) {
      runModelIds.value.push(data.dataId);
    }
    if (runBtnStatus.value) return;
    const recordRes = await getAlgorithmRecordCatalog();
    bus.emit("RecordResults", {
      show: true,
      row: transformToArray(recordRes)
    });
  }
});

const data = reactive({
  form: {
    resource: "Sponsor"
  } as any,
  rules: {
    // value: [{ required: true, message: "不能为空", trigger: "blur" }],
    // value_2: [{ required: true, message: "不能为空", trigger: "blur" }]
  } as any
});

const { form, rules } = toRefs(data);

const columns: TableColumnList = [
  {
    label: "序号",
    prop: "index",
    width: "60px"
  },
  {
    label: "文件名称",
    prop: "name",
    width: "180px",
    align: "left"
  },
  {
    label: "操作",
    slot: "operation",
    width: "75px",
    align: "center"
  }
];

const dataList = ref([]);
const fileName = ref("");
const regionUploadRef = ref();
const paramsUploadRef = ref();
const runBtnStatus = ref(false);
const runBtnText = ref("运行");
const runText = reactive({
  dataIds: [] as any[],
  spaceDataIds: [] as any[],
  settingDataIds: [] as any[]
});

const timer = ref<any>(null);

const runError = (data: any) => {
  if (router.currentRoute.value.fullPath !== "/index") return;
  ElNotification({
    title: "参数模型运行失败",
    message: data.log || "未知错误，请联系管理员！",
    type: "error",
    duration: 0
  });
};

const getUserRunResults = async (show?: boolean) => {
  //非管理员不展示
  if (!userStore.info.admin) return;

  const { data } = await getStAlgorithmRecord();
  sliderValue.value = data.runStatus;
  // getUserRunResults(data);
  if (data.status == "3") {
    clearInterval(timer.value);
    timer.value = null;
    runBtnStatus.value = false;
    runBtnText.value = "运行";
    const recordRes = await getAlgorithmRecordCatalog();
    bus.emit("RecordResults", {
      show: isShow.value,
      row: transformToArray(recordRes)
    });
  } else if (data.status == "4") {
    runBtnStatus.value = false;
    runBtnText.value = "运行";
    clearInterval(timer.value);
    timer.value = null;
    if (show) runError(data);
  } else if (data.status == "1") {
    runBtnStatus.value = true;
    runBtnText.value = "排队中...";
    clearInterval(timer.value);
    timer.value = null;
    // timer.value = setInterval(() => {
    //   getUserRunResults(true);
    // }, 10000);
  } else if (data.status == "2") {
    runBtnStatus.value = true;
    runBtnText.value = "运行中...";
    clearInterval(timer.value);
    timer.value = null;
    // timer.value = setInterval(() => {
    //   getUserRunResults(true);
    // }, 10000);
  }
};

const runModel = async () => {
  if (runModelIds.value.length === 0) {
    message("请载入影像数据！", { type: "warning" });
    return;
  }

  // runText.dataIds = ["1990696272096784385", "1990696271467638786"];
  // runText.dataIds = runModelIds.value;

  // const res = await stAlgorithmRecord(runText).catch(() => {
  //   runModelIds.value = [];
  // });
  // if (res && res.code === 200) {
  //   message("操作成功，正在后台运行中...", { type: "success" });
  // }

  // getUserRunResults(true);
  bus.emit("RecordResults", {
    show: isShow.value,
    row: []
  });

  dialogVisible.value = false;
};

const addToTimer = async () => {
  await addTimerInfo({
    type: 1,
    taskType: 2,
    name: `定时计算_${dayjs().format("YYYYMMDD_HH:mm:ss")}`,
    userId: userStore.info.userId,
    status: 1,
    runDate: dayjs().format("YYYYMMDD"),
    runTime: dayjs().format("HH:mm:ss"),
    runText: JSON.stringify({
      dataIds: runModelIds.value,
      spaceDataIds: runText.spaceDataIds,
      settingDataIds: runText.settingDataIds
    })
  });
  message("操作成功", { type: "success" });
  dialogVisible.value = false;
};

const handleFileUpload: any = param => {
  console.log(param);
  if (!param.file.type.includes("text")) {
    message("请上传txt格式文件！", {
      type: "warning"
    });
    return;
  }
  const formData = new FormData();
  formData.append("file", param.file);
  addSetting(formData)
    .then(res => {
      if (res.code === 200) {
        message("上传成功！", { type: "success" });
        runText.settingDataIds = [res.data.id];
      }
    })
    .catch(err => {
      console.error(err);
    });
};

const RegFileUpload: any = param => {
  console.log(param);
  if (!param.file.name.includes(".shp")) {
    message("请上传shp格式文件！", {
      type: "warning"
    });
    return;
  }
  const formData = new FormData();
  formData.append("file", param.file);
  addSetting(formData)
    .then(res => {
      if (res.code === 200) {
        message("上传成功！", { type: "success" });
        runText.spaceDataIds = [res.data.id];
      }
    })
    .catch(err => {
      console.error(err);
    });
};

const handleChange = (res: any) => {
  fileName.value = res.name;
  fileList.value = [res];
};

const handleChange_b = (res: any) => {
  if (dataList.value.findIndex((item: any) => item.name === res.name) !== -1)
    return;
  dataList.value = [
    {
      index: 1,
      name: res.name
    }
  ];
};

const delData = (row: any) => {
  dataList.value.forEach((item: any, index: number) => {
    if (item.index === row.index) {
      dataList.value = dataList.value.filter(
        (item: any) => item.index !== row.index
      );
    }
  });
};

/** 加载左侧勾选缩略图 same as 载入地图 */
const loadThumbImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    if (src && !String(src).startsWith("data:")) {
      img.crossOrigin = "anonymous";
    }
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("缩略图加载失败"));
    img.src = src;
  });

/** 居中自动换行 */
const fillTextWrappedCenter = (
  ctx: CanvasRenderingContext2D,
  text: string,
  centerX: number,
  y: number,
  maxWidth: number,
  lineHeight: number
) => {
  ctx.textAlign = "center";
  let cy = y;
  const paragraphs = text.split("\n");
  for (const para of paragraphs) {
    if (para === "") {
      cy += lineHeight;
      continue;
    }
    let line = "";
    for (let i = 0; i < para.length; i++) {
      const ch = para[i];
      const test = line + ch;
      if (ctx.measureText(test).width > maxWidth && line) {
        ctx.fillText(line, centerX, cy);
        line = ch;
        cy += lineHeight;
      } else {
        line = test;
      }
    }
    if (line) {
      ctx.fillText(line, centerX, cy);
      cy += lineHeight;
    }
  }
  ctx.textAlign = "left";
  return cy;
};

const THEMATIC_PRODUCTION_UNIT = "制作单位：中国科学院南海海洋研究所";

/** 专题图横向图例（竖条图顺时针转 90°） */
const legendToHorizontalCanvas = (
  legendImg: HTMLImageElement,
  legendDrawW: number,
  legendDrawH: number
) => {
  const rot = document.createElement("canvas");
  rot.width = legendDrawH;
  rot.height = legendDrawW;
  const rg = rot.getContext("2d");
  if (!rg) return rot;
  rg.translate(legendDrawH, 0);
  rg.rotate(Math.PI / 2);
  rg.drawImage(legendImg, 0, 0, legendDrawW, legendDrawH);
  return rot;
};
/** 生成专题图：左侧勾选缩略图 + mapLegend 同源图例 */
const handleGenerateThematic = async () => {
  thematicGenerating.value = true;
  try {
    // bus.emit("ensureMapLegendVisible");
    await nextTick();

    const rows = (remoteThematicRows.value || []).filter(r => r.thumbUrl);
    if (!rows.length) {
      message(
        "请先在左侧「遥感计算」检索并勾选数据（需有缩略图）后再生成专题图。",
        { type: "warning" }
      );
      return;
    }
    if (!legendImageDataUrl.value) {
      message("地图图例尚未加载完成，请进入地图页面稍候后再生成专题图。", {
        type: "warning"
      });
      return;
    }
    await ElMessageBox.confirm(
      "生成时不会对地图做任何飞行或自动缩放，只会截取当前这一刻的画布。请先手动把地图缩放到您需要的视角与层级，再点击生成。",
      "提示",
      {
        confirmButtonText: "已调整好，生成专题图",
        cancelButtonText: "取消",
        type: "info",
        closeOnClickModal: false
      }
    );
    await buildThematicImageAndDownload(rows);
    message("专题图已生成并开始下载", { type: "success" });
  } catch (e) {
    if (e === "cancel") return;
    throw e;
  } finally {
    thematicGenerating.value = false;
  }
};
/** 合成专题图：缩略图名称标题、缩略图红框、横向图例、制作单位 */
const buildThematicImageAndDownload = async (rows: any[]) => {
  const legendSrc = legendImageDataUrl.value;
  if (!legendSrc) {
    message(
      "地图图例尚未写入（请进入含地图的页面，待右下角图例生成后再试）。",
      { type: "warning" }
    );
    return;
  }

  const first = rows[0];
  // 加当前的年月日
  const currentDate = dayjs().format("YYYY-MM-DD");
  const titleText =
    String(first?.name + "算法计算结果数据" || "").trim() +
    "(" +
    currentDate +
    ")";
  const timeText = first?.productTime || dayjs().format("YYYY-MM-DD HH:mm:ss");

  const W = 900;
  const pad = 40;
  const maxW = W - pad * 2;
  const cx = W / 2;

  let thumbImg: HTMLImageElement;
  // 不 fly、不自动改视角，仅截当前地图画布
  const captured = await map.captureCurrentSceneThumbnailDataUrl();
  if (captured) {
    thumbImg = await loadThumbImage(captured);
  } else {
    const thumbProcessed = (await removeBackground(
      String(first.thumbUrl)
    )) as string;
    thumbImg = await loadThumbImage(thumbProcessed);
  }
  const scale = Math.min(1, maxW / thumbImg.width);
  const thumbDw = thumbImg.width * scale;
  const thumbDh = thumbImg.height * scale;

  const legendImg = await loadThumbImage(legendSrc);
  const legendMaxH = 320;
  const legendScale = Math.min(1, legendMaxH / legendImg.height);
  const legendDrawW = legendImg.width * legendScale;
  const legendDrawH = legendImg.height * legendScale;
  const legendHorizCanvas = legendToHorizontalCanvas(
    legendImg,
    legendDrawW,
    legendDrawH
  );
  let legendHorizW = legendHorizCanvas.width;
  let legendHorizH = legendHorizCanvas.height;
  if (legendHorizW > maxW) {
    const s = maxW / legendHorizW;
    legendHorizW = maxW;
    legendHorizH *= s;
  }

  const tmp = document.createElement("canvas");
  tmp.width = W;
  tmp.height = 300;
  const tctx = tmp.getContext("2d");
  if (!tctx) return;
  tctx.font = "bold 22px Microsoft YaHei, PingFang SC, sans-serif";
  const afterTitle = fillTextWrappedCenter(
    tctx,
    titleText,
    cx,
    pad + 26,
    maxW,
    32
  );
  tctx.font = "15px Microsoft YaHei, PingFang SC, sans-serif";
  const afterTime = fillTextWrappedCenter(
    tctx,
    timeText,
    cx,
    afterTitle + 14,
    maxW,
    24
  );

  const thumbStrokeOut = 1.5;
  const gapThumbToLegend = 20;
  const thumbsBlockH = thumbDh + thumbStrokeOut + gapThumbToLegend;
  const legendLabelAndGap = 22 + 8;
  const footerBand = 36;
  const H = Math.min(
    4000,
    Math.max(
      680,
      afterTime +
        28 +
        thumbsBlockH +
        legendLabelAndGap +
        legendHorizH +
        footerBand +
        pad
    )
  );

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = "#1a1a1a";
  ctx.font = "bold 22px Microsoft YaHei, PingFang SC, sans-serif";
  let y = pad + 26;
  y = fillTextWrappedCenter(ctx, titleText, cx, y, maxW, 32);

  y += 14;
  ctx.fillStyle = "#333333";
  ctx.font = "15px Microsoft YaHei, PingFang SC, sans-serif";
  y = fillTextWrappedCenter(ctx, timeText, cx, y, maxW, 24);

  y += 28;
  ctx.fillStyle = "#1a1a1a";
  const thumbX = (W - thumbDw) / 2;
  const thumbY = y;
  ctx.drawImage(thumbImg, thumbX, thumbY, thumbDw, thumbDh);
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 2;
  ctx.strokeRect(thumbX - 1.5, thumbY - 1.5, thumbDw + 3, thumbDh + 3);

  y = thumbY + thumbDh + thumbStrokeOut + gapThumbToLegend;
  ctx.font = "bold 15px Microsoft YaHei, PingFang SC, sans-serif";
  ctx.fillText("图例", pad, y);
  ctx.drawImage(legendHorizCanvas, pad, y + 8, legendHorizW, legendHorizH);

  ctx.font = "14px Microsoft YaHei, PingFang SC, sans-serif";
  ctx.fillStyle = "#333333";
  ctx.textAlign = "right";
  ctx.textBaseline = "bottom";
  ctx.fillText(THEMATIC_PRODUCTION_UNIT, W - pad, H - pad);
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";

  await new Promise<void>(resolve => {
    canvas.toBlob(blob => {
      if (!blob) {
        resolve();
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `专题图_${dayjs().format("YYYYMMDD_HHmmss")}.png`;
      a.click();
      URL.revokeObjectURL(url);
      resolve();
    }, "image/png");
  });
};

/**
 * 画空间
 * @param tool 工具
 */

const draw = tool => {
  if (tool.type === 6) {
    drawTools.value.forEach(t => {
      t.active = false;
    });
    map.cancelActiveDraw();
    map.lastDrawGeojson = null;
    geometry = null;
    return;
  }
  drawTools.value.forEach(t => {
    t.active = tool.type === t.type;
  });

  switch (tool.mode) {
    case "circle":
      map.drawCircle(async ({ geojson, center, radius }) => {
        const wkt = await toCircleWkt4326({
          centerWkt: center.wkt,
          radius
        }).then(res => res.data);
        geometry = {
          type: "circle",
          wkt,
          geojson,
          center,
          radius
        };
        console.log("circle", geojson);
      });
      break;
    case "polygon":
      map.drawPolygon((wkt, geojson) => {
        geometry = { type: "polygon", wkt, geojson };
        console.log("polygon", geojson);
      });
      break;
    case "rectangle":
      map.drawRectangle((wkt, geojson) => {
        geometry = {
          type: "rectangle",
          wkt,
          geojson
        };
        console.log("rectangle", geojson);
      });
      break;
  }
};

onMounted(async () => {
  getUserRunResults(true);
  timer.value = setInterval(() => {
    getUserRunResults(true);
  }, 10000);
});
onUnmounted(() => {
  clearInterval(timer.value);
  ElNotification.closeAll();
  bus.off("ModelParams");
});
</script>

<style lang="scss" scoped>
.tool-item {
  display: flex;
  align-items: center;
  margin-left: 10px;
  color: #5f85c6;
  font-size: 12px;
  margin-right: 10px;

  .tool-name {
    white-space: nowrap;
    margin-right: 5px;
  }

  .icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 12px;
    height: 12px;
    margin-left: 2px;
    cursor: pointer;

    .iconfont {
      font-size: 22px;
    }

    &.active,
    &:hover {
      color: #5cdcff;
    }
  }
}
:deep(.el-form-item__label) {
  color: #545353;
  text-wrap: nowrap;
}

:deep(.el-table) {
  padding: 10px 0;
  background: rgb(4 44 103 / 0%);
  // margin-bottom: 20px;
}

:deep(.el-table__body) {
  width: 100% !important;
}

:deep(.el-table__header) {
  width: 100% !important;
}

@media screen and (width <= 1670px) {
  :deep(.el-table__body) {
    width: auto !important;
  }

  :deep(.el-table__header) {
    width: auto !important;
  }
}

:deep(.el-table__inner-wrapper)::before {
  display: none;
}

:deep(.el-tabs__content) {
  padding-top: 60px;
}
.slider-block {
  width: 100%;
  .step-description {
    margin-top: 10px;
  }
}

:deep(.radio-group-inline) {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  white-space: nowrap;
}

:deep(.radio-group-inline .el-radio) {
  margin-right: 16px;
}

:deep(.radio-group-inline .el-radio:last-child) {
  margin-right: 0;
}
.slider-block {
  width: 100%;

  :deep(.el-steps) {
    --el-process-steps-color: #409eff;
  }

  :deep(.el-step__head) {
    font-size: 12px;
  }

  :deep(.el-step__icon) {
    width: 18px;
    height: 18px;
  }

  :deep(.el-step__icon-inner) {
    font-size: 12px;
  }

  :deep(.el-step__line) {
    top: 11px;
  }

  .step-description {
    // margin-top: 4px;
    font-size: 12px;
    line-height: 1.2;
    margin-top: 10px;
  }
}
</style>

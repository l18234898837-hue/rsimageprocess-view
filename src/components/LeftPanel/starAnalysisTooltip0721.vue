<template>
  <!-- 点击收起面板 -->
  <div class="flex items-center w-full mb-5 mt-3">
    <div
      :class="[
        'border-[2px] border-[rgba(210,210,212,0.8)]',
        'rounded h-[20px] mr-[5px]'
      ]"
    />
    <div :class="['text-[13px] mr-[10px] text-center']">分析计算</div>
  </div>
  <el-form
    ref="formRef"
    :model="form"
    label-width="auto"
    style="max-width: 600px"
    :rules="rules"
    :validate-on-rule-change="false"
  >
    <el-form-item label="分析类型" prop="analysisType">
      <el-select
        v-model="form.analysisType"
        placeholder="请选择分析类型"
        style="cursor: pointer"
        @change="onAnalysisTypeChange"
      >
        <el-option
          v-for="item in typeList"
          :key="item.value"
          :label="item.label"
          :value="item.value"
        />
      </el-select>
    </el-form-item>
    <el-form-item v-if="showTreeOptions" label="数据内容" prop="runFileStr">
      <el-tree-select
        v-model="form.runFileStr"
        class="run-file-tree-select"
        :data="treeData"
        :show-checkbox="false"
        :multiple="false"
        check-strictly
        node-key="value"
        style="cursor: pointer"
        clearable
        filterable
        default-expand-all
        placeholder="请选择数据"
        :props="{
          children: 'children',
          label: 'label',
          value: 'value',
          disabled: 'disabled'
        }"
      />
    </el-form-item>
    <el-form-item
      v-if="form.analysisType === 'AC_L2gen'"
      label="MOD03数据内容"
      prop="mod03FileStr"
    >
      <el-tree-select
        v-model="form.mod03FileStr"
        class="run-file-tree-select"
        :data="treeData"
        :show-checkbox="false"
        :multiple="false"
        check-strictly
        node-key="value"
        style="cursor: pointer"
        clearable
        filterable
        default-expand-all
        placeholder="请选择数据"
        :props="{
          children: 'children',
          label: 'label',
          value: 'value',
          disabled: 'disabled'
        }"
      />
    </el-form-item>
    <!-- {
    "startDate":"",
    "endDate":""
} -->
    <el-form-item
      v-if="form.analysisType === 'sst' || form.analysisType === 'SLA'"
      label="开始日期"
      prop="startDate"
    >
      <el-date-picker
        v-model="form.startDate"
        type="date"
        value-format="YYYY-MM-DD HH:mm:ss"
        format="YYYY-MM-DD HH:mm:ss"
        placeholder="请选择开始日期"
      />
    </el-form-item>
    <el-form-item
      v-if="form.analysisType === 'sst' || form.analysisType === 'SLA'"
      label="结束日期"
      prop="endDate"
    >
      <el-date-picker
        v-model="form.endDate"
        type="date"
        value-format="YYYY-MM-DD HH:mm:ss"
        format="YYYY-MM-DD HH:mm:ss"
        placeholder="请选择结束日期"
      />
    </el-form-item>
    <el-form-item
      v-if="form.analysisType === 'SLA'"
      label="上传文件"
      prop="parFileId"
    >
      <el-upload
        v-model:file-list="fileList"
        action=""
        :limit="1"
        :http-request="handleUpload"
        :on-remove="handleRemove"
      >
        <el-button type="primary">上传文件</el-button>
      </el-upload>
    </el-form-item>
    <el-form-item
      v-if="form.analysisType === 'snr'"
      label="开始行"
      prop="area1"
    >
      <el-input v-model="form.area1" clearable style="cursor: pointer" />
    </el-form-item>
    <el-form-item
      v-if="form.analysisType === 'snr'"
      label="结束行"
      prop="area2"
    >
      <el-input v-model="form.area2" clearable style="cursor: pointer" />
    </el-form-item>
    <el-form-item
      v-if="form.analysisType === 'snr'"
      label="开始列"
      prop="area3"
    >
      <el-input v-model="form.area3" clearable style="cursor: pointer" />
    </el-form-item>
    <el-form-item
      v-if="form.analysisType === 'snr'"
      label="结束列"
      prop="area4"
    >
      <el-input v-model="form.area4" clearable style="cursor: pointer" />
    </el-form-item>
    <el-form-item
      v-if="form.analysisType === 'qa' || form.analysisType === 'wind'"
      label="算法类型"
      prop="qaAlgorithm"
    >
      <el-select
        v-model="form.qaAlgorithm"
        placeholder="请选择算法类型"
        style="cursor: pointer"
        clearable
        @change="onQaAlgorithmChange"
      >
        <el-option
          v-for="item in algorithmList"
          :key="item.value"
          :label="item.label"
          :value="item.value"
        />
      </el-select>
    </el-form-item>
  </el-form>
  <div class="mt-10 flex justify-end">
    <el-button type="primary" @click="onRun">开始计算</el-button>
  </div>

  <div class="border-t border-gray-300 my-4" />
  <div class="flex items-center w-full mb-5 mt-3">
    <div
      :class="[
        'border-[2px] border-[rgba(210,210,212,0.8)]',
        'rounded h-[20px] mr-[5px]'
      ]"
    />
    <div :class="['text-[13px] mr-[10px] text-center']">查看结果</div>
  </div>
  <el-form
    ref="formRef1"
    :model="form1"
    label-width="auto"
    style="max-width: 600px"
    :rules="rules1"
    :validate-on-rule-change="false"
  >
    <el-form-item label="分析类型" prop="analysisType">
      <el-select
        v-model="form1.analysisType"
        placeholder="请选择分析类型"
        @change="onAnalysisTypeChange2"
      >
        <el-option
          v-for="item in typeList"
          :key="item.value"
          :label="item.label"
          :value="item.value"
        />
      </el-select>
    </el-form-item>
    <el-form-item v-if="showResultData" label="数据内容" prop="runFileStr">
      <el-tree-select
        v-model="form1.runFileStr"
        class="run-file-tree-select"
        :data="treeData"
        :show-checkbox="false"
        :multiple="false"
        check-strictly
        node-key="value"
        style="cursor: pointer"
        clearable
        filterable
        default-expand-all
        placeholder="请选择数据"
        :props="{
          children: 'children',
          label: 'label',
          value: 'value',
          disabled: 'disabled'
        }"
      />
    </el-form-item>
    <el-form-item
      v-if="form1.analysisType === 'wind'"
      label="结果类型"
      prop="resultType"
    >
      <el-select
        v-model="form1.resultType"
        placeholder="请选择结果类型"
        style="cursor: pointer"
        clearable
      >
        <el-option
          v-for="item in resultTypeList"
          :key="item.value"
          :label="item.label"
          :value="item.value"
        />
      </el-select>
    </el-form-item>
  </el-form>
  <div class="mt-10 flex justify-end">
    <el-button type="primary" @click="onViewResult">获取结果</el-button>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, nextTick } from "vue";
import type { FormInstance, FormRules } from "element-plus";
import { message } from "@/utils/message";
import bus from "@/utils/bus";
import type {
  UploadProps,
  UploadUserFile,
  UploadRequestHandler
} from "element-plus";
import {
  getStarAnalysisData,
  getRunSNR,
  getRunSensitivity,
  getSNRData,
  getSensitivityData,
  getL2genData,
  getACL2genData,
  getL2genResult,
  getACL2genResult,
  getSSTResult,
  getSLAResult,
  runL2gen,
  runSST,
  runACL2gen,
  runSLA,
  uploadFile,
  deleteFile,
  runQaPython1,
  runQaPython2,
  runQaPython3,
  runQaPython4,
  runQaPython5,
  runQaPython6,
  getQaInput,
  getQaOutput,
  runWindSh,
  runWindPython1,
  runWindPython2,
  runSarwindPython,
  runSwhSh,
  runSwhPython,
  getWindOutputSh,
  getWindOutputPython1,
  getWindOutputPython2,
  getSwhOutput,
  getSarwindOutput,
  getScanFolder
} from "@/api/starAnalysis";
const canOverView = ref(false);
const formRef = ref<FormInstance>();
const formRef1 = ref<FormInstance>();
const rules = computed<FormRules>(() => {
  const analysisType: FormRules["analysisType"] = [
    { required: true, message: "请选择分析类型", trigger: [] }
  ];
  const runFileStr: FormRules["runFileStr"] = [
    { required: true, message: "请选择数据", trigger: [] }
  ];
  const parFileId: FormRules["parFileId"] = [
    { required: true, message: "请上传文件", trigger: [] }
  ];
  const startDate: FormRules["startDate"] = [
    { required: true, message: "请选择开始日期", trigger: [] }
  ];
  const endDate: FormRules["endDate"] = [
    { required: true, message: "请选择结束日期", trigger: [] }
  ];
  const mod03FileStr: FormRules["mod03FileStr"] = [
    { required: true, message: "请选择MOD03数据", trigger: [] }
  ];
  if (form.value.analysisType === "SLA") {
    return { analysisType, parFileId, startDate, endDate };
  }
  if (form.value.analysisType === "sst") {
    return { analysisType, startDate, endDate };
  }
  if (form.value.analysisType === "AC_L2gen") {
    return { analysisType, runFileStr, mod03FileStr };
  }
  const base: FormRules = { analysisType, runFileStr };
  if (form.value.analysisType !== "snr" || !showSnrRangeFields.value) {
    return base;
  }
  return {
    ...base,
    area1: [{ required: true, message: "请输入开始行", trigger: [] }],
    area2: [{ required: true, message: "请输入结束行", trigger: [] }],
    area3: [{ required: true, message: "请输入开始列", trigger: [] }],
    area4: [{ required: true, message: "请输入结束列", trigger: [] }]
  };
});
const form = ref<{
  analysisType: string;
  runFileStr: string;
  mod03FileStr: string;
  parFileId: string;
  startDate: string;
  endDate: string;
  area1: string;
  area2: string;
  area3: string;
  area4: string;
  qaAlgorithm: string;
}>({
  analysisType: "",
  runFileStr: "",
  mod03FileStr: "",
  parFileId: "",
  startDate: "",
  endDate: "",
  area1: "",
  area2: "",
  area3: "",
  area4: "",
  qaAlgorithm: ""
});
const form1 = ref<{
  analysisType: string;
  runFileStr: string;
  resultType: string;
}>({
  analysisType: "",
  runFileStr: "",
  resultType: ""
});
const needRunFileTypes = ["snr", "sensitivity", "L2gen"];
const treeOptionTypes = ["snr", "sensitivity", "L2gen", "AC_L2gen"];
let resultType = ref("");
const rules1 = computed<FormRules>(() => {
  const analysisType: FormRules["analysisType"] = [
    { required: true, message: "请选择分析类型", trigger: [] }
  ];
  const rules: FormRules = { analysisType };
  if (needRunFileTypes.includes(resultType.value)) {
    rules.runFileStr = [{ required: true, message: "请选择数据", trigger: [] }];
  }
  return rules;
});

const runnerMap: Record<string, () => Promise<{ code: number }>> = {
  qaPython1: runQaPython1,
  qaPython2: runQaPython2,
  qaPython3: runQaPython3,
  qaPython4: runQaPython4,
  qaPython5: runQaPython5,
  qaPython6: runQaPython6,
  runWindSh: runWindSh,
  runWindPython1: runWindPython1,
  runWindPython2: runWindPython2
};
let runnerQaWind = ref<() => Promise<{ code: number }>>();
const onQaAlgorithmChange = () => {
  runnerQaWind.value = runnerMap[form.value.qaAlgorithm];
};
/** 树节点（el-tree-select） */
interface RunFileTreeNode {
  label: string;
  value: string;
  disabled?: boolean;
  children?: RunFileTreeNode[];
}

/** 接口单条：目录 name + 文件列表 data */
interface SatelliteGroupItem {
  name: string;
  data?: { name: string; path: string; thumbPath?: string }[];
}

let typeList = ref<{ label: string; value: string }[]>([
  { label: "卫星信噪比", value: "snr" },
  { label: "敏感性分析", value: "sensitivity" },
  { label: "大气校正", value: "L2gen" },
  { label: "海平面反演融合分析", value: "SLA" },
  { label: "卫星定标", value: "AC_L2gen" },
  { label: "海温反演融合分析", value: "sst" },
  { label: "qa", value: "qa" },
  { label: "wind", value: "wind" },
  { label: "sarwind", value: "sarwind" },
  { label: "swhSh", value: "swhSh" },
  { label: "swh", value: "swh" },
  { label: "test", value: "test" }
]);

const buildRunFileTree = (list: unknown): RunFileTreeNode[] => {
  if (!Array.isArray(list)) return [];
  return (list as SatelliteGroupItem[]).map((group, gi) => ({
    label: String(group?.name ?? ""),
    value: `__group_${gi}`,
    disabled: true,
    children: (Array.isArray(group?.data) ? group.data : []).map(f => ({
      label: String(f?.name ?? ""),
      value: String(f?.path ?? "")
    }))
  }));
};

const treeData = ref<RunFileTreeNode[]>([]);
/** 树数据获取映射 */
const treeDataFetchMap: Record<string, () => Promise<{ data?: unknown }>> = {
  snr: getStarAnalysisData,
  sensitivity: getStarAnalysisData,
  L2gen: getL2genData,
  AC_L2gen: getACL2genData
};

/** 加载树数据 */
const loadTreeData = (value: string) => {
  treeDataFetchMap[value]?.().then(res => {
    treeData.value = buildRunFileTree(res?.data);
  });
};
const fileList = ref<UploadUserFile[]>([]);

/** 重置上传 */
const resetUpload = () => {
  fileList.value = [];
  form.value.parFileId = "";
};

/** 上传文件 */
const handleUpload: UploadRequestHandler = options => {
  const formData = new FormData();
  formData.append("file", options.file);
  return uploadFile(formData).then(res => {
    if (res.code === 200) {
      form.value.parFileId = res.data.id;
      fileList.value = [{ name: res.data.fileName, url: res.data.filePath }];
      options.onSuccess(res);
      message("上传成功", { type: "success" });
    } else {
      fileList.value = [];
      options.onError({
        name: "UploadError",
        message: "上传失败",
        status: 0,
        method: options.method,
        url: options.action
      });
      message("上传失败", { type: "error" });
    }
  });
};
/** 删除文件 */
const handleRemove: UploadProps["onRemove"] = () => {
  const fileId = form.value.parFileId;
  if (!fileId) {
    resetUpload();
    return;
  }
  deleteFile(fileId).then(res => {
    if (res.code === 200) {
      resetUpload();
      message("删除成功", { type: "success" });
    } else {
      message("删除失败", { type: "error" });
    }
  });
};

/** 查看结果成功后隐藏 SNR 行列输入 */
const showSnrRangeFields = ref(true);
const reset = () => {
  form.value.runFileStr = "";
  form.value.mod03FileStr = "";
  form.value.parFileId = "";
  form.value.startDate = "";
  form.value.endDate = "";
  form.value.area1 = "";
  form.value.area2 = "";
  form.value.area3 = "";
  form.value.area4 = "";
  fileList.value = [];
};
let selectedValue = ref("");
const onAnalysisTypeChange = (value: string) => {
  selectedValue.value = value;
  reset();
  loadTreeData(value);
  showSnrRangeFields.value = true;
};
/** 算法列表 */
const algorithmList = computed(() => {
  return selectedValue.value === "wind"
    ? [
        { label: "run", value: "runWindSh" },
        { label: "wind_fusion_analysis", value: "runWindPython1" },
        { label: "fusion_buoy_analysis", value: "runWindPython2" }
      ]
    : [
        { label: "test_rmse", value: "qaPython1" },
        { label: "test_space", value: "qaPython2" },
        { label: "test_space_res", value: "qaPython3" },
        { label: "test_time", value: "qaPython4" },
        { label: "test_var", value: "qaPython5" },
        { label: "scheduler", value: "qaPython6" }
      ];
});
const resultTypeList = computed(() => {
  return form1.value.analysisType === "wind"
    ? [
        { label: "run", value: "run" },
        { label: "wind_fusion_analysis", value: "wind_fusion_analysis" },
        { label: "fusion_buoy_analysis", value: "fusion_buoy_analysis" }
      ]
    : [];
});

const resultFunMap: Record<string, () => Promise<{ data?: unknown }>> = {
  run: getWindOutputSh,
  wind_fusion_analysis: getWindOutputPython1,
  fusion_buoy_analysis: getWindOutputPython2
};

/** 查看结果类型改变 */
const onAnalysisTypeChange2 = (value: string) => {
  resultType.value = value;
  form1.value.runFileStr = "";
  form1.value.resultType = "";
  loadTreeData(value);
};
const showTreeOptions = computed(() => {
  return treeOptionTypes.includes(selectedValue.value);
});
/** 运行处理映射 */
const runHandlerMap: Record<string, () => Promise<unknown>> = {
  snr: () =>
    getRunSNR({
      runFileStr: form.value.runFileStr,
      area1: form.value.area1,
      area2: form.value.area2,
      area3: form.value.area3,
      area4: form.value.area4
    }),
  sensitivity: () => getRunSensitivity({ runFileStr: form.value.runFileStr }),
  L2gen: () => runL2gen({ runFileStr: form.value.runFileStr }),
  sst: () =>
    runSST({
      startDate: form.value.startDate,
      endDate: form.value.endDate
    }),
  AC_L2gen: () =>
    runACL2gen({
      runFileStr: form.value.runFileStr,
      mod03FileStr: form.value.mod03FileStr
    }),
  SLA: () =>
    runSLA({
      parFileId: form.value.parFileId,
      startDate: form.value.startDate,
      endDate: form.value.endDate
    }),
  qa: () => runnerQaWind.value?.(),
  wind: () => runnerQaWind.value?.(),
  sarwind: () => runSarwindPython(),
  swhSh: () => runSwhSh(),
  swh: () => runSwhPython()
};

/** 运行 */
const onRun = () => {
  showSnrRangeFields.value = true;
  formRef.value?.validate(valid => {
    if (!valid) return;
    const run = runHandlerMap[selectedValue.value];
    run?.().then(() => {
      message("计算成功", { type: "success" });
    });
  });
};

// 是否显示数据内容
const showResultData = computed(() => {
  return needRunFileTypes.includes(resultType.value);
});

/** 发射结果 */
const emitAnalysisResult = (title: string, data: unknown) => {
  bus.emit("legendRightWidth", true);
  bus.emit("StarAnalysisResult", { show: true, title, data });
};

/** 查看结果配置 */
const viewResultConfig: Record<
  string,
  { title: string; request: () => Promise<{ data?: unknown }> }
> = {
  snr: {
    title: "卫星信噪比结果",
    request: () => getSNRData({ runFileStr: form1.value.runFileStr })
  },
  sensitivity: {
    title: "敏感性分析结果",
    request: () => getSensitivityData({ runFileStr: form1.value.runFileStr })
  },
  L2gen: {
    title: "大气校正结果",
    request: () => getL2genResult({ runFileStr: form1.value.runFileStr })
  },
  sst: {
    title: "海温反演融合分析结果",
    request: () => getSSTResult()
  },
  SLA: {
    title: "海平面反演融合分析结果",
    request: () => getSLAResult()
  },
  AC_L2gen: {
    title: "卫星定标结果",
    request: () => getACL2genResult()
  },
  qa: {
    title: "qa 结果",
    request: () => getQaOutput()
  },
  wind: {
    title: "wind 结果",
    request: () => resultFunMap[form1.value.resultType]?.()
  },
  sarwind: {
    title: "sarwind 结果",
    request: () => getSarwindOutput()
  },
  swhSh: {
    title: "swhSh 结果",
    request: () => getSwhOutput()
  },
  swh: {
    title: "swh 结果",
    request: () => getSwhOutput()
  },
  test: {
    title: "test 结果",
    request: () => getScanFolder()
  }
};

/** 查看结果 */
const onViewResult = () => {
  showSnrRangeFields.value = false;
  formRef1.value?.validate(valid => {
    if (!valid) return;
    const config = viewResultConfig[resultType.value];
    config?.request().then(res => {
      emitAnalysisResult(config.title, res?.data);
    });
  });
};

const emit = defineEmits<{ close: [] }>();

onMounted(() => {
  bus.on("clearForm", () => {
    resetUpload();
    form.value = {
      analysisType: "",
      runFileStr: "",
      mod03FileStr: "",
      parFileId: "",
      startDate: "",
      endDate: "",
      area1: "",
      area2: "",
      area3: "",
      area4: ""
    };
    form1.value = {
      analysisType: "",
      runFileStr: "",
      resultType: ""
    };
    nextTick(() => {
      formRef.value?.clearValidate();
      formRef1.value?.clearValidate();
    });
  });
});
</script>

<style lang="less" scoped>
::-webkit-scrollbar {
  display: none;
}
:deep(.el-checkbox__inner) {
  background-color: rgba(255, 255, 255);
}
.left-panel {
  position: relative;
  z-index: 999;
  width: 20vw;
  height: 100%;
  // margin: 30px;
  border-radius: 5px;
  // border: 2px solid #008ada;
  color: #545353;
  background: rgba(255, 255, 255, 0.9);
  display: flex;
  overflow-y: scroll;
  // pointer-events: all;
  // transition: left 0.2s ease-in-out;
}

:deep(.el-tabs--card > .el-tabs__header .el-tabs__item) {
  font-family:
    Source Han Sans SC,
    Source Han Sans SC;
  font-weight: 400;
  color: #545353;
  letter-spacing: 1px;
  text-align: center;
  font-style: normal;
  text-transform: none;
  width: 50%;
  border: none;
}
:deep(.el-tabs--card > .el-tabs__header .el-tabs__nav) {
  width: 100%;
  // background: linear-gradient(180deg, rgba(31, 106, 187, 0) 0%, #1b62ad 100%);
  border: none;
  overflow: hidden;
}
:deep(.el-tabs--card > .el-tabs__header .el-tabs__item.is-active) {
  border: none;
  // background: linear-gradient(180deg, rgba(31, 106, 187, 0) 0%, #3485db 100%);
  // background-image: url("@/assets/Group_1321315329@2x.png");
  background-color: gray;
  background-position: center;
  background-repeat: no-repeat;
  background-size: 100% 100%;
  font-family:
    Source Han Sans SC,
    Source Han Sans SC;
  font-weight: 400;
  color: #fff;
  letter-spacing: 1px;
  text-align: center;
  font-style: normal;
  text-transform: none;
}
:deep(.el-table) {
  background: rgba(4, 44, 103, 0);
  padding: 0 20px;
  margin-bottom: 20px;
}
:deep(.el-table__body) {
  width: 100% !important;
}
:deep(.el-table__header) {
  width: 100% !important;
}

@media screen and (max-width: 1670px) {
  :deep(.el-table__body) {
    width: auto !important;
  }
  :deep(.el-table__header) {
    width: auto !important;
  }
}

:deep(.el-table__inner-wrapper):before {
  display: none;
}
:deep(.el-tabs--card > .el-tabs__header) {
  position: fixed;
  z-index: 999;
  width: calc(20vw - 2px);
  // background: rgba(4, 66, 133);
  border-radius: 5px 5px 0 0;
  // background-image: url("@/assets/Group_1321315329@2x.png");
  background: rgba(255, 255, 255, 0.9);
  background-position: center;
  background-repeat: no-repeat;
  background-size: 100% 100%;
}
:deep(.el-tabs__content) {
  padding-top: 60px;
}
.run-file-tree-select {
  width: 100%;
  min-width: 260px;
}
</style>

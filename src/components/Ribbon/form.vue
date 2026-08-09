<template>
  <el-dialog
    v-model="formDialog"
    title="编辑色带"
    :before-close="handleDrawerClose"
    size="320px"
  >
    <el-form ref="dictRef" :rules="rules" :model="form">
      <el-form-item label="色带名称" prop="name">
        <el-input v-model="form.name" placeholder="请输入色带名称" />
      </el-form-item>
      <el-form-item label="最小值" prop="minValue">
        <el-input-number
          v-model="form.minValue"
          :min="0"
          :step="1"
          controls-position="right"
          style="width: 100%"
        />
      </el-form-item>
      <el-form-item label="最大值" prop="maxValue">
        <el-input-number
          v-model="form.maxValue"
          :min="0"
          :step="1"
          controls-position="right"
          style="width: 100%"
        />
      </el-form-item>
      <el-form-item label="色带范围" prop="colorRampStr">
        <!-- <p class="color-ramp-tip">
          共 5 个节点，从左到右对应渐变；提交为 RGB 数组。
        </p> -->
        <div class="color-ramp-pickers">
          <div v-for="(_, index) in 5" :key="index" class="color-ramp-row">
            <span class="color-ramp-idx">{{ index + 1 }}</span>
            <el-color-picker
              :model-value="pickerHex(index)"
              @update:model-value="val => onPickColor(index, val)"
            />
            <span class="color-ramp-rgb"
              >[{{ rgbStops[index]?.join(", ") || "0, 0, 0" }}]</span
            >
          </div>
        </div>
        <div class="preview-gradient" :style="{ background: gradientStyle }" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" :loading="loading" @click="onSubmit(dictRef)"
          >提交</el-button
        >
        <el-button @click="handleDrawerClose">取消</el-button>
      </el-form-item>
    </el-form>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, toRefs, computed, watch } from "vue";
import { message } from "@/utils/message";
import { updateSysColorRamp, addSysColorRamp } from "@/api/ribbon";

const loading = ref(false);
const formDialog = ref(false);
const dictRef = ref();

/** 默认 5 档示例（与常见海洋热力渐变一致，可自行改色） */
const DEFAULT_RGB_STOPS: number[][] = [
  [0, 0, 143],
  [0, 0, 255],
  [0, 255, 255],
  [255, 255, 0],
  [255, 0, 0]
];

const clamp255 = (n: number) =>
  Math.min(255, Math.max(0, Math.round(Number(n))));

function hexToRgbTuple(hex: string): number[] {
  const s = hex.trim();
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(s);
  if (!m) return [0, 0, 0];
  return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
}

function rgbTupleToHex(r: number, g: number, b: number) {
  return `#${[r, g, b]
    .map(x => clamp255(x).toString(16).padStart(2, "0"))
    .join("")}`;
}

/** 将后端/历史数据规整为 5 个 [R,G,B] */
function normalizeToFiveRgb(input: unknown): number[][] {
  let arr: unknown[] = [];
  if (typeof input === "string") {
    try {
      arr = JSON.parse(input);
    } catch {
      return DEFAULT_RGB_STOPS.map(row => [...row]);
    }
  } else if (Array.isArray(input)) {
    arr = input;
  }
  if (!Array.isArray(arr) || arr.length === 0) {
    return DEFAULT_RGB_STOPS.map(row => [...row]);
  }
  const out: number[][] = [];
  for (let i = 0; i < 5; i++) {
    const c = arr[i];
    if (Array.isArray(c) && c.length >= 3) {
      out.push([clamp255(c[0]), clamp255(c[1]), clamp255(c[2])]);
    } else if (Array.isArray(c) && c.length === 2) {
      const g = clamp255(c[0]);
      out.push([g, g, g]);
    } else if (out.length > 0) {
      out.push([...out[out.length - 1]]);
    } else {
      out.push([...DEFAULT_RGB_STOPS[i]]);
    }
  }
  return out;
}

const rgbStops = ref<number[][]>(DEFAULT_RGB_STOPS.map(row => [...row]));

const validateColorRamp = (
  _rule: any,
  value: string,
  callback: (e?: Error) => void
) => {
  if (!value || !String(value).trim()) {
    callback(new Error("色带范围不能为空"));
    return;
  }
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      callback(new Error("色带范围必须是 JSON 数组"));
      return;
    }
    if (parsed.length !== 5) {
      callback(new Error("需要恰好 5 个颜色节点"));
      return;
    }
    for (let i = 0; i < 5; i++) {
      const color = parsed[i];
      if (!Array.isArray(color) || color.length !== 3) {
        callback(new Error(`第 ${i + 1} 个颜色须为 [R,G,B] 三个数字`));
        return;
      }
      for (let j = 0; j < 3; j++) {
        const n = color[j];
        if (typeof n !== "number" || n < 0 || n > 255) {
          callback(new Error(`第 ${i + 1} 个颜色的 RGB 须在 0–255 之间`));
          return;
        }
      }
    }
    callback();
  } catch {
    callback(new Error("JSON 格式错误"));
  }
};

const data = reactive({
  form: {
    id: undefined as number | undefined,
    name: "",
    maxValue: 0,
    minValue: 0,
    colorRampStr: JSON.stringify(DEFAULT_RGB_STOPS)
  } as any,
  rules: {
    name: [{ required: true, message: "色带名称不能为空", trigger: "blur" }],
    minValue: [{ required: true, message: "最小值不能为空", trigger: "blur" }],
    maxValue: [{ required: true, message: "最大值不能为空", trigger: "blur" }],
    colorRampStr: [
      { required: true, message: "色带范围不能为空", trigger: "blur" },
      { validator: validateColorRamp, trigger: "blur" }
    ]
  }
});

const { form, rules } = toRefs(data);

watch(
  rgbStops,
  () => {
    form.value.colorRampStr = JSON.stringify(rgbStops.value);
  },
  { deep: true, immediate: true }
);

const pickerHex = (index: number) => {
  const c = rgbStops.value[index];
  if (!c || c.length < 3) return "#000000";
  return rgbTupleToHex(c[0], c[1], c[2]);
};

const onPickColor = (index: number, val: string | null) => {
  // debugger;
  if (val == null || val === "") return;
  const rgb = hexToRgbTuple(val);
  const next = rgbStops.value.map((row, j) => (j === index ? rgb : row));
  rgbStops.value = next;
};

const gradientStyle = computed(() => {
  const colors = rgbStops.value;
  if (colors.length < 2) return "linear-gradient(90deg, #ccc, #ccc)";
  const stops = colors
    .map((c, index, arr) => {
      const position = (index / (arr.length - 1)) * 100;
      return `rgb(${c[0]}, ${c[1]}, ${c[2]}) ${position}%`;
    })
    .join(", ");
  return `linear-gradient(90deg, ${stops})`;
});

const reset = () => {
  rgbStops.value = DEFAULT_RGB_STOPS.map(row => [...row]);
  form.value = {
    id: undefined,
    name: "",
    maxValue: 0,
    minValue: 0,
    colorRampStr: JSON.stringify(rgbStops.value)
  } as any;
  if (dictRef.value?.resetFields) {
    dictRef.value.resetFields();
  }
};

const isUpdate = ref(false);

const handleDrawerClose = () => {
  reset();
  formDialog.value = false;
};

const onSubmit = (formEl: any) => {
  if (!formEl) return;
  formEl
    .validate()
    .then(() => {
      loading.value = true;
      const submitData: any = {
        name: form.value.name,
        minValue: form.value.minValue,
        maxValue: form.value.maxValue,
        colorRamp: JSON.parse(form.value.colorRampStr)
      };
      if (isUpdate.value && form.value.id) {
        submitData.id = form.value.id;
      }
      const req = updateSysColorRamp(submitData);
      // const req = !isUpdate.value
      //   ? addSysColorRamp(submitData)
      //   : updateSysColorRamp(submitData);
      return req
        .then(() => {
          message("修改成功", {
            type: "success"
          });
          successBack();
        })
        .catch((err: any) => {
          message(err?.message || "操作失败", { type: "error" });
        });
    })
    .catch(() => {})
    .finally(() => {
      loading.value = false;
    });
};

const successBack = () => {
  handleDrawerClose();
  emit("reload");
};

const emit = defineEmits<{
  (e: "reload"): void;
}>();

const setData = (row?: any) => {
  reset();

  if (!row) {
    isUpdate.value = false;
    formDialog.value = true;
    return;
  }

  isUpdate.value = true;
  formDialog.value = true;

  rgbStops.value = normalizeToFiveRgb(row.colorRamp);
  form.value.colorRampStr = JSON.stringify(rgbStops.value);
  form.value = {
    id: row.id,
    name: row.name,
    minValue: row.minValue,
    maxValue: row.maxValue,
    colorRampStr: JSON.stringify(rgbStops.value)
  };
};

defineExpose({ formDialog, setData });
</script>

<style scoped>
.color-ramp-tip {
  margin: 0 0 10px;
  font-size: 12px;
  color: #909399;
  line-height: 1.5;
}

.color-ramp-pickers {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.color-ramp-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.color-ramp-idx {
  width: 22px;
  font-size: 13px;
  color: #909399;
}

.color-ramp-rgb {
  font-family: ui-monospace, Menlo, monospace;
  font-size: 12px;
  color: #606266;
}

.preview-gradient {
  height: 36px;
  margin-top: 12px;
  border-radius: 4px;
  border: 1px solid #dcdfe6;
}

.form-tip {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
  font-size: 12px;
  color: #909399;
}

:deep(.el-drawer__body) {
  padding: 20px;
}

:deep(.el-form-item) {
  margin-bottom: 22px;
}

:deep(.el-input-number) {
  width: 100%;
}
</style>

<template>
  <div
    v-if="starResultVisible"
    class="w-full mb-[10px] text-[#545353] border-[1px] border-[#ccc]"
    style="background: rgb(255 255 255 / 90%); border-radius: 5px"
  >
    <div
      class="flex justify-center items-center w-full px-[15px] py-[8px]"
      style="background-color: gray"
    >
      <div class="text-[#fff] text-[14px]">{{ starResultTitle }}</div>
    </div>
    <div class="px-[10px] py-[10px]">
      <pure-table
        border
        align-whole="center"
        show-overflow-tooltip
        height="360px"
        size="small"
        :data="starResultRows"
        :columns="columns"
        :row-key="row => row.fileName"
      >
        <template #action="{ row }">
          <el-button
            v-if="isImageNginxPath(row)"
            type="primary"
            link
            size="small"
            @click="handlePreview(row)"
          >
            预览
          </el-button>
          <el-button
            v-if="row.type !== 0"
            type="primary"
            link
            :disabled="isDownloading(row)"
            size="small"
            :loading="isDownloading(row)"
            @click="handleDownload(row)"
          >
            下载
          </el-button>
        </template>
      </pure-table>
    </div>

    <el-dialog
      v-model="previewVisible"
      title="图片预览"
      width="min(90vw, 960px)"
      destroy-on-close
      append-to-body
      align-center
      @closed="clearPreviewUrl"
    >
      <div v-loading="previewLoading" class="preview-img-wrap">
        <img v-if="previewUrl" :src="previewUrl" alt="预览" />
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, onUnmounted } from "vue";
import { getDownloadFile } from "@/api/starAnalysis";
import { downloadFile } from "@/utils/downloadFile";
import bus from "@/utils/bus";

const starResultRows = ref<Record<string, unknown>[]>([]);
const starResultTitle = ref("");
const previewVisible = ref(false);
const previewUrl = ref("");
const previewLoading = ref(false);

/** 根据文件名后缀判断是否为常见图片 */
const isImageNginxPath = (row: Record<string, unknown>) => {
  const fileName = String(row.fileName ?? "");
  return /\.(png|jpe?g|gif|webp|bmp|svg)(\?|#|$)/i.test(fileName);
};

/** 释放预览 ObjectURL */
const clearPreviewUrl = () => {
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value);
    previewUrl.value = "";
  }
};

/** 弹窗预览图片 */
const handlePreview = (row: Record<string, unknown>) => {
  const filePath = String(row.absolutePath ?? "");
  if (!filePath || previewLoading.value) return;
  previewLoading.value = true;
  previewVisible.value = true;
  clearPreviewUrl();
  getDownloadFile({ filePath })
    .then(res => {
      previewUrl.value = URL.createObjectURL(res.data as Blob);
    })
    .finally(() => {
      previewLoading.value = false;
    });
};

const downloadLoadingMap = ref<Record<string, boolean>>({});

const isDownloading = (row: Record<string, unknown>) => {
  const key = String(row.absolutePath ?? "");
  return !!downloadLoadingMap.value[key];
};

/** 下载文件 */
const handleDownload = (row: Record<string, unknown>) => {
  const key = String(row.absolutePath ?? "");
  if (!key || downloadLoadingMap.value[key]) return;
  downloadLoadingMap.value[key] = true;
  getDownloadFile({ filePath: key })
    .then(res => {
      downloadFile(res, row.fileName as string);
    })
    .finally(() => {
      downloadLoadingMap.value[key] = false;
    });
};
/** 静态文件完整 URL + fetch 落盘（直连 192.168.* 时勿用 localhost+nginxPath） */
const handleDownload1 = (row: Record<string, unknown>) => {
  const url = window.location.origin + "/api" + row.nginxPath;
  // const url = buildNginxFileUrl(String(row?.nginxPath ?? ""));
  if (!url) return;
  const name = row.name as string;
  fetch(url, { credentials: "include", mode: "cors" })
    .then(res => {
      if (!res.ok) {
        throw new Error(`下载失败 ${res.status}`);
      }
      return res.blob();
    })
    .then(blob => {
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = name;
      a.rel = "noopener noreferrer";
      a.click();
      URL.revokeObjectURL(href);
    });
};
const columns: TableColumnList = [
  {
    label: "名称",
    prop: "fileName",
    align: "left"
  },
  {
    label: "操作",
    slot: "action",
    width: 140,
    align: "center"
  }
];

const starResultVisible = ref(false);
const onStarAnalysisResult = (data: {
  show?: boolean;
  title?: string;
  data?: {
    children?: Record<string, unknown>[];
  };
}) => {
  if (data?.show === false) {
    starResultVisible.value = false;
    previewVisible.value = false;
    clearPreviewUrl();
    return;
  }
  starResultVisible.value = true;
  starResultTitle.value = data.title ?? "";
  starResultRows.value = Array.isArray(data.data.children)
    ? (data.data.children as Record<string, unknown>[])
    : [];
};
onUnmounted(() => {
  bus.off("StarAnalysisResult", onStarAnalysisResult);
  clearPreviewUrl();
});

onMounted(() => {
  bus.on("StarAnalysisResult", onStarAnalysisResult);
  bus.on("closeStarAnalysisResult", () => {
    starResultVisible.value = false;
    previewVisible.value = false;
    clearPreviewUrl();
  });
});
</script>

<style lang="scss" scoped>
.search-area-tools {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
  width: 100%;
  font-size: 13px;
  line-height: 1.4;
  color: #545353;
}

.search-area-radios {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.search-area-radios :deep(.el-radio) {
  margin-right: 0;
  height: auto;
  align-items: center;
}

.search-area-radios :deep(.el-radio__label) {
  font-size: 13px;
  color: #545353;
  padding-left: 6px;
}

.search-area-draw-tools {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.search-area-draw-row {
  display: flex;
  align-items: center;
  width: 100%;
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

.tool-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: #545353;

  .tool-name {
    white-space: nowrap;
    font-size: 13px;
  }

  .icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    cursor: pointer;

    .iconfont {
      font-size: 15px;
    }

    &.active,
    &:hover {
      color: #1890ff;
    }
  }
}
</style>

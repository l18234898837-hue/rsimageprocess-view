<template>
  <div v-if="instrument" class="instrument-detail">
    <div class="detail-header">
      <!-- <div class="detail-title">
        {{ displayValue(instrument.instrumentName) }}
      </div> -->
      <div class="detail-subtitle">观测仪器详情</div>
    </div>

    <div class="detail-body">
      <div class="detail-image-card">
        <div class="card-label">仪器图片</div>
        <div class="image-wrap">
          <el-image
            v-if="imageSrc"
            class="detail-image"
            fit="contain"
            :src="imageSrc"
            :preview-src-list="[imageSrc]"
            preview-teleported
          />
          <el-image
            v-else
            class="detail-image"
            fit="contain"
            :src="imgCarousel"
          />
        </div>
      </div>

      <div class="detail-info-card">
        <div class="card-label">基本信息</div>
        <el-descriptions :column="2" border class="detail-descriptions">
          <el-descriptions-item label="仪器名称">
            {{ displayValue(instrument.instrumentName) }}
          </el-descriptions-item>
          <el-descriptions-item label="仪器编号">
            {{ displayValue(instrument.id) }}
          </el-descriptions-item>
          <el-descriptions-item label="图片编号">
            {{ displayValue(instrument.imageId) }}
          </el-descriptions-item>
          <el-descriptions-item label="生产厂家">
            {{ displayValue(instrument.manufacturer) }}
          </el-descriptions-item>
          <el-descriptions-item label="代理商">
            {{ displayValue(instrument.distributor) }}
          </el-descriptions-item>
          <el-descriptions-item label="创建人">
            {{ displayValue(instrument.createBy) }}
          </el-descriptions-item>
          <el-descriptions-item label="创建时间">
            {{ displayValue(instrument.createTime) }}
          </el-descriptions-item>
          <el-descriptions-item label="更新人">
            {{ displayValue(instrument.updateBy) }}
          </el-descriptions-item>
          <el-descriptions-item label="更新时间">
            {{ displayValue(instrument.updateTime) }}
          </el-descriptions-item>
          <el-descriptions-item label="参数说明" :span="2">
            <div class="parameters-text">
              {{ displayValue(instrument.parameters) }}
            </div>
          </el-descriptions-item>
        </el-descriptions>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import imgCarousel from "/images/img2@1x.png";

const props = defineProps<{
  instrument?: Record<string, any>;
}>();

const instrument = computed(() => props.instrument);

const imageSrc = computed(() => {
  const url = props.instrument?.thumbUrl;
  return typeof url === "string" && url ? url : "";
});

const displayValue = (value: unknown) => {
  if (value === null || value === undefined || value === "") {
    return "-";
  }
  return String(value);
};
</script>

<style lang="scss" scoped>
.instrument-detail {
  box-sizing: border-box;
  height: calc(100% - 100px);
  padding: 20px;
  overflow-y: auto;
}

.detail-header {
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(0, 128, 255, 0.15);
}

.detail-title {
  color: #1f2d3d;
  font-size: 22px;
  font-weight: 600;
  line-height: 1.4;
}

.detail-subtitle {
  margin-top: 6px;
  color: #7a8699;
  font-size: 13px;
}

.detail-body {
  display: grid;
  grid-template-columns: minmax(280px, 360px) minmax(0, 1fr);
  gap: 20px;
}

.detail-image-card,
.detail-info-card {
  background: linear-gradient(180deg, #f8fbff 0%, #ffffff 100%);
  border: 1px solid rgba(210, 210, 212, 0.8);
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 128, 255, 0.08);
  padding: 18px;
}

.card-label {
  position: relative;
  margin-bottom: 16px;
  padding-left: 12px;
  color: #0080ff;
  font-size: 15px;
  font-weight: 600;
}

.card-label::before {
  position: absolute;
  top: 2px;
  left: 0;
  width: 4px;
  height: 16px;
  border-radius: 2px;
  background: linear-gradient(180deg, #0080ff 0%, rgba(0, 128, 255, 0.35) 100%);
  content: "";
}

.image-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 320px;
  // padding-top: 16px;
  border-radius: 10px;
  // background: #0f1720;
}

.detail-image {
  width: 100%;
  height: 320px;
}

.detail-descriptions {
  width: 100%;
}

.parameters-text {
  color: #545353;
  line-height: 1.8;
  white-space: pre-wrap;
  word-break: break-word;
}

:deep(.el-descriptions__label) {
  width: 110px;
  color: #7a8699;
  font-weight: 500;
}

:deep(.el-descriptions__content) {
  color: #545353;
}

@media (max-width: 1200px) {
  .detail-body {
    grid-template-columns: 1fr;
  }

  .image-wrap,
  .detail-image {
    min-height: 260px;
    height: 260px;
  }
}
</style>

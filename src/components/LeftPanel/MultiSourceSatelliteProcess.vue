<template>
  <section class="mission-panel satellite-workspace" aria-label="卫星产品处理">
    <div class="mission-panel__selector">
      <label for="product-template">卫星数据选择</label>
      <select
        id="product-template"
        :value="activeTemplate.id"
        :disabled="isTaskActive || isBusy || isUploading || isArchiveImporting"
        @change="handleTemplateChange"
      >
        <option
          v-for="template in PRODUCT_TEMPLATES"
          :key="template.id"
          :value="template.id"
        >
          {{ template.label }}
        </option>
      </select>
      <small
        v-if="isTaskActive || isBusy || isUploading || isArchiveImporting"
        class="mission-panel__lock-note"
      >
        {{ templateLockMessage }}
      </small>
    </div>

    <section class="mission-section" aria-labelledby="package-title">
      <div class="mission-section__heading">
        <div>
          <strong id="package-title">上传产品包</strong>
          <el-tooltip
            class="package-requirements-tooltip"
            :content="activeTemplate.packageRequirements"
            placement="top-start"
            effect="light"
            :show-after="180"
          >
            <button
              class="package-requirements-tooltip__trigger"
              type="button"
              aria-label="查看产品包要求"
            >
              <el-icon><QuestionFilled /></el-icon>
            </button>
          </el-tooltip>
        </div>
        <small class="package-upload-note">请在下方上传对应产品包</small>
        <button
          class="package-toggle"
          type="button"
          :aria-expanded="isPackageContentVisible"
          :title="isPackageContentVisible ? '收起产品包' : '展开产品包'"
          @click="togglePackageExpanded"
        >
          <span>{{ uploadedSlotCount }}/{{ activeTemplate.slots.length }}</span>
          <el-icon :class="{ 'is-expanded': isPackageContentVisible }">
            <ArrowDown />
          </el-icon>
        </button>
      </div>
      <div
        class="archive-import-panel"
        :class="{
          'is-actionable': isArchivePickerActionable,
          'is-importing': isArchiveImporting,
          'is-completed': archiveImportProgress.status === 'COMPLETED'
        }"
        :role="isArchivePickerActionable ? 'button' : undefined"
        :tabindex="isArchivePickerActionable ? 0 : undefined"
        :aria-label="isArchivePickerActionable ? '导入 ZIP 产品包' : undefined"
        :aria-disabled="isArchivePickerActionable ? undefined : true"
        @click="handleArchivePanelActivate"
        @keydown.enter.prevent="openArchivePicker"
        @keydown.space.prevent="openArchivePicker"
      >
        <div class="archive-import-panel__copy">
          <span class="archive-import-panel__mark" aria-hidden="true">
            <el-icon><FolderOpened /></el-icon>
          </span>
          <div class="archive-import-panel__copy-text">
            <strong>导入产品包</strong>
            <small
              v-if="isArchivePickerActionable"
              title="点击选择产品包导入，仅支持.zip格式"
            >
              点击选择产品包导入，仅支持.zip格式
            </small>
            <small v-else-if="isArchiveImporting">正在导入，请稍候</small>
            <small v-else-if="archiveImportProgress.status === 'COMPLETED'">
              已完成，删除下方文件后可重新导入
            </small>
          </div>
        </div>
        <input
          ref="archiveInput"
          class="visually-hidden"
          type="file"
          accept=".zip,application/zip"
          :disabled="!isArchivePickerActionable"
          @change="handleArchiveChange"
        />
        <div
          v-if="archiveImportProgress.status !== 'IDLE'"
          class="archive-import-panel__status"
          aria-live="polite"
        >
          <div class="archive-import-panel__status-line">
            <span>{{ archiveStatusLabel(archiveImportProgress.status) }}</span>
            <span v-if="archiveImportProgress.totalFiles"
              >{{
                archiveImportProgress.status === "MATCHING"
                  ? archiveImportProgress.matchingFilesProcessed ?? 0
                  : archiveImportProgress.processedFiles
              }}
              / {{ archiveImportProgress.totalFiles }} 个文件</span
            >
            <button
              v-if="isArchiveImporting"
              type="button"
              class="archive-import-panel__cancel"
              aria-label="取消导入产品包"
              title="取消导入"
              @click.stop="cancelArchiveImport"
              @keydown.stop
            >
              <el-icon><Close /></el-icon>
              <span class="visually-hidden">取消导入</span>
            </button>
          </div>
          <div class="archive-import-panel__progress">
            <span :style="{ width: `${archiveProgressPercent}%` }" />
          </div>
          <small
            v-if="archiveImportProgress.currentFile"
            class="archive-import-panel__current-file"
            :title="archiveImportProgress.currentFile"
          >
            <span>当前：</span>
            <span>{{ archiveImportProgress.currentFile }}</span>
          </small>
          <small v-if="archiveImportProgress.error" class="inline-error">{{
            archiveImportProgress.error
          }}</small>
        </div>
      </div>
      <div
        v-if="isPackageContentVisible"
        class="file-stack"
        :class="{ 'is-archive-importing': isArchiveImporting }"
      >
        <article
          v-for="slot in activeTemplate.slots"
          :key="`${activeTemplate.id}-${slot.id}`"
          class="file-slot"
          :class="[
            `is-${slots[slot.id].status.toLowerCase()}`,
            {
              'is-actionable': isSlotActionable(slots[slot.id].status)
            }
          ]"
          :role="isSlotActionable(slots[slot.id].status) ? 'button' : undefined"
          :tabindex="isSlotActionable(slots[slot.id].status) ? 0 : undefined"
          :aria-label="
            isSlotActionable(slots[slot.id].status)
              ? `为 ${slot.label} 选择文件`
              : undefined
          "
          @click="handleSlotActivate(slot.id, $event)"
          @keydown.enter.prevent="handleSlotActivate(slot.id, $event)"
          @keydown.space.prevent="handleSlotActivate(slot.id, $event)"
        >
          <div class="file-slot__meta">
            <div class="file-slot__details">
              <el-tooltip
                :content="
                  (slots[slot.id].status === 'EMPTY'
                    ? '缺少' + slot.label + ' · '
                    : '') +
                  slot.role +
                  ' · ' +
                  slot.extensions.join(' / ')
                "
                placement="top"
                effect="light"
                :offset="6"
                :show-after="180"
              >
                <strong>{{ slotDisplayName(slot.id, slot.label) }}</strong>
              </el-tooltip>
              <small
                v-if="slots[slot.id].status === 'EMPTY'"
                class="file-slot__upload-hint"
              >
                点击卡片上传
              </small>
            </div>
            <span
              v-if="slots[slot.id].status !== 'EMPTY'"
              class="file-slot__status"
            >
              {{ slotStatusLabel(slots[slot.id].status) }}
              <template v-if="slots[slot.id].status === 'UPLOADING'">
                {{ slots[slot.id].uploadProgress ?? 0 }}%
              </template>
            </span>
            <input
              :id="`file-${activeTemplate.id}-${slot.id}`"
              class="visually-hidden"
              type="file"
              :accept="slot.extensions.join(',')"
              :disabled="isTaskActive || isBusy || isArchiveImporting"
              @change="handleFileChange(slot.id, $event)"
            />
          </div>
          <div
            v-if="slots[slot.id].status === 'UPLOADING'"
            class="file-slot__progress"
            aria-live="polite"
          >
            <div
              class="file-slot__progress-track"
              role="progressbar"
              :aria-label="`${slot.label}上传进度`"
              aria-valuemin="0"
              aria-valuemax="100"
              :aria-valuenow="slots[slot.id].uploadProgress ?? 0"
            >
              <span
                :style="{
                  width: `${slots[slot.id].uploadProgress ?? 0}%`
                }"
              />
            </div>
          </div>
          <small v-if="slots[slot.id].error" class="inline-error">
            {{ slots[slot.id].error }}
          </small>
          <button
            v-if="slots[slot.id].file"
            class="file-slot__remove"
            type="button"
            title="移除文件"
            :disabled="isTaskActive || isBusy || isArchiveImporting"
            @click.stop="removeProductSlot(slot.id)"
          >
            <el-icon><Delete /></el-icon>
          </button>
        </article>
      </div>
    </section>

    <ProcessingPlanPanel
      :target-steps="targetSteps"
      :plan-steps="resolvedPlanSteps"
      :selected-targets="selectedTargets"
      :checked-targets="checkedTargetKeys"
      :locked-targets="lockedTargetKeys"
      :runtime-stage-views="runtimeStageViews"
      :disabled="isTaskActive || isBusy || isUploading"
      @update:selected-targets="updateSelectedTargets"
      @configure="isParameterDrawerOpen = true"
      @show-progress="isTaskProgressOpen = true"
    />

    <TaskProgressDialog
      v-model="isTaskProgressOpen"
      :task-status="taskStatus"
      :task-status-label="taskStatusLabel"
      :task-status-tone="taskStatusTone"
      :runtime-stage-views="runtimeStageViews"
      :runtime-current-stage="runtimeCurrentStage"
      :completed-stage-count="runtimeConfirmedCount"
      :progress-percent="runtimeProgressPercent(runtimeStageViews)"
      :is-terminal="isTerminal"
      :can-cancel="canCancel"
      :is-busy="isBusy"
      :is-downloading-result="isDownloadingResult"
      :expanded-artifact-stage-ids="expandedArtifactStageIds"
      :previewing-artifact="previewingArtifact"
      :downloading-artifact="downloadingArtifact"
      :runtime-key="runtimeStageKey"
      :stage-title="runtimeStageTitle"
      :stage-description="runtimeStageDescription"
      :error-message="translateProcessingErrorMessage"
      :artifact-name="artifactFileName"
      :artifact-size="artifactSize"
      :is-previewable="isPreviewableArtifact"
      :can-retry="canRetryStage"
      @toggle-artifacts="toggleStageArtifacts"
      @preview-artifact="previewArtifact"
      @download-artifact="downloadStageArtifact"
      @retry-stage="retryTask"
      @cancel="cancelTask"
      @download-result="downloadTask"
      @reset="resetTask"
    />

    <section
      v-if="processingRiskNotice"
      class="mission-section processing-risk-notice"
      role="note"
    >
      <el-icon aria-hidden="true"><WarningFilled /></el-icon>
      <span>{{ processingRiskNotice }}</span>
    </section>

    <section class="mission-section mission-launch" aria-label="任务启动">
      <div>
        <strong>{{ activeTemplate.label }}</strong>
        <small>{{ launchHint }}</small>
      </div>
      <el-button
        type="primary"
        :loading="isBusy"
        :disabled="!canStart || isTaskActive"
        @click="startTask"
      >
        开始处理
        <el-icon class="el-icon--right"><ArrowRight /></el-icon>
      </el-button>
    </section>

    <section v-if="candidate" class="mission-section candidate-strip">
      <div class="mission-section__heading">
        <div>
          <span class="mission-section__signal is-valid" aria-hidden="true" />
          <strong>已识别配置</strong>
        </div>
        <span>{{ candidate.supportStatus }}</span>
      </div>
      <code>{{ candidate.packageId }}</code>
      <small v-if="candidate.profileKey">
        {{ candidate.profileKey.productCode }} /
        {{ candidate.profileKey.profileVersion }}
      </small>
    </section>

    <el-dialog
      v-model="isArtifactPreviewOpen"
      class="artifact-preview-dialog"
      width="min(860px, calc(100vw - 40px))"
      append-to-body
      destroy-on-close
      @closed="clearArtifactPreview"
    >
      <template #header>
        <strong class="artifact-preview-dialog__title">{{
          artifactPreviewName
        }}</strong>
      </template>
      <div class="artifact-preview-dialog__body">
        <img
          v-if="artifactPreviewUrl"
          :src="artifactPreviewUrl"
          :alt="artifactPreviewName"
        />
      </div>
    </el-dialog>

    <el-drawer
      v-if="isHy1c"
      v-model="isParameterDrawerOpen"
      class="mission-parameter-drawer product-parameter-drawer"
      direction="rtl"
      size="440px"
      append-to-body
      title="参数配置工作台"
      modal-class="parameter-drawer-overlay"
      :lock-scroll="false"
      :modal="false"
      :show-close="false"
    >
      <template #header>
        <div class="parameter-drawer__header">
          <h2 class="drawer-heading__workbench-title">参数配置工作台</h2>
          <button
            class="parameter-drawer__close"
            type="button"
            aria-label="关闭参数工作台"
            @click="isParameterDrawerOpen = false"
          >
            <el-icon><Close /></el-icon>
          </button>
        </div>
      </template>

      <div class="parameter-drawer__body">
        <ParameterWorkbenchOverview :parameters="hy1cOverviewParameters" />

        <section class="l2a-console">
          <fieldset
            v-if="visibleParameterGroups.includes('preprocess')"
            class="control-group parameter-step-card spectral-fieldset"
            :disabled="isConfigurationLocked"
          >
            <legend>
              输出波段
              <ParameterHint
                label="输出波段"
                text="选择要写入标准产品的 CZI 波段。后续 RGB 与检测只能使用已选波段。"
              />
            </legend>
            <OutputBandPicker
              v-model="l2aForm.bands"
              :bands="HY1C_OUTPUT_BANDS"
              :columns="4"
              :disabled="isConfigurationLocked"
              aria-label="CZI 输出波段选择"
            />
            <ParameterFieldStatus
              :issues="parameterIssues"
              :fields="['bands']"
            />
          </fieldset>

          <fieldset
            v-if="visibleParameterGroups.includes('preprocess')"
            class="control-group parameter-step-card roi-parameter-block"
            :disabled="isConfigurationLocked"
          >
            <legend>
              工程网格
              <ParameterHint
                label="工程网格"
                text="定义输出坐标、空间分辨率、重采样方式和处理范围。"
              />
            </legend>
            <p class="roi-parameter-block__note">
              WGS84 ROI 开启后按经纬度范围处理；关闭后处理产品全幅。
            </p>
            <div class="field-grid">
              <label class="control-field">
                <span
                  >输出坐标系
                  <ParameterHint
                    label="输出坐标系"
                    text="输出地图使用的坐标表达方式。推荐保留 AUTO_UTM，由系统自动选择所在地图分区；有明确要求时可选择指定的 UTM 分区。"
                /></span>
                <select
                  v-model="l2aForm.grid.targetCrs"
                  class="crs-input"
                  title="默认自动选择所在地图分区；有明确要求时可选择指定分区"
                  aria-label="输出坐标系，默认自动选择地图分区"
                >
                  <option value="AUTO_UTM">AUTO_UTM - 自动选择 UTM 分区</option>
                  <option value="EPSG:32648">EPSG:32648 - UTM 48N</option>
                  <option value="EPSG:32649">EPSG:32649 - UTM 49N</option>
                  <option value="EPSG:32650">EPSG:32650 - UTM 50N</option>
                  <option value="EPSG:32651">EPSG:32651 - UTM 51N</option>
                  <option value="EPSG:32652">EPSG:32652 - UTM 52N</option>
                </select>
                <ParameterFieldStatus
                  :issues="parameterIssues"
                  :fields="['grid.targetCrs']"
                  guidance="推荐自动选择，也可指定 UTM 分区"
                />
              </label>
              <label class="control-field">
                <span
                  >分辨率（米）
                  <ParameterHint
                    label="分辨率"
                    text="输出像元大小，单位为米，必须大于 0。"
                /></span>
                <ParameterNumberInput
                  v-model="l2aForm.grid.resolutionMeters"
                  min="0.01"
                  step="1"
                  :disabled="isConfigurationLocked"
                />
                <ParameterFieldStatus
                  :issues="parameterIssues"
                  :fields="['grid.resolutionMeters']"
                  guidance="必须大于 0 米，步长 1"
                />
              </label>
              <label class="control-field">
                <span
                  >科学重采样
                  <ParameterHint
                    label="科学重采样"
                    text="固定采用 nearest，避免改变原始观测值，因此不可调整。"
                /></span>
                <input
                  value="nearest"
                  disabled
                  aria-label="科学重采样，固定为 nearest"
                />
                <small class="parameter-field__guide is-neutral"
                  >固定值：nearest</small
                >
              </label>
            </div>
            <div class="roi-control-card">
              <label class="toggle-row">
                <span
                  >WGS84 ROI
                  <ParameterHint
                    label="WGS84 ROI"
                    text="限定处理范围。关闭后按产品全幅处理。"
                  />
                </span>
                <input
                  v-model="l2aForm.roi.enabled"
                  type="checkbox"
                  :disabled="
                    isConfigurationLocked ||
                    !allSlotsUploaded ||
                    !hy1cRoiSuggestion
                  "
                  :title="
                    allSlotsUploaded && hy1cRoiSuggestion
                      ? '可开启 WGS84 ROI'
                      : '请先完成当前产品所需文件上传并解析定位元数据'
                  "
                />
              </label>
              <p
                v-if="!allSlotsUploaded"
                class="roi-parameter-block__status is-warning"
              >
                请先完成当前产品所需文件上传，再开启 ROI。
              </p>
              <p v-if="l2aForm.roi.enabled" class="roi-control-card__note">
                可手动输入或使用地图框选，最后一次修改生效；输入范围必须位于上传数据覆盖范围内。
              </p>
              <div v-if="l2aForm.roi.enabled" class="field-grid compact-grid">
                <label v-for="field in ROI_FIELDS" :key="field.key">
                  <span
                    >{{ field.label }}
                    <ParameterHint
                      :label="field.label"
                      :text="
                        field.longitude
                          ? '经度范围为 -180 到 180。'
                          : '纬度范围为 -90 到 90。'
                      "
                  /></span>
                  <ParameterNumberInput
                    v-model="l2aForm.roi[field.key]"
                    step="0.0001"
                    :min="field.longitude ? -180 : -90"
                    :max="field.longitude ? 180 : 90"
                    :disabled="!l2aForm.roi.enabled || isConfigurationLocked"
                  />
                  <ParameterFieldStatus
                    :issues="parameterIssues"
                    :fields="['roiWgs84']"
                    :guidance="
                      field.longitude
                        ? '范围 -180 到 180 度'
                        : '范围 -90 到 90 度'
                    "
                  />
                </label>
              </div>
              <RoiMapPicker
                v-show="l2aForm.roi.enabled"
                v-model="hy1cRoiModel"
                :bounds="hy1cRoiSuggestion"
                :disabled="isConfigurationLocked"
              />
            </div>
          </fieldset>

          <fieldset
            v-if="selectedTargets.includes('feature-extraction')"
            class="control-group parameter-step-card algorithm-group"
            :disabled="isConfigurationLocked"
          >
            <legend>
              特征提取
              <ParameterHint
                label="特征提取"
                text="从已选波段计算统计、梯度或局部方差等空间特征。"
              />
            </legend>
            <FeatureMetricPicker
              v-model="l2aForm.algorithms.features.metrics"
              :metrics="
                featureMetricOptions([
                  'statistics',
                  'gradient',
                  'local_variance'
                ])
              "
              :disabled="
                !l2aForm.algorithms.features.enabled || isConfigurationLocked
              "
            >
              <template #local-variance>
                <div class="feature-metric-picker__parameter">
                  <span
                    >纹理窗口
                    <ParameterHint
                      label="纹理窗口"
                      text="局部方差的计算邻域，必须为不小于 3 的奇数；数值越大，结果越平滑。"
                    />
                  </span>
                  <ParameterNumberInput
                    v-model="l2aForm.algorithms.features.windowSize"
                    min="3"
                    step="2"
                    :disabled="
                      !l2aForm.algorithms.features.enabled ||
                      isConfigurationLocked
                    "
                  />
                  <ParameterFieldStatus
                    :issues="parameterIssues"
                    :fields="['algorithms.features.windowSize']"
                    guidance="不小于 3，必须为奇数"
                  />
                </div>
              </template>
            </FeatureMetricPicker>
            <ParameterFieldStatus
              :issues="parameterIssues"
              :fields="['algorithms.features.metrics']"
            />
          </fieldset>

          <fieldset
            v-if="selectedTargets.includes('rgb-fusion')"
            class="control-group parameter-step-card algorithm-group"
            :disabled="isConfigurationLocked"
          >
            <legend>
              RGB 波段组合
              <ParameterHint
                label="RGB 波段组合"
                text="选择红、绿、蓝通道组成彩色输出，只能选择已输出的波段。"
              />
            </legend>
            <div class="rgb-grid">
              <label v-for="channel in RGB_CHANNELS" :key="channel.key">
                <span
                  ><strong>{{ channel.label }}</strong> {{ channel.name }}
                  <ParameterHint
                    :label="channel.name"
                    text="RGB 组合通道，只能选择已输出的波段。"
                /></span>
                <select
                  v-model="l2aForm.algorithms.fusion[channel.key]"
                  :disabled="
                    !l2aForm.algorithms.fusion.enabled || isConfigurationLocked
                  "
                >
                  <option
                    v-for="band in HY1C_CZI_BANDS"
                    :key="band"
                    :value="band"
                    :disabled="!isBandSelected(band)"
                  >
                    {{ band }}
                  </option>
                </select>
                <small class="parameter-field__guide is-neutral">{{
                  channel.guide
                }}</small>
              </label>
            </div>
            <ParameterFieldStatus
              :issues="parameterIssues"
              :fields="['algorithms.fusion']"
            />
            <div class="control-grid compact-grid">
              <label class="control-field">
                <span
                  >低百分位
                  <ParameterHint
                    label="低百分位"
                    text="显示拉伸的下限，范围 0 到 100，且必须小于高百分位。"
                /></span>
                <ParameterNumberInput
                  v-model="l2aForm.algorithms.fusion.lowPercentile"
                  min="0"
                  max="100"
                  step="1"
                  :disabled="
                    !l2aForm.algorithms.fusion.enabled || isConfigurationLocked
                  "
                />
                <ParameterFieldStatus
                  :issues="parameterIssues"
                  :fields="['algorithms.fusion.percentiles']"
                  guidance="范围 0 到 100 %，且小于高百分位"
                />
              </label>
              <label class="control-field">
                <span
                  >高百分位
                  <ParameterHint
                    label="高百分位"
                    text="显示拉伸的上限，范围 0 到 100，且必须大于低百分位。"
                /></span>
                <ParameterNumberInput
                  v-model="l2aForm.algorithms.fusion.highPercentile"
                  min="0"
                  max="100"
                  step="1"
                  :disabled="
                    !l2aForm.algorithms.fusion.enabled || isConfigurationLocked
                  "
                />
                <ParameterFieldStatus
                  :issues="parameterIssues"
                  :fields="['algorithms.fusion.percentiles']"
                  guidance="范围 0 到 100 %，且大于低百分位"
                />
              </label>
            </div>
          </fieldset>

          <fieldset
            v-if="selectedTargets.includes('anomaly-detection')"
            class="control-group parameter-step-card algorithm-group"
            :disabled="isConfigurationLocked"
          >
            <legend>
              对比度显著性
              <ParameterHint
                label="对比度显著性"
                text="在指定波段中识别局部对比度异常区域。"
              />
            </legend>
            <div class="control-grid">
              <label class="control-field">
                <span
                  >源波段
                  <ParameterHint
                    label="源波段"
                    text="用于显著性检测的输入波段，只能选择已输出的波段。"
                /></span>
                <select
                  v-model="l2aForm.algorithms.saliency.source"
                  :disabled="
                    !l2aForm.algorithms.saliency.enabled ||
                    isConfigurationLocked
                  "
                >
                  <option
                    v-for="band in HY1C_CZI_BANDS"
                    :key="band"
                    :value="band"
                    :disabled="!isBandSelected(band)"
                  >
                    {{ band }}
                  </option>
                </select>
                <ParameterFieldStatus
                  :issues="parameterIssues"
                  :fields="['algorithms.saliency.source']"
                />
              </label>
              <label class="control-field">
                <span
                  >阈值
                  <ParameterHint
                    label="阈值"
                    text="异常显著程度的判定值，范围 0 到 1；数值越高，判定越严格。"
                /></span>
                <ParameterNumberInput
                  v-model="l2aForm.algorithms.saliency.threshold"
                  min="0"
                  max="1"
                  step="0.05"
                  :disabled="
                    !l2aForm.algorithms.saliency.enabled ||
                    isConfigurationLocked
                  "
                />
                <ParameterFieldStatus
                  :issues="parameterIssues"
                  :fields="['algorithms.saliency.threshold']"
                  guidance="范围 0 到 1，步长 0.05"
                />
              </label>
              <label class="control-field">
                <span
                  >窗口
                  <ParameterHint
                    label="窗口"
                    text="检测的局部邻域，必须为不小于 3 的奇数。"
                /></span>
                <ParameterNumberInput
                  v-model="l2aForm.algorithms.saliency.windowSize"
                  min="3"
                  step="2"
                  :disabled="
                    !l2aForm.algorithms.saliency.enabled ||
                    isConfigurationLocked
                  "
                />
                <ParameterFieldStatus
                  :issues="parameterIssues"
                  :fields="['algorithms.saliency.windowSize']"
                  guidance="不小于 3，必须为奇数"
                />
              </label>
            </div>
          </fieldset>
        </section>
      </div>

      <template #footer>
        <div class="parameter-drawer__footer">
          <span :class="{ 'is-invalid': parameterIssues.length }">
            {{
              parameterIssues.length
                ? `发现 ${parameterIssues.length} 项待处理`
                : "参数校验已通过"
            }}
          </span>
          <el-button
            type="primary"
            :disabled="!isConfigurationLocked && parameterIssues.length > 0"
            @click="confirmParameterConfiguration"
          >
            {{ isConfigurationLocked ? "关闭快照" : "完成配置" }}
          </el-button>
        </div>
      </template>
    </el-drawer>
    <Fy3hMersiParameterDrawer
      v-if="isFy3h"
      v-model="isParameterDrawerOpen"
      :form="fy3hForm"
      :visible-steps="visibleParameterGroups"
      :locked="isConfigurationLocked"
      :roi-data-ready="allSlotsUploaded"
      :issues="fy3hParameterIssues"
      :summary="fy3hSummary"
      @update-form="updateFy3hForm"
      @confirm="confirmParameterConfiguration"
    />
    <Hy2dAltimeterParameterDrawer
      v-if="isHy2d"
      v-model="isParameterDrawerOpen"
      :form="hy2dForm"
      :visible-steps="visibleParameterGroups"
      :locked="isConfigurationLocked"
      :issues="hy2dParameterIssues"
      :summary="hy2dSummary"
      @update-form="updateHy2dForm"
      @confirm="confirmParameterConfiguration"
    />
    <Fy4bAgriParameterDrawer
      v-if="isFy4b"
      v-model="isParameterDrawerOpen"
      :form="fy4bForm"
      :visible-steps="visibleParameterGroups"
      :locked="isConfigurationLocked"
      :roi-data-ready="allSlotsUploaded"
      :issues="fy4bParameterIssues"
      :summary="fy4bSummary"
      @update-form="updateFy4bForm"
      @confirm="confirmParameterConfiguration"
    />
    <Gf6WfvL1aParameterDrawer
      v-if="isGf6WfvL1a"
      v-model="isParameterDrawerOpen"
      :form="gf6Form"
      :metadata-file="slots.metadataXml.file"
      :visible-steps="visibleParameterGroups"
      :locked="isConfigurationLocked"
      :roi-data-ready="allSlotsUploaded"
      :issues="gf6ParameterIssues"
      @update-form="updateGf6Form"
      @confirm="confirmParameterConfiguration"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from "vue";
import {
  ArrowRight,
  Close,
  Delete,
  ArrowDown,
  Setting,
  QuestionFilled,
  FolderOpened,
  WarningFilled
} from "@element-plus/icons-vue";

import { message } from "@/utils/message";
import ProcessingPlanPanel from "@/components/LeftPanel/ProcessingPlanPanel.vue";
import TaskProgressDialog from "@/components/LeftPanel/TaskProgressDialog.vue";
import Fy3hMersiParameterDrawer from "@/features/multisource/Fy3hMersiParameterDrawer.vue";
import Hy2dAltimeterParameterDrawer from "@/features/multisource/Hy2dAltimeterParameterDrawer.vue";
import Fy4bAgriParameterDrawer from "@/features/multisource/Fy4bAgriParameterDrawer.vue";
import Gf6WfvL1aParameterDrawer from "@/features/multisource/Gf6WfvL1aParameterDrawer.vue";
import { getVisibleParameterGroups } from "@/features/multisource/parameterVisibility";
import ParameterWorkbenchOverview from "@/features/multisource/ParameterWorkbenchOverview.vue";
import ParameterHint from "@/features/multisource/ParameterHint.vue";
import ParameterFieldStatus from "@/features/multisource/ParameterFieldStatus.vue";
import ParameterNumberInput from "@/features/multisource/ParameterNumberInput.vue";
import RoiMapPicker, {
  type RoiBounds
} from "@/features/multisource/RoiMapPicker.vue";
import FeatureMetricPicker from "@/features/multisource/FeatureMetricPicker.vue";
import OutputBandPicker, {
  type OutputBandOption
} from "@/features/multisource/OutputBandPicker.vue";
import {
  featureMetricLabel,
  featureMetricOptions
} from "@/features/multisource/featureMetricLabels";
import {
  buildFy4bAgriSnapshot,
  defaultFy4bAgriForm,
  validateFy4bAgriForm
} from "@/features/multisource/fy4bAgriParameters";
import {
  buildGf6WfvL1aSnapshot,
  defaultGf6WfvL1aForm,
  validateGf6WfvL1aForm
} from "@/features/multisource/gf6WfvL1aParameters";
import {
  buildFy3hMersiSnapshot,
  defaultFy3hMersiForm,
  validateFy3hMersiForm
} from "@/features/multisource/fy3hMersiParameters";
import {
  buildHy2dAltimeterSnapshot,
  defaultHy2dAltimeterForm,
  validateHy2dAltimeterForm
} from "@/features/multisource/hy2dAltimeterParameters";
import {
  HY1C_CZI_BANDS,
  buildHy1cCziL2aSnapshot,
  defaultL2aForm,
  validateHy1cCziL2aForm,
  type Hy1cCziBand
} from "@/features/multisource/hy1cCziL2aParameters";

const HY1C_OUTPUT_BANDS: OutputBandOption[] = [
  { value: "B460", label: "B460", category: "蓝光 460 nm", tone: "blue" },
  { value: "B560", label: "B560", category: "绿光 560 nm", tone: "green" },
  { value: "B650", label: "B650", category: "红光 650 nm", tone: "red" },
  {
    value: "B825",
    label: "B825",
    category: "近红外 825 nm",
    tone: "infrared"
  }
];
import {
  hy1cRoiStateAfterMetadataChange,
  type Hy1cCziL2aRoi
} from "@/features/multisource/hy1cCziL2aRoi";
import { gf6FootprintRoiFromXml } from "@/features/multisource/gf6WfvL1aRoi";
import {
  processingStartSuccessMessage,
  translateProcessingErrorMessage
} from "@/features/multisource/processingTaskRules";
import {
  getPipelineDefinition,
  getTargetSteps
} from "@/features/multisource/pipelineDefinitions";
import {
  getCheckedSelectableStepKeys,
  getRequiredSelectableSteps,
  resolveProcessingPlan,
  type ProcessingPlan
} from "@/features/multisource/processingPlan";
import {
  buildRuntimeStageViews,
  runtimeProgressPercent,
  runtimeSucceededCount,
  type RuntimeStageView
} from "@/features/multisource/processingRunState";
import {
  FY3H_MERSI_TEMPLATE,
  FY4B_AGRI_TEMPLATE,
  GF6_WFV_L1A_TEMPLATE,
  HY1C_CZI_L2A_TEMPLATE,
  HY2D_ALTIMETER_TEMPLATE,
  PRODUCT_TEMPLATES,
  type SlotId
} from "@/features/multisource/productTemplates";
import { useProcessingTask } from "@/features/multisource/useProcessingTask";
import type {
  ExecutionProgressArtifact,
  ExecutionProgressStage
} from "@/api/multiSourceSatellite";
import { BlobReader, BlobWriter, ZipReader } from "@zip.js/zip.js";
import {
  cancelArchiveUpload,
  completeArchiveUpload,
  createArchiveUpload,
  getArchiveUploadStatus,
  uploadArchiveChunk
} from "@/api/multiSourceArchive";
import {
  ARCHIVE_CHUNK_SIZE,
  ARCHIVE_MAX_SIZE,
  ARCHIVE_SERVER_ONLY,
  archiveStatusLabel as getArchiveStatusLabel,
  assertArchiveSize,
  getArchiveChunkCount,
  getArchiveChunkRange,
  isArchiveServerUnavailable,
  type ArchiveImportProgress
} from "@/features/multisource/archiveImport";
import {
  matchProductArchiveEntries,
  type ProductArchiveEntry
} from "@/features/multisource/productArchiveImport";
import {
  buildFy4bWorkbenchSummary,
  buildHy1cWorkbenchSummary,
  buildFy3hWorkbenchSummary,
  buildHy2dWorkbenchSummary,
  resetMultisourceProductForms,
  syncProductAlgorithmSelection
} from "@/features/multisource/multisourceProductState";

const props = withDefaults(defineProps<{ active?: boolean }>(), {
  active: true
});

const ROI_FIELDS = [
  { key: "minLon", label: "最小经度", longitude: true },
  { key: "minLat", label: "最小纬度", longitude: false },
  { key: "maxLon", label: "最大经度", longitude: true },
  { key: "maxLat", label: "最大纬度", longitude: false }
] as const;
const RGB_CHANNELS = [
  { key: "red", label: "R", name: "红色通道", guide: "暖色与高反射目标" },
  { key: "green", label: "G", name: "绿色通道", guide: "植被与中间色调" },
  { key: "blue", label: "B", name: "蓝色通道", guide: "水体、薄雾与冷色调" }
] as const;
const STAGE_LABELS: Record<string, string> = {
  VALIDATE_BROWSE: "验证浏览产品",
  GEOREFERENCE_BROWSE: "解析地理参考",
  EXTRACT_VISUAL_FEATURES: "提取视觉特征",
  WRITE_BROWSE_REPORT: "生成浏览报告",
  VALIDATE_SOURCE: "校验 L2A 产品",
  DECODE_SCALE_AND_NODATA: "解码波段与无效值",
  APPLY_L2_FLAGS: "应用 L2 质量标志",
  GEOLOCATE_AND_GRID: "地理定位与网格化",
  CROP_OPTIONAL: "按范围裁剪",
  WRITE_STANDARD_COG: "生成标准 COG",
  EXTRACT_CZI_FEATURES: "提取特征",
  FUSE_CZI_BANDS: "生成显示融合",
  DETECT_CZI_SALIENCY: "生成显著性结果",
  STANDARDIZE_MERSI_L1: "处理 FY-3H MERSI L1 产品",
  VALIDATE_FY3H_PAIR: "校验 1000M / GEO1K 配对",
  DECODE_MERSI_L1: "解码 MERSI L1 通道",
  CALIBRATE_MERSI_L1: "定标 MERSI 观测",
  APPLY_MERSI_QUALITY: "应用 MERSI 质量掩膜",
  GRID_MERSI_SWATH: "扫描带网格化",
  WRITE_MERSI_STANDARD_COG: "生成 MERSI 标准 COG",
  EXTRACT_MERSI_FEATURES: "提取 MERSI 特征",
  FUSE_MERSI_BANDS: "生成 MERSI RGB 融合",
  DETECT_MERSI_SALIENCY: "检测 MERSI 显著性",
  STANDARDIZE_ALTIMETER_TRACK: "处理 HY-2D 高度计沿轨产品",
  DECODE_ALTIMETER_TRACK: "解码高度计沿轨数据",
  APPLY_TRACK_QUALITY: "应用沿轨质量规则",
  CALCULATE_BASELINE_SSH: "计算基线海表高度",
  EXTRACT_TRACK_FEATURES: "提取沿轨特征",
  DETECT_TRACK_ANOMALIES: "检测沿轨异常",
  WRITE_STANDARD_TRACK_OUTPUT: "生成标准沿轨产品",
  GRID_TRACK_OPTIONAL: "生成可选网格产品",
  STANDARDIZE_FY4B_AGRI: "处理 FY-4B AGRI 全圆盘产品",
  STANDARDIZE_GF6_WFV_L1A: "处理 GF-6 WFV L1A 工程产品"
};

const l2aForm = reactive(defaultL2aForm());
const hy1cRoiSuggestion = ref<Hy1cCziL2aRoi | null>(null);
const gf6RoiBounds = ref<[number, number, number, number] | null>(null);
const hy1cRoiModel = computed<RoiBounds | null>({
  get: () => {
    const { minLon, minLat, maxLon, maxLat } = l2aForm.roi;
    return l2aForm.roi.enabled &&
      [minLon, minLat, maxLon, maxLat].every(Number.isFinite)
      ? [minLon as number, minLat as number, maxLon as number, maxLat as number]
      : null;
  },
  set: value => {
    if (!value) {
      l2aForm.roi.enabled = false;
      return;
    }
    [
      l2aForm.roi.minLon,
      l2aForm.roi.minLat,
      l2aForm.roi.maxLon,
      l2aForm.roi.maxLat
    ] = value;
    l2aForm.roi.enabled = true;
  }
});
const fy3hForm = reactive(defaultFy3hMersiForm());
const hy2dForm = reactive(defaultHy2dAltimeterForm());
const fy4bForm = reactive(defaultFy4bAgriForm());
const gf6Form = reactive(defaultGf6WfvL1aForm());
gf6Form.roi = null;
const productForms = {
  hy1c: l2aForm,
  fy3h: fy3hForm,
  hy2d: hy2dForm,
  fy4b: fy4bForm,
  gf6: gf6Form
};
const isBusy = ref(false);
const isParameterDrawerOpen = ref(false);
const isConfigurationConfirmed = ref(false);
watch(
  () => props.active,
  active => {
    if (!active) isParameterDrawerOpen.value = false;
  },
  { immediate: true }
);
const isPackageExpanded = ref(false);
const isArchiveImporting = ref(false);
const archiveInput = ref<HTMLInputElement | null>(null);
const archiveMatchedSlots = ref(new Set<SlotId>());
const archiveImportProgress = reactive<ArchiveImportProgress>({
  status: "IDLE",
  uploadedChunks: 0,
  totalChunks: 0,
  processedFiles: 0,
  matchingFilesProcessed: 0
});
const archiveUploadId = ref<string>();
const archiveCancelRequested = ref(false);
let archivePollTimer: ReturnType<typeof setTimeout> | undefined;
const isArchivePickerActionable = computed(
  () =>
    !isTaskActive.value &&
    !isBusy.value &&
    !isUploading.value &&
    !isArchiveImporting.value &&
    archiveImportProgress.status !== "COMPLETED"
);
const archiveProgressPercent = computed(() => {
  const { status } = archiveImportProgress;
  if (status === "COMPLETED") return 100;
  if (status === "MATCHING") {
    const total = archiveImportProgress.totalFiles || 1;
    return Math.round(
      85 + ((archiveImportProgress.matchingFilesProcessed ?? 0) / total) * 13
    );
  }
  if (status === "PARSING") {
    const total = archiveImportProgress.totalFiles || 1;
    return Math.round(55 + (archiveImportProgress.processedFiles / total) * 30);
  }
  if (status === "MERGING") return 50;
  if (status === "UPLOADING") {
    return archiveImportProgress.totalChunks
      ? Math.round(
          (archiveImportProgress.uploadedChunks /
            archiveImportProgress.totalChunks) *
            45
        )
      : 0;
  }
  return 0;
});
const archiveStatusLabel = getArchiveStatusLabel;
const selectedTargets = ref<string[]>([]);
const {
  activeTemplate,
  slots,
  validation,
  allSlotsUploaded,
  isTaskActive,
  isUploading,
  isDownloadingResult,
  candidate,
  taskStatus,
  progress,
  newlyCompletedStageIds,
  setTemplate,
  uploadSlot,
  setUploadedSlot,
  removeSlot,
  startProcessing,
  translateError,
  cancel,
  retry,
  downloadResult,
  downloadArtifact,
  getArtifactBlob,
  reset
} = useProcessingTask(GF6_WFV_L1A_TEMPLATE);

watch(
  [l2aForm, fy3hForm, hy2dForm, fy4bForm, gf6Form, selectedTargets],
  () => {
    isConfigurationConfirmed.value = false;
  },
  { deep: true }
);
watch(
  () => [
    allSlotsUploaded.value,
    validation.value.valid,
    activeTemplate.value.id
  ],
  () => {
    isConfigurationConfirmed.value = false;
  }
);
watch(
  () =>
    activeTemplate.value.slots.map(slot => {
      const state = slots[slot.id];
      return [slot.id, state.status, state.file?.name, state.error];
    }),
  () => {
    isConfigurationConfirmed.value = false;
  },
  { deep: true }
);

watch(
  () => slots.metadataXml?.file,
  async file => {
    gf6RoiBounds.value = file
      ? gf6FootprintRoiFromXml(await file.text())
      : null;
  },
  { immediate: true }
);

const expandedArtifactStageIds = ref<ExecutionProgressStage["stageId"][]>([]);
const isTaskProgressOpen = ref(false);
const isArtifactPreviewOpen = ref(false);
const artifactPreviewUrl = ref("");
const artifactPreviewName = ref("");
const previewingArtifact = ref<ExecutionProgressArtifact | null>(null);
const downloadingArtifact = ref<ExecutionProgressArtifact | null>(null);

const isHy1c = computed(
  () => activeTemplate.value.id === HY1C_CZI_L2A_TEMPLATE.id
);
const isFy3h = computed(
  () => activeTemplate.value.id === FY3H_MERSI_TEMPLATE.id
);
const isHy2d = computed(
  () => activeTemplate.value.id === HY2D_ALTIMETER_TEMPLATE.id
);
const isFy4b = computed(
  () => activeTemplate.value.id === FY4B_AGRI_TEMPLATE.id
);
const isGf6WfvL1a = computed(
  () => activeTemplate.value.id === GF6_WFV_L1A_TEMPLATE.id
);
const pipelineDefinition = computed(() =>
  getPipelineDefinition(activeTemplate.value.id)
);
const targetSteps = computed(() => getTargetSteps(activeTemplate.value.id));
const processingPlan = computed<ProcessingPlan>(() =>
  resolveProcessingPlan(pipelineDefinition.value, selectedTargets.value)
);
const visibleParameterGroups = computed(() =>
  getVisibleParameterGroups(
    activeTemplate.value.id,
    processingPlan.value.resolvedSteps
  )
);
const resolvedPlanSteps = computed(() =>
  processingPlan.value.resolvedSteps
    .map(key => pipelineDefinition.value.steps.find(step => step.key === key))
    .filter((step): step is NonNullable<typeof step> => Boolean(step))
);
const runtimeStageViews = computed(() =>
  buildRuntimeStageViews(
    resolvedPlanSteps.value,
    progress.value?.stages || [],
    progress.value?.artifacts || []
  ).map((view, index) => ({
    ...view,
    runtimeId: view.stage?.stageId ?? `planned-${view.step.key}-${index}`
  }))
);
watch(newlyCompletedStageIds, ids => {
  const latest = ids[ids.length - 1];
  if (latest === undefined) return;
  if (!expandedArtifactStageIds.value.includes(latest)) {
    expandedArtifactStageIds.value = [
      ...expandedArtifactStageIds.value,
      latest
    ];
  }
});
const runtimeConfirmedCount = computed(() =>
  runtimeSucceededCount(runtimeStageViews.value)
);
const runtimeCurrentStage = computed(
  () =>
    runtimeStageViews.value.find(view => view.status === "PROCESSING") ||
    runtimeStageViews.value.find(view => view.status === "FAILED")
);
const taskStatusTone = computed(() => {
  if (taskStatus.value === "SUCCEEDED") return "success";
  if (
    taskStatus.value === "FAILED" ||
    taskStatus.value === "RECOVERY_PENDING"
  ) {
    return "danger";
  }
  if (taskStatus.value === "CANCELED") return "muted";
  return "running";
});
const checkedTargetKeys = computed(() =>
  getCheckedSelectableStepKeys(pipelineDefinition.value, selectedTargets.value)
);
const lockedTargetKeys = computed(() =>
  getRequiredSelectableSteps(pipelineDefinition.value, selectedTargets.value)
);
const templateLockMessage = computed(() => {
  if (isArchiveImporting.value)
    return "产品包正在导入；完成或取消后才能切换模板。";
  if (isUploading.value) return "文件正在上传；上传结束后才能切换模板。";
  if (isBusy.value) return "正在创建任务；请等待当前请求完成。";
  return "任务正在执行；结束或取消后才能切换模板。";
});
const uploadedSlotCount = computed(
  () =>
    activeTemplate.value.slots.filter(
      slot => slots[slot.id].status === "UPLOADED"
    ).length
);
const parameterValidation = computed(() =>
  validateHy1cCziL2aForm(l2aForm, hy1cRoiSuggestion.value)
);
const parameterIssues = computed(() => parameterValidation.value.issues);
const l2aSummary = computed(() => buildHy1cWorkbenchSummary(l2aForm));
const hy1cOverviewParameters = computed(() => {
  if (!visibleParameterGroups.value.includes("preprocess")) return [];
  return [
    { label: "网格定义", value: l2aSummary.value.grid },
    { label: "处理范围", value: l2aSummary.value.roi }
  ];
});
const fy3hParameterValidation = computed(() => validateFy3hMersiForm(fy3hForm));
const fy3hParameterIssues = computed(
  () => fy3hParameterValidation.value.issues
);
const fy3hSummary = computed(() => buildFy3hWorkbenchSummary(fy3hForm));
const hy2dParameterValidation = computed(() =>
  validateHy2dAltimeterForm(hy2dForm)
);
const hy2dParameterIssues = computed(
  () => hy2dParameterValidation.value.issues
);
const hy2dSummary = computed(() => buildHy2dWorkbenchSummary(hy2dForm));
const fy4bParameterValidation = computed(() => validateFy4bAgriForm(fy4bForm));
const fy4bParameterIssues = computed(
  () => fy4bParameterValidation.value.issues
);
const fy4bSummary = computed(() =>
  buildFy4bWorkbenchSummary(fy4bForm, featureMetricLabel)
);
const gf6ParameterValidation = computed(() =>
  validateGf6WfvL1aForm(gf6Form, gf6RoiBounds.value)
);
const gf6ParameterIssues = computed(() => gf6ParameterValidation.value.issues);
const activeParametersValid = computed(() => {
  if (isHy1c.value) return parameterValidation.value.valid;
  if (isFy3h.value) return fy3hParameterValidation.value.valid;
  if (isHy2d.value) return hy2dParameterValidation.value.valid;
  if (isFy4b.value) return fy4bParameterValidation.value.valid;
  if (isGf6WfvL1a.value) return gf6ParameterValidation.value.valid;
  return true;
});
const launchHint = computed(() => {
  if (isTaskActive.value || isBusy.value) return "任务正在处理中，请稍候";
  if (isUploading.value || isArchiveImporting.value) {
    return "产品包正在处理中，请等待上传、解析和匹配完成";
  }
  if (!allSlotsUploaded.value) return "请先上传完整产品包";
  if (!validation.value.valid) return "请先修正产品包校验问题";
  if (!selectedTargets.value.length) return "请选择至少一个处理功能";
  if (!activeParametersValid.value) return "请修正参数配置中的错误";
  if (!isConfigurationConfirmed.value) {
    return "请打开配置参数，检查并点击“完成配置”";
  }
  return "参数配置已完成，可以开始处理";
});
const isConfigurationLocked = computed(
  () => isTaskActive.value || isBusy.value
);
const hasPackageAttention = computed(() => {
  const result = validation.value;
  return (
    isUploading.value ||
    activeTemplate.value.slots.some(slot => Boolean(slots[slot.id].error)) ||
    result.invalidExtensions.length > 0 ||
    result.mismatchedBasenames ||
    result.productIssues.length > 0
  );
});
const isPackageContentVisible = computed(
  () => isPackageExpanded.value || hasPackageAttention.value
);
const canStart = computed(
  () =>
    allSlotsUploaded.value &&
    validation.value.valid &&
    activeParametersValid.value &&
    selectedTargets.value.length > 0 &&
    isConfigurationConfirmed.value
);
const processingRiskNotice = computed(() => {
  if (!canStart.value || !visibleParameterGroups.value.includes("preprocess")) {
    return "";
  }
  if (isGf6WfvL1a.value) {
    return "当前处理未启用地形校正，山区或高差较大区域的定位可能存在偏差。";
  }
  if (isFy4b.value) {
    return "当前产品的名义定位尚未完成测绘级验证；涉及坐标量测或边界判读前请先核验。";
  }
  return "";
});
const isTerminal = computed(() =>
  ["SUCCEEDED", "FAILED", "CANCELED"].includes(taskStatus.value || "")
);
const canCancel = computed(
  () => taskStatus.value === "CREATED" || taskStatus.value === "RUNNING"
);
const taskStatusLabel = computed(() => {
  const labels: Record<string, string> = {
    CREATED: "任务已创建",
    RUNNING: "正在处理",
    RECOVERY_PENDING: "等待恢复",
    SUCCEEDED: "处理完成",
    FAILED: "处理失败",
    CANCELED: "任务已取消"
  };
  return labels[taskStatus.value || ""] || "等待创建";
});

function runtimeStageKey(
  view: RuntimeStageView & { runtimeId?: string | number }
) {
  return view.runtimeId ?? view.step.key;
}

function runtimeStageTitle(view: RuntimeStageView) {
  return view.stage
    ? stageLabel(view.stage.stageCode || view.stage.stageKey)
    : view.step.title;
}

function runtimeStageDescription(view: RuntimeStageView) {
  if (view.status === "PROCESSING") return "正在执行该阶段";
  if (view.status === "SUCCEEDED") {
    return view.stage?.finishedAt
      ? `完成于 ${view.stage.finishedAt}`
      : "阶段已完成";
  }
  if (view.status === "FAILED") return "请查看错误信息并重试";
  return "等待前置阶段完成";
}

function isStageArtifactsExpanded(stageId?: ExecutionProgressStage["stageId"]) {
  return (
    stageId !== undefined && expandedArtifactStageIds.value.includes(stageId)
  );
}

function toggleStageArtifacts(stageId: ExecutionProgressStage["stageId"]) {
  expandedArtifactStageIds.value = isStageArtifactsExpanded(stageId)
    ? expandedArtifactStageIds.value.filter(id => id !== stageId)
    : [...expandedArtifactStageIds.value, stageId];
}

function artifactFileName(artifact: ExecutionProgressArtifact) {
  const value = artifact.uri.split(/[\\/]/).pop() || artifact.type;
  return value.split(/[?#]/)[0] || "处理产物";
}

function artifactSize(artifact: ExecutionProgressArtifact) {
  const bytes = artifact.sizeBytes || 0;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isPreviewableArtifact(artifact: ExecutionProgressArtifact) {
  return /\.(jpe?g|png|webp|gif)(?:[?#]|$)/i.test(artifact.uri);
}

async function previewArtifact(artifact: ExecutionProgressArtifact) {
  previewingArtifact.value = artifact;
  try {
    const blob = await getArtifactBlob(artifact);
    clearArtifactPreview();
    artifactPreviewUrl.value = URL.createObjectURL(blob);
    artifactPreviewName.value = artifactFileName(artifact);
    isArtifactPreviewOpen.value = true;
  } catch (error) {
    message(error instanceof Error ? error.message : "产物预览失败", {
      type: "error"
    });
  } finally {
    previewingArtifact.value = null;
  }
}

async function downloadStageArtifact(artifact: ExecutionProgressArtifact) {
  downloadingArtifact.value = artifact;
  try {
    await downloadArtifact(artifact);
  } catch (error) {
    message(error instanceof Error ? error.message : "产物下载失败", {
      type: "error"
    });
  } finally {
    downloadingArtifact.value = null;
  }
}

function clearArtifactPreview() {
  if (artifactPreviewUrl.value) URL.revokeObjectURL(artifactPreviewUrl.value);
  artifactPreviewUrl.value = "";
  artifactPreviewName.value = "";
  isArtifactPreviewOpen.value = false;
}

onBeforeUnmount(clearArtifactPreview);

function isBandSelected(band: Hy1cCziBand) {
  return l2aForm.bands.includes(band);
}

function updateFy3hForm(value: ReturnType<typeof defaultFy3hMersiForm>) {
  Object.assign(fy3hForm, value);
}

function updateHy2dForm(value: ReturnType<typeof defaultHy2dAltimeterForm>) {
  Object.assign(hy2dForm, value);
}

function updateFy4bForm(value: ReturnType<typeof defaultFy4bAgriForm>) {
  Object.assign(fy4bForm, value);
}

function updateGf6Form(value: ReturnType<typeof defaultGf6WfvL1aForm>) {
  Object.assign(gf6Form, value);
}

function confirmParameterConfiguration() {
  if (isConfigurationLocked.value) {
    isParameterDrawerOpen.value = false;
    return;
  }
  if (!activeParametersValid.value) {
    message("请先修正参数配置中的错误", { type: "warning" });
    return;
  }
  isConfigurationConfirmed.value = true;
  isParameterDrawerOpen.value = false;
}

function updateSelectedTargets(value: string[]) {
  selectedTargets.value = value;
  syncProductAlgorithmSelection(productForms, value);
}

function togglePackageExpanded() {
  isPackageExpanded.value = !isPackageExpanded.value;
}

function slotStatusLabel(status: string) {
  const labels: Record<string, string> = {
    EMPTY: "未上传",
    SELECTED: "已选择",
    UPLOADING: "上传中",
    UPLOADED: "已上传",
    FAILED: "失败"
  };
  return labels[status] || status;
}

function isSlotActionable(status: string) {
  return (
    !isTaskActive.value &&
    !isBusy.value &&
    !isArchiveImporting.value &&
    (status === "EMPTY" || status === "FAILED")
  );
}

function handleSlotActivate(slotId: SlotId, event: Event) {
  if (!isSlotActionable(slots[slotId].status)) return;
  if ((event.target as HTMLElement | null)?.closest("button")) return;
  document.getElementById(`file-${activeTemplate.value.id}-${slotId}`)?.click();
}

function slotDisplayName(slotId: SlotId, fallback: string) {
  return slots[slotId].file?.name ?? fallback;
}

function openArchivePicker() {
  if (!isArchivePickerActionable.value) return;
  archiveInput.value?.click();
}

function handleArchivePanelActivate(event: MouseEvent) {
  if (event.target instanceof HTMLInputElement) return;
  openArchivePicker();
}

function resetArchiveProgress() {
  if (archivePollTimer) clearTimeout(archivePollTimer);
  archivePollTimer = undefined;
  archiveUploadId.value = undefined;
  archiveCancelRequested.value = false;
  Object.assign(archiveImportProgress, {
    status: "IDLE",
    uploadedChunks: 0,
    totalChunks: 0,
    processedFiles: 0,
    matchingFilesProcessed: 0,
    totalFiles: undefined,
    currentFile: undefined,
    error: undefined
  });
}

async function importArchiveFromServer(archive: File) {
  const totalChunks = getArchiveChunkCount(archive.size, ARCHIVE_CHUNK_SIZE);
  const created = await createArchiveUpload({
    fileName: archive.name,
    fileSize: archive.size,
    chunkSize: ARCHIVE_CHUNK_SIZE,
    totalChunks,
    templateId: activeTemplate.value.id
  });
  const uploadId = created.data?.uploadId;
  if (!uploadId) throw new Error("服务端未返回 ZIP 上传会话");
  archiveUploadId.value = uploadId;
  archiveCancelRequested.value = false;
  Object.assign(archiveImportProgress, { status: "UPLOADING", totalChunks });
  for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex += 1) {
    if (archiveCancelRequested.value) return;
    const { start, end } = getArchiveChunkRange(
      archive.size,
      chunkIndex,
      ARCHIVE_CHUNK_SIZE
    );
    await uploadArchiveChunk(uploadId, chunkIndex, archive.slice(start, end));
    if (archiveCancelRequested.value) return;
    archiveImportProgress.uploadedChunks = chunkIndex + 1;
  }
  archiveImportProgress.status = "MERGING";
  await completeArchiveUpload(uploadId);
  archiveImportProgress.status = "PARSING";
  await pollArchiveImport(uploadId, archive);
}

async function extractArchiveMetadataFiles(
  archive: File,
  matchedFiles: Array<{
    slotId: string;
    fileName: string;
    content?: string;
  }>
) {
  const metadataMatches = matchedFiles.filter(file =>
    ["metadata", "metadataXml"].includes(file.slotId)
  );
  const files = new Map<SlotId, File>();
  for (const match of metadataMatches) {
    if (match.content !== undefined) {
      files.set(
        match.slotId as SlotId,
        new File([match.content], match.fileName, { type: "application/xml" })
      );
    }
  }
  const unresolved = metadataMatches.filter(
    match => !files.has(match.slotId as SlotId)
  );
  if (unresolved.length === 0) return files;

  const reader = new ZipReader(new BlobReader(archive));
  try {
    const entries = await reader.getEntries();
    for (const match of unresolved) {
      const expectedName = match.fileName.replace(/\\/g, "/").toLowerCase();
      const entry = entries.find(candidate => {
        const entryName = candidate.filename.replace(/\\/g, "/").toLowerCase();
        return (
          !candidate.directory &&
          Boolean(candidate.getData) &&
          (entryName === expectedName ||
            entryName.endsWith(`/${expectedName}`) ||
            entryName.split("/").pop() === expectedName.split("/").pop())
        );
      });
      if (!entry?.getData) continue;
      const blob = await entry.getData(new BlobWriter());
      files.set(
        match.slotId as SlotId,
        new File([blob], match.fileName, {
          type: blob.type || "application/xml"
        })
      );
    }
  } finally {
    await reader.close();
  }
  return files;
}

async function pollArchiveImport(
  uploadId: string,
  archive: File
): Promise<void> {
  if (archiveCancelRequested.value) return;
  const response = await getArchiveUploadStatus(uploadId);
  if (archiveCancelRequested.value) return;
  const status = response.data;
  if (!status) throw new Error("服务端未返回 ZIP 解析状态");
  Object.assign(archiveImportProgress, status);
  if (status.status === "COMPLETED") {
    const matchedFiles = status.matchedFiles ?? [];
    Object.assign(archiveImportProgress, {
      status: "MATCHING",
      totalFiles: matchedFiles.length,
      processedFiles: 0,
      matchingFilesProcessed: 0,
      currentFile: undefined
    });
    const metadataFiles = await extractArchiveMetadataFiles(
      archive,
      matchedFiles
    );
    for (const file of matchedFiles) {
      if (archiveCancelRequested.value) return;
      const slotId = file.slotId as SlotId;
      archiveImportProgress.currentFile = file.fileName;
      archiveMatchedSlots.value.add(slotId);
      setUploadedSlot(
        slotId,
        file.fileName,
        file.sysFileId,
        metadataFiles.get(slotId)
      );
      archiveImportProgress.matchingFilesProcessed =
        (archiveImportProgress.matchingFilesProcessed ?? 0) + 1;
    }
    archiveImportProgress.currentFile = undefined;
    archiveImportProgress.status = "COMPLETED";
    isPackageExpanded.value = true;
    const hy1cMetadata = metadataFiles.get("metadata");
    if (isHy1c.value && hy1cMetadata) {
      applyHy1cMetadataRoi(await hy1cMetadata.text());
    }
    message(
      `已从 ZIP 自动匹配并上传 ${status.matchedFiles?.length ?? status.processedFiles} 个文件`,
      { type: "success" }
    );
    return;
  }
  if (status.status === "FAILED")
    throw new Error(status.error || "ZIP 产品包解析失败");
  if (status.status === "CANCELED") throw new Error("ZIP 解析已取消");
  await new Promise<void>(resolve => {
    archivePollTimer = setTimeout(resolve, 700);
  });
  return pollArchiveImport(uploadId, archive);
}

async function cancelArchiveImport() {
  if (!archiveUploadId.value) return;
  archiveCancelRequested.value = true;
  if (archivePollTimer) clearTimeout(archivePollTimer);
  archivePollTimer = undefined;
  try {
    await cancelArchiveUpload(archiveUploadId.value);
    archiveMatchedSlots.value.clear();
    resetArchiveProgress();
    isArchiveImporting.value = false;
  } catch (error) {
    archiveCancelRequested.value = false;
    archiveImportProgress.error =
      error instanceof Error ? error.message : "取消 ZIP 解析失败，请稍后重试";
    message(archiveImportProgress.error, { type: "warning" });
    return;
  }
}

async function handleArchiveChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const archive = input.files?.[0];
  if (!archive) return;
  isArchiveImporting.value = true;
  let reader: ZipReader<BlobReader> | undefined;
  try {
    assertArchiveSize(archive.size, ARCHIVE_MAX_SIZE);
    try {
      await importArchiveFromServer(archive);
      return;
    } catch (error) {
      if (ARCHIVE_SERVER_ONLY) {
        throw new Error(
          isArchiveServerUnavailable(error)
            ? "服务端分片解析接口不可用，请检查后端接口是否已部署"
            : error instanceof Error
              ? error.message
              : "服务端 ZIP 解析失败"
        );
      }
      if (!isArchiveServerUnavailable(error)) {
        throw error;
      }
      if (archive.size > 2 * 1024 * 1024 * 1024) {
        throw new Error(
          "当前服务端分片接口不可用，20 GB 以内的大 ZIP 需要部署服务端解析后才能导入"
        );
      }
      resetArchiveProgress();
    }
    reader = new ZipReader(new BlobReader(archive));
    const zipEntries = await reader.getEntries();
    if (zipEntries.length > 200) {
      await reader.close();
      reader = undefined;
      throw new Error("ZIP 压缩包文件数量不能超过 200 个");
    }
    const archiveEntries = zipEntries
      .filter(entry => !entry.directory && Boolean(entry.getData))
      .map(entry => ({
        name: entry.filename,
        zipEntry: entry
      }));
    const result = matchProductArchiveEntries(
      archiveEntries,
      activeTemplate.value
    );
    if (result.conflicts.length > 0) {
      const conflictSlots = result.conflicts
        .map(conflict => conflict.slot.label)
        .join("、");
      throw new Error(
        `ZIP 中存在重复匹配文件：${conflictSlots}，请整理后重新导入`
      );
    }
    if (result.missingRequired.length > 0) {
      const missingSlots = result.missingRequired
        .map(
          slotId =>
            activeTemplate.value.slots.find(slot => slot.id === slotId)
              ?.label ?? slotId
        )
        .join("、");
      throw new Error(`ZIP 缺少必需文件：${missingSlots}`);
    }
    if (result.matches.length === 0) {
      throw new Error("ZIP 中没有识别到当前产品所需的文件");
    }
    isPackageExpanded.value = true;
    for (const match of result.matches) {
      const archiveEntry = match.entry as ProductArchiveEntry & {
        zipEntry: { getData: (writer: BlobWriter) => Promise<Blob> };
      };
      const blob = await archiveEntry.zipEntry.getData(new BlobWriter());
      const file = new File(
        [blob],
        match.entry.name.split("/").pop() ?? match.entry.name,
        {
          type: blob.type || "application/octet-stream"
        }
      );
      archiveMatchedSlots.value.add(match.slot.id);
      await uploadSlot(match.slot.id, file);
      if (slots[match.slot.id].status === "FAILED") {
        throw new Error(`${match.slot.label}上传失败，请使用单文件上传重试`);
      }
      if (
        isHy1c.value &&
        match.slot.id === "metadata" &&
        slots.metadata.status === "UPLOADED"
      ) {
        applyHy1cMetadataRoi(await file.text());
      }
    }
    message(`已从 ZIP 自动匹配并上传 ${result.matches.length} 个文件`, {
      type: "success"
    });
  } catch (error) {
    archiveImportProgress.error =
      error instanceof Error ? error.message : "ZIP 产品包解析失败";
    message(error instanceof Error ? error.message : "ZIP 产品包解析失败", {
      type: "warning"
    });
  } finally {
    if (reader) await reader.close();
    input.value = "";
    isArchiveImporting.value = false;
    if (
      archiveImportProgress.status === "UPLOADING" ||
      archiveImportProgress.status === "MERGING" ||
      archiveImportProgress.status === "PARSING" ||
      archiveImportProgress.status === "MATCHING"
    ) {
      archiveImportProgress.status = "FAILED";
    }
  }
}

function stageLabel(stageCode: string) {
  if (stageCode === "VALIDATE_SOURCE" && isHy2d.value) {
    return "校验 HY-2D 产品包";
  }
  return STAGE_LABELS[stageCode] || stageCode;
}

function canRetryStage(status: string) {
  return status === "FAILED" || status === "RECOVERY_PENDING";
}

function handleTemplateChange(event: Event) {
  const select = event.target as HTMLSelectElement;
  const template = PRODUCT_TEMPLATES.find(item => item.id === select.value);
  if (!template) return;
  try {
    setTemplate(template);
    resetMultisourceProductForms(productForms);
    archiveMatchedSlots.value.clear();
    resetArchiveProgress();
    hy1cRoiSuggestion.value = null;
    selectedTargets.value = [];
    isPackageExpanded.value = false;
    isParameterDrawerOpen.value = false;
    isTaskProgressOpen.value = false;
  } catch (error) {
    select.value = activeTemplate.value.id;
    message(error instanceof Error ? error.message : "无法切换产品模板", {
      type: "warning"
    });
  }
}

async function handleFileChange(slotId: SlotId, event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  try {
    archiveMatchedSlots.value.delete(slotId);
    await uploadSlot(slotId, file);
    if (isGf6WfvL1a.value && slotId === "metadataXml") {
      gf6RoiBounds.value = gf6FootprintRoiFromXml(await file.text());
    }
    if (
      isHy1c.value &&
      slotId === "metadata" &&
      slots.metadata.status === "UPLOADED"
    ) {
      applyHy1cMetadataRoi(await file.text());
    }
  } catch (error) {
    message(error instanceof Error ? error.message : "文件上传失败", {
      type: "error"
    });
  } finally {
    input.value = "";
  }
}

function applyHy1cMetadataRoi(xmlText: string) {
  const { roi, suggestion } = hy1cRoiStateAfterMetadataChange(xmlText);
  l2aForm.roi.enabled = false;
  l2aForm.roi.minLon = roi.minLon;
  l2aForm.roi.minLat = roi.minLat;
  l2aForm.roi.maxLon = roi.maxLon;
  l2aForm.roi.maxLat = roi.maxLat;
  hy1cRoiSuggestion.value = suggestion;
}

function removeProductSlot(slotId: SlotId) {
  try {
    const shouldResetArchiveImport =
      archiveImportProgress.status === "COMPLETED";
    archiveMatchedSlots.value.delete(slotId);
    removeSlot(slotId);
    if (shouldResetArchiveImport) {
      archiveMatchedSlots.value.clear();
      resetArchiveProgress();
    }
    if (isHy1c.value && slotId === "metadata") {
      applyHy1cMetadataRoi("");
    }
    if (isGf6WfvL1a.value && slotId === "metadataXml") {
      gf6RoiBounds.value = null;
    }
  } catch (error) {
    message(error instanceof Error ? error.message : "无法移除文件", {
      type: "warning"
    });
  }
}

async function startTask() {
  isBusy.value = true;
  try {
    const snapshot = isHy1c.value
      ? buildHy1cCziL2aSnapshot(l2aForm)
      : isFy3h.value
        ? buildFy3hMersiSnapshot(fy3hForm)
        : isHy2d.value
          ? buildHy2dAltimeterSnapshot(hy2dForm)
          : isFy4b.value
            ? buildFy4bAgriSnapshot(fy4bForm)
            : isGf6WfvL1a.value
              ? buildGf6WfvL1aSnapshot(gf6Form)
              : activeTemplate.value.parameterSnapshot;
    await startProcessing(snapshot);
    message(processingStartSuccessMessage(), {
      type: "success"
    });
  } catch (error) {
    message(translateError(error, "开始处理失败，请重试"), { type: "error" });
  } finally {
    isBusy.value = false;
  }
}

async function cancelTask() {
  try {
    await cancel();
    message("已发送取消请求", { type: "success" });
  } catch (error) {
    message(error instanceof Error ? error.message : "取消任务失败", {
      type: "error"
    });
  }
}

async function retryTask(stageId: string | number) {
  isBusy.value = true;
  try {
    await retry(stageId);
    message("任务已重新启动", { type: "success" });
  } catch (error) {
    message(error instanceof Error ? error.message : "任务重试失败", {
      type: "error"
    });
  } finally {
    isBusy.value = false;
  }
}

async function downloadTask() {
  try {
    const started = await downloadResult();
    if (started) message("结果 ZIP 已加入浏览器下载列表", { type: "success" });
  } catch (error) {
    message(error instanceof Error ? error.message : "结果下载失败", {
      type: "error"
    });
  }
}

function resetTask() {
  try {
    reset();
    isTaskProgressOpen.value = false;
  } catch (error) {
    message(error instanceof Error ? error.message : "无法重置任务", {
      type: "warning"
    });
  }
}
</script>

<style lang="less" scoped>
.mission-panel {
  --abyss: #0e2540;
  --survey: #1b4671;
  --cyan: #36c9e3;
  --mint: #78d8b4;
  --violet: #927de8;
  --cloud: #f3faff;

  box-sizing: border-box;
  height: 100%;
  padding: 10px 13px 28px;
  overflow-y: auto;
  color: var(--abyss);
  font-family: "Microsoft YaHei UI", "PingFang SC", sans-serif;
  scrollbar-color: #9bc8dc transparent;
  scrollbar-width: thin;
}

.mission-panel__masthead {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  justify-content: space-between;
  padding: 14px 15px;
  color: #fff;
  background: var(--abyss);
  border-left: 3px solid var(--cyan);
}

.mission-panel__eyebrow {
  display: block;
  margin-bottom: 4px;
  color: var(--cyan);
  font:
    700 10px/1.2 ui-monospace,
    "Cascadia Code",
    monospace;
  letter-spacing: 0.12em;
}

.mission-panel__masthead h3 {
  margin: 0;
  font-family: "Aptos Display", "Microsoft YaHei", sans-serif;
  font-size: 19px;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.mission-panel__profile {
  color: #b9d9e8;
  font:
    10px/1.45 ui-monospace,
    "Cascadia Code",
    monospace;
  text-align: right;
}

.mission-panel__selector {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr);
  gap: 6px 9px;
  align-items: center;
  padding: 12px 3px 4px;
}

.mission-panel__selector label,
.control-group legend {
  font-size: 12px;
  font-weight: 700;
  color: var(--survey);
}

.mission-panel__selector select,
.control-field input,
.control-field select,
.roi-grid input,
.rgb-grid select {
  box-sizing: border-box;
  width: 100%;
  min-height: 32px;
  padding: 5px 8px;
  color: var(--abyss);
  background: #fff;
  border: 1px solid #b8d5e4;
  border-radius: 2px;
  outline: none;
}

.mission-panel__lock-note {
  grid-column: 2;
  color: #a05d40;
}

.mission-section {
  margin-top: 13px;
  padding-top: 11px;
  border-top: 1px solid #c8dfea;
}

.mission-section__heading,
.mission-section__heading > div,
.artifact-shelf__title {
  display: flex;
  gap: 7px;
  align-items: center;
  justify-content: space-between;
}

.mission-section__heading > div {
  justify-content: flex-start;
}

.package-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: auto;
}

.mission-section__heading strong {
  font:
    600 14px/1.3 "Aptos Display",
    "Microsoft YaHei",
    sans-serif;
}

.mission-section__heading > span,
.artifact-shelf__title span {
  color: #5b809c;
  font:
    10px/1.2 ui-monospace,
    "Cascadia Code",
    monospace;
}

.package-toggle {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2px 0;
  color: #2e7da3;
  background: transparent;
  border: 0;
  cursor: pointer;
}

.package-toggle span {
  font:
    10px/1.2 ui-monospace,
    "Cascadia Code",
    monospace;
}

.package-toggle .el-icon {
  transition: transform 150ms ease;
}

.package-toggle .el-icon.is-expanded {
  transform: rotate(180deg);
}

.package-toggle:focus-visible {
  outline: 2px solid #2e7da3;
  outline-offset: 2px;
}

.package-requirements-tooltip {
  display: inline-flex;
  align-items: center;
}

.package-requirements-tooltip__trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  padding: 0;
  color: #6c8490;
  cursor: help;
  background: transparent;
  border: 0;
  border-radius: 3px;
}

.package-requirements-tooltip__trigger .el-icon {
  font-size: 14px;
}

.package-requirements-tooltip__trigger:hover {
  color: #206e8c;
  background: #e6f2f6;
}

.package-requirements-tooltip__trigger:focus-visible {
  outline: 2px solid var(--plain-primary, #2e7da3);
  outline-offset: 2px;
}

.mission-section__signal {
  width: 14px;
  height: 3px;
  background: var(--cyan);
}

.mission-section__signal.is-violet {
  background: var(--violet);
}

.mission-section__signal.is-valid {
  background: var(--mint);
}

.mission-section__note {
  margin: 6px 0 10px;
  color: #5d7890;
  font-size: 11px;
  line-height: 1.55;
}

.file-stack,
.stage-timeline,
.artifact-shelf {
  display: grid;
  gap: 7px;
}

.file-slot {
  position: relative;
  padding: 9px;
  background: var(--cloud);
  border: 1px solid #cde3ed;
  border-left: 2px solid #a9c9d8;
}

.file-slot.is-uploaded {
  border-left-color: var(--mint);
}

.file-slot.is-failed {
  border-left-color: #d36c6c;
}

.file-slot__meta {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  justify-content: space-between;
  padding-right: 20px;
}

.file-slot__meta strong,
.file-slot__meta small,
.candidate-strip small,
.artifact-row small {
  display: block;
}

.file-slot__meta strong {
  font-size: 12px;
}

.file-slot__meta small,
.artifact-row small {
  margin-top: 2px;
  color: #67869c;
  font:
    9px/1.35 ui-monospace,
    "Cascadia Code",
    monospace;
}

.file-slot__meta > span {
  color: var(--survey);
  font-size: 10px;
}

.file-slot__picker {
  display: flex;
  gap: 6px;
  align-items: center;
  min-width: 0;
  margin-top: 7px;
  padding: 6px 7px;
  color: var(--survey);
  cursor: pointer;
  background: #fff;
  border: 1px dashed #76bfd2;
}

.file-slot__picker span {
  overflow: hidden;
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-slot__picker.is-disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.file-slot__remove {
  position: absolute;
  top: 7px;
  right: 6px;
  padding: 2px;
  color: #718da2;
  cursor: pointer;
  background: transparent;
  border: 0;
}

.inline-error,
.diagnostic-strip span {
  display: block;
  color: #a94848;
  font-size: 10px;
  line-height: 1.45;
}

.diagnostic-strip {
  margin-top: 7px;
  padding: 7px 9px;
  background: #fff4f1;
  border-left: 2px solid #d36c6c;
}

.l2a-console {
  padding: 11px 10px 10px;
  background: #edf7fb;
  border: 1px solid #c5deea;
}

.control-group {
  min-width: 0;
  margin: 10px 0 0;
  padding: 9px 0 0;
  border: 0;
  border-top: 1px solid #d0e3eb;
}

.control-group legend {
  padding: 0 5px 0 0;
}

.spectral-fieldset {
  border-top-color: transparent;
}

.spectral-rail {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 4px;
  margin-top: 7px;
}

.spectral-channel {
  position: relative;
  display: grid;
  gap: 2px;
  min-width: 0;
  padding: 5px;
  overflow: hidden;
  color: #647d91;
  cursor: pointer;
  background: #fff;
  border: 1px solid #c8dce5;
}

.spectral-channel input {
  position: absolute;
  opacity: 0;
}

.spectral-channel__bar {
  height: 4px;
  margin-bottom: 2px;
  background: #aab7c2;
  opacity: 0.35;
}

.spectral-channel strong,
.spectral-channel small {
  font-family: ui-monospace, "Cascadia Code", monospace;
}

.spectral-channel strong {
  font-size: 10px;
}

.spectral-channel small {
  font-size: 8px;
}

.spectral-channel.is-selected {
  color: var(--abyss);
  border-color: currentcolor;
}

.spectral-channel.is-selected .spectral-channel__bar {
  opacity: 1;
}

.band-b460 .spectral-channel__bar {
  background: #4e86e8;
}

.band-b560 .spectral-channel__bar {
  background: var(--mint);
}

.band-b650 .spectral-channel__bar {
  background: #e66f78;
}

.band-b825 .spectral-channel__bar {
  background: var(--violet);
}

.control-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 7px;
  margin-top: 7px;
}

.control-field,
.roi-grid label,
.rgb-grid label {
  display: grid;
  gap: 4px;
  color: #526f84;
  font-size: 10px;
}

.control-field.is-wide {
  grid-column: 1 / -1;
}

.control-field input:read-only {
  color: #63788a;
  background: #e7f0f4;
}

.toggle-heading {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
}

.toggle-control {
  display: inline-flex;
  gap: 5px;
  align-items: center;
  cursor: pointer;
}

.toggle-control input {
  position: absolute;
  opacity: 0;
}

.toggle-control > span {
  position: relative;
  width: 25px;
  height: 13px;
  background: #abc1cc;
  border-radius: 8px;
}

.toggle-control > span::after {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 9px;
  height: 9px;
  content: "";
  background: #fff;
  border-radius: 50%;
  transition: transform 140ms ease;
}

.toggle-control input:checked + span {
  background: var(--survey);
}

.toggle-control input:checked + span::after {
  transform: translateX(12px);
}

.toggle-control small {
  width: 24px;
  color: #647f92;
  font-size: 9px;
}

.roi-grid,
.rgb-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 7px;
  margin-top: 7px;
}

.rgb-grid {
  grid-template-columns: repeat(3, 1fr);
}

.chip-list {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 7px;
}

.chip-list input {
  position: absolute;
  opacity: 0;
}

.chip-list span {
  display: block;
  padding: 4px 6px;
  color: #5c7689;
  font-size: 9px;
  cursor: pointer;
  background: #fff;
  border: 1px solid #bfd5de;
}

.chip-list input:checked + span {
  color: var(--abyss);
  background: #e2dffc;
  border-color: var(--violet);
}

.chip-list input:disabled + span {
  cursor: not-allowed;
  opacity: 0.5;
}

.mission-launch {
  display: flex;
  gap: 10px;
  align-items: center;
  justify-content: space-between;
}

.mission-launch strong,
.mission-launch small {
  display: block;
}

.mission-launch strong {
  color: var(--survey);
  font-size: 12px;
}

.mission-launch small {
  max-width: 180px;
  margin-top: 3px;
  color: #698294;
  font-size: 9px;
  line-height: 1.4;
}

.candidate-strip code,
.candidate-strip > small {
  margin-top: 7px;
  color: var(--survey);
  font:
    10px/1.4 ui-monospace,
    "Cascadia Code",
    monospace;
  overflow-wrap: anywhere;
}

.stage-timeline {
  margin-top: 10px;
}

.stage-row {
  position: relative;
  display: grid;
  grid-template-columns: 8px minmax(0, 1fr) auto;
  gap: 7px;
  align-items: start;
}

.stage-row:not(:last-child)::before {
  position: absolute;
  top: 9px;
  bottom: -9px;
  left: 3px;
  width: 1px;
  content: "";
  background: #bfd4df;
}

.stage-row__marker {
  z-index: 1;
  width: 7px;
  height: 7px;
  margin-top: 4px;
  background: #adc1cc;
  border: 1px solid #fff;
  border-radius: 50%;
  box-shadow: 0 0 0 1px #adc1cc;
}

.stage-row.is-running .stage-row__marker,
.stage-row.is-created .stage-row__marker {
  background: var(--cyan);
  box-shadow: 0 0 0 1px var(--cyan);
}

.stage-row.is-succeeded .stage-row__marker {
  background: var(--mint);
  box-shadow: 0 0 0 1px #43ae89;
}

.stage-row.is-failed .stage-row__marker,
.stage-row.is-recovery_pending .stage-row__marker {
  background: #d36c6c;
  box-shadow: 0 0 0 1px #d36c6c;
}

.stage-row__body {
  min-width: 0;
  padding-bottom: 8px;
}

.stage-row__body strong,
.stage-row__body small {
  display: block;
}

.stage-row__body strong {
  font-size: 11px;
}

.stage-row__body small,
.stage-row__status {
  color: #698398;
  font:
    9px/1.4 ui-monospace,
    "Cascadia Code",
    monospace;
}

.stage-row__status {
  display: block;
  margin-top: 2px;
}

.server-error {
  margin-top: 5px;
  padding: 5px 7px;
  color: #8f3d3d;
  background: #fff1ee;
  border-left: 2px solid #d36c6c;
}

.server-error code,
.server-error p {
  margin: 0;
  font:
    9px/1.45 ui-monospace,
    "Cascadia Code",
    monospace;
  overflow-wrap: anywhere;
}

.artifact-shelf {
  margin-top: 10px;
  padding: 9px;
  background: var(--cloud);
  border: 1px solid #cbdfe8;
}

.artifact-shelf__toggle {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  padding: 0;
  color: var(--survey);
  text-align: left;
  cursor: pointer;
  background: transparent;
  border: 0;
}

.artifact-shelf__toggle .el-icon {
  transition: transform 150ms ease;
}

.artifact-shelf__toggle .el-icon.is-expanded {
  transform: rotate(180deg);
}

.artifact-shelf__items {
  display: grid;
  gap: 7px;
  margin-top: 8px;
}

.artifact-row__info {
  min-width: 0;
}

.artifact-row__info code {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.artifact-preview-dialog__body {
  display: flex;
  max-height: 70vh;
  justify-content: center;
  overflow: auto;
  background: #f3f8fa;
}

.artifact-preview-dialog__body img {
  display: block;
  max-width: 100%;
  height: auto;
  object-fit: contain;
}

.artifact-shelf__title strong {
  font-size: 11px;
}

.artifact-row {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
  padding-top: 6px;
  border-top: 1px solid #d7e6ed;
}

.artifact-row code {
  color: var(--survey);
  font:
    9px/1.3 ui-monospace,
    "Cascadia Code",
    monospace;
  overflow-wrap: anywhere;
}

.task-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  justify-content: flex-end;
  margin-top: 12px;
}

.final-zip-button {
  min-width: 142px;
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

:is(button, select, input, label):focus-visible,
.visually-hidden:focus-visible + .file-slot__picker,
.spectral-channel:has(input:focus-visible),
.toggle-control:has(input:focus-visible),
.chip-list label:has(input:focus-visible) span {
  outline: 2px solid var(--cyan);
  outline-offset: 2px;
}

input:disabled,
select:disabled,
button:disabled {
  cursor: not-allowed;
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    scroll-behavior: auto !important;
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
  }
}
</style>

<style lang="less" scoped>
/* Multi-source satellite workspace — feature-scoped, so the legacy map panels stay untouched. */
.satellite-workspace {
  --orbit-ink: #071827;
  --orbit-ocean: #0d3d5d;
  --orbit-blue: #168cb7;
  --orbit-cyan: #72d7ff;
  --orbit-mist: #eaf5fa;
  --orbit-mint: #6dd4ad;
  --orbit-alert: #e27d7d;
  --orbit-line: #c7e2ed;

  min-height: 100%;
  padding: 14px 14px 34px;
  color: var(--orbit-ink);
  background: radial-gradient(
      circle at 88% 0%,
      rgb(114 215 255 / 16%),
      transparent 28%
    ),
    linear-gradient(180deg, #f8fcfe 0%, #edf7fb 100%);
  font-family: "PingFang SC", "Microsoft YaHei UI", sans-serif;
}

.satellite-workspace::-webkit-scrollbar {
  width: 5px;
}

.satellite-workspace::-webkit-scrollbar-thumb {
  background: #8ec8dd;
  border-radius: 99px;
}

.satellite-workspace .mission-panel__masthead {
  position: relative;
  min-height: 122px;
  padding: 18px 16px 16px;
  overflow: hidden;
  color: #f7fcff;
  background: radial-gradient(
      circle at 84% 25%,
      rgb(114 215 255 / 22%),
      transparent 22%
    ),
    linear-gradient(145deg, #0c2945 0%, #071827 100%);
  border: 1px solid rgb(114 215 255 / 32%);
  border-radius: 12px 12px 4px 4px;
  box-shadow: 0 16px 32px rgb(7 24 39 / 18%);
}

.satellite-workspace .mission-panel__masthead::before {
  position: absolute;
  inset: 0;
  content: "";
  pointer-events: none;
  background-image: linear-gradient(rgb(114 215 255 / 6%) 1px, transparent 1px),
    linear-gradient(90deg, rgb(114 215 255 / 6%) 1px, transparent 1px);
  background-size: 16px 16px;
  mask-image: linear-gradient(90deg, #000, transparent 84%);
}

.mission-panel__heading,
.mission-panel__profile {
  position: relative;
  z-index: 1;
}

.mission-panel__heading {
  max-width: calc(100% - 72px);
}

.satellite-workspace .mission-panel__eyebrow {
  margin-bottom: 7px;
  color: var(--orbit-cyan);
  font:
    700 9px/1.2 ui-monospace,
    "Cascadia Code",
    monospace;
  letter-spacing: 0.14em;
}

.satellite-workspace .mission-panel__masthead h3 {
  color: #fff;
  font-family: "YouSheBiaoTiHei", "PingFang SC", sans-serif;
  font-size: clamp(22px, 1.25vw, 25px);
  font-weight: 400;
  letter-spacing: 0.08em;
  text-shadow: 0 0 18px rgb(114 215 255 / 24%);
}

.mission-panel__heading p {
  max-width: 250px;
  margin-top: 7px;
  color: #b7d6e5;
  font-size: 10px;
  line-height: 1.6;
}

.satellite-workspace .mission-panel__profile {
  display: grid;
  gap: 3px;
  min-width: 72px;
  padding: 8px 9px;
  color: #d9f5ff;
  text-align: right;
  background: rgb(255 255 255 / 7%);
  border: 1px solid rgb(114 215 255 / 20%);
  border-radius: 7px;
  backdrop-filter: blur(8px);
}

.mission-panel__profile > span {
  color: #7fcbe8;
  font:
    700 8px/1 ui-monospace,
    "Cascadia Code",
    monospace;
  letter-spacing: 0.1em;
}

.mission-panel__profile strong,
.mission-panel__profile small {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mission-panel__profile strong {
  color: #fff;
  font:
    700 10px/1.2 ui-monospace,
    "Cascadia Code",
    monospace;
}

.mission-panel__profile small {
  color: #a9cbda;
  font:
    9px/1.2 ui-monospace,
    "Cascadia Code",
    monospace;
}

.mission-panel__orbit {
  position: absolute;
  right: -11px;
  bottom: -36px;
  width: 130px;
  height: 130px;
  pointer-events: none;
  opacity: 0.86;
}

.mission-panel__orbit-core,
.mission-panel__orbit-track {
  position: absolute;
  border: 1px solid rgb(114 215 255 / 40%);
  border-radius: 50%;
}

.mission-panel__orbit-core {
  top: 47px;
  left: 47px;
  width: 18px;
  height: 18px;
  background: var(--orbit-cyan);
  border-color: #d6f8ff;
  box-shadow:
    0 0 0 6px rgb(114 215 255 / 12%),
    0 0 20px var(--orbit-cyan);
}

.mission-panel__orbit-track.is-one {
  inset: 23px 9px 29px 11px;
  transform: rotate(-34deg);
}

.mission-panel__orbit-track.is-two {
  inset: 8px 22px 11px 19px;
  border-color: rgb(109 212 173 / 38%);
  transform: rotate(37deg);
}

.satellite-workspace .mission-panel__selector {
  display: grid;
  grid-template-columns: 1fr;
  gap: 6px;
  padding: 14px 2px 2px;
}

.satellite-workspace .mission-panel__selector label {
  color: #456a82;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
}

.satellite-workspace .mission-panel__selector select {
  min-height: 38px;
  padding: 0 30px 0 11px;
  color: var(--orbit-ink);
  font-weight: 700;
  background: #fff;
  border: 1px solid var(--orbit-line);
  border-radius: 7px;
  box-shadow: 0 5px 14px rgb(13 61 93 / 7%);
  transition:
    border-color 160ms ease,
    box-shadow 160ms ease;
}

.satellite-workspace .mission-panel__selector select:hover,
.satellite-workspace .mission-panel__selector select:focus {
  border-color: var(--orbit-blue);
  box-shadow: 0 0 0 3px rgb(22 140 183 / 11%);
}

.satellite-workspace .mission-panel__lock-note {
  grid-column: auto;
  padding: 6px 8px;
  color: #97553d;
  font-size: 10px;
  background: #fff4eb;
  border-left: 2px solid #e89b61;
}

.satellite-workspace .mission-section {
  margin-top: 12px;
  padding: 14px;
  background: rgb(255 255 255 / 84%);
  border: 1px solid #d3e6ee;
  border-radius: 10px;
  box-shadow: 0 9px 22px rgb(13 61 93 / 6%);
}

.satellite-workspace .archive-import-panel {
  display: grid;
  gap: 8px 12px;
  align-items: center;
  margin: 14px 0 11px;
  padding: 11px 12px;
  background: #edf7fd;
  border: 1px dashed #78b8d2;
  border-radius: 6px;
  transition:
    background-color 150ms ease,
    border-color 150ms ease;
}

.satellite-workspace .archive-import-panel.is-actionable {
  cursor: pointer;
}

.satellite-workspace .archive-import-panel.is-actionable:hover {
  background: #e3f3fc;
  border-color: #3f94bb;
}

.satellite-workspace .archive-import-panel.is-actionable:focus-visible {
  outline: 2px solid #2e7da3;
  outline-offset: 2px;
}

.satellite-workspace .archive-import-panel.is-importing {
  cursor: wait;
  background: #f1f8fb;
  border-color: #9fc7d7;
}

.satellite-workspace .archive-import-panel.is-completed {
  cursor: default;
  background: #f3f8fa;
  border-color: #b8d2de;
}

.satellite-workspace .archive-import-panel__copy {
  display: flex;
  min-width: 0;
  gap: 9px;
  align-items: center;
}

.satellite-workspace .archive-import-panel__copy-text {
  display: flex;
  min-width: 0;
  gap: 7px;
  align-items: baseline;
}

.satellite-workspace .archive-import-panel__mark {
  display: inline-flex;
  flex: 0 0 auto;
  width: 28px;
  height: 28px;
  align-items: center;
  justify-content: center;
  color: #1f536d;
  background: #d9edf4;
  border: 1px solid #b8d8e4;
  border-radius: 4px;
}

.satellite-workspace .archive-import-panel__mark .el-icon {
  font-size: 15px;
}

.satellite-workspace .archive-import-panel__copy strong {
  flex: 0 0 auto;
  color: var(--plain-ink);
  font-size: 13px;
  font-weight: 600;
}

.satellite-workspace .archive-import-panel__copy small {
  min-width: 0;
  overflow: hidden;
  color: #587687;
  font-size: 10px;
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.satellite-workspace .package-upload-note {
  min-width: 0;
  flex: 1 1 auto;
  margin-left: auto;
  overflow: hidden;
  color: #718895;
  font-size: 10px;
  line-height: 1.3;
  text-align: right;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.satellite-workspace .archive-import-panel__status small {
  color: var(--plain-muted);
  font-size: 11px;
}

.satellite-workspace .archive-import-panel__status {
  grid-column: 1 / -1;
  display: grid;
  gap: 6px;
}

.satellite-workspace .archive-import-panel__status-line {
  display: flex;
  min-width: 0;
  gap: 10px;
  align-items: center;
  justify-content: space-between;
  color: var(--plain-primary);
  font-size: 11px;
  font-weight: 600;
}

.satellite-workspace .archive-import-panel__progress {
  height: 4px;
  overflow: hidden;
  background: #dcebf0;
  border-radius: 99px;
}

.satellite-workspace .archive-import-panel__progress span {
  display: block;
  height: 100%;
  background: linear-gradient(90deg, #2e7da3, #62b9c9);
  border-radius: inherit;
  transition: width 220ms ease;
}

.satellite-workspace .archive-import-panel__cancel {
  display: inline-flex;
  width: 24px;
  height: 24px;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  padding: 0;
  color: #9f4545;
  background: #fff;
  border: 1px solid #e4aaaa;
  border-radius: 3px;
  cursor: pointer;
  transition:
    color 150ms ease,
    background-color 150ms ease,
    border-color 150ms ease;
}

.satellite-workspace .archive-import-panel__cancel:hover {
  color: #903939;
  background: #fff4f4;
  border-color: #d98f8f;
}

.satellite-workspace .archive-import-panel__cancel .el-icon {
  font-size: 13px;
}

.satellite-workspace .archive-import-panel__current-file {
  display: flex;
  min-width: 0;
  gap: 3px;
  align-items: center;
  line-height: 1.35;
}

.satellite-workspace .archive-import-panel__current-file > span:first-child {
  flex: 0 0 auto;
}

.satellite-workspace .archive-import-panel__current-file > span:last-child {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.satellite-workspace .mission-section__heading,
.satellite-workspace .mission-section__heading > div,
.satellite-workspace .artifact-shelf__title {
  gap: 8px;
}

.satellite-workspace .mission-section__heading strong {
  color: #143751;
  font-family: "YouSheBiaoTiHei", "PingFang SC", sans-serif;
  font-size: 17px;
  font-weight: 400;
  letter-spacing: 0.05em;
}

.satellite-workspace .mission-section__heading > span,
.satellite-workspace .artifact-shelf__title span {
  padding: 3px 6px;
  color: #4a728a;
  font:
    700 9px/1 ui-monospace,
    "Cascadia Code",
    monospace;
  background: #e8f4f8;
  border-radius: 99px;
}

.satellite-workspace .mission-section__signal {
  width: 18px;
  height: 3px;
  background: linear-gradient(90deg, var(--orbit-blue), var(--orbit-cyan));
  box-shadow: 0 0 7px rgb(114 215 255 / 72%);
}

.satellite-workspace .mission-section__signal.is-violet {
  background: linear-gradient(90deg, #8f76e3, #c0aaff);
  box-shadow: 0 0 7px rgb(192 170 255 / 58%);
}

.satellite-workspace .mission-section__signal.is-valid {
  background: linear-gradient(90deg, #43ad86, var(--orbit-mint));
  box-shadow: 0 0 7px rgb(109 212 173 / 54%);
}

.satellite-workspace .mission-section__note {
  margin: 7px 0 11px;
  color: #607d90;
  font-size: 10px;
  line-height: 1.65;
}

.satellite-workspace .file-stack {
  gap: 8px;
}

.satellite-workspace .file-stack.is-archive-importing {
  opacity: 0.56;
}

.satellite-workspace .file-stack.is-archive-importing .file-slot {
  cursor: wait;
}

.satellite-workspace .file-stack.is-archive-importing .file-slot:hover {
  border-color: #d0e5ed;
  box-shadow: none;
  transform: none;
}

.satellite-workspace .file-slot {
  padding: 10px;
  overflow: hidden;
  background: linear-gradient(135deg, #fff 0%, #f5fbfd 100%);
  border: 1px solid #d0e5ed;
  border-left: 3px solid #93c5d7;
  border-radius: 7px;
  box-shadow: 0 4px 11px rgb(13 61 93 / 4%);
  transition:
    border-color 160ms ease,
    box-shadow 160ms ease,
    transform 160ms ease;
}

.satellite-workspace .file-slot:hover {
  border-color: #8fc9dc;
  box-shadow: 0 9px 18px rgb(13 61 93 / 9%);
  transform: translateY(-1px);
}

.satellite-workspace .file-slot.is-uploaded {
  border-left-color: var(--orbit-mint);
}

.satellite-workspace .file-slot.is-uploading {
  border-left-color: var(--orbit-cyan);
}

.satellite-workspace .file-slot.is-failed {
  border-left-color: var(--orbit-alert);
}

.satellite-workspace .file-slot__meta {
  padding-right: 0;
}

.satellite-workspace .file-slot__meta strong {
  color: #183a52;
  font-size: 11px;
}

.satellite-workspace .file-slot__meta small,
.satellite-workspace .artifact-row small {
  color: #71899a;
  font-size: 9px;
}

.satellite-workspace .file-slot__meta > span {
  padding: 3px 5px;
  color: #386e86;
  font-size: 9px;
  background: #e4f2f7;
  border-radius: 4px;
}

.satellite-workspace .file-slot.is-uploaded .file-slot__meta > span {
  color: #1b745c;
  background: #e0f7ee;
}

.satellite-workspace .file-slot__picker {
  min-height: 34px;
  margin-top: 8px;
  padding: 7px 8px;
  color: #2b6a86;
  background: rgb(255 255 255 / 86%);
  border: 1px dashed #8fc5d6;
  border-radius: 5px;
  transition:
    color 150ms ease,
    background 150ms ease,
    border-color 150ms ease;
}

.satellite-workspace .file-slot__picker:hover:not(.is-disabled) {
  color: #0d6086;
  background: #f0fbff;
  border-color: var(--orbit-blue);
}

.satellite-workspace .file-slot__remove {
  top: 8px;
  right: 7px;
  color: #658699;
  border-radius: 4px;
}

.satellite-workspace .file-slot__remove:hover:not(:disabled) {
  color: #b34242;
  background: #fff0f0;
}

.satellite-workspace .diagnostic-strip {
  margin-top: 9px;
  padding: 8px 9px;
  background: #fff6f2;
  border: 1px solid #ffd9cd;
  border-left: 3px solid var(--orbit-alert);
  border-radius: 5px;
}

.satellite-workspace .diagnostic-strip span,
.satellite-workspace .inline-error {
  color: #a44747;
  font-size: 10px;
}

.satellite-workspace .configuration-brief {
  position: relative;
  padding: 15px;
  overflow: hidden;
  color: #eaf8ff;
  background: radial-gradient(
      circle at 94% 8%,
      rgb(114 215 255 / 22%),
      transparent 28%
    ),
    linear-gradient(142deg, #0e3451 0%, #09253f 100%);
  border-color: rgb(114 215 255 / 35%);
  box-shadow: 0 14px 28px rgb(7 24 39 / 16%);
}

.satellite-workspace .configuration-brief::after {
  position: absolute;
  right: -44px;
  bottom: -82px;
  width: 182px;
  height: 182px;
  content: "";
  border: 1px solid rgb(114 215 255 / 17%);
  border-radius: 50%;
  box-shadow:
    0 0 0 22px rgb(114 215 255 / 3%),
    0 0 0 43px rgb(114 215 255 / 2%);
}

.configuration-brief__heading,
.configuration-brief__heading > div {
  position: relative;
  z-index: 1;
  display: flex;
  gap: 8px;
  align-items: flex-start;
  justify-content: space-between;
}

.configuration-brief__heading > div {
  justify-content: flex-start;
}

.configuration-brief__heading strong {
  display: block;
  color: #fff;
  font-family: "YouSheBiaoTiHei", "PingFang SC", sans-serif;
  font-size: 17px;
  font-weight: 400;
  letter-spacing: 0.05em;
}

.configuration-brief__heading small {
  display: block;
  margin-top: 3px;
  color: #a7cadb;
  font-size: 9px;
}

:deep(.configuration-brief__open) {
  position: relative;
  z-index: 1;
  height: 28px;
  padding: 0 7px;
  color: #c8f5ff !important;
  font-size: 10px;
  background: rgb(114 215 255 / 10%) !important;
  border: 1px solid rgb(114 215 255 / 26%) !important;
  border-radius: 5px;
}

:deep(.configuration-brief__open:hover) {
  color: #fff !important;
  background: rgb(114 215 255 / 19%) !important;
}

.spectral-signature {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 5px;
  margin-top: 14px;
}

.spectral-signature__band {
  display: grid;
  gap: 4px;
  min-width: 0;
  opacity: 0.28;
  transition: opacity 160ms ease;
}

.spectral-signature__band.is-selected {
  opacity: 1;
}

.spectral-signature__band i {
  display: block;
  height: 5px;
  border-radius: 99px;
  box-shadow: 0 0 10px currentcolor;
}

.spectral-signature__band strong {
  color: #e8faff;
  font:
    700 8px/1 ui-monospace,
    "Cascadia Code",
    monospace;
  text-align: center;
}

.spectral-signature__band.band-b460 i {
  color: #61a4ff;
  background: currentcolor;
}

.spectral-signature__band.band-b560 i {
  color: #6dd4ad;
  background: currentcolor;
}

.spectral-signature__band.band-b650 i {
  color: #ff7d89;
  background: currentcolor;
}

.spectral-signature__band.band-b825 i {
  color: #b29bff;
  background: currentcolor;
}

.configuration-summary {
  position: relative;
  z-index: 1;
  display: grid;
  gap: 7px;
  margin: 14px 0 0;
}

.configuration-summary > div {
  display: grid;
  grid-template-columns: 64px minmax(0, 1fr);
  gap: 8px;
  align-items: baseline;
  padding-top: 7px;
  border-top: 1px solid rgb(184 230 244 / 12%);
}

.configuration-summary dt {
  color: #92bacd;
  font-size: 9px;
}

.configuration-summary dd {
  min-width: 0;
  margin: 0;
  overflow: hidden;
  color: #f0fbff;
  font:
    700 9px/1.45 ui-monospace,
    "Cascadia Code",
    monospace;
  text-align: right;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.configuration-algorithms {
  position: relative;
  z-index: 1;
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 11px;
}

.satellite-workspace .derived-output-checklist {
  margin-top: 11px;
  padding: 10px 12px;
  background: #f5fafc;
  border: 1px solid #cfe1e8;
  border-radius: 4px;
}

.satellite-workspace .derived-output-checklist__heading {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 7px;
  color: var(--plain-ink);
  font-size: 12px;
  font-weight: 700;
}

.satellite-workspace .derived-output-checklist__heading small {
  color: var(--plain-muted);
  font-size: 10px;
  font-weight: 400;
}

.satellite-workspace .derived-output-checklist__items {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.satellite-workspace .derived-output-checklist__items label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--plain-ink);
  font-size: 12px;
}

.satellite-workspace .derived-output-checklist__items input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}

.satellite-workspace .derived-output-checklist__indicator {
  display: inline-grid;
  flex: 0 0 auto;
  width: 16px;
  height: 16px;
  place-items: center;
  border: 2px solid #587b8d;
  border-radius: 3px;
  background: #fff;
}

.satellite-workspace
  .derived-output-checklist__items
  input:checked
  + .derived-output-checklist__indicator {
  border-color: #087ea4;
  background: #087ea4;
  box-shadow: 0 0 0 2px rgb(8 126 164 / 16%);
}

.satellite-workspace
  .derived-output-checklist__items
  input:checked
  + .derived-output-checklist__indicator::after {
  width: 7px;
  height: 4px;
  content: "";
  border-bottom: 2px solid #fff;
  border-left: 2px solid #fff;
  transform: rotate(-45deg) translate(1px, -1px);
}

.configuration-algorithms span {
  padding: 4px 6px;
  color: #c1e7f4;
  font-size: 9px;
  background: rgb(255 255 255 / 8%);
  border: 1px solid rgb(187 235 247 / 15%);
  border-radius: 4px;
}

.satellite-workspace .mission-launch {
  position: relative;
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 15px;
  overflow: hidden;
  color: #fff;
  background: linear-gradient(135deg, #0d3d5d 0%, #0b2d48 100%);
  border-color: #2b7394;
}

.satellite-workspace .mission-launch::after {
  position: absolute;
  top: -70px;
  right: -46px;
  width: 146px;
  height: 146px;
  content: "";
  pointer-events: none;
  border: 1px solid rgb(114 215 255 / 22%);
  border-radius: 50%;
}

.satellite-workspace .mission-launch > div,
.satellite-workspace .mission-launch > button {
  position: relative;
  z-index: 1;
}

.satellite-workspace .mission-launch strong {
  color: #fff;
  font-family: "YouSheBiaoTiHei", "PingFang SC", sans-serif;
  font-size: 17px;
  font-weight: 400;
  letter-spacing: 0.05em;
}

.satellite-workspace .mission-launch small {
  max-width: 154px;
  color: #a9cfdf;
  font-size: 9px;
}

.satellite-workspace .mission-launch :deep(.el-button--primary) {
  min-height: 36px;
  padding: 0 12px;
  color: #062137;
  font-weight: 800;
  background: linear-gradient(135deg, #9de6ff, var(--orbit-cyan));
  border: 0;
  border-radius: 6px;
  box-shadow: 0 8px 18px rgb(0 0 0 / 17%);
}

.satellite-workspace .mission-launch :deep(.el-button--primary.is-disabled) {
  color: #648092;
  background: #b6cbd5;
  box-shadow: none;
}

.satellite-workspace .candidate-strip {
  background: linear-gradient(135deg, #effbf6, #f7fffb);
  border-color: #bde8d6;
}

.satellite-workspace .candidate-strip code,
.satellite-workspace .candidate-strip > small {
  color: #23755c;
  font-weight: 700;
}

.satellite-workspace .progress-console {
  background: linear-gradient(145deg, #fff 0%, #f5fbfd 100%);
}

.satellite-workspace .stage-timeline {
  gap: 2px;
  margin-top: 12px;
}

.satellite-workspace .stage-row {
  grid-template-columns: 12px minmax(0, 1fr) auto;
  gap: 8px;
  padding: 6px 7px;
  border-radius: 5px;
  transition: background 160ms ease;
}

.satellite-workspace .stage-row:hover {
  background: #eff8fb;
}

.satellite-workspace .stage-row:not(:last-child)::before {
  top: 15px;
  bottom: -5px;
  left: 5px;
  background: #c9e1e9;
}

.satellite-workspace .stage-row__marker {
  width: 8px;
  height: 8px;
  margin-top: 5px;
  background: #afc4cf;
  box-shadow: 0 0 0 2px #dcecf2;
}

.satellite-workspace .stage-row.is-running .stage-row__marker,
.satellite-workspace .stage-row.is-created .stage-row__marker {
  background: var(--orbit-cyan);
  box-shadow:
    0 0 0 2px rgb(114 215 255 / 20%),
    0 0 11px var(--orbit-cyan);
}

.satellite-workspace .stage-row.is-succeeded .stage-row__marker {
  background: var(--orbit-mint);
  box-shadow:
    0 0 0 2px rgb(109 212 173 / 18%),
    0 0 8px var(--orbit-mint);
}

.satellite-workspace .stage-row__body {
  padding-bottom: 3px;
}

.satellite-workspace .stage-row > .artifact-shelf {
  grid-column: 2;
  grid-row: 2;
  margin-top: 2px;
}

.satellite-workspace .stage-row > :deep(.el-button) {
  grid-column: 3;
  grid-row: 1;
}

.satellite-workspace .stage-row__body strong {
  color: #1c425a;
  font-size: 10px;
}

.satellite-workspace .stage-row__body small,
.satellite-workspace .stage-row__status {
  color: #6d899b;
  font-size: 8px;
}

.satellite-workspace .artifact-shelf {
  padding: 10px;
  background: #eef8fb;
  border: 1px solid #d0e8ef;
  border-radius: 7px;
}

.satellite-workspace .artifact-shelf__toggle {
  color: #1c607e;
}

.satellite-workspace .artifact-shelf__toggle:focus-visible {
  outline: 2px solid var(--orbit-cyan);
  outline-offset: 2px;
}

.satellite-workspace .artifact-row {
  padding-top: 8px;
  border-top-color: #d6e9ef;
}

.satellite-workspace .task-actions {
  gap: 6px;
  margin-top: 13px;
}

.satellite-workspace .task-actions :deep(.el-button) {
  min-height: 30px;
  border-radius: 5px;
}

/* The wide parameter workspace deliberately uses the map's darker visual language. */
:deep(.mission-parameter-drawer) {
  --drawer-ink: #071827;
  --drawer-ocean: #0d3d5d;
  --drawer-cyan: #72d7ff;
  --drawer-mint: #6dd4ad;

  color: #eaf8ff;
  background: radial-gradient(
      circle at 93% 3%,
      rgb(114 215 255 / 17%),
      transparent 24%
    ),
    linear-gradient(180deg, #0b2944, #071827);
  border-left: 1px solid rgb(114 215 255 / 31%);
  box-shadow: -24px 0 48px rgb(7 24 39 / 25%);
}

:deep(.mission-parameter-drawer .el-drawer__header) {
  padding: 19px 19px 13px;
  margin: 0;
  border-bottom: 1px solid rgb(114 215 255 / 14%);
}

:deep(.mission-parameter-drawer .el-drawer__body) {
  padding: 0 19px 18px;
  overflow-y: auto;
}

:deep(.mission-parameter-drawer .el-drawer__footer) {
  padding: 12px 19px;
  margin: 0;
  background: rgb(4 19 33 / 45%);
  border-top: 1px solid rgb(114 215 255 / 14%);
}

.parameter-drawer__header {
  display: flex;
  gap: 14px;
  align-items: flex-start;
  justify-content: space-between;
}

.parameter-drawer__header > div {
  min-width: 0;
}

.parameter-drawer__header span,
.parameter-drawer__signal span {
  display: block;
  color: var(--drawer-cyan, #72d7ff);
  font:
    700 9px/1.2 ui-monospace,
    "Cascadia Code",
    monospace;
  letter-spacing: 0.14em;
}

.parameter-drawer__header h2 {
  margin: 6px 0 0;
  color: #fff;
  font-family: "YouSheBiaoTiHei", "PingFang SC", sans-serif;
  font-size: 23px;
  font-weight: 400;
  letter-spacing: 0.06em;
}

.parameter-drawer__header p {
  margin: 7px 0 0;
  color: #a9c9d9;
  font-size: 10px;
  line-height: 1.55;
}

.parameter-drawer__close {
  display: grid;
  flex: 0 0 auto;
  width: 30px;
  height: 30px;
  place-items: center;
  color: #b7d9e8;
  cursor: pointer;
  background: rgb(114 215 255 / 7%);
  border: 1px solid rgb(114 215 255 / 19%);
  border-radius: 6px;
  transition:
    color 150ms ease,
    background 150ms ease;
}

.parameter-drawer__close:hover {
  color: #fff;
  background: rgb(114 215 255 / 17%);
}

.parameter-drawer__body {
  padding-top: 14px;
}

.parameter-drawer__signal {
  display: flex;
  gap: 16px;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  background: linear-gradient(
    135deg,
    rgb(114 215 255 / 12%),
    rgb(114 215 255 / 3%)
  );
  border: 1px solid rgb(114 215 255 / 18%);
  border-radius: 8px;
}

.parameter-drawer__signal strong {
  display: block;
  margin-top: 5px;
  color: #f2fbff;
  font:
    700 10px/1.35 ui-monospace,
    "Cascadia Code",
    monospace;
}

.parameter-drawer__signal-rail {
  display: flex;
  flex: 0 0 auto;
  gap: 4px;
  align-items: center;
}

.parameter-drawer__signal-rail i {
  width: 5px;
  height: 30px;
  opacity: 0.22;
  border-radius: 99px;
  transition: opacity 150ms ease;
}

.parameter-drawer__signal-rail i.is-selected {
  opacity: 1;
  box-shadow: 0 0 11px currentcolor;
}

.parameter-drawer__signal-rail .band-b460 {
  color: #61a4ff;
  background: currentcolor;
}

.parameter-drawer__signal-rail .band-b560 {
  color: #6dd4ad;
  background: currentcolor;
}

.parameter-drawer__signal-rail .band-b650 {
  color: #ff7d89;
  background: currentcolor;
}

.parameter-drawer__signal-rail .band-b825 {
  color: #b29bff;
  background: currentcolor;
}

.l2a-console {
  --console-ink: #deeff7;
  --console-muted: #95b7c8;
  --console-line: rgb(114 215 255 / 18%);

  margin-top: 13px;
  padding: 14px;
  color: var(--console-ink);
  background: rgb(2 17 30 / 28%);
  border: 1px solid var(--console-line);
  border-radius: 9px;
}

.l2a-console__heading,
.l2a-console__heading > div {
  display: flex;
  gap: 7px;
  align-items: center;
  justify-content: space-between;
}

.l2a-console__heading > div {
  justify-content: flex-start;
}

.l2a-console__heading strong {
  color: #fff;
  font-family: "YouSheBiaoTiHei", "PingFang SC", sans-serif;
  font-size: 17px;
  font-weight: 400;
  letter-spacing: 0.05em;
}

.l2a-console__heading > span {
  padding: 3px 6px;
  color: #c0dfea;
  font:
    700 9px/1 ui-monospace,
    "Cascadia Code",
    monospace;
  background: rgb(114 215 255 / 9%);
  border-radius: 99px;
}

.l2a-console .mission-section__signal {
  width: 15px;
  height: 3px;
}

.l2a-console .control-group {
  min-width: 0;
  margin: 13px 0 0;
  padding: 12px 0 0;
  border-top: 1px solid var(--console-line);
}

.l2a-console .spectral-fieldset {
  border-top-color: transparent;
}

.l2a-console .control-group legend {
  padding-right: 5px;
  color: #e9f8ff;
  font-size: 12px;
  font-weight: 700;
}

.l2a-console .control-group:disabled {
  opacity: 0.64;
}

.l2a-console .control-grid,
.l2a-console .roi-grid,
.l2a-console .rgb-grid {
  gap: 8px;
  margin-top: 9px;
}

.l2a-console .control-field,
.l2a-console .roi-grid label,
.l2a-console .rgb-grid label {
  gap: 5px;
  color: var(--console-muted);
  font-size: 10px;
}

.l2a-console .control-field input,
.l2a-console .control-field select,
.l2a-console .roi-grid input,
.l2a-console .rgb-grid select {
  min-height: 34px;
  color: #eaf8ff;
  background: rgb(2 23 39 / 66%);
  border-color: rgb(151 211 233 / 28%);
  border-radius: 5px;
  transition:
    border-color 150ms ease,
    box-shadow 150ms ease;
}

.l2a-console .control-field input:focus,
.l2a-console .control-field select:focus,
.l2a-console .roi-grid input:focus,
.l2a-console .rgb-grid select:focus {
  border-color: var(--drawer-cyan, #72d7ff);
  box-shadow: 0 0 0 3px rgb(114 215 255 / 11%);
}

.l2a-console .control-field input:read-only {
  color: #9db8c7;
  background: rgb(4 24 39 / 46%);
}

.l2a-console .control-field input:disabled,
.l2a-console .control-field select:disabled,
.l2a-console .roi-grid input:disabled,
.l2a-console .rgb-grid select:disabled {
  color: #8aa5b5;
  cursor: not-allowed;
  background: rgb(3 18 30 / 40%);
  border-color: rgb(151 211 233 / 12%);
}

.l2a-console .spectral-rail {
  gap: 6px;
  margin-top: 9px;
}

.l2a-console .spectral-channel {
  gap: 3px;
  padding: 7px 6px;
  color: #89a7b6;
  background: rgb(2 23 39 / 62%);
  border-color: rgb(151 211 233 / 22%);
  border-radius: 5px;
  opacity: 0.62;
  transition:
    opacity 150ms ease,
    border-color 150ms ease,
    transform 150ms ease;
}

.l2a-console .spectral-channel:hover:not(:has(input:disabled)) {
  transform: translateY(-1px);
}

.l2a-console .spectral-channel.is-selected {
  color: #eaf9ff;
  border-color: rgb(114 215 255 / 58%);
  opacity: 1;
}

.l2a-console .spectral-channel__bar {
  height: 5px;
  border-radius: 99px;
}

.l2a-console .spectral-channel strong {
  font-size: 9px;
}

.l2a-console .spectral-channel small {
  color: #91adbd;
  font-size: 8px;
}

.l2a-console .toggle-control > span {
  background: #58798a;
}

.l2a-console .toggle-control input:checked + span {
  background: var(--drawer-cyan, #72d7ff);
}

.l2a-console .toggle-control small {
  color: #a6c3d1;
}

.l2a-console .chip-list {
  gap: 6px;
  margin-top: 9px;
}

.l2a-console .chip-list span {
  padding: 5px 7px;
  color: #a4c0ce;
  background: rgb(2 23 39 / 62%);
  border-color: rgb(151 211 233 / 22%);
  border-radius: 4px;
}

.l2a-console .control-field select.crs-input {
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0;
}

.l2a-console .chip-list input:checked + span {
  color: #f2fbff;
  background: rgb(114 215 255 / 16%);
  border-color: rgb(114 215 255 / 58%);
}

.l2a-console .chip-list input:disabled + span {
  opacity: 0.52;
}

.parameter-drawer__footer {
  display: flex;
  gap: 10px;
  align-items: center;
  justify-content: space-between;
}

.parameter-drawer__footer > span {
  color: #9ec5d7;
  font-size: 10px;
}

.parameter-drawer__footer > span.is-invalid {
  color: #ffb2a5;
}

.parameter-drawer__footer :deep(.el-button--primary) {
  color: #08263d;
  font-weight: 800;
  background: linear-gradient(135deg, #9de6ff, var(--drawer-cyan, #72d7ff));
  border: 0;
  border-radius: 5px;
}

.satellite-workspace :is(button, select, input, label):focus-visible,
.satellite-workspace .visually-hidden:focus-visible + .file-slot__picker,
.l2a-console .spectral-channel:has(input:focus-visible),
.l2a-console .toggle-control:has(input:focus-visible),
.l2a-console .chip-list label:has(input:focus-visible) span,
.parameter-drawer__close:focus-visible {
  outline: 2px solid var(--orbit-cyan, #72d7ff);
  outline-offset: 2px;
}

@media (max-width: 760px) {
  .satellite-workspace {
    padding-inline: 10px;
  }

  .satellite-workspace .mission-panel__masthead {
    min-height: 108px;
  }

  .mission-panel__heading p {
    display: none;
  }

  .satellite-workspace .mission-section,
  .satellite-workspace .configuration-brief {
    padding: 12px;
  }

  :deep(.mission-parameter-drawer) {
    width: min(470px, 94vw) !important;
  }

  :deep(.mission-parameter-drawer .el-drawer__header) {
    padding: 16px 14px 12px;
  }

  :deep(.mission-parameter-drawer .el-drawer__body) {
    padding-inline: 14px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .satellite-workspace *,
  .satellite-workspace *::before,
  .satellite-workspace *::after,
  .mission-parameter-drawer *,
  .mission-parameter-drawer *::before,
  .mission-parameter-drawer *::after {
    scroll-behavior: auto !important;
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
  }
}
</style>

<style lang="less" scoped>
/* Keep the processing flow readable: one typeface, modest hierarchy, and plain form surfaces. */
.satellite-workspace {
  --plain-ink: #243746;
  --plain-muted: #647585;
  --plain-primary: #2e7da3;
  --plain-primary-soft: #edf6fa;
  --plain-line: #d7e1e7;
  --plain-panel: #ffffff;
  --plain-surface: #ffffff;
  --plain-success: #338467;
  --plain-danger: #b44c4c;

  padding: 12px 12px 28px;
  color: var(--plain-ink);
  background: var(--plain-surface);
  font-family: "Microsoft YaHei", "PingFang SC", sans-serif;
}

.satellite-workspace *,
:deep(.mission-parameter-drawer *) {
  box-shadow: none;
  transition: none;
}

.satellite-workspace .mission-panel__masthead {
  min-height: 0;
  padding: 16px;
  color: var(--plain-ink);
  background: var(--plain-panel);
  border: 1px solid var(--plain-line);
  border-left: 3px solid var(--plain-primary);
  border-radius: 6px;
}

.satellite-workspace .mission-panel__masthead::before,
.satellite-workspace .mission-panel__orbit {
  display: none;
}

.satellite-workspace .mission-panel__heading {
  max-width: none;
}

.satellite-workspace .mission-panel__eyebrow {
  display: none;
}

.satellite-workspace .mission-panel__masthead h3 {
  color: var(--plain-ink);
  font-family: inherit;
  font-size: 18px;
  font-weight: 600;
  letter-spacing: 0;
  text-shadow: none;
}

.satellite-workspace .mission-panel__heading p {
  margin: 5px 0 0;
  color: var(--plain-muted);
  font-size: 12px;
  line-height: 1.6;
}

.satellite-workspace .mission-panel__profile {
  gap: 2px;
  min-width: 80px;
  padding: 6px 8px;
  color: var(--plain-muted);
  text-align: left;
  background: var(--plain-primary-soft);
  border: 1px solid #d6e8f0;
  border-radius: 4px;
  backdrop-filter: none;
}

.satellite-workspace .mission-panel__profile > span {
  color: var(--plain-muted);
  font-family: inherit;
  font-size: 11px;
  font-weight: 400;
  letter-spacing: 0;
}

.satellite-workspace .mission-panel__profile strong {
  color: var(--plain-ink);
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
}

.satellite-workspace .mission-panel__profile small {
  color: var(--plain-muted);
  font-family: inherit;
  font-size: 11px;
}

.satellite-workspace .mission-panel__selector {
  grid-template-columns: 84px minmax(0, 1fr);
  gap: 5px;
  padding: 6px 0 2px;
}

.satellite-workspace .mission-panel__selector label {
  color: var(--plain-ink);
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0;
}

.satellite-workspace .mission-panel__selector select {
  min-height: 36px;
  color: var(--plain-ink);
  font-size: 14px;
  font-weight: 400;
  background: var(--plain-panel);
  border-color: var(--plain-line);
  border-radius: 4px;
}

.satellite-workspace .mission-panel__selector select:hover,
.satellite-workspace .mission-panel__selector select:focus {
  border-color: var(--plain-primary);
  box-shadow: 0 0 0 2px rgb(46 125 163 / 12%);
}

.satellite-workspace .mission-panel__lock-note {
  grid-column: 1 / -1;
  width: 100%;
  box-sizing: border-box;
  display: block;
  min-width: 0;
  overflow: hidden;
  padding: 4px 8px;
  color: #8a563d;
  font-size: 11px;
  background: #fff7f1;
  border-left: 2px solid #d88a59;
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.satellite-workspace .mission-section {
  margin-top: 12px;
  padding: 14px;
  background: var(--plain-panel);
  border: 1px solid var(--plain-line);
  border-radius: 6px;
}

.satellite-workspace .mission-section__heading,
.satellite-workspace .mission-section__heading > div,
.satellite-workspace .artifact-shelf__title {
  gap: 7px;
}

.satellite-workspace .mission-section__heading strong,
.satellite-workspace .configuration-brief__heading strong,
.satellite-workspace .l2a-console__heading strong {
  color: var(--plain-ink);
  font-family: inherit;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 0;
}

.satellite-workspace .mission-section__heading > span,
.satellite-workspace .artifact-shelf__title span,
.satellite-workspace .l2a-console__heading > span {
  padding: 0;
  color: var(--plain-muted);
  font-family: inherit;
  font-size: 12px;
  font-weight: 400;
  background: transparent;
  border-radius: 0;
}

.satellite-workspace .mission-section__signal {
  width: 3px;
  height: 16px;
  background: var(--plain-primary);
  box-shadow: none;
}

.satellite-workspace .mission-section__signal.is-violet {
  background: #7565a8;
}

.satellite-workspace .mission-section__signal.is-valid {
  background: var(--plain-success);
}

.satellite-workspace .mission-section__note {
  margin: 7px 0 11px;
  color: var(--plain-muted);
  font-size: 12px;
  line-height: 1.6;
}

.satellite-workspace .file-stack {
  gap: 6px;
}

.satellite-workspace .file-slot {
  padding: 8px 9px;
  background: #fafcfd;
  border: 1px solid #dce5ea;
  border-left: 3px solid #9ebdcd;
  border-radius: 4px;
}

.satellite-workspace .file-slot.is-actionable {
  cursor: pointer;
}

.satellite-workspace .file-slot.is-actionable:hover {
  border-color: #8fbccc;
  border-left-color: var(--plain-primary);
  box-shadow: 0 4px 10px rgb(13 61 93 / 7%);
  transform: translateY(-1px);
}

.satellite-workspace .file-slot.is-actionable:focus-visible {
  outline: 2px solid var(--plain-primary);
  outline-offset: 2px;
}

.satellite-workspace .file-slot.is-uploaded {
  cursor: default;
}

.satellite-workspace .file-slot:hover {
  border-color: #adc9d7;
  border-left-color: var(--plain-primary);
  transform: none;
}

.satellite-workspace .file-slot.is-uploaded {
  border-left-color: var(--plain-success);
}

.satellite-workspace .file-slot.is-uploading {
  border-left-color: var(--plain-primary);
}

.satellite-workspace .file-slot.is-failed {
  border-left-color: var(--plain-danger);
}

.satellite-workspace .file-slot__meta {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-right: 0;
  min-height: 24px;
}

.satellite-workspace .file-slot:has(.file-slot__remove) .file-slot__meta {
  padding-right: 22px;
}

.satellite-workspace .file-slot__details {
  display: flex;
  flex: 1 1 auto;
  align-items: baseline;
  gap: 6px;
  min-width: 0;
}

.satellite-workspace .file-slot__upload-hint {
  flex: 0 0 auto;
  color: #71899a;
  font-size: 10px;
  line-height: 1.25;
}

.satellite-workspace .file-slot__details .el-tooltip {
  display: block;
  min-width: 0;
  overflow: hidden;
}

.satellite-workspace .file-slot__meta strong,
.satellite-workspace .file-slot__meta small {
  min-width: 0;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.satellite-workspace .file-slot__meta strong {
  flex: 0 1 auto;
  color: var(--plain-ink);
  font-size: 12px;
  font-weight: 600;
}

.satellite-workspace .file-slot__meta small,
.satellite-workspace .artifact-row small {
  flex: 1 1 auto;
  color: var(--plain-muted);
  font-family: inherit;
  font-size: 11px;
}

.satellite-workspace .file-slot__meta small.file-slot__upload-hint {
  flex: 0 0 auto;
  color: #71899a;
  font-size: 10px;
}

.satellite-workspace .file-slot__meta > span {
  flex: 0 0 auto;
  padding: 0;
  color: var(--plain-muted);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  background: transparent;
  border-radius: 0;
}

.satellite-workspace .file-slot.is-empty .file-slot__status {
  color: #b44c4c;
  font-weight: 600;
}

.satellite-workspace .file-slot.is-uploading .file-slot__status {
  color: var(--plain-primary);
  font-weight: 600;
}

.satellite-workspace .file-slot.is-uploaded .file-slot__meta > span {
  color: var(--plain-success);
  background: transparent;
}

.satellite-workspace .file-slot__progress {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  height: 3px;
  margin: 0;
  overflow: hidden;
  background: #dce7ec;
}

.satellite-workspace .file-slot__progress-track {
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: transparent;
  border-radius: 0;
}

.satellite-workspace .file-slot__progress-track span {
  display: block;
  height: 100%;
  background: var(--plain-primary);
  border-radius: 0;
  transition: width 180ms ease-out;
}

.satellite-workspace .file-slot__remove {
  display: inline-flex;
  width: 24px;
  height: 24px;
  align-items: center;
  justify-content: center;
  padding: 0;
  color: var(--plain-muted);
  background: #fff;
  border: 1px solid #cbdde5;
  border-radius: 3px;
  transition:
    color 150ms ease,
    background-color 150ms ease,
    border-color 150ms ease;
}

.satellite-workspace .file-slot__remove:hover:not(:disabled) {
  color: var(--plain-danger);
  background: #fff4f4;
  border-color: #e4aaaa;
}

.satellite-workspace .file-slot__remove .el-icon {
  font-size: 13px;
}

.satellite-workspace .diagnostic-strip {
  margin-top: 9px;
  padding: 8px 9px;
  background: #fff6f4;
  border: 1px solid #f0d6d0;
  border-left: 3px solid var(--plain-danger);
  border-radius: 4px;
}

.satellite-workspace .diagnostic-strip span,
.satellite-workspace .inline-error {
  color: #9f4545;
  font-size: 12px;
}

.satellite-workspace .configuration-brief {
  position: static;
  color: var(--plain-ink);
  background: var(--plain-panel);
  border-color: var(--plain-line);
}

.satellite-workspace .configuration-brief::after {
  display: none;
}

.satellite-workspace .configuration-brief__heading,
.satellite-workspace .configuration-brief__heading > div {
  gap: 8px;
  align-items: center;
}

.satellite-workspace .configuration-brief__heading > div {
  justify-content: flex-start;
}

.satellite-workspace .configuration-brief__heading small {
  margin-top: 3px;
  color: var(--plain-muted);
  font-size: 12px;
}

:deep(.configuration-brief__open) {
  height: 30px;
  padding: 0 9px;
  color: var(--plain-primary) !important;
  font-size: 12px;
  background: transparent !important;
  border: 1px solid #a9cbd9 !important;
  border-radius: 4px;
}

:deep(.configuration-brief__open:hover) {
  color: #216889 !important;
  background: var(--plain-primary-soft) !important;
}

.satellite-workspace .spectral-signature {
  gap: 7px;
  margin-top: 13px;
}

.satellite-workspace .spectral-signature__band {
  gap: 4px;
  opacity: 0.45;
}

.satellite-workspace .spectral-signature__band.is-selected {
  opacity: 1;
}

.satellite-workspace .spectral-signature__band i {
  height: 4px;
  border-radius: 1px;
  box-shadow: none;
}

.satellite-workspace .spectral-signature__band strong {
  color: var(--plain-muted);
  font-family: inherit;
  font-size: 11px;
  font-weight: 500;
}

.satellite-workspace .configuration-summary {
  gap: 6px;
  margin: 0;
}

.satellite-workspace .configuration-summary > div {
  grid-template-columns: 70px minmax(0, 1fr);
  gap: 10px;
  padding-top: 7px;
  border-top-color: #e1e8ec;
}

.satellite-workspace .configuration-summary dt {
  color: var(--plain-muted);
  font-size: 12px;
}

.satellite-workspace .configuration-summary dd {
  color: var(--plain-ink);
  font-family: inherit;
  font-size: 12px;
  font-weight: 500;
}

.satellite-workspace .configuration-section {
  padding: 15px 0;
  border-top: 1px solid #e1e8ec;
}

.satellite-workspace .configuration-section--bands {
  display: grid;
  gap: 9px;
}

.satellite-workspace .configuration-section__heading {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

.satellite-workspace .configuration-section__heading strong {
  color: var(--plain-ink);
  font-size: 13px;
  font-weight: 700;
}

.satellite-workspace .configuration-section__heading small {
  color: var(--plain-muted);
  font-size: 11px;
}

.satellite-workspace .configuration-band-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.satellite-workspace .configuration-band-list span {
  display: inline-flex;
  align-items: center;
  width: fit-content;
  min-width: 42px;
  padding: 4px 8px;
  color: #24546b;
  font-family: "Cascadia Mono", Consolas, monospace;
  font-size: 11px;
  font-weight: 650;
  line-height: 1.2;
  background: #edf7fb;
  border: 1px solid #b9dce8;
  border-radius: 3px;
}

.satellite-workspace .configuration-section--outputs {
  padding-bottom: 12px;
}

.satellite-workspace
  .configuration-section--outputs
  :deep(.derived-output-checklist) {
  padding: 0;
  margin: 0;
  background: transparent;
  border: 0;
}

.satellite-workspace
  .configuration-section--outputs
  :deep(.derived-output-checklist__heading) {
  margin-bottom: 9px;
}

.satellite-workspace :deep(.derived-output-checklist__items) {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 7px;
}

.satellite-workspace :deep(.derived-output-checklist__items label) {
  display: flex;
  width: 100%;
  min-height: 34px;
  padding: 6px 10px;
  align-items: center;
  background: #fff;
  border: 1px solid #d7e3e9;
  border-radius: 4px;
}

.satellite-workspace .configuration-algorithms {
  gap: 6px;
  margin: 0;
}

.satellite-workspace .configuration-algorithms span {
  padding: 4px 7px;
  color: #526d7d;
  font-size: 11px;
  background: #f2f6f8;
  border: 1px solid #dce5ea;
  border-radius: 3px;
}

.satellite-workspace .mission-launch {
  position: static;
  gap: 12px;
  color: var(--plain-ink);
  background: var(--plain-panel);
  border-color: #bfd5e0;
}

.satellite-workspace .processing-risk-notice {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  margin-top: 8px;
  padding: 8px 10px;
  color: #795814;
  font-size: 12px;
  line-height: 1.5;
  background: #fff9e8;
  border: 1px solid #ecd89e;
  border-left: 3px solid #d7a62e;
  border-radius: 4px;
}

.satellite-workspace .processing-risk-notice .el-icon {
  flex: 0 0 auto;
  margin-top: 2px;
  color: #b47b09;
  font-size: 14px;
}

.satellite-workspace .mission-launch::after {
  display: none;
}

.satellite-workspace .mission-launch strong {
  color: var(--plain-ink);
  font-family: inherit;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0;
}

.satellite-workspace .mission-launch small {
  max-width: none;
  color: var(--plain-muted);
  font-size: 12px;
}

.satellite-workspace .mission-launch :deep(.el-button--primary),
.parameter-drawer__footer :deep(.el-button--primary) {
  min-height: 32px;
  padding: 0 12px;
  color: #fff;
  font-size: 13px;
  font-weight: 500;
  background: var(--plain-primary);
  border: 1px solid var(--plain-primary);
  border-radius: 4px;
}

.satellite-workspace .mission-launch :deep(.el-button--primary.is-disabled) {
  color: #8b9ca7;
  background: #e1e7ea;
  border-color: #e1e7ea;
}

.satellite-workspace .candidate-strip,
.satellite-workspace .progress-console {
  background: var(--plain-panel);
  border-color: var(--plain-line);
}

.satellite-workspace .candidate-strip code,
.satellite-workspace .candidate-strip > small {
  color: #3e6d59;
  font-family: inherit;
  font-size: 12px;
  font-weight: 500;
}

.satellite-workspace .stage-timeline {
  gap: 0;
  margin-top: 10px;
}

.satellite-workspace .stage-row {
  grid-template-columns: 10px minmax(0, 1fr) auto;
  gap: 8px;
  padding: 8px 0;
  border-radius: 0;
}

.satellite-workspace .stage-row:hover {
  background: transparent;
}

.satellite-workspace .stage-row:not(:last-child)::before {
  top: 16px;
  bottom: -4px;
  left: 4px;
  background: #d8e1e6;
}

.satellite-workspace .stage-row__marker {
  width: 8px;
  height: 8px;
  margin-top: 5px;
  background: #aebdc6;
  box-shadow: 0 0 0 2px #e4ebee;
}

.satellite-workspace .stage-row.is-running .stage-row__marker,
.satellite-workspace .stage-row.is-created .stage-row__marker {
  background: var(--plain-primary);
  box-shadow: 0 0 0 2px #dceef5;
}

.satellite-workspace .stage-row.is-succeeded .stage-row__marker {
  background: var(--plain-success);
  box-shadow: 0 0 0 2px #ddefe7;
}

.satellite-workspace .stage-row__body {
  padding-bottom: 0;
}

.satellite-workspace .stage-row__body strong {
  color: var(--plain-ink);
  font-size: 13px;
  font-weight: 500;
}

.satellite-workspace .stage-row__body small,
.satellite-workspace .stage-row__status {
  color: var(--plain-muted);
  font-family: inherit;
  font-size: 11px;
}

.satellite-workspace .runtime-stage-row {
  position: relative;
  min-height: 48px;
  padding: 10px 0;
  border-bottom: 1px solid #edf1f3;
}

.satellite-workspace .runtime-stage-row:last-child {
  border-bottom: 0;
}

.satellite-workspace .runtime-stage-row.is-succeeded .stage-row__marker {
  background: #2f9b68;
  box-shadow: 0 0 0 2px #d9f1e4;
}

.satellite-workspace .runtime-stage-row.is-processing .stage-row__marker {
  background: #2f8fb3;
  box-shadow: 0 0 0 2px #d9edf4;
  animation: runtime-stage-pulse 1.6s ease-in-out infinite;
}

.satellite-workspace .runtime-stage-row.is-failed .stage-row__marker {
  background: #c44f55;
  box-shadow: 0 0 0 2px #f6dddd;
}

.satellite-workspace .runtime-stage-row.is-succeeded .stage-row__status {
  color: #238052;
}

.satellite-workspace .runtime-stage-row.is-processing .stage-row__status {
  color: #247c9d;
  font-weight: 600;
}

.satellite-workspace .runtime-stage-row.is-failed .stage-row__status {
  color: #b13f46;
  font-weight: 600;
}

.satellite-workspace .runtime-stage-row.is-waiting .stage-row__status {
  color: #87949d;
}

.satellite-workspace .progress-console .mission-section__signal.is-success,
.satellite-workspace .runtime-current-stage__dot.is-success {
  background: #2f9b68;
  box-shadow: 0 0 0 3px #d9f1e4;
}

.satellite-workspace .progress-console .mission-section__signal.is-danger,
.satellite-workspace .runtime-current-stage__dot.is-danger {
  background: #c44f55;
  box-shadow: 0 0 0 3px #f6dddd;
}

.satellite-workspace .progress-console .mission-section__signal.is-muted,
.satellite-workspace .runtime-current-stage__dot.is-muted {
  background: #98a5ac;
  box-shadow: 0 0 0 3px #e9edef;
}

.satellite-workspace .runtime-current-stage {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin: 10px 0 4px;
  padding: 9px 10px;
  background: #f1f8fb;
  border: 1px solid #d4e8ef;
  border-radius: 5px;
}

.satellite-workspace .runtime-current-stage__dot {
  width: 8px;
  height: 8px;
  flex: 0 0 auto;
  margin-top: 5px;
  background: #2f8fb3;
  border-radius: 50%;
  box-shadow: 0 0 0 3px #d9edf4;
}

.satellite-workspace .runtime-current-stage div {
  display: grid;
  gap: 2px;
}

.satellite-workspace .runtime-current-stage small,
.satellite-workspace .runtime-current-stage span {
  color: #68808c;
  font-size: 11px;
}

.satellite-workspace .runtime-current-stage strong {
  color: #24556b;
  font-size: 13px;
  font-weight: 600;
}

.satellite-workspace .runtime-stage-row .artifact-shelf {
  min-width: 92px;
  padding: 4px 7px;
  background: #f7fafb;
}

@keyframes runtime-stage-pulse {
  50% {
    box-shadow: 0 0 0 4px #d9edf4;
  }
}

.satellite-workspace .artifact-shelf {
  padding: 10px;
  background: #f8fafb;
  border: 1px solid #dce5ea;
  border-radius: 4px;
}

.satellite-workspace .artifact-row {
  padding-top: 8px;
  border-top-color: #e0e7eb;
}

.satellite-workspace .task-actions :deep(.el-button) {
  min-height: 32px;
  border-radius: 4px;
}

.satellite-workspace > .mission-section {
  margin-top: 8px;
  padding: 10px 12px 12px;
  background: #fff;
  border-color: #dce5ea;
  border-radius: 6px;
  box-shadow: none;
}

.satellite-workspace > .mission-section[aria-labelledby="package-title"] {
  border-top: 2px solid #c7e0eb;
}

.satellite-workspace > .mission-section.configuration-brief {
  background: #fbfcfd;
  border-top: 2px solid #d8d0f0;
}

.satellite-workspace > .processing-plan-stack {
  margin-top: 8px;
}

.satellite-workspace > .processing-plan-stack > .processing-plan,
.satellite-workspace > .processing-plan-stack > .execution-plan {
  padding: 12px;
  background: #f7fafb;
  border-color: #dce5ea;
  border-radius: 6px;
}

:deep(.mission-parameter-drawer) {
  --plain-ink: #243746;
  --plain-muted: #647585;
  --plain-primary: #2e7da3;
  --plain-primary-soft: #edf6fa;
  --plain-line: #d7e1e7;
  --plain-panel: #ffffff;
  --plain-surface: #f5f7f8;
  --plain-success: #338467;
  --plain-danger: #b44c4c;

  color: var(--plain-ink);
  background: var(--plain-panel);
  border-left: 1px solid var(--plain-line);
  box-shadow: -8px 0 24px rgb(36 55 70 / 12%);
}

:deep(.mission-parameter-drawer .el-drawer__header) {
  padding: 18px 20px 14px;
  border-bottom: 1px solid var(--plain-line);
}

:deep(.mission-parameter-drawer .el-drawer__body) {
  padding: 0 20px 18px;
}

:deep(.mission-parameter-drawer .el-drawer__footer) {
  padding: 12px 20px;
  background: #fafcfd;
  border-top: 1px solid var(--plain-line);
}

.parameter-drawer__header {
  gap: 12px;
}

.parameter-drawer__header span,
.parameter-drawer__signal span {
  color: var(--plain-muted);
  font-family: inherit;
  font-size: 11px;
  font-weight: 400;
  letter-spacing: 0;
}

.parameter-drawer__header h2 {
  margin-top: 4px;
  color: var(--plain-ink);
  font-family: inherit;
  font-size: 18px;
  font-weight: 600;
  letter-spacing: 0;
}

.parameter-drawer__header p {
  margin-top: 5px;
  color: var(--plain-muted);
  font-size: 12px;
  line-height: 1.6;
}

.parameter-drawer__close {
  width: 30px;
  height: 30px;
  color: var(--plain-muted);
  background: #f4f7f8;
  border: 1px solid var(--plain-line);
  border-radius: 4px;
}

.parameter-drawer__close:hover {
  color: var(--plain-ink);
  background: #edf3f5;
}

.parameter-drawer__body {
  padding-top: 14px;
}

.parameter-drawer__signal {
  padding: 12px;
  color: var(--plain-ink);
  background: #f7fafb;
  border: 1px solid #dce5ea;
  border-radius: 4px;
}

.parameter-drawer__signal strong {
  margin-top: 4px;
  color: var(--plain-ink);
  font-family: inherit;
  font-size: 13px;
  font-weight: 500;
}

.parameter-drawer__signal-rail i {
  height: 26px;
  border-radius: 1px;
}

.parameter-drawer__signal-rail i.is-selected {
  box-shadow: none;
}

.l2a-console {
  margin-top: 12px;
  padding: 14px;
  color: var(--plain-ink);
  background: var(--plain-panel);
  border: 1px solid var(--plain-line);
  border-radius: 4px;
}

.l2a-console .mission-section__signal {
  width: 3px;
  height: 16px;
}

.l2a-console .control-group {
  margin-top: 12px;
  padding-top: 11px;
  border-top-color: #e0e7eb;
}

.l2a-console .control-group legend {
  color: var(--plain-ink);
  font-size: 13px;
  font-weight: 600;
}

.l2a-console .control-field,
.l2a-console .roi-grid label,
.l2a-console .rgb-grid label {
  color: var(--plain-muted);
  font-size: 12px;
}

.l2a-console .control-field input,
.l2a-console .control-field select,
.l2a-console .roi-grid input,
.l2a-console .rgb-grid select {
  min-height: 34px;
  color: var(--plain-ink);
  font-size: 13px;
  background: var(--plain-panel);
  border-color: #cfdbe1;
  border-radius: 4px;
}

.l2a-console .control-field input:focus,
.l2a-console .control-field select:focus,
.l2a-console .roi-grid input:focus,
.l2a-console .rgb-grid select:focus {
  border-color: var(--plain-primary);
  box-shadow: 0 0 0 2px rgb(46 125 163 / 12%);
}

.l2a-console .control-field input:read-only {
  color: var(--plain-muted);
  background: #f4f7f8;
}

.l2a-console .control-field input:disabled,
.l2a-console .control-field select:disabled,
.l2a-console .roi-grid input:disabled,
.l2a-console .rgb-grid select:disabled {
  color: #8b9ca7;
  background: #f4f7f8;
  border-color: #e0e7eb;
}

/* Keep RGB rows aligned with the shared product-drawer workbench. */
.l2a-console .rgb-grid {
  grid-template-columns: 1fr;
  gap: 8px;
}

.l2a-console .rgb-grid label {
  grid-template-columns: 96px minmax(0, 1fr) 136px;
  column-gap: 10px;
  row-gap: 0;
  align-items: center;
  min-height: var(--drawer-control-height);
  line-height: 1.35;
}

.l2a-console .rgb-grid label > span {
  grid-column: 1;
  grid-row: 1;
}

.l2a-console .rgb-grid label > select {
  grid-column: 2;
  grid-row: 1;
  width: 100%;
  min-height: var(--drawer-control-height);
  padding: 5px 10px;
  font-family: "Cascadia Mono", SFMono-Regular, Consolas, monospace;
  font-size: var(--drawer-font-control);
  font-weight: 500;
  border-radius: 8px;
}

.l2a-console .rgb-grid .parameter-field__guide {
  grid-column: 3;
  grid-row: 1;
  width: 136px;
  min-height: 0;
  margin: 0;
  color: #6d8492;
  font-size: 11px;
  font-weight: 500;
  line-height: 1.35;
}

.l2a-console .spectral-channel {
  color: #657784;
  background: #fff;
  border-color: #cfdce2;
  border-radius: 4px;
  opacity: 1;
}

.l2a-console .spectral-channel:hover:not(:has(input:disabled)) {
  transform: none;
}

.l2a-console .spectral-channel.is-selected {
  color: #155d7a;
  background: #e6f4fa;
  border-color: var(--plain-primary);
  box-shadow: inset 0 0 0 1px var(--plain-primary);
}

.l2a-console .spectral-channel:not(.is-selected) .spectral-channel__bar {
  opacity: 0.28;
}

.l2a-console .spectral-channel__bar {
  border-radius: 1px;
}

.l2a-console .spectral-channel strong {
  font-size: 12px;
}

.l2a-console .spectral-channel small {
  color: var(--plain-muted);
  font-size: 11px;
}

.l2a-console .toggle-control > span {
  background: #97aab5;
}

.l2a-console .toggle-control input:checked + span {
  background: var(--plain-primary);
}

.l2a-console .toggle-control small {
  color: var(--plain-muted);
  font-size: 11px;
}

.l2a-console .chip-list span {
  padding: 5px 7px;
  color: #657784;
  font-size: 12px;
  background: #fff;
  border-color: #cfdce2;
  border-radius: 3px;
}

.l2a-console .chip-list input:checked + span {
  color: #155d7a;
  font-weight: 600;
  background: #e6f4fa;
  border-color: var(--plain-primary);
  box-shadow: inset 0 0 0 1px var(--plain-primary);
}

.parameter-drawer__footer > span {
  color: var(--plain-muted);
  font-size: 12px;
}

.parameter-drawer__footer > span.is-invalid {
  color: var(--plain-danger);
}

.satellite-workspace :is(button, select, input, label):focus-visible,
.satellite-workspace .visually-hidden:focus-visible + .file-slot__picker,
.l2a-console .spectral-channel:has(input:focus-visible),
.l2a-console .toggle-control:has(input:focus-visible),
.l2a-console .chip-list label:has(input:focus-visible) span,
.parameter-drawer__close:focus-visible {
  outline-color: var(--plain-primary);
}

@media (max-width: 760px) {
  .satellite-workspace {
    padding-inline: 10px;
  }

  .satellite-workspace .mission-panel__masthead {
    align-items: flex-start;
  }

  :deep(.mission-parameter-drawer .el-drawer__header) {
    padding: 16px 14px 12px;
  }

  :deep(.mission-parameter-drawer .el-drawer__body) {
    padding-inline: 14px;
  }
}
</style>

<style lang="less">
@import "../../features/multisource/unifiedProductParameterDrawer.less";
</style>

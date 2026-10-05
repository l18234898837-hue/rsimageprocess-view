<template>
  <Teleport to="body">
    <section
      v-show="visible"
      ref="historyPanel"
      class="task-history-dialog"
      :style="historyPanelStyle"
      role="dialog"
      aria-modal="false"
      aria-labelledby="task-history-dialog-title"
      @pointerdown.capture="activateHistoryPanel"
    >
      <header
        class="task-history-dialog__header"
        title="可拖动窗口；拖拽边缘或四角调整窗口大小"
        @pointerdown="startHistoryPanelDrag"
      >
        <div class="task-history-dialog__heading">
          <div>
            <strong id="task-history-dialog-title">历史任务与产物</strong>
            <small>查看、下载和管理已完成任务的产物</small>
          </div>
          <span class="task-history-dialog__header-actions">
            <el-button
              size="small"
              text
              circle
              aria-label="关闭历史任务与产物"
              title="关闭"
              @click.stop="visible = false"
            >
              <el-icon><Close /></el-icon>
            </el-button>
          </span>
        </div>
      </header>

      <dl v-if="storageSummary" class="task-history-dialog__storage">
        <div
          class="task-history-dialog__storage-group task-history-dialog__storage-group--source"
        >
          <el-icon class="task-history-dialog__storage-icon" aria-hidden="true">
            <FolderOpened />
          </el-icon>
          <div>
            <dt>源文件占用</dt>
            <dd>{{ formatBytes(storageSummary.sourceBytes) }}</dd>
          </div>
        </div>
        <div
          class="task-history-dialog__storage-group task-history-dialog__storage-group--artifacts"
        >
          <el-icon class="task-history-dialog__storage-icon" aria-hidden="true">
            <Box />
          </el-icon>
          <div>
            <dt>可用产物</dt>
            <dd>{{ storageSummary.availableArtifactCount }} 个</dd>
          </div>
          <div>
            <dt>产物占用</dt>
            <dd>{{ formatBytes(storageSummary.artifactBytes) }}</dd>
          </div>
          <div class="task-history-dialog__storage-recycle">
            <dt>
              <el-icon
                class="task-history-dialog__storage-recycle-icon"
                aria-hidden="true"
              >
                <Delete />
              </el-icon>
              回收站占用
            </dt>
            <dd>{{ formatBytes(storageSummary.recycleBinBytes) }}</dd>
          </div>
        </div>
      </dl>

      <span
        v-for="handle in resizeHandles"
        :key="handle"
        class="task-history-dialog__resize-handle"
        :class="`is-${handle}`"
        aria-hidden="true"
        @pointerdown.stop="beginHistoryPanelResize(handle, $event)"
      />

      <div class="task-history-dialog__filters" aria-label="历史任务筛选">
        <div
          class="task-history-dialog__filter-group task-history-dialog__filter-group--source"
        >
          <el-input
            v-model="filters.keyword"
            clearable
            placeholder="任务名称 / 编号 / 产品"
            @keyup.enter="loadHistory()"
          />
          <el-select
            v-model="filters.lifecycle"
            clearable
            placeholder="任务状态"
            popper-class="task-history-dialog__filter-popper"
          >
            <el-option
              v-for="status in lifecycleOptions"
              :key="status"
              :label="lifecycleLabel(status)"
              :value="status"
            />
          </el-select>
        </div>
        <div
          class="task-history-dialog__filter-group task-history-dialog__filter-group--time"
        >
          <span class="task-history-dialog__filter-label">完成时间</span>
          <el-date-picker
            v-model="completedRange"
            type="daterange"
            value-format="YYYY-MM-DDTHH:mm:ss"
            range-separator="至"
            start-placeholder="开始时间"
            end-placeholder="结束时间"
            popper-class="task-history-dialog__filter-popper"
          />
        </div>
        <div
          class="task-history-dialog__filter-group task-history-dialog__filter-group--retention"
        >
          <el-select
            v-model="filters.retention"
            class="task-history-dialog__retention-filter"
            clearable
            placeholder="产物状态"
            popper-class="task-history-dialog__filter-popper"
          >
            <el-option
              v-for="status in retentionOptions"
              :key="status"
              :label="retentionLabel(status)"
              :value="status"
            />
          </el-select>
          <el-select
            v-model="filters.inputRetention"
            class="task-history-dialog__retention-filter"
            clearable
            placeholder="源文件状态"
            popper-class="task-history-dialog__filter-popper"
          >
            <el-option
              v-for="status in inputRetentionOptions"
              :key="status"
              :label="inputRetentionLabel(status)"
              :value="status"
            />
          </el-select>
          <el-button
            type="primary"
            :loading="isLoading"
            :class="{ 'is-filter-dirty': isFilterDirty }"
            class="task-history-dialog__query-button"
            :title="
              isFilterDirty ? '筛选条件已变更，请点击查询' : '按当前条件查询'
            "
            @click="loadHistory()"
            >查询</el-button
          >
          <el-button
            class="task-history-dialog__reset-button"
            :disabled="isLoading"
            @click="resetFilters"
            >重置</el-button
          >
        </div>
      </div>

      <div
        ref="contentElement"
        class="task-history-dialog__content"
        :style="{ '--task-history-list-width': `${listPanelWidth}px` }"
      >
        <section
          id="task-history-list"
          class="task-history-dialog__list"
          aria-label="历史任务列表"
        >
          <div class="task-history-dialog__list-heading">
            <span>共 {{ total }} 个任务</span>
            <small>仅显示当前用户创建的任务</small>
          </div>
          <div
            v-if="items.length"
            class="task-history-dialog__batch-toolbar"
            aria-label="批量操作"
          >
            <strong>已选择 {{ batchSelection.selectedCount }} 个任务</strong>
            <div class="task-history-dialog__batch-actions">
              <el-button
                v-if="!activeRecycleBinScope"
                size="small"
                type="primary"
                plain
                class="task-history-dialog__action--secondary"
                :disabled="!batchSelection.selectedCount || isBatchChanging"
                @click="openBatchSourceRetention"
                >批量设置原始输入保留期</el-button
              >
              <el-button
                v-if="activeRecycleBinScope !== 'artifact'"
                size="small"
                type="danger"
                class="task-history-dialog__action--danger"
                :disabled="!batchSelection.selectedCount"
                :loading="isBatchChanging"
                @click="
                  isViewingSourceRecycleBin
                    ? batchPermanentlyPurgeSourceInputs()
                    : batchRecycleSourceInputs()
                "
                >{{
                  isViewingSourceRecycleBin
                    ? "批量永久删除源文件"
                    : "批量移入源文件回收站"
                }}</el-button
              >
              <el-button
                v-if="activeRecycleBinScope !== 'source'"
                size="small"
                :type="isViewingArtifactRecycleBin ? 'danger' : 'warning'"
                :plain="!isViewingArtifactRecycleBin"
                class="task-history-dialog__action--recycle"
                :disabled="!batchSelection.selectedCount"
                :loading="isBatchChanging"
                @click="
                  isViewingArtifactRecycleBin
                    ? batchPermanentlyPurgeArtifacts()
                    : batchRecycleArtifacts()
                "
                >{{
                  isViewingArtifactRecycleBin
                    ? "批量永久删除任务产物"
                    : "批量移入产物回收站"
                }}</el-button
              >
            </div>
            <el-button
              size="small"
              text
              class="task-history-dialog__action--secondary"
              @click="clearBatchSelection"
              >清除选择</el-button
            >
          </div>
          <div
            v-if="isLoading"
            class="task-history-dialog__empty"
            role="status"
          >
            正在加载历史任务…
          </div>
          <div
            v-else-if="!items.length"
            class="task-history-dialog__empty"
            role="status"
          >
            <el-icon class="task-history-dialog__empty-icon" aria-hidden="true">
              <Search />
            </el-icon>
            <strong>没有符合筛选条件的历史任务</strong>
            <span>请调整筛选条件后重试。</span>
          </div>
          <div v-else class="task-history-dialog__table-wrap">
            <table class="task-history-dialog__table">
              <thead>
                <tr>
                  <th scope="col" class="task-history-dialog__selection-cell">
                    <el-checkbox
                      :model-value="isCurrentPageSelected"
                      :indeterminate="isCurrentPagePartiallySelected"
                      :disabled="!selectableItems.length"
                      aria-label="选择当前页任务"
                      @click.stop
                      @change="toggleCurrentPage"
                    />
                  </th>
                  <th scope="col">任务</th>
                  <th scope="col">产品</th>
                  <th scope="col">完成时间</th>
                  <th scope="col">状态</th>
                  <th scope="col">产物</th>
                  <th scope="col">占用</th>
                  <th scope="col">保留状态</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="item in items"
                  :key="String(item.taskId)"
                  :class="{
                    'is-selected': selectedTask?.taskId === item.taskId
                  }"
                  tabindex="0"
                  @click="selectTask(item)"
                  @keydown.enter.prevent="selectTask(item)"
                  @keydown.space.prevent="selectTask(item)"
                >
                  <td class="task-history-dialog__selection-cell" @click.stop>
                    <el-checkbox
                      :model-value="isBatchSelected(item)"
                      :disabled="!isBatchEligible(item)"
                      :aria-label="`选择任务 ${item.taskNo}`"
                      @change="toggleBatchSelection(item)"
                    />
                  </td>
                  <td class="task-history-dialog__task-name-cell">
                    <strong :title="`${item.taskName} (${item.taskNo})`">{{
                      item.taskName
                    }}</strong>
                    <small :title="item.taskNo">{{ item.taskNo }}</small>
                  </td>
                  <td>
                    <span
                      class="task-history-dialog__table-cell-text"
                      :title="item.productCodes.join(' / ') || '—'"
                    >
                      {{ item.productCodes.join(" / ") || "—" }}
                    </span>
                  </td>
                  <td>{{ formatDate(item.completedAt) }}</td>
                  <td>
                    <span class="task-history-dialog__tag is-lifecycle">
                      {{ lifecycleLabel(item.lifecycleStatus) }}
                    </span>
                  </td>
                  <td>{{ item.artifactCount }} 个</td>
                  <td>{{ formatBytes(item.artifactSizeBytes) }}</td>
                  <td>
                    <div class="task-history-dialog__retention-stack">
                      <span
                        class="task-history-dialog__tag task-history-dialog__tag--source"
                        :class="`is-${item.sourceRetentionStatus.toLowerCase()}`"
                      >
                        <el-icon aria-hidden="true">
                          <component
                            :is="
                              retentionStatusIcon(item.sourceRetentionStatus)
                            "
                          />
                        </el-icon>
                        <span>源文件</span>
                        <strong>{{
                          inputRetentionLabel(item.sourceRetentionStatus)
                        }}</strong>
                      </span>
                      <span
                        class="task-history-dialog__tag task-history-dialog__tag--artifact"
                        :class="`is-${item.retentionStatus.toLowerCase()}`"
                      >
                        <el-icon aria-hidden="true">
                          <component
                            :is="retentionStatusIcon(item.retentionStatus)"
                          />
                        </el-icon>
                        <span>任务产物</span>
                        <strong>{{
                          retentionLabel(item.retentionStatus)
                        }}</strong>
                      </span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-if="total > 0" class="task-history-dialog__pagination">
            <el-button
              :disabled="page <= 1 || isLoading"
              @click="changePage(-1)"
              >上一页</el-button
            >
            <span>第 {{ page }} / {{ totalPages }} 页</span>
            <el-button
              :disabled="page * pageSize >= total || isLoading"
              @click="changePage(1)"
              >下一页</el-button
            >
          </div>
        </section>

        <div
          class="task-history-dialog__splitter"
          role="separator"
          aria-label="调整历史任务列表和详情宽度"
          aria-orientation="vertical"
          aria-controls="task-history-list task-history-detail"
          :aria-valuemin="MIN_LIST_PANEL_WIDTH"
          :aria-valuemax="splitterMaxWidth"
          :aria-valuenow="listPanelWidth"
          tabindex="0"
          @pointerdown="beginSplitResize"
          @keydown="resizeSplitWithKeyboard"
        />

        <aside
          id="task-history-detail"
          class="task-history-dialog__detail"
          aria-label="任务产物详情"
        >
          <div
            v-if="!selectedTask && total === 0 && !isLoading"
            class="task-history-dialog__detail-empty task-history-dialog__detail-empty--no-results"
          >
            <el-icon class="task-history-dialog__empty-icon" aria-hidden="true">
              <Search />
            </el-icon>
            <strong>暂无可展示的任务</strong>
            <span>当前筛选条件没有匹配的历史任务。</span>
          </div>
          <div
            v-else-if="!selectedTask"
            class="task-history-dialog__detail-empty"
          >
            <strong>选择一个历史任务</strong>
            <span>可查看任务产物、质量报告和保留状态。</span>
          </div>
          <template v-else>
            <header class="task-history-dialog__detail-heading">
              <div>
                <strong :title="selectedTask.taskName">{{
                  selectedTask.taskName
                }}</strong>
                <small>{{ selectedTask.taskNo }}</small>
              </div>
              <span
                class="task-history-dialog__tag"
                :class="`is-${selectedRetentionStatus.toLowerCase()}`"
              >
                <el-icon aria-hidden="true">
                  <component
                    :is="retentionStatusIcon(selectedRetentionStatus)"
                  />
                </el-icon>
                {{ retentionLabel(selectedRetentionStatus) }}
              </span>
            </header>
            <p
              v-if="selectedActions.reason"
              class="task-history-dialog__notice"
            >
              {{ selectedActions.reason }}
            </p>
            <section
              class="task-history-dialog__detail-card task-history-dialog__source-card"
            >
              <div class="task-history-dialog__subheading">
                <strong>原始输入</strong>
                <span
                  class="task-history-dialog__tag"
                  :class="`is-${selectedInputRetentionStatus.toLowerCase()}`"
                >
                  <el-icon aria-hidden="true">
                    <component
                      :is="retentionStatusIcon(selectedInputRetentionStatus)"
                    />
                  </el-icon>
                  {{ inputRetentionLabel(selectedInputRetentionStatus) }}
                </span>
              </div>
              <dl class="task-history-dialog__card-meta">
                <div>
                  <dt>文件数量</dt>
                  <dd>
                    {{
                      sourceInputCount === undefined
                        ? "—"
                        : `${sourceInputCount} 个`
                    }}
                  </dd>
                </div>
                <div>
                  <dt>占用空间</dt>
                  <dd>
                    {{
                      sourceInputSizeBytes === undefined
                        ? "—"
                        : formatBytes(sourceInputSizeBytes)
                    }}
                  </dd>
                </div>
                <div>
                  <dt>源文件状态</dt>
                  <dd>
                    {{ inputRetentionLabel(selectedInputRetentionStatus) }}
                  </dd>
                </div>
                <div>
                  <dt>{{ sourceInputExpiryLabel }}</dt>
                  <dd>{{ sourceInputExpiry }}</dd>
                </div>
                <div>
                  <dt>保留策略</dt>
                  <dd>{{ sourceInputPolicy }}</dd>
                </div>
              </dl>
              <div class="task-history-dialog__task-actions">
                <el-button
                  size="small"
                  :disabled="!canChangeInputRetention"
                  :loading="isInputRetentionChanging"
                  class="task-history-dialog__action--secondary"
                  @click="openSourceRetentionEditor"
                  >修改保留期</el-button
                >
                <el-button
                  size="small"
                  type="danger"
                  class="task-history-dialog__action--danger"
                  :disabled="!canChangeInputRetention"
                  :loading="isInputRetentionChanging"
                  @click="purgeSourceInputs"
                  >移入源文件回收站</el-button
                >
                <el-button
                  v-if="selectedInputRetentionStatus === 'RECYCLE_BIN'"
                  size="small"
                  type="primary"
                  :loading="isInputRetentionChanging"
                  @click="restoreSourceInputs"
                  >恢复源文件</el-button
                >
                <el-button
                  v-if="selectedInputRetentionStatus === 'RECYCLE_BIN'"
                  size="small"
                  type="danger"
                  class="task-history-dialog__action--danger"
                  :loading="isInputRetentionChanging"
                  @click="permanentlyPurgeSourceInputs"
                  >永久删除源文件</el-button
                >
              </div>
            </section>

            <section
              class="task-history-dialog__detail-card task-history-dialog__artifact-card"
            >
              <div class="task-history-dialog__subheading">
                <strong>任务产物</strong>
                <span
                  class="task-history-dialog__tag"
                  :class="`is-${selectedRetentionStatus.toLowerCase()}`"
                >
                  <el-icon aria-hidden="true">
                    <component
                      :is="retentionStatusIcon(selectedRetentionStatus)"
                    />
                  </el-icon>
                  {{ retentionLabel(selectedRetentionStatus) }}
                </span>
              </div>
              <div class="task-history-dialog__detail-meta">
                <span
                  >产物总大小
                  <strong>{{ formatBytes(selectedArtifactSize) }}</strong></span
                >
                <span
                  >{{ artifactExpiryLabel }}
                  <strong>{{ cleanupTime }}</strong></span
                >
              </div>
              <div class="task-history-dialog__task-actions">
                <el-button
                  v-if="selectedActions.canPin"
                  size="small"
                  type="primary"
                  plain
                  class="task-history-dialog__action--secondary"
                  :loading="isRetentionChanging"
                  @click="changeRetention('PIN')"
                  >长期保留</el-button
                >
                <el-button
                  size="small"
                  type="warning"
                  plain
                  class="task-history-dialog__action--recycle"
                  :disabled="!selectedActions.canRecycle"
                  :loading="isRetentionChanging"
                  @click="recycleTask"
                  >移入回收站</el-button
                >
                <el-button
                  v-if="selectedActions.canRestore"
                  size="small"
                  type="primary"
                  class="task-history-dialog__action--primary"
                  :loading="isRetentionChanging"
                  @click="changeRetention('RESTORE')"
                  >恢复产物</el-button
                >
                <el-button
                  v-if="selectedActions.canPurge"
                  size="small"
                  type="danger"
                  class="task-history-dialog__action--danger"
                  :loading="isRetentionChanging"
                  @click="purgeTask"
                  >{{
                    selectedRetentionStatus === "PURGE_FAILED"
                      ? "重试永久删除"
                      : "永久删除"
                  }}</el-button
                >
                <el-tooltip
                  :content="selectedActions.reason || '下载全部产物 ZIP'"
                >
                  <span>
                    <el-button
                      size="small"
                      type="primary"
                      :disabled="!selectedActions.canDownload"
                      @click="
                        emit(
                          'download-result',
                          selectedTask.taskId,
                          selectedTask.taskNo
                        )
                      "
                      >下载全部 ZIP</el-button
                    >
                  </span>
                </el-tooltip>
              </div>

              <div
                v-if="isDetailLoading"
                class="task-history-dialog__empty"
                role="status"
              >
                正在加载任务详情…
              </div>
              <p
                v-else-if="detailError"
                class="task-history-dialog__detail-error"
              >
                {{ detailError }}
              </p>
              <div v-else class="task-history-dialog__artifacts">
                <div class="task-history-dialog__subheading">
                  <strong>执行详情</strong>
                  <span
                    >{{ completedStageCount }} /
                    {{ runtimeStageViews.length }} 个阶段已完成</span
                  >
                </div>
                <div
                  v-if="!runtimeStageViews.length"
                  class="task-history-dialog__empty"
                  role="status"
                >
                  <strong>任务尚未启动</strong>
                  <span>该任务没有可展示的执行阶段。</span>
                </div>
                <div
                  v-else
                  class="task-progress-dialog__timeline"
                  aria-label="阶段状态与产物"
                >
                  <article
                    v-for="view in runtimeStageViews"
                    :key="runtimeKey(view)"
                    class="task-progress-dialog__stage"
                    :class="[
                      `is-${view.status.toLowerCase()}`,
                      { 'is-expandable': Boolean(view.stage) }
                    ]"
                    :tabindex="view.stage ? 0 : -1"
                    :aria-expanded="
                      view.stage ? isStageArtifactsExpanded(view) : undefined
                    "
                    @click="handleStageClick($event, view)"
                    @keydown.enter.prevent="toggleStageArtifacts(view)"
                    @keydown.space.prevent="toggleStageArtifacts(view)"
                  >
                    <span
                      class="task-progress-dialog__stage-marker"
                      aria-hidden="true"
                    />
                    <div class="task-progress-dialog__stage-body">
                      <div class="task-progress-dialog__stage-heading">
                        <strong>{{ stageTitle(view) }}</strong>
                        <span>{{ statusLabel(view.status) }}</span>
                      </div>
                      <p>{{ stageDescription(view) }}</p>
                      <small v-if="view.stage"
                        >耗时 {{ formatStageDuration(view.stage) }}</small
                      >
                    </div>
                    <div
                      v-if="isStageArtifactsExpanded(view)"
                      :id="stageArtifactId(view)"
                      class="task-progress-dialog__stage-expanded"
                      @click.stop
                      @keydown.stop
                    >
                      <div
                        v-if="view.artifacts.length"
                        class="task-progress-dialog__artifact-list"
                        aria-label="阶段产物"
                      >
                        <div
                          v-for="artifact in view.artifacts"
                          :key="`${artifact.stageId}-${artifact.type}-${artifact.uri}`"
                          class="task-progress-dialog__artifact"
                        >
                          <div class="task-progress-dialog__artifact-main">
                            <el-icon aria-hidden="true"><Document /></el-icon>
                            <span>
                              <strong :title="artifactName(artifact)">{{
                                artifactName(artifact)
                              }}</strong>
                              <small
                                >{{ artifactFormat(artifact) }} ·
                                {{ formatBytes(artifact.sizeBytes || 0) }} ·
                                {{ artifactRetentionLabel(artifact) }}</small
                              >
                            </span>
                          </div>
                          <small
                            class="task-progress-dialog__artifact-description"
                            >{{ artifactDescription(artifact) }}</small
                          >
                          <div class="task-progress-dialog__artifact-actions">
                            <el-tooltip
                              :content="artifactPreviewHint(artifact)"
                            >
                              <span>
                                <el-button
                                  size="small"
                                  text
                                  type="primary"
                                  :disabled="!canPreviewArtifact(artifact)"
                                  @click="openArtifact(artifact)"
                                  ><el-icon
                                    ><Location
                                      v-if="isMapArtifact(artifact)" /><View
                                      v-else /></el-icon
                                  >查看</el-button
                                >
                              </span>
                            </el-tooltip>
                            <el-button
                              size="small"
                              text
                              type="primary"
                              @click="openArtifactInterpretation(artifact)"
                            >
                              <el-icon><Reading /></el-icon>
                              结果解读
                            </el-button>
                            <el-tooltip
                              :content="selectedActions.reason || '下载产物'"
                            >
                              <span>
                                <el-button
                                  size="small"
                                  text
                                  type="primary"
                                  :disabled="
                                    !selectedActions.canDownload ||
                                    artifact.downloadable === false
                                  "
                                  @click="
                                    emit(
                                      'download-artifact',
                                      selectedTask.taskId,
                                      artifact
                                    )
                                  "
                                  ><el-icon><Download /></el-icon
                                  >下载</el-button
                                >
                              </span>
                            </el-tooltip>
                          </div>
                        </div>
                      </div>
                      <p v-else class="task-history-dialog__artifact-empty">
                        该阶段未生成可下载产物
                      </p>
                    </div>
                  </article>
                  <article
                    class="task-progress-dialog__stage task-progress-dialog__quality-stage"
                    :class="qualityReportStageClass"
                  >
                    <span
                      class="task-progress-dialog__stage-marker"
                      aria-hidden="true"
                    />
                    <div class="task-progress-dialog__stage-body">
                      <div class="task-progress-dialog__stage-heading">
                        <strong>质量检测报告</strong>
                        <small class="task-progress-dialog__stage-kind"
                          >质量检测</small
                        >
                        <span>{{ qualityReportStatusLabel }}</span>
                      </div>
                      <p class="task-progress-dialog__stage-description">
                        任务级基础质量与产物完整性检查
                      </p>
                      <small class="task-progress-dialog__stage-meta">
                        {{ qualityReportMeta }}
                      </small>
                    </div>
                    <div class="task-progress-dialog__quality-actions">
                      <el-tooltip :content="qualityReportViewHint">
                        <span>
                          <el-button
                            size="small"
                            text
                            type="primary"
                            :disabled="!isSelectedTaskTerminal"
                            :loading="isLoadingQualityReport"
                            @click="
                              emit('view-quality-report', selectedTask.taskId)
                            "
                          >
                            <el-icon v-if="!isLoadingQualityReport"
                              ><View
                            /></el-icon>
                            查看
                          </el-button>
                        </span>
                      </el-tooltip>
                      <el-tooltip :content="qualityReportDownloadHint">
                        <span>
                          <el-button
                            size="small"
                            text
                            type="primary"
                            :disabled="!isSelectedTaskTerminal"
                            :loading="isDownloadingQualityReport"
                            @click="
                              emit(
                                'download-quality-report',
                                selectedTask.taskId
                              )
                            "
                          >
                            <el-icon v-if="!isDownloadingQualityReport"
                              ><Download
                            /></el-icon>
                            下载
                          </el-button>
                        </span>
                      </el-tooltip>
                    </div>
                  </article>
                </div>
              </div>
            </section>
          </template>
        </aside>
      </div>
    </section>
    <section
      v-show="isInterpretationOpen"
      ref="interpretationPanel"
      class="task-history-dialog__interpretation-dialog"
      :style="interpretationPanelStyle"
      role="dialog"
      aria-modal="false"
      aria-labelledby="task-history-interpretation-title"
      @pointerdown.capture="activateInterpretation"
    >
      <header
        class="task-history-dialog__interpretation-header"
        title="可拖动窗口"
        @pointerdown="startInterpretationDrag"
      >
        <strong id="task-history-interpretation-title">结果依据</strong>
        <el-button
          size="small"
          text
          circle
          aria-label="关闭结果说明"
          title="关闭"
          @click.stop="isInterpretationOpen = false"
        >
          <el-icon><Close /></el-icon>
        </el-button>
      </header>
      <div
        v-if="selectedInterpretationArtifact"
        class="task-history-dialog__interpretation-body"
      >
        <ArtifactInterpretationPanel
          :artifact="selectedInterpretationArtifact"
          :stages="selectedProgress?.stages ?? []"
          :fallback-description="
            artifactDescription(selectedInterpretationArtifact)
          "
        />
      </div>
      <span
        v-for="handle in resizeHandles"
        :key="`interpretation-${handle}`"
        class="task-history-dialog__interpretation-resize-handle"
        :class="`is-${handle}`"
        aria-hidden="true"
        @pointerdown.stop="beginInterpretationResize(handle, $event)"
      />
    </section>
  </Teleport>
</template>

<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  reactive,
  ref,
  watch
} from "vue";
import { ElMessageBox, type ElMessageBoxOptions } from "element-plus";
import {
  Document,
  Box,
  CircleCheck,
  Close,
  Delete,
  Download,
  FolderOpened,
  Location,
  Reading,
  Search,
  Timer,
  WarningFilled,
  View
} from "@element-plus/icons-vue";
import { message } from "@/utils/message";
import {
  batchChangeProcessingTaskArtifactRetention,
  batchChangeProcessingTaskInputRetention,
  changeProcessingTaskArtifactRetention,
  changeProcessingTaskInputRetention,
  getProcessingProgress,
  getProcessingStorageSummary,
  getProcessingTaskHistory,
  getProcessingTaskHistoryDetail,
  purgeProcessingTaskArtifacts,
  type ArtifactRetentionOperation,
  type ExecutionProgressArtifact,
  type ExecutionProgressResponse,
  type ProcessingIdentifier,
  type ProcessingLifecycleStatus,
  type ProcessingStorageSummaryResponse,
  type TaskArtifactRetentionStatus,
  type TaskHistoryDetailResponse,
  type TaskHistoryItem,
  type TaskHistoryQueryParams,
  type TaskInputRetention,
  type TaskInputRetentionStatus
} from "@/api/multiSourceSatellite";
import {
  artifactActionsEnabled,
  historyActions
} from "@/features/multisource/taskHistory";
import { createTaskHistorySelection } from "@/features/multisource/taskHistorySelection";
import {
  clampHistoryPage,
  effectiveInputRetentionStatus,
  preflightBatchOperation,
  type BatchRetentionOperation
} from "@/features/multisource/taskHistoryBatch";
import { resolveArtifactView } from "@/features/multisource/artifactCapabilities";
import ArtifactInterpretationPanel from "@/features/multisource/ArtifactInterpretationPanel.vue";
import { useFloatingPanelStack } from "@/features/multisource/floatingPanelStack";
import {
  buildRuntimeStageViews,
  collapseRuntimeStageViews,
  formatStageDuration,
  processingStageLabel,
  processingStepStatusLabel,
  runtimeSucceededCount,
  type RuntimeStageView
} from "@/features/multisource/processingRunState";

const props = defineProps<{
  modelValue: boolean;
  isLoadingQualityReport?: boolean;
  isDownloadingQualityReport?: boolean;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  "preview-artifact": [
    taskId: ProcessingIdentifier,
    artifact: ExecutionProgressArtifact
  ];
  "download-artifact": [
    taskId: ProcessingIdentifier,
    artifact: ExecutionProgressArtifact
  ];
  "download-result": [taskId: ProcessingIdentifier, taskNo: string];
  "show-artifact-on-map": [
    taskId: ProcessingIdentifier,
    artifact: ExecutionProgressArtifact
  ];
  "view-quality-report": [taskId: ProcessingIdentifier];
  "download-quality-report": [taskId: ProcessingIdentifier];
}>();

const lifecycleOptions: ProcessingLifecycleStatus[] = [
  "SUCCEEDED",
  "FAILED",
  "CANCELED"
];
const retentionOptions: TaskArtifactRetentionStatus[] = [
  "AVAILABLE",
  "PINNED",
  "RECYCLE_BIN",
  "PURGING",
  "PURGE_FAILED",
  "PURGED",
  "MISSING"
];
const inputRetentionOptions: TaskInputRetentionStatus[] = [
  "AVAILABLE",
  "SCHEDULED",
  "RECYCLE_BIN",
  "PURGING",
  "PURGE_FAILED",
  "PURGED",
  "MISSING"
];

const filters = reactive<{
  keyword: string;
  lifecycle?: ProcessingLifecycleStatus;
  retention?: TaskArtifactRetentionStatus;
  inputRetention?: TaskInputRetentionStatus;
}>({
  keyword: "",
  lifecycle: undefined,
  retention: undefined,
  inputRetention: undefined
});
const completedRange = ref<string[]>([]);
const appliedFilterKey = ref("");
const filterKey = computed(() =>
  JSON.stringify({
    keyword: filters.keyword.trim(),
    lifecycle: filters.lifecycle ?? "",
    completedFrom: completedRange.value[0] || "",
    completedTo: completedRange.value[1] || "",
    retention: filters.retention ?? "",
    inputRetention: filters.inputRetention ?? ""
  })
);
const isFilterDirty = computed(
  () => appliedFilterKey.value !== filterKey.value
);
const isViewingSourceRecycleBin = computed(
  () => !isFilterDirty.value && filters.inputRetention === "RECYCLE_BIN"
);
const isViewingArtifactRecycleBin = computed(
  () => !isFilterDirty.value && filters.retention === "RECYCLE_BIN"
);
const activeRecycleBinScope = computed<"source" | "artifact" | null>(() => {
  if (isViewingSourceRecycleBin.value) return "source";
  if (isViewingArtifactRecycleBin.value) return "artifact";
  return null;
});
const items = ref<TaskHistoryItem[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = 10;
const selectedTask = ref<TaskHistoryItem>();
const detail = ref<TaskHistoryDetailResponse>();
const selectedProgress = ref<ExecutionProgressResponse>();
const storageSummary = ref<ProcessingStorageSummaryResponse>();
const isLoading = ref(false);
const isDetailLoading = ref(false);
const isRetentionChanging = ref(false);
const isInputRetentionChanging = ref(false);
const isBatchChanging = ref(false);
const selectionVersion = ref(0);
const batchSelection = createTaskHistorySelection();
const selectedTaskSnapshots = new Map<string, TaskHistoryItem>();
const detailError = ref("");
const totalPages = computed(() =>
  Math.max(1, Math.ceil(total.value / pageSize))
);
const selectableItems = computed(() => items.value.filter(isBatchEligible));
const isCurrentPageSelected = computed(() => {
  selectionVersion.value;
  return (
    selectableItems.value.length > 0 &&
    selectableItems.value.every(item => batchSelection.isSelected(item.taskId))
  );
});
const isCurrentPagePartiallySelected = computed(() => {
  selectionVersion.value;
  const selected = selectableItems.value.filter(item =>
    batchSelection.isSelected(item.taskId)
  ).length;
  return selected > 0 && selected < selectableItems.value.length;
});
const expandedArtifactStageIds = ref<ProcessingIdentifier[]>([]);
const selectedInterpretationArtifact = ref<ExecutionProgressArtifact | null>(
  null
);
const isInterpretationOpen = ref(false);
const contentElement = ref<HTMLElement | null>(null);
const historyPanel = ref<HTMLElement | null>(null);
const listPanelWidth = ref(760);
const splitContainerWidth = ref(0);

const TASK_HISTORY_SPLIT_WIDTH_STORAGE_KEY = "rs.task-history.list-width";
const TASK_HISTORY_PANEL_GEOMETRY_STORAGE_KEY =
  "rs.task-history.panel-geometry";
const HISTORY_REFRESH_INTERVAL_MS = 15000;
const MIN_LIST_PANEL_WIDTH = 520;
const MIN_DETAIL_PANEL_WIDTH = 360;
const MIN_HISTORY_PANEL_WIDTH = 760;
const MIN_HISTORY_PANEL_HEIGHT = 480;
const resizeHandles = ["n", "ne", "e", "se", "s", "sw", "w", "nw"] as const;
type ResizeHandle = (typeof resizeHandles)[number];
let splitStartX = 0;
let splitStartWidth = 0;
let activePanelDrag: { offsetX: number; offsetY: number } | null = null;
let activePanelResize: {
  handle: ResizeHandle;
  startX: number;
  startY: number;
  left: number;
  top: number;
  width: number;
  height: number;
} | null = null;
let interpretationDrag: { offsetX: number; offsetY: number } | null = null;
let activeInterpretationResize: {
  handle: ResizeHandle;
  startX: number;
  startY: number;
  left: number;
  top: number;
  width: number;
  height: number;
} | null = null;
let panelResizeObserver: ResizeObserver | undefined;
let historyRefreshTimer: number | undefined;
let isHistoryRefreshing = false;

const visible = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit("update:modelValue", value)
});
const panelPosition = ref(centeredHistoryPanelPosition(1480, 760));
const interpretationPanel = ref<HTMLElement | null>(null);
const interpretationPosition = ref(centeredHistoryPanelPosition(720, 560));
const hasPlacedInterpretationPanel = ref(false);
const { panelZIndex, bringToFront } = useFloatingPanelStack();
const historyPanelStyle = computed(() => ({
  left: `${panelPosition.value.left}px`,
  top: `${panelPosition.value.top}px`,
  width: `${panelPosition.value.width}px`,
  height: `${panelPosition.value.height}px`,
  zIndex: panelZIndex("task-history")
}));
const interpretationPanelStyle = computed(() => ({
  left: `${interpretationPosition.value.left}px`,
  top: `${interpretationPosition.value.top}px`,
  width: `${interpretationPosition.value.width}px`,
  height: `${interpretationPosition.value.height}px`,
  zIndex: panelZIndex("result-interpretation")
}));

function floatingMessageBoxOptions<T extends ElMessageBoxOptions>(options: T) {
  bringToFront("message-box");
  return {
    ...options,
    appendTo: document.body,
    modalClass: "task-history-dialog__message-box-overlay"
  };
}
const selectedRetentionStatus = computed<TaskArtifactRetentionStatus>(
  () =>
    detail.value?.retention.status ??
    selectedTask.value?.retentionStatus ??
    "MISSING"
);
const selectedActions = computed(() =>
  historyActions(selectedRetentionStatus.value)
);
const selectedInputRetention = computed<TaskInputRetention | undefined>(
  () => detail.value?.sourceRetention ?? undefined
);
const sourceInputCount = computed(() => detail.value?.sourceInputCount);
const sourceInputSizeBytes = computed(() => detail.value?.sourceInputSizeBytes);
const selectedInputRetentionStatus = computed<TaskInputRetentionStatus>(() =>
  effectiveInputRetentionStatus(
    selectedInputRetention.value?.status ??
      selectedTask.value?.sourceRetentionStatus ??
      "MISSING",
    sourceInputCount.value
  )
);
const canChangeInputRetention = computed(() =>
  ["AVAILABLE", "SCHEDULED", "PURGE_FAILED"].includes(
    selectedInputRetentionStatus.value
  )
);
const sourceInputExpiry = computed(() =>
  formatDate(
    selectedInputRetention.value?.recycleExpiresAt ??
      selectedInputRetention.value?.expiresAt
  )
);
const sourceInputExpiryLabel = computed(() =>
  selectedInputRetentionStatus.value === "RECYCLE_BIN"
    ? "回收站到期时间"
    : "到期时间"
);
const sourceInputPolicy = computed(() => {
  if (sourceInputCount.value === 0) return "源文件已清理";
  const retention = selectedInputRetention.value;
  if (!retention) return "按工作区默认策略";
  if (!retention.expiresAt && retention.status === "AVAILABLE") {
    return "长期保留";
  }
  return retention.expiresAt ? "到期清理" : "按工作区默认策略";
});
const selectedArtifactSize = computed(
  () =>
    detail.value?.artifactSizeBytes ??
    selectedTask.value?.artifactSizeBytes ??
    0
);
const selectedStages = computed(
  () => selectedProgress.value?.stages ?? detail.value?.detail.stages ?? []
);
const selectedArtifacts = computed(
  () =>
    selectedProgress.value?.artifacts ?? detail.value?.detail.artifacts ?? []
);
const runtimeStageViews = computed(() =>
  collapseRuntimeStageViews(
    buildRuntimeStageViews([], selectedStages.value, selectedArtifacts.value)
  )
);
const completedStageCount = computed(() =>
  runtimeSucceededCount(runtimeStageViews.value)
);
const isSelectedTaskTerminal = computed(() =>
  ["SUCCEEDED", "FAILED", "CANCELED"].includes(
    detail.value?.detail.lifecycleStatus ??
      selectedTask.value?.lifecycleStatus ??
      ""
  )
);
const qualityReportSummary = computed(
  () => selectedProgress.value?.qualityReportSummary
);
const qualityReportStatus = computed(
  () =>
    qualityReportSummary.value?.overallStatus ??
    selectedProgress.value?.qualityStatus ??
    detail.value?.detail.qualityStatus
);
const qualityReportStageClass = computed(() => {
  if (!isSelectedTaskTerminal.value) return "is-waiting";
  switch (qualityReportStatus.value?.toUpperCase()) {
    case "PASS":
      return "is-succeeded";
    case "WARN":
      return "is-needs_rerun";
    case "FAIL":
      return "is-failed";
    default:
      return "is-succeeded";
  }
});
const qualityReportStatusLabel = computed(() => {
  if (!isSelectedTaskTerminal.value) return "待生成";
  switch (qualityReportStatus.value?.toUpperCase()) {
    case "PASS":
      return "已通过";
    case "WARN":
      return "有警告";
    case "FAIL":
      return "未通过";
    default:
      return "可查看";
  }
});
const qualityReportMeta = computed(() => {
  const summary = qualityReportSummary.value;
  if (!summary) {
    return isSelectedTaskTerminal.value
      ? "任务结束后可查看报告"
      : "任务结束后生成报告";
  }
  return `检查 ${summary.totalChecks} 项 · 通过 ${summary.passedChecks} · 警告 ${summary.warningChecks} · 失败 ${summary.failedChecks}`;
});
const qualityReportViewHint = computed(() =>
  isSelectedTaskTerminal.value
    ? "质量报告作为任务记录保留，可查看"
    : "任务结束后生成质量报告"
);
const qualityReportDownloadHint = computed(() =>
  isSelectedTaskTerminal.value
    ? "质量报告作为任务记录保留，可下载"
    : "任务结束后生成质量报告"
);
const cleanupTime = computed(() => {
  const retention = detail.value?.retention;
  return formatDate(
    retention?.recycleExpiresAt ||
      retention?.purgedAt ||
      retention?.purgeStartedAt ||
      retention?.recycledAt
  );
});
const artifactExpiryLabel = computed(() =>
  selectedRetentionStatus.value === "RECYCLE_BIN"
    ? "回收站到期时间"
    : "清理时间"
);
const splitterMaxWidth = computed(() => {
  return Math.max(
    MIN_LIST_PANEL_WIDTH,
    splitContainerWidth.value - MIN_DETAIL_PANEL_WIDTH - 12
  );
});

watch(
  () => props.modelValue,
  async open => {
    if (open) {
      void refresh();
      startHistoryRefresh();
      await nextTick();
      restoreHistoryPanelGeometry();
      restoreSplitWidth();
    } else {
      stopHistoryRefresh();
    }
  }
);

onBeforeUnmount(() => {
  window.removeEventListener("pointermove", resizeSplit);
  window.removeEventListener("pointerup", finishSplitResize);
  window.removeEventListener("pointercancel", finishSplitResize);
  window.removeEventListener("resize", syncSplitContainerWidth);
  stopHistoryRefresh();
  panelResizeObserver?.disconnect();
  stopHistoryPanelInteraction();
  stopInterpretationDrag();
  stopInterpretationResize();
});

onMounted(() => {
  window.addEventListener("resize", syncSplitContainerWidth);
  if (typeof ResizeObserver !== "undefined" && historyPanel.value) {
    panelResizeObserver = new ResizeObserver(() => {
      syncSplitContainerWidth();
      clampHistoryPanelGeometry();
    });
    panelResizeObserver.observe(historyPanel.value);
  }
});

function responseData<T>(response: { data?: T }): T {
  if (response.data === undefined) throw new Error("后端响应缺少数据");
  return response.data;
}

function activateHistoryPanel() {
  bringToFront("task-history");
}

function activateInterpretation() {
  bringToFront("result-interpretation");
}

function startInterpretationDrag(event: PointerEvent) {
  if ((event.target as HTMLElement).closest("button")) return;
  event.preventDefault();
  const rect = interpretationPanel.value?.getBoundingClientRect();
  if (!rect) return;
  if (!hasPlacedInterpretationPanel.value) {
    interpretationPosition.value = centeredHistoryPanelPosition(
      rect.width,
      rect.height
    );
    hasPlacedInterpretationPanel.value = true;
  }
  interpretationPosition.value.left = rect.left;
  interpretationPosition.value.top = rect.top;
  interpretationPosition.value.width = rect.width;
  interpretationPosition.value.height = rect.height;
  interpretationDrag = {
    offsetX: event.clientX - rect.left,
    offsetY: event.clientY - rect.top
  };
  activateInterpretation();
  window.addEventListener("pointermove", handleInterpretationDrag);
  window.addEventListener("pointerup", stopInterpretationDrag, { once: true });
  window.addEventListener("pointercancel", stopInterpretationDrag, {
    once: true
  });
}

function handleInterpretationDrag(event: PointerEvent) {
  if (!interpretationDrag) return;
  interpretationPosition.value.left =
    event.clientX - interpretationDrag.offsetX;
  interpretationPosition.value.top = event.clientY - interpretationDrag.offsetY;
  const maxLeft = Math.max(
    12,
    window.innerWidth - interpretationPosition.value.width - 12
  );
  const maxTop = Math.max(12, window.innerHeight - 48);
  interpretationPosition.value.left = Math.max(
    12,
    Math.min(interpretationPosition.value.left, maxLeft)
  );
  interpretationPosition.value.top = Math.max(
    12,
    Math.min(interpretationPosition.value.top, maxTop)
  );
}

function stopInterpretationDrag() {
  interpretationDrag = null;
  window.removeEventListener("pointermove", handleInterpretationDrag);
  window.removeEventListener("pointerup", stopInterpretationDrag);
  window.removeEventListener("pointercancel", stopInterpretationDrag);
}

function beginInterpretationResize(handle: ResizeHandle, event: PointerEvent) {
  event.preventDefault();
  const rect = interpretationPanel.value?.getBoundingClientRect();
  if (!rect) return;
  activeInterpretationResize = {
    handle,
    startX: event.clientX,
    startY: event.clientY,
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height
  };
  window.addEventListener("pointermove", resizeInterpretation);
  window.addEventListener("pointerup", stopInterpretationResize, {
    once: true
  });
  window.addEventListener("pointercancel", stopInterpretationResize, {
    once: true
  });
}

function resizeInterpretation(event: PointerEvent) {
  if (!activeInterpretationResize) return;
  const resize = activeInterpretationResize;
  const dx = event.clientX - resize.startX;
  const dy = event.clientY - resize.startY;
  let left = resize.left;
  let top = resize.top;
  let width = resize.width;
  let height = resize.height;
  if (resize.handle.includes("e")) width = resize.width + dx;
  if (resize.handle.includes("s")) height = resize.height + dy;
  if (resize.handle.includes("w")) {
    width = resize.width - dx;
    left = resize.left + dx;
  }
  if (resize.handle.includes("n")) {
    height = resize.height - dy;
    top = resize.top + dy;
  }
  if (width < 620) {
    if (resize.handle.includes("w")) left = resize.left + resize.width - 620;
    width = 620;
  }
  if (height < 400) {
    if (resize.handle.includes("n")) top = resize.top + resize.height - 400;
    height = 400;
  }
  interpretationPosition.value = { left, top, width, height };
}

function stopInterpretationResize() {
  activeInterpretationResize = null;
  window.removeEventListener("pointermove", resizeInterpretation);
  window.removeEventListener("pointerup", stopInterpretationResize);
  window.removeEventListener("pointercancel", stopInterpretationResize);
}

function centeredHistoryPanelPosition(width: number, height: number) {
  if (typeof window === "undefined")
    return { left: 24, top: 72, width, height };
  const safeWidth = Math.min(
    width,
    Math.max(MIN_HISTORY_PANEL_WIDTH, window.innerWidth - 24)
  );
  const safeHeight = Math.min(
    height,
    Math.max(MIN_HISTORY_PANEL_HEIGHT, window.innerHeight - 24)
  );
  return {
    left: Math.max(12, Math.round((window.innerWidth - safeWidth) / 2)),
    top: Math.max(12, Math.round((window.innerHeight - safeHeight) / 2)),
    width: safeWidth,
    height: safeHeight
  };
}

function clampHistoryPanelGeometry() {
  const width = Math.min(
    panelPosition.value.width,
    Math.max(MIN_HISTORY_PANEL_WIDTH, window.innerWidth - 24)
  );
  const height = Math.min(
    panelPosition.value.height,
    Math.max(MIN_HISTORY_PANEL_HEIGHT, window.innerHeight - 24)
  );
  panelPosition.value.width = Math.max(MIN_HISTORY_PANEL_WIDTH, width);
  panelPosition.value.height = Math.max(MIN_HISTORY_PANEL_HEIGHT, height);
  panelPosition.value.left = Math.max(
    12,
    Math.min(
      panelPosition.value.left,
      window.innerWidth - panelPosition.value.width - 12
    )
  );
  panelPosition.value.top = Math.max(
    12,
    Math.min(panelPosition.value.top, window.innerHeight - 48)
  );
}

function restoreHistoryPanelGeometry() {
  const stored = window.localStorage.getItem(
    TASK_HISTORY_PANEL_GEOMETRY_STORAGE_KEY
  );
  if (stored) {
    try {
      const geometry = JSON.parse(stored) as Partial<
        typeof panelPosition.value
      >;
      panelPosition.value = {
        ...panelPosition.value,
        ...geometry
      };
    } catch {
      panelPosition.value = centeredHistoryPanelPosition(1480, 760);
    }
  }
  clampHistoryPanelGeometry();
}

function persistHistoryPanelGeometry() {
  window.localStorage.setItem(
    TASK_HISTORY_PANEL_GEOMETRY_STORAGE_KEY,
    JSON.stringify(panelPosition.value)
  );
}

function startHistoryPanelDrag(event: PointerEvent) {
  if ((event.target as HTMLElement).closest("button, input, textarea, select"))
    return;
  const rect = historyPanel.value?.getBoundingClientRect();
  if (!rect) return;
  activePanelDrag = {
    offsetX: event.clientX - rect.left,
    offsetY: event.clientY - rect.top
  };
  window.addEventListener("pointermove", handleHistoryPanelDrag);
  window.addEventListener("pointerup", stopHistoryPanelInteraction, {
    once: true
  });
  window.addEventListener("pointercancel", stopHistoryPanelInteraction, {
    once: true
  });
}

function handleHistoryPanelDrag(event: PointerEvent) {
  if (!activePanelDrag) return;
  panelPosition.value.left = event.clientX - activePanelDrag.offsetX;
  panelPosition.value.top = event.clientY - activePanelDrag.offsetY;
  clampHistoryPanelGeometry();
}

function beginHistoryPanelResize(handle: ResizeHandle, event: PointerEvent) {
  event.preventDefault();
  const rect = historyPanel.value?.getBoundingClientRect();
  if (!rect) return;
  activePanelResize = {
    handle,
    startX: event.clientX,
    startY: event.clientY,
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height
  };
  window.addEventListener("pointermove", resizeHistoryPanel);
  window.addEventListener("pointerup", stopHistoryPanelInteraction, {
    once: true
  });
  window.addEventListener("pointercancel", stopHistoryPanelInteraction, {
    once: true
  });
}

function resizeHistoryPanel(event: PointerEvent) {
  if (!activePanelResize) return;
  const resize = activePanelResize;
  const dx = event.clientX - resize.startX;
  const dy = event.clientY - resize.startY;
  let left = resize.left;
  let top = resize.top;
  let width = resize.width;
  let height = resize.height;
  if (resize.handle.includes("e")) width = resize.width + dx;
  if (resize.handle.includes("s")) height = resize.height + dy;
  if (resize.handle.includes("w")) {
    width = resize.width - dx;
    left = resize.left + dx;
  }
  if (resize.handle.includes("n")) {
    height = resize.height - dy;
    top = resize.top + dy;
  }
  if (width < MIN_HISTORY_PANEL_WIDTH) {
    if (resize.handle.includes("w"))
      left = resize.left + resize.width - MIN_HISTORY_PANEL_WIDTH;
    width = MIN_HISTORY_PANEL_WIDTH;
  }
  if (height < MIN_HISTORY_PANEL_HEIGHT) {
    if (resize.handle.includes("n"))
      top = resize.top + resize.height - MIN_HISTORY_PANEL_HEIGHT;
    height = MIN_HISTORY_PANEL_HEIGHT;
  }
  panelPosition.value = { left, top, width, height };
  clampHistoryPanelGeometry();
}

function stopHistoryPanelInteraction() {
  if (activePanelDrag || activePanelResize) persistHistoryPanelGeometry();
  activePanelDrag = null;
  activePanelResize = null;
  window.removeEventListener("pointermove", handleHistoryPanelDrag);
  window.removeEventListener("pointermove", resizeHistoryPanel);
  window.removeEventListener("pointerup", stopHistoryPanelInteraction);
  window.removeEventListener("pointercancel", stopHistoryPanelInteraction);
}

function formatBytes(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(
    Math.floor(Math.log(value) / Math.log(1024)),
    units.length - 1
  );
  const amount = value / 1024 ** index;
  return `${amount >= 10 || index === 0 ? amount.toFixed(0) : amount.toFixed(1)} ${units[index]}`;
}

function formatDate(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("zh-CN", { hour12: false });
}

function lifecycleLabel(status: ProcessingLifecycleStatus): string {
  return {
    CREATED: "已创建",
    RUNNING: "执行中",
    RECOVERY_PENDING: "等待恢复",
    SUCCEEDED: "已完成",
    FAILED: "执行失败",
    CANCELED: "已取消"
  }[status];
}

function retentionLabel(status: TaskArtifactRetentionStatus): string {
  return {
    AVAILABLE: "可用",
    PINNED: "长期保留",
    RECYCLE_BIN: "回收站",
    PURGING: "清理中",
    PURGE_FAILED: "清理失败",
    PURGED: "已永久删除",
    MISSING: "文件缺失"
  }[status];
}

function inputRetentionLabel(status: TaskInputRetentionStatus): string {
  return {
    AVAILABLE: "可用",
    SCHEDULED: "已安排清理",
    RECYCLE_BIN: "回收站",
    PURGING: "清理中",
    PURGE_FAILED: "清理失败",
    PURGED: "已清理",
    MISSING: "文件缺失"
  }[status];
}

function retentionStatusIcon(
  status: TaskArtifactRetentionStatus | TaskInputRetentionStatus
) {
  switch (status) {
    case "AVAILABLE":
    case "PINNED":
      return CircleCheck;
    case "RECYCLE_BIN":
    case "PURGED":
      return Delete;
    case "SCHEDULED":
    case "PURGING":
      return Timer;
    default:
      return WarningFilled;
  }
}

function restoreSplitWidth() {
  syncSplitContainerWidth();
  if (!visible.value || splitContainerWidth.value === 0) {
    if (visible.value) window.requestAnimationFrame(restoreSplitWidth);
    return;
  }
  const storedWidth = Number.parseInt(
    window.localStorage.getItem(TASK_HISTORY_SPLIT_WIDTH_STORAGE_KEY) || "",
    10
  );
  const defaultWidth = Math.round(splitContainerWidth.value * 0.58);
  listPanelWidth.value = clampSplitWidth(
    Number.isFinite(storedWidth) ? storedWidth : defaultWidth
  );
}

function syncSplitContainerWidth() {
  splitContainerWidth.value = contentElement.value?.clientWidth ?? 0;
  if (
    splitContainerWidth.value > 0 &&
    !window.matchMedia("(max-width: 900px)").matches
  ) {
    listPanelWidth.value = clampSplitWidth(listPanelWidth.value);
  }
}

function clampSplitWidth(width: number): number {
  return Math.min(
    splitterMaxWidth.value,
    Math.max(MIN_LIST_PANEL_WIDTH, width)
  );
}

function beginSplitResize(event: PointerEvent) {
  if (window.matchMedia("(max-width: 900px)").matches) return;
  event.preventDefault();
  syncSplitContainerWidth();
  splitStartX = event.clientX;
  splitStartWidth = listPanelWidth.value;
  window.addEventListener("pointermove", resizeSplit);
  window.addEventListener("pointerup", finishSplitResize, { once: true });
  window.addEventListener("pointercancel", finishSplitResize, { once: true });
}

function resizeSplit(event: PointerEvent) {
  listPanelWidth.value = clampSplitWidth(
    splitStartWidth + event.clientX - splitStartX
  );
}

function finishSplitResize() {
  window.removeEventListener("pointermove", resizeSplit);
  window.removeEventListener("pointerup", finishSplitResize);
  window.removeEventListener("pointercancel", finishSplitResize);
  window.localStorage.setItem(
    TASK_HISTORY_SPLIT_WIDTH_STORAGE_KEY,
    String(listPanelWidth.value)
  );
}

function resizeSplitWithKeyboard(event: KeyboardEvent) {
  const step = event.shiftKey ? 80 : 24;
  let nextWidth: number | undefined;
  if (event.key === "ArrowLeft") nextWidth = listPanelWidth.value - step;
  if (event.key === "ArrowRight") nextWidth = listPanelWidth.value + step;
  if (event.key === "Home") nextWidth = MIN_LIST_PANEL_WIDTH;
  if (event.key === "End") nextWidth = splitterMaxWidth.value;
  if (nextWidth === undefined) return;
  event.preventDefault();
  listPanelWidth.value = clampSplitWidth(nextWidth);
  window.localStorage.setItem(
    TASK_HISTORY_SPLIT_WIDTH_STORAGE_KEY,
    String(listPanelWidth.value)
  );
}

function artifactName(artifact: ExecutionProgressArtifact): string {
  return artifact.displayName || artifact.uri.split("/").pop() || artifact.type;
}

function runtimeKey(view: RuntimeStageView): string | number {
  return view.stage?.stageId ?? view.step.key;
}

function stageTitle(view: RuntimeStageView): string {
  const stageCode = view.stage?.stageCode || view.stage?.stageKey;
  if (!stageCode) return view.step.title;
  const isHy2d =
    selectedTask.value?.productCodes.some(productCode =>
      /HY-2D|ALTIMETER/i.test(productCode)
    ) ?? false;
  return processingStageLabel(stageCode, isHy2d);
}

function stageDescription(view: RuntimeStageView): string {
  const rawDescription = view.stage?.description?.trim();
  const stageCode = view.stage?.stageCode || view.stage?.stageKey;
  if (
    rawDescription &&
    rawDescription !== stageCode &&
    !/^[A-Z][A-Z0-9_]+$/.test(rawDescription)
  ) {
    return rawDescription;
  }
  if (view.status === "SUCCEEDED") return "阶段已完成";
  if (view.status === "PROCESSING") return "正在执行该阶段";
  if (view.status === "FAILED") return "请查看错误信息并重试";
  return "等待前置阶段完成";
}

function statusLabel(status: RuntimeStageView["status"]): string {
  return processingStepStatusLabel(status);
}

function stageArtifactId(view: RuntimeStageView): string {
  return `task-history-artifacts-${String(runtimeKey(view)).replace(/[^a-z0-9_-]/gi, "-")}`;
}

function isStageArtifactsExpanded(view: RuntimeStageView): boolean {
  return Boolean(
    view.stage && expandedArtifactStageIds.value.includes(view.stage.stageId)
  );
}

function toggleStageArtifacts(view: RuntimeStageView) {
  if (!view.stage) return;
  const stageId = view.stage.stageId;
  const index = expandedArtifactStageIds.value.findIndex(
    id => String(id) === String(stageId)
  );
  if (index >= 0) {
    expandedArtifactStageIds.value = expandedArtifactStageIds.value.filter(
      (_, currentIndex) => currentIndex !== index
    );
  } else {
    expandedArtifactStageIds.value = [
      ...expandedArtifactStageIds.value,
      stageId
    ];
  }
}

function handleStageClick(event: MouseEvent, view: RuntimeStageView) {
  if (!view.stage) return;
  const target = event.target;
  if (
    target instanceof HTMLElement &&
    target.closest("button, a, [role='button']")
  ) {
    return;
  }
  toggleStageArtifacts(view);
}

function artifactFormat(artifact: ExecutionProgressArtifact): string {
  return (
    artifact.format || resolveArtifactView(artifact).format || artifact.type
  );
}

function artifactRetentionLabel(artifact: ExecutionProgressArtifact): string {
  return artifact.retention === "FINAL" ? "最终产物" : "中间产物";
}

function artifactDescription(artifact: ExecutionProgressArtifact): string {
  return (
    artifact.description?.trim() ||
    "本阶段生成的处理产物，可根据格式查看或下载。"
  );
}

function artifactPreviewHint(artifact: ExecutionProgressArtifact): string {
  const view = resolveArtifactView(artifact);
  return view.enabled
    ? "在线查看产物"
    : view.reason || "该产物暂不支持在线查看，请下载后查看";
}

function canPreviewArtifact(artifact: ExecutionProgressArtifact): boolean {
  const view = resolveArtifactView(artifact);
  return selectedActions.value.canPreview && view.enabled;
}

function isMapArtifact(artifact: ExecutionProgressArtifact): boolean {
  return resolveArtifactView(artifact).mode === "map";
}

function historyQuery(): TaskHistoryQueryParams {
  return {
    keyword: filters.keyword.trim() || undefined,
    lifecycle: filters.lifecycle,
    completedFrom: completedRange.value[0] || undefined,
    completedTo: completedRange.value[1] || undefined,
    retention: filters.retention,
    inputRetention: filters.inputRetention,
    page: page.value,
    pageSize
  };
}

function resetFilters() {
  filters.keyword = "";
  filters.lifecycle = undefined;
  filters.retention = undefined;
  filters.inputRetention = undefined;
  completedRange.value = [];
  page.value = 1;
  void loadHistory();
}

function isBatchEligible(item: TaskHistoryItem): boolean {
  return (
    ["AVAILABLE", "SCHEDULED", "RECYCLE_BIN", "PURGE_FAILED"].includes(
      item.sourceRetentionStatus
    ) ||
    ["AVAILABLE", "PINNED", "RECYCLE_BIN", "PURGE_FAILED"].includes(
      item.retentionStatus
    )
  );
}

function isBatchSelected(item: TaskHistoryItem): boolean {
  selectionVersion.value;
  return batchSelection.isSelected(item.taskId);
}

function toggleBatchSelection(item: TaskHistoryItem) {
  batchSelection.toggle({
    taskId: item.taskId,
    eligible: isBatchEligible(item)
  });
  syncTaskSnapshots([item]);
  selectionVersion.value += 1;
}

function toggleCurrentPage() {
  const before = new Set(batchSelection.selectedIds);
  batchSelection.togglePage(
    selectableItems.value.map(item => ({ taskId: item.taskId }))
  );
  for (const item of selectableItems.value) {
    const key = String(item.taskId);
    if (batchSelection.isSelected(item.taskId))
      selectedTaskSnapshots.set(key, item);
    else if (before.has(key)) selectedTaskSnapshots.delete(key);
  }
  selectionVersion.value += 1;
}

function clearBatchSelection() {
  batchSelection.clear();
  selectedTaskSnapshots.clear();
  selectionVersion.value += 1;
}

function syncTaskSnapshots(rows: TaskHistoryItem[]) {
  for (const item of rows) {
    const key = String(item.taskId);
    if (batchSelection.isSelected(item.taskId))
      selectedTaskSnapshots.set(key, item);
    else selectedTaskSnapshots.delete(key);
  }
}

function selectedBatchTaskIds(
  operation: BatchRetentionOperation
): ProcessingIdentifier[] {
  return selectedBatchTasks(operation).map(item => item.taskId);
}

function selectedBatchTasks(
  operation: BatchRetentionOperation
): TaskHistoryItem[] {
  const selected = batchSelection.selectedIds
    .map(id => selectedTaskSnapshots.get(id))
    .filter((item): item is TaskHistoryItem => Boolean(item));
  return preflightBatchOperation(selected, operation).eligible;
}

function selectedBatchConfirmations(
  operation: BatchRetentionOperation
): Record<string, string> | undefined {
  if (operation !== "PURGE") return undefined;
  return Object.fromEntries(
    selectedBatchTasks(operation).map(item => [
      String(item.taskId),
      item.taskNo
    ])
  );
}

function reportBatchResult(
  results: Array<{ outcome: string }>,
  action: string
) {
  const changed = results.filter(result => result.outcome === "CHANGED").length;
  const skipped = results.filter(result => result.outcome === "SKIPPED").length;
  const failed = results.filter(result => result.outcome === "FAILED").length;
  message(`${action}：已处理 ${changed}，跳过 ${skipped}，失败 ${failed}`, {
    type: failed ? "warning" : "success"
  });
}

async function confirmBatchPreflight(operation: BatchRetentionOperation) {
  const selected = batchSelection.selectedIds
    .map(id => selectedTaskSnapshots.get(id))
    .filter((item): item is TaskHistoryItem => Boolean(item));
  const { eligible, ineligible } = preflightBatchOperation(selected, operation);
  if (!ineligible.length) return eligible.length > 0;
  const names = ineligible
    .map(item => `${item.taskNo}（${item.taskName}）`)
    .join("、");
  const action =
    operation === "RECYCLE"
      ? "任务产物移入回收站"
      : operation === "PURGE_ARTIFACT"
        ? "任务产物永久删除"
        : "原始输入操作";
  try {
    await ElMessageBox.confirm(
      `共选择 ${selected.length} 个任务，其中 ${ineligible.length} 个不可执行${action}：${names}。不可操作项将跳过，是否继续处理其余 ${eligible.length} 个任务？`,
      `${action}前校验`,
      floatingMessageBoxOptions({
        confirmButtonText: eligible.length ? "跳过并继续" : "知道了",
        cancelButtonText: eligible.length ? "取消" : "关闭",
        type: eligible.length ? "warning" : "info"
      })
    );
  } catch {
    return false;
  }
  if (!eligible.length) {
    message("所选任务均不可执行该批量操作", { type: "warning" });
    return false;
  }
  return true;
}

async function submitBatchSourceRetention(
  operation: "SET_EXPIRY" | "PURGE" | "RECYCLE",
  expiresAt?: string
) {
  if (!batchSelection.selectedCount || isBatchChanging.value) return;
  isBatchChanging.value = true;
  try {
    const result = responseData(
      await batchChangeProcessingTaskInputRetention({
        taskIds: selectedBatchTaskIds(
          operation === "RECYCLE" ? "RECYCLE_SOURCE" : operation
        ),
        operation,
        workspaceKey: "default",
        expiresAt,
        confirmations: selectedBatchConfirmations(operation)
      })
    );
    reportBatchResult(
      result.results,
      operation === "RECYCLE"
        ? "源文件已移入回收站"
        : operation === "PURGE"
          ? "源文件已永久删除"
          : "原始输入保留期已更新"
    );
    clearBatchSelection();
    await refresh();
  } catch (error) {
    message(error instanceof Error ? error.message : "原始输入批量操作失败", {
      type: "error"
    });
  } finally {
    isBatchChanging.value = false;
  }
}

async function openBatchSourceRetention() {
  if (!batchSelection.selectedCount || isBatchChanging.value) return;
  if (!(await confirmBatchPreflight("SET_EXPIRY"))) return;
  let days: number;
  try {
    const result = await ElMessageBox.prompt(
      "输入从当前时刻起保留的天数。此操作只更新原始输入，不影响任务产物。",
      "批量设置原始输入保留期",
      floatingMessageBoxOptions({
        confirmButtonText: "设置保留期",
        cancelButtonText: "取消",
        inputPlaceholder: "例如 14",
        inputPattern: /^\d+$/,
        inputErrorMessage: "请输入非负整数天数"
      })
    );
    days = Number(result.value);
  } catch {
    return;
  }
  const expiresAt = new Date(
    Date.now() + days * 24 * 60 * 60 * 1000
  ).toISOString();
  await submitBatchSourceRetention("SET_EXPIRY", expiresAt);
}

async function batchRecycleSourceInputs() {
  if (!batchSelection.selectedCount || isBatchChanging.value) return;
  if (!(await confirmBatchPreflight("RECYCLE_SOURCE"))) return;
  try {
    await ElMessageBox.confirm(
      "将所选任务的原始输入移入回收站。任务产物、任务记录和质量报告将保留，回收期内可恢复。",
      "批量移入源文件回收站",
      floatingMessageBoxOptions({
        confirmButtonText: "移入源文件回收站",
        cancelButtonText: "取消",
        type: "warning"
      })
    );
  } catch {
    return;
  }
  await submitBatchSourceRetention("RECYCLE");
}

async function batchPermanentlyPurgeSourceInputs() {
  if (!batchSelection.selectedCount || isBatchChanging.value) return;
  if (!(await confirmBatchPreflight("PURGE"))) return;
  try {
    await ElMessageBox.confirm(
      "将永久删除所选任务的原始输入，操作不可恢复。任务产物、任务记录和质量报告将保留。",
      "批量永久删除源文件",
      floatingMessageBoxOptions({
        confirmButtonText: "永久删除",
        cancelButtonText: "取消",
        type: "error"
      })
    );
  } catch {
    return;
  }
  await submitBatchSourceRetention("PURGE");
}

async function batchRecycleArtifacts() {
  if (!batchSelection.selectedCount || isBatchChanging.value) return;
  if (!(await confirmBatchPreflight("RECYCLE"))) return;
  try {
    await ElMessageBox.confirm(
      "将所选任务产物移入回收站。原始输入、任务记录和质量报告将保留。",
      "批量移入产物回收站",
      floatingMessageBoxOptions({
        confirmButtonText: "移入任务产物回收站",
        cancelButtonText: "取消",
        type: "warning"
      })
    );
  } catch {
    return;
  }
  isBatchChanging.value = true;
  try {
    const result = responseData(
      await batchChangeProcessingTaskArtifactRetention({
        taskIds: selectedBatchTaskIds("RECYCLE"),
        operation: "RECYCLE"
      })
    );
    reportBatchResult(result.results, "任务产物已移入回收站");
    clearBatchSelection();
    await refresh();
  } catch (error) {
    message(error instanceof Error ? error.message : "任务产物批量操作失败", {
      type: "error"
    });
  } finally {
    isBatchChanging.value = false;
  }
}

async function batchPermanentlyPurgeArtifacts() {
  if (!batchSelection.selectedCount || isBatchChanging.value) return;
  if (!(await confirmBatchPreflight("PURGE_ARTIFACT"))) return;
  try {
    await ElMessageBox.confirm(
      "将永久删除所选任务的全部产物，操作不可恢复。原始输入、任务记录和质量报告将保留。",
      "批量永久删除任务产物",
      floatingMessageBoxOptions({
        confirmButtonText: "永久删除",
        cancelButtonText: "取消",
        type: "error"
      })
    );
  } catch {
    return;
  }

  const targets = selectedBatchTasks("PURGE_ARTIFACT");
  isBatchChanging.value = true;
  try {
    const results = await Promise.all(
      targets.map(async target => {
        try {
          responseData(
            await purgeProcessingTaskArtifacts(target.taskId, target.taskNo)
          );
          return { outcome: "CHANGED" };
        } catch {
          return { outcome: "FAILED" };
        }
      })
    );
    reportBatchResult(results, "任务产物已永久删除");
    clearBatchSelection();
    await refresh();
  } finally {
    isBatchChanging.value = false;
  }
}

async function loadHistory(resetSelection = true, showLoading = true) {
  if (resetSelection) clearBatchSelection();
  if (showLoading) isLoading.value = true;
  try {
    const result = responseData(await getProcessingTaskHistory(historyQuery()));
    const boundedPage = clampHistoryPage(page.value, result.total, pageSize);
    if (boundedPage !== page.value) {
      page.value = boundedPage;
      await loadHistory(false, showLoading);
      return;
    }
    items.value = result.items;
    total.value = result.total;
    syncTaskSnapshots(items.value);
    appliedFilterKey.value = filterKey.value;
    if (
      selectedTask.value &&
      !items.value.some(item => item.taskId === selectedTask.value?.taskId)
    ) {
      selectedTask.value = undefined;
      detail.value = undefined;
      selectedProgress.value = undefined;
    }
  } catch (error) {
    if (showLoading) {
      message(error instanceof Error ? error.message : "历史任务加载失败", {
        type: "error"
      });
    }
  } finally {
    if (showLoading) isLoading.value = false;
  }
}

async function loadStorageSummary() {
  try {
    storageSummary.value = responseData(await getProcessingStorageSummary());
  } catch {
    storageSummary.value = undefined;
  }
}

async function refresh(resetSelection = true, silent = false) {
  await Promise.all([
    loadHistory(resetSelection, !silent),
    loadStorageSummary()
  ]);
}

function stopHistoryRefresh() {
  if (historyRefreshTimer !== undefined) {
    window.clearInterval(historyRefreshTimer);
    historyRefreshTimer = undefined;
  }
}

function startHistoryRefresh() {
  stopHistoryRefresh();
  historyRefreshTimer = window.setInterval(() => {
    void refreshHistoryView();
  }, HISTORY_REFRESH_INTERVAL_MS);
}

async function refreshHistoryView() {
  if (
    !visible.value ||
    document.hidden ||
    isFilterDirty.value ||
    isHistoryRefreshing ||
    isLoading.value
  ) {
    return;
  }
  isHistoryRefreshing = true;
  try {
    await refresh(false, true);
    await refreshSelectedTaskDetail();
  } finally {
    isHistoryRefreshing = false;
  }
}

async function refreshSelectedTaskDetail() {
  if (!selectedTask.value || isDetailLoading.value) return;
  const taskId = selectedTask.value.taskId;
  const updated = items.value.find(item => item.taskId === taskId);
  if (updated) selectedTask.value = updated;

  try {
    const nextDetail = responseData(
      await getProcessingTaskHistoryDetail(taskId)
    );
    detail.value = nextDetail;
    if (artifactActionsEnabled(nextDetail.retention.status)) {
      selectedProgress.value = responseData(
        await getProcessingProgress(taskId)
      );
    } else {
      selectedProgress.value = undefined;
    }
  } catch {
    // 自动刷新失败时保留当前详情，避免短暂网络波动清空用户视图。
  }
}

async function selectTask(task: TaskHistoryItem) {
  selectedTask.value = task;
  detail.value = undefined;
  selectedProgress.value = undefined;
  expandedArtifactStageIds.value = [];
  selectedInterpretationArtifact.value = null;
  isInterpretationOpen.value = false;
  detailError.value = "";
  isDetailLoading.value = true;
  try {
    const nextDetail = responseData(
      await getProcessingTaskHistoryDetail(task.taskId)
    );
    detail.value = nextDetail;
    if (artifactActionsEnabled(nextDetail.retention.status)) {
      selectedProgress.value = responseData(
        await getProcessingProgress(task.taskId)
      );
    }
  } catch (error) {
    detailError.value =
      error instanceof Error ? error.message : "任务详情加载失败";
  } finally {
    isDetailLoading.value = false;
  }
}

async function refreshSelectedTask() {
  const currentTaskId = selectedTask.value?.taskId;
  await refresh();
  if (currentTaskId === undefined) return;
  const updated = items.value.find(item => item.taskId === currentTaskId);
  if (updated) await selectTask(updated);
}

function changePage(delta: number) {
  page.value = Math.max(1, page.value + delta);
  void loadHistory(false);
}

async function changeRetention(operation: ArtifactRetentionOperation) {
  if (!selectedTask.value || isRetentionChanging.value) return;
  isRetentionChanging.value = true;
  try {
    responseData(
      await changeProcessingTaskArtifactRetention(
        selectedTask.value.taskId,
        operation
      )
    );
    message(operation === "PIN" ? "任务产物已长期保留" : "任务产物已恢复", {
      type: "success"
    });
    await refreshSelectedTask();
  } catch (error) {
    message(error instanceof Error ? error.message : "产物状态更新失败", {
      type: "error"
    });
  } finally {
    isRetentionChanging.value = false;
  }
}

async function recycleTask() {
  if (!selectedTask.value || isRetentionChanging.value) return;
  try {
    await ElMessageBox.confirm(
      "移入回收站后将立即禁用该任务的查看和下载，可在保留期内恢复。原始输入、任务记录和质量报告将保留。",
      "移入回收站",
      floatingMessageBoxOptions({
        confirmButtonText: "移入回收站",
        cancelButtonText: "取消",
        type: "warning"
      })
    );
  } catch {
    return;
  }
  isRetentionChanging.value = true;
  try {
    responseData(
      await changeProcessingTaskArtifactRetention(
        selectedTask.value.taskId,
        "RECYCLE"
      )
    );
    message("任务产物已移入回收站", { type: "success" });
    await refreshSelectedTask();
  } catch (error) {
    message(error instanceof Error ? error.message : "移入回收站失败", {
      type: "error"
    });
  } finally {
    isRetentionChanging.value = false;
  }
}

async function purgeTask() {
  if (!selectedTask.value || isRetentionChanging.value) return;
  const target = selectedTask.value;
  try {
    await ElMessageBox.confirm(
      "将永久删除该任务的全部输出、ZIP 和预览缓存，操作不可恢复。原始输入、任务记录和质量报告将保留。",
      "永久删除任务产物",
      floatingMessageBoxOptions({
        confirmButtonText: "永久删除",
        cancelButtonText: "取消",
        type: "error"
      })
    );
  } catch {
    return;
  }
  isRetentionChanging.value = true;
  try {
    responseData(
      await purgeProcessingTaskArtifacts(target.taskId, target.taskNo)
    );
    message("已提交永久清理任务", { type: "success" });
    await refreshSelectedTask();
  } catch (error) {
    message(error instanceof Error ? error.message : "永久清理提交失败", {
      type: "error"
    });
  } finally {
    isRetentionChanging.value = false;
  }
}

async function openSourceRetentionEditor() {
  if (!selectedTask.value || isInputRetentionChanging.value) return;
  let value: string;
  try {
    const result = await ElMessageBox.prompt(
      "输入从当前时刻起保留的天数，或输入“长期”以永久保留。此操作只影响原始输入。",
      "修改原始输入保留期",
      floatingMessageBoxOptions({
        confirmButtonText: "更新保留期",
        cancelButtonText: "取消",
        inputPlaceholder: "例如 14 或 长期",
        inputPattern: /^(\d+|长期)$/,
        inputErrorMessage: "请输入非负整数天数或“长期”"
      })
    );
    value = result.value.trim();
  } catch {
    return;
  }

  isInputRetentionChanging.value = true;
  try {
    const data =
      value === "长期"
        ? { operation: "PIN" as const, workspaceKey: "default" }
        : {
            operation: "SET_EXPIRY" as const,
            workspaceKey: "default",
            expiresAt: new Date(
              Date.now() + Number(value) * 24 * 60 * 60 * 1000
            ).toISOString()
          };
    responseData(
      await changeProcessingTaskInputRetention(selectedTask.value.taskId, data)
    );
    message(value === "长期" ? "原始输入已长期保留" : "原始输入保留期已更新", {
      type: "success"
    });
    await refreshSelectedTask();
  } catch (error) {
    message(error instanceof Error ? error.message : "原始输入保留期更新失败", {
      type: "error"
    });
  } finally {
    isInputRetentionChanging.value = false;
  }
}

async function purgeSourceInputs() {
  if (!selectedTask.value || isInputRetentionChanging.value) return;
  const target = selectedTask.value;
  try {
    await ElMessageBox.confirm(
      "移入回收站后将立即禁用该任务原始输入的访问，可在保留期内恢复。任务产物、任务记录和质量报告将保留。",
      "移入源文件回收站",
      floatingMessageBoxOptions({
        confirmButtonText: "移入回收站",
        cancelButtonText: "取消",
        type: "warning"
      })
    );
  } catch {
    return;
  }

  isInputRetentionChanging.value = true;
  try {
    responseData(
      await changeProcessingTaskInputRetention(target.taskId, {
        operation: "RECYCLE",
        workspaceKey: "default",
        taskNo: target.taskNo
      })
    );
    message("源文件已移入回收站", { type: "success" });
    await refreshSelectedTask();
  } catch (error) {
    message(error instanceof Error ? error.message : "源文件清理提交失败", {
      type: "error"
    });
  } finally {
    isInputRetentionChanging.value = false;
  }
}

async function restoreSourceInputs() {
  if (!selectedTask.value || isInputRetentionChanging.value) return;
  isInputRetentionChanging.value = true;
  try {
    responseData(
      await changeProcessingTaskInputRetention(selectedTask.value.taskId, {
        operation: "RESTORE",
        workspaceKey: "default"
      })
    );
    message("源文件已恢复", { type: "success" });
    await refreshSelectedTask();
  } catch (error) {
    message(error instanceof Error ? error.message : "源文件恢复失败", {
      type: "error"
    });
  } finally {
    isInputRetentionChanging.value = false;
  }
}

async function permanentlyPurgeSourceInputs() {
  if (!selectedTask.value || isInputRetentionChanging.value) return;
  const target = selectedTask.value;
  try {
    await ElMessageBox.confirm(
      "将永久删除该任务的原始输入，操作不可恢复。任务产物、任务记录和质量报告不会受影响。",
      "永久删除源文件",
      floatingMessageBoxOptions({
        confirmButtonText: "永久删除",
        cancelButtonText: "取消",
        type: "error"
      })
    );
  } catch {
    return;
  }

  isInputRetentionChanging.value = true;
  try {
    responseData(
      await changeProcessingTaskInputRetention(target.taskId, {
        operation: "PURGE",
        workspaceKey: "default",
        taskNo: target.taskNo
      })
    );
    message("已提交源文件永久删除", { type: "success" });
    await refreshSelectedTask();
  } catch (error) {
    message(error instanceof Error ? error.message : "源文件永久删除提交失败", {
      type: "error"
    });
  } finally {
    isInputRetentionChanging.value = false;
  }
}

function openArtifact(artifact: ExecutionProgressArtifact) {
  if (!selectedTask.value || !selectedActions.value.canPreview) return;
  if (resolveArtifactView(artifact).mode === "map") {
    emit("show-artifact-on-map", selectedTask.value.taskId, artifact);
  } else {
    emit("preview-artifact", selectedTask.value.taskId, artifact);
  }
}

function openArtifactInterpretation(artifact: ExecutionProgressArtifact) {
  if (!selectedActions.value.canPreview) return;
  selectedInterpretationArtifact.value = artifact;
  isInterpretationOpen.value = true;
  activateInterpretation();
  if (!hasPlacedInterpretationPanel.value) {
    nextTick(() => {
      interpretationPosition.value = centeredHistoryPanelPosition(720, 560);
      hasPlacedInterpretationPanel.value = true;
    });
  }
}
</script>

<style>
.task-history-dialog .el-dialog__header {
  padding: 18px 22px 14px;
  margin-right: 0;
  background: linear-gradient(110deg, #e9f6fb 0%, #f7fbfd 58%, #fff 100%);
  border-bottom: 1px solid #c8dce5;
}

.task-history-dialog .el-dialog__body {
  padding: 16px 22px 22px;
}

.task-history-dialog {
  position: fixed;
  display: flex;
  flex-direction: column;
  min-width: 760px;
  max-width: calc(100vw - 24px);
  min-height: 480px;
  max-height: calc(100vh - 24px);
  overflow: hidden;
  background: #fff;
  border: 1px solid #bfd9e5;
  border-radius: 7px;
  box-shadow: 0 18px 42px rgb(30 66 84 / 22%);
}

.task-history-dialog__header {
  flex: 0 0 auto;
  padding: 14px 20px 12px;
  touch-action: none;
  cursor: move;
  user-select: none;
  background: linear-gradient(110deg, #e9f6fb 0%, #f7fbfd 58%, #fff 100%);
  border-bottom: 1px solid #c8dce5;
}

.task-history-dialog__header-actions {
  position: relative;
  z-index: 3;
  display: inline-flex;
  align-items: center;
  margin-left: auto;
}

.task-history-dialog__resize-handle {
  position: absolute;
  z-index: 5;
  display: block;
  touch-action: none;
}

.task-history-dialog__resize-handle.is-n,
.task-history-dialog__resize-handle.is-s {
  right: 10px;
  left: 10px;
  height: 8px;
  cursor: ns-resize;
}

.task-history-dialog__resize-handle.is-n {
  top: -3px;
}

.task-history-dialog__resize-handle.is-s {
  bottom: -3px;
}

.task-history-dialog__resize-handle.is-e,
.task-history-dialog__resize-handle.is-w {
  top: 10px;
  bottom: 10px;
  width: 8px;
  cursor: ew-resize;
}

.task-history-dialog__resize-handle.is-e {
  right: -3px;
}

.task-history-dialog__resize-handle.is-w {
  left: -3px;
}

.task-history-dialog__resize-handle.is-ne,
.task-history-dialog__resize-handle.is-nw,
.task-history-dialog__resize-handle.is-se,
.task-history-dialog__resize-handle.is-sw {
  width: 14px;
  height: 14px;
}

.task-history-dialog__resize-handle.is-ne {
  top: -4px;
  right: -4px;
  cursor: nesw-resize;
}

.task-history-dialog__resize-handle.is-nw {
  top: -4px;
  left: -4px;
  cursor: nwse-resize;
}

.task-history-dialog__resize-handle.is-se {
  right: -4px;
  bottom: -4px;
  cursor: nwse-resize;
}

.task-history-dialog__resize-handle.is-sw {
  bottom: -4px;
  left: -4px;
  cursor: nesw-resize;
}

.task-history-dialog__heading,
.task-history-dialog__heading > div,
.task-history-dialog__storage,
.task-history-dialog__detail-heading,
.task-history-dialog__detail-heading > div,
.task-history-dialog__artifact,
.task-history-dialog__artifact > div,
.task-history-dialog__list-heading,
.task-history-dialog__subheading,
.task-history-dialog__pagination,
.task-history-dialog__detail-meta,
.task-history-dialog__task-actions,
.task-history-dialog__card-meta,
.task-history-dialog__artifact-actions {
  display: flex;
}

.task-history-dialog__heading,
.task-history-dialog__detail-heading,
.task-history-dialog__list-heading,
.task-history-dialog__subheading,
.task-history-dialog__pagination,
.task-history-dialog__artifact {
  align-items: center;
  justify-content: space-between;
}

.task-history-dialog__heading {
  gap: 24px;
}

.task-history-dialog__heading > div,
.task-history-dialog__detail-heading > div {
  flex-direction: column;
  min-width: 0;
}

.task-history-dialog__heading strong {
  font-size: 18px;
  color: #153a51;
}

.task-history-dialog__heading small {
  margin-top: 4px;
  font-size: 12px;
  color: #617c8c;
}

.task-history-dialog__storage {
  position: absolute;
  top: 12px;
  right: 56px;
  z-index: 1;
  flex: 0 0 auto;
  flex-wrap: wrap;
  gap: 12px 16px;
  align-items: stretch;
  max-width: calc(100% - 320px);
}

.task-history-dialog__filter-popper {
  z-index: 10000 !important;
}

.task-history-dialog__storage-group {
  display: flex;
  flex: 0 1 auto;
  gap: 8px;
  align-items: center;
  min-width: 160px;
  max-width: 100%;
  padding: 8px 10px;
  background: #fff;
  border: 1px solid #d4e3e9;
  border-radius: 4px;
}

.task-history-dialog__storage-group--source {
  background: #f6fbff;
}

.task-history-dialog__storage-group--artifacts {
  flex-wrap: wrap;
  background: #fbfdfb;
}

.task-history-dialog__storage-group > div {
  display: flex;
  flex-direction: column;
  min-width: 64px;
}

.task-history-dialog__storage-icon {
  flex: 0 0 auto;
  font-size: 18px;
  color: #3475a3;
}

.task-history-dialog__storage-group--artifacts
  .task-history-dialog__storage-icon {
  color: #3b846f;
}

.task-history-dialog__storage dt {
  display: flex;
  gap: 3px;
  align-items: center;
  font-size: 11px;
  color: #6b8593;
}

.task-history-dialog__storage-recycle-icon {
  font-size: 12px;
  color: #a36c22;
}

.task-history-dialog__storage dd {
  margin: 3px 0 0;
  font-size: 15px;
  font-weight: 700;
  color: #153a51;
}

.task-history-dialog__filters {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: stretch;
  margin-bottom: 14px;
}

.task-history-dialog__filter-group {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  min-width: 0;
  padding: 6px;
  background: #f8fbfc;
  border: 1px solid #d9e6eb;
  border-radius: 4px;
}

.task-history-dialog__filter-group--source {
  flex: 1 1 280px;
}

.task-history-dialog__filter-group--time {
  flex: 1 1 360px;
}

.task-history-dialog__filter-group--retention {
  flex: 1 1 360px;
}

.task-history-dialog__filter-group > .el-input,
.task-history-dialog__filter-group > .el-select,
.task-history-dialog__filter-group > .el-date-editor {
  flex: 1 1 150px;
  min-width: 140px;
}

.task-history-dialog__filter-label {
  flex: 0 0 auto;
  font-size: 11px;
  color: #607986;
  white-space: nowrap;
}

.task-history-dialog__retention-filter {
  min-width: 126px !important;
}

.task-history-dialog__filters :deep(.el-input:hover .el-input__wrapper),
.task-history-dialog__filters :deep(.el-select:hover .el-select__wrapper),
.task-history-dialog__filters :deep(.el-date-editor:hover) {
  box-shadow: 0 0 0 1px #65aeca inset;
}

.task-history-dialog__query-button.is-filter-dirty {
  box-shadow: 0 0 0 2px rgb(50 150 190 / 18%);
}

.task-history-dialog__reset-button {
  color: #58717d;
}

.task-history-dialog__content {
  display: flex;
  flex: 1 1 auto;
  height: auto;
  min-height: 0;
  overflow: hidden;
  border: 1px solid #d2e1e7;
}

.task-history-dialog__list {
  display: flex;
  flex: 0 0 var(--task-history-list-width, 58%);
  flex-direction: column;
  min-width: 520px;
  min-height: 0;
  padding: 14px;
  overflow-x: hidden;
  background: #fbfdfe;
}

.task-history-dialog__splitter {
  position: relative;
  z-index: 2;
  flex: 0 0 12px;
  touch-action: none;
  cursor: col-resize;
  background: #f4f8fa;
  border-right: 1px solid #d2e1e7;
  border-left: 1px solid #d2e1e7;
}

.task-history-dialog__splitter::after {
  position: absolute;
  top: 50%;
  left: 3px;
  width: 4px;
  height: 34px;
  content: "";
  background: repeating-linear-gradient(
    to bottom,
    #9ab7c4 0,
    #9ab7c4 3px,
    transparent 3px,
    transparent 6px
  );
  border-radius: 2px;
  transform: translateY(-50%);
}

.task-history-dialog__splitter:hover,
.task-history-dialog__splitter:focus-visible {
  background: #e5f3f8;
  outline: 2px solid #4d9fc1;
  outline-offset: -2px;
}

.task-history-dialog__list-heading {
  margin-bottom: 10px;
  font-size: 12px;
  color: #365566;
}

.task-history-dialog__batch-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  padding: 9px 10px;
  margin: 0 0 10px;
  color: #365566;
  background: #f8fbfc;
  border: 1px solid #d9e6eb;
  border-radius: 4px;
}

.task-history-dialog__batch-toolbar strong {
  margin-right: auto;
  font-size: 12px;
}

.task-history-dialog__batch-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding-left: 10px;
  border-left: 1px solid #d7e3e8;
}

.task-history-dialog__list-heading small,
.task-history-dialog__artifact small,
.task-history-dialog__detail-heading small {
  font-size: 11px;
  color: #6e8490;
}

.task-history-dialog__table-wrap {
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  overflow: auto auto;
}

.task-history-dialog__table {
  width: 100%;
  min-width: 730px;
  font-size: 12px;
  color: #2b4b5b;
  border-collapse: collapse;
}

.task-history-dialog__table th {
  position: sticky;
  top: 0;
  z-index: 1;
  padding: 9px 8px;
  font-size: 11px;
  font-weight: 600;
  color: #557383;
  text-align: left;
  white-space: nowrap;
  background: #edf5f8;
}

.task-history-dialog__table td {
  height: 58px;
  padding: 10px 8px;
  vertical-align: middle;
  border-bottom: 1px solid #e3edf1;
}

.task-history-dialog__selection-cell {
  width: 34px;
  padding-right: 2px !important;
  padding-left: 6px !important;
  text-align: center;
}

.task-history-dialog__table tbody tr {
  cursor: pointer;
}

.task-history-dialog__table tbody tr:hover,
.task-history-dialog__table tbody tr:focus-visible,
.task-history-dialog__table tbody tr.is-selected {
  background: #e4f5fb;
  outline: none;
}

.task-history-dialog__table strong,
.task-history-dialog__table small {
  display: block;
  max-width: 132px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-history-dialog__task-name-cell {
  min-width: 160px;
}

.task-history-dialog__task-name-cell strong {
  max-width: 220px;
  white-space: nowrap;
}

.task-history-dialog__table small {
  margin-top: 3px;
  color: #79909b;
}

.task-history-dialog__table-cell-text {
  display: block;
  max-width: 132px;
  overflow: hidden;
  line-height: 1.35;
  text-overflow: ellipsis;
  overflow-wrap: anywhere;
  white-space: normal;
}

.task-history-dialog__table td:first-child strong {
  display: -webkit-box;
  overflow: hidden;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: normal;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.task-history-dialog__tag {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  min-height: 20px;
  padding: 0 6px;
  font-size: 11px;
  color: #326175;
  white-space: nowrap;
  background: #e8f1f4;
  border-radius: 2px;
}

.task-history-dialog__retention-stack {
  display: grid;
  gap: 4px;
  min-width: 126px;
}

.task-history-dialog__tag--source,
.task-history-dialog__tag--artifact {
  width: fit-content;
}

.task-history-dialog__tag--source strong,
.task-history-dialog__tag--artifact strong {
  display: inline;
  max-width: none;
  overflow: visible;
  font-size: inherit;
  font-weight: 700;
  text-overflow: clip;
  white-space: nowrap;
}

.task-history-dialog__tag--source.is-available,
.task-history-dialog__tag--source.is-scheduled,
.task-history-dialog__tag--source.is-purging {
  color: #236598;
  background: #e8f3ff;
}

.task-history-dialog__tag--source.is-purge_failed,
.task-history-dialog__tag--source.is-purged,
.task-history-dialog__tag--source.is-missing {
  color: #8a3d3d;
  background: #fbe4e4;
}

.task-history-dialog__tag--artifact.is-available {
  color: #28755f;
  background: #e2f4ed;
}

.task-history-dialog__tag--artifact.is-pinned,
.task-history-dialog__tag--artifact.is-recycle_bin {
  color: #8a5b13;
  background: #fff1dd;
}

.task-history-dialog__tag.is-lifecycle,
.task-history-dialog__tag.is-available {
  color: #1e6b68;
  background: #dcf1ed;
}

.task-history-dialog__tag.is-pinned {
  color: #68550b;
  background: #fff1bd;
}

.task-history-dialog__tag.is-recycle_bin {
  color: #9a5d13;
  background: #fff0dd;
}

.task-history-dialog__tag.is-purging {
  color: #47667c;
  background: #e3edf3;
}

.task-history-dialog__tag.is-purge_failed,
.task-history-dialog__tag.is-purged,
.task-history-dialog__tag.is-missing {
  color: #8a3d3d;
  background: #fbe4e4;
}

.task-history-dialog__pagination {
  flex: 0 0 auto;
  gap: 9px;
  padding-top: 12px;
  margin-top: auto;
  font-size: 12px;
  color: #607986;
}

.task-history-dialog__detail {
  flex: 1 1 0;
  width: auto;
  min-width: 360px;
  min-height: 0;
  padding: 16px;
  overflow: hidden auto;
  background: #fff;
}

.task-history-dialog__detail-card {
  padding: 12px;
  margin-top: 12px;
  border: 1px solid #dce8ed;
  border-radius: 4px;
}

.task-history-dialog__source-card {
  background: #fbfdfd;
}

.task-history-dialog__artifact-card {
  background: #fff;
}

.task-history-dialog__detail-card .task-history-dialog__subheading {
  margin-top: 0;
}

.task-history-dialog__card-meta {
  flex-wrap: wrap;
  gap: 9px 14px;
  padding: 10px 0;
  margin: 0;
}

.task-history-dialog__card-meta div {
  min-width: 84px;
}

.task-history-dialog__card-meta dt {
  font-size: 11px;
  color: #718994;
}

.task-history-dialog__card-meta dd {
  margin: 3px 0 0;
  font-size: 12px;
  font-weight: 600;
  color: #35596b;
}

.task-history-dialog__interpretation {
  margin: 12px 0;
  background: #f7fbfc;
  border: 1px solid #cbdfe7;
}

.task-history-dialog__interpretation-heading {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  justify-content: space-between;
  padding: 10px 12px;
  border-bottom: 1px solid #dce8ed;
}

.task-history-dialog__interpretation-heading > div {
  display: grid;
  gap: 3px;
  min-width: 0;
}

.task-history-dialog__interpretation-heading small {
  overflow: hidden;
  font-size: 11px;
  color: #71838e;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-history-dialog__interpretation-body {
  flex: 1 1 auto;
  min-height: 0;
  padding: 10px 12px 12px;
  overflow: auto;
  font-size: 12px;
  line-height: 1.6;
  color: #405665;
}

.task-history-dialog__interpretation-body h4 {
  margin: 10px 0 3px;
  font-size: 12px;
  color: #314957;
}

.task-history-dialog__interpretation-body p {
  margin: 0;
}

.task-history-dialog__interpretation-dialog {
  position: fixed;
  display: flex;
  flex-direction: column;
  min-width: 620px;
  max-width: calc(100vw - 24px);
  min-height: 460px;
  max-height: calc(100vh - 24px);
  overflow: hidden;
  background: #fff;
  border: 1px solid #bfd9e5;
  border-radius: 6px;
  box-shadow: 0 14px 34px rgb(30 66 84 / 24%);
}

.task-history-dialog__interpretation-resize-handle {
  position: absolute;
  z-index: 2;
  display: block;
}

.task-history-dialog__interpretation-resize-handle.is-n,
.task-history-dialog__interpretation-resize-handle.is-s {
  right: 8px;
  left: 8px;
  height: 8px;
  cursor: ns-resize;
}

.task-history-dialog__interpretation-resize-handle.is-n {
  top: -4px;
}

.task-history-dialog__interpretation-resize-handle.is-s {
  bottom: -4px;
}

.task-history-dialog__interpretation-resize-handle.is-e,
.task-history-dialog__interpretation-resize-handle.is-w {
  top: 8px;
  bottom: 8px;
  width: 8px;
  cursor: ew-resize;
}

.task-history-dialog__interpretation-resize-handle.is-e {
  right: -4px;
}

.task-history-dialog__interpretation-resize-handle.is-w {
  left: -4px;
}

.task-history-dialog__interpretation-resize-handle.is-ne,
.task-history-dialog__interpretation-resize-handle.is-nw,
.task-history-dialog__interpretation-resize-handle.is-se,
.task-history-dialog__interpretation-resize-handle.is-sw {
  width: 12px;
  height: 12px;
}

.task-history-dialog__interpretation-resize-handle.is-ne {
  top: -5px;
  right: -5px;
  cursor: nesw-resize;
}

.task-history-dialog__interpretation-resize-handle.is-nw {
  top: -5px;
  left: -5px;
  cursor: nwse-resize;
}

.task-history-dialog__interpretation-resize-handle.is-se {
  right: -5px;
  bottom: -5px;
  cursor: nwse-resize;
}

.task-history-dialog__interpretation-resize-handle.is-sw {
  bottom: -5px;
  left: -5px;
  cursor: nesw-resize;
}

.task-history-dialog__interpretation-header {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  color: #314957;
  touch-action: none;
  cursor: move;
  user-select: none;
  background: #f4fafc;
  border-bottom: 1px solid #dce8ed;
}

.task-history-dialog__interpretation-dialog .el-dialog__body {
  font-size: 12px;
  line-height: 1.65;
  color: #405665;
}

.task-history-dialog__interpretation-dialog h4 {
  margin: 14px 0 4px;
  font-size: 12px;
  color: #314957;
}

.task-history-dialog__interpretation-dialog p {
  margin: 0;
}

.task-history-dialog__message-box-overlay {
  z-index: 9999 !important;
}

.task-progress-dialog__timeline {
  display: grid;
  gap: 8px;
  margin-top: 10px;
}

.task-progress-dialog__stage {
  position: relative;
  display: grid;
  grid-template-columns: 8px minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  min-width: 0;
  padding: 10px;
  color: #426477;
  background: #f7fafb;
  border: 1px solid #dce8ed;
  border-radius: 4px;
}

.task-progress-dialog__stage.is-expandable {
  cursor: pointer;
}

.task-progress-dialog__stage-marker {
  width: 8px;
  height: 8px;
  margin-top: 4px;
  background: #9eb5c0;
  border-radius: 50%;
}

.task-progress-dialog__stage.is-succeeded .task-progress-dialog__stage-marker {
  background: #42a37e;
}

.task-progress-dialog__stage.is-processing .task-progress-dialog__stage-marker {
  background: #3c94c1;
}

.task-progress-dialog__stage.is-failed .task-progress-dialog__stage-marker {
  background: #c76666;
}

.task-progress-dialog__stage-body {
  min-width: 0;
}

.task-progress-dialog__stage-heading {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
}

.task-progress-dialog__stage-heading span,
.task-progress-dialog__stage-body small {
  font-size: 11px;
  color: #718994;
}

.task-progress-dialog__stage-body p {
  margin: 4px 0;
  font-size: 11px;
  color: #6b828e;
}

.task-progress-dialog__stage-expanded {
  grid-column: 2 / -1;
  min-width: 0;
  padding-top: 8px;
  overflow: hidden;
  border-top: 1px solid #e0eaee;
}

.task-progress-dialog__artifact-list {
  display: grid;
  gap: 7px;
}

.task-progress-dialog__artifact {
  display: flex;
  gap: 8px;
  align-items: center;
  min-width: 0;
  padding: 7px 0;
  border-bottom: 1px solid #e4edf1;
}

.task-progress-dialog__artifact-main {
  display: flex;
  flex: 0 1 42%;
  gap: 7px;
  align-items: center;
  min-width: 0;
}

.task-progress-dialog__artifact-main > span {
  display: flex;
  flex: 1 1 auto;
  gap: 6px;
  align-items: baseline;
  min-width: 0;
  white-space: nowrap;
}

.task-progress-dialog__artifact-main strong {
  min-width: 0;
  overflow: hidden;
  font-size: 12px;
  color: #35596a;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-progress-dialog__artifact-main small,
.task-progress-dialog__artifact-description {
  overflow: hidden;
  font-size: 11px;
  color: #718994;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-progress-dialog__artifact-description {
  flex: 1 1 0;
  min-width: 0;
  margin: 0;
}

.task-progress-dialog__artifact-actions {
  display: inline-flex;
  flex: 0 0 auto;
  gap: 2px;
  align-items: center;
  white-space: nowrap;
}

.task-progress-dialog__artifact-actions > span {
  display: inline-flex;
}

.task-progress-dialog__artifact-actions :deep(.el-button) {
  min-width: 0;
  padding: 4px 5px;
}

.task-progress-dialog__artifact-actions :deep(.el-button .el-icon) {
  margin-right: 3px;
}

.task-progress-dialog__quality-stage {
  cursor: default;
}

.task-progress-dialog__quality-actions {
  display: inline-flex;
  flex: 0 0 auto;
  grid-column: 3;
  gap: 2px;
  align-items: center;
  justify-content: flex-end;
}

.task-progress-dialog__quality-actions > span {
  display: inline-flex;
}

.task-progress-dialog__quality-actions :deep(.el-button) {
  min-width: 0;
  padding: 4px 5px;
}

.task-progress-dialog__quality-actions :deep(.el-button .el-icon) {
  margin-right: 3px;
}

.task-history-dialog__detail-empty,
.task-history-dialog__empty {
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: center;
  justify-content: center;
  min-height: 150px;
  font-size: 12px;
  color: #718994;
  text-align: center;
}

.task-history-dialog__detail-empty strong {
  color: #426477;
}

.task-history-dialog__empty-icon {
  width: 34px;
  height: 34px;
  margin-bottom: 2px;
  font-size: 30px;
  color: #8bb6c6;
}

.task-history-dialog__empty span,
.task-history-dialog__detail-empty span {
  color: #718994;
}

.task-history-dialog__detail-empty--no-results {
  min-height: 220px;
  padding: 24px;
  text-align: center;
}

.task-history-dialog__notice,
.task-history-dialog__detail-error {
  padding: 8px 10px;
  font-size: 12px;
  line-height: 1.5;
  color: #845818;
  background: #fff8df;
  border-left: 3px solid #dba941;
}

.task-history-dialog__detail-error {
  color: #8d3e3e;
  background: #fff0f0;
  border-left-color: #c76666;
}

.task-history-dialog__detail-meta {
  flex-wrap: wrap;
  gap: 8px 14px;
  margin: 14px 0;
  font-size: 12px;
  color: #6d8490;
}

.task-history-dialog__detail-meta strong {
  margin-left: 4px;
  color: #35596b;
}

.task-history-dialog__task-actions {
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}

.task-history-dialog__task-actions :deep(.el-button) {
  min-width: 104px;
  height: 28px;
  padding: 0 10px;
  border-radius: 4px;
}

.task-history-dialog__action--secondary {
  font-weight: 500;
}

.task-history-dialog
  .el-button--warning.is-plain.task-history-dialog__action--recycle {
  color: #9b6417;
  background: #fffaf1;
  border-color: #e7c78d;
}

.task-history-dialog__action--danger {
  font-weight: 600;
}

.task-history-dialog :deep(.el-button.is-disabled),
.task-history-dialog :deep(.el-button.is-disabled:hover) {
  opacity: 0.5;
}

.task-history-dialog__source-card .task-history-dialog__task-actions {
  margin-bottom: 0;
}

.task-history-dialog__subheading {
  padding-bottom: 7px;
  margin-top: 16px;
  font-size: 12px;
  color: #36596a;
  border-bottom: 1px solid #dce8ed;
}

.task-history-dialog__subheading span {
  font-size: 11px;
  color: #748a95;
}

.task-history-dialog__stages {
  display: grid;
  gap: 5px;
  padding: 0;
  margin: 10px 0;
  list-style: none;
}

.task-history-dialog__stages li {
  display: flex;
  gap: 10px;
  justify-content: space-between;
  padding: 7px 8px;
  font-size: 11px;
  color: #4a6878;
  background: #f5f9fa;
  border-left: 2px solid #77bad0;
}

.task-history-dialog__stages span {
  color: #6c8390;
}

.task-history-dialog__artifact {
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid #e4edf1;
}

.task-history-dialog__artifact > div:first-child {
  flex: 1;
  min-width: 0;
}

.task-history-dialog__artifact-main {
  flex: 0 1 42%;
}

.task-history-dialog__artifact-main > span {
  flex: 1 1 auto;
  flex-direction: row;
  gap: 6px;
  align-items: baseline;
  white-space: nowrap;
}

.task-history-dialog__artifact strong {
  overflow: hidden;
  font-size: 12px;
  color: #35596a;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-history-dialog__artifact small {
  margin-top: 3px;
}

.task-history-dialog__artifact-actions {
  flex: 0 0 auto;
  flex-direction: row;
  gap: 2px;
  white-space: nowrap;
}

.task-history-dialog__artifact-empty {
  margin: 12px 0;
  font-size: 12px;
  color: #738994;
}

@media (width <= 1199px) {
  .task-history-dialog__detail {
    min-width: 320px;
  }

  .task-progress-dialog__artifact {
    flex-wrap: wrap;
    row-gap: 4px;
  }

  .task-progress-dialog__artifact-description {
    flex-basis: 100%;
    padding-left: 25px;
  }

  .task-progress-dialog__artifact-actions {
    flex: 0 0 auto;
    margin-left: auto;
  }
}

@media (width <= 900px) {
  .task-history-dialog {
    width: calc(100vw - 24px) !important;
    min-width: 0;
    height: calc(100vh - 24px) !important;
  }

  .task-history-dialog__header {
    cursor: default;
  }

  .task-history-dialog__resize-handle {
    display: none;
  }

  .task-history-dialog__filters {
    flex-direction: column;
  }

  .task-history-dialog__filter-group {
    width: 100%;
  }

  .task-history-dialog__content {
    flex-direction: column;
    height: min(72vh, 700px);
  }

  .task-history-dialog__list {
    flex: 1 1 0;
    min-width: 0;
    border-right: 0;
    border-bottom: 1px solid #d2e1e7;
  }

  .task-history-dialog__splitter {
    display: none;
  }

  .task-history-dialog__detail {
    flex: 1 1 auto;
    width: auto;
    min-height: 260px;
  }

  .task-history-dialog__storage {
    display: none;
  }

  .task-history-dialog__interpretation-dialog {
    width: calc(100vw - 24px) !important;
    height: auto !important;
  }

  .task-history-dialog__interpretation-header {
    cursor: default;
  }
}
</style>

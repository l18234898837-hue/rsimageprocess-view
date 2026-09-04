<template>
  <section class="configuration-workbench" aria-labelledby="gf6-workbench-title">
    <header class="configuration-workbench__header">
      <div>
        <span class="configuration-workbench__eyebrow">CONFIGURATION WORKSPACE</span>
        <h2 id="gf6-workbench-title">GF-6 WFV L1A 参数工作台</h2>
        <p>固定高程名义 RPC 工程处理配置</p>
      </div>
      <button type="button" class="configuration-workbench__action" @click="$emit('configure')">
        <el-icon><Setting /></el-icon>
        {{ locked ? "查看快照" : "配置参数" }}
      </button>
    </header>

    <section class="configuration-workbench__section configuration-workbench__section--bands">
      <div class="configuration-workbench__section-heading"><h3>输出波段</h3><small>当前 {{ bands.length }} 个</small></div>
      <div class="configuration-workbench__band-list"><span v-for="band in bands" :key="band">{{ band }}</span></div>
    </section>

    <section v-if="selectedTargets.some(step => step !== 'preprocess')" class="configuration-workbench__section configuration-workbench__section--outputs">
      <div class="configuration-workbench__section-heading"><h3>派生输出</h3><small>由功能选择决定</small></div>
      <div class="configuration-workbench__output-list">
        <div v-for="item in outputItems" :key="item.key" class="configuration-workbench__output-row">
          <span class="configuration-workbench__check" :class="{ 'is-selected': selectedTargets.includes(item.key) }" aria-hidden="true" />
          <strong>{{ item.label }}</strong><small>{{ selectedTargets.includes(item.key) ? "已选择" : "未选择" }}</small>
        </div>
      </div>
    </section>

    <section class="configuration-workbench__section configuration-workbench__section--parameters">
      <div class="configuration-workbench__section-heading"><h3>必要参数</h3><small>仅显示已选功能</small></div>
      <dl class="configuration-workbench__parameter-list">
        <div v-if="selectedTargets.includes('preprocess')"><dt>工程网格</dt><dd>{{ grid }}</dd></div>
        <div v-if="selectedTargets.includes('preprocess')"><dt>处理范围</dt><dd>{{ roi }}</dd></div>
        <div v-if="selectedTargets.includes('rgb-fusion')"><dt>RGB 波段</dt><dd>{{ rgbBands }}</dd></div>
        <div v-if="selectedTargets.includes('rgb-fusion')"><dt>拉伸范围</dt><dd>{{ stretch }}</dd></div>
        <div v-if="selectedTargets.includes('feature-extraction')"><dt>特征项</dt><dd>{{ featureMetrics }}</dd></div>
        <div v-if="selectedTargets.includes('anomaly-detection')"><dt>检测源</dt><dd>{{ saliency }}</dd></div>
      </dl>
    </section>

    <section class="configuration-workbench__section configuration-workbench__section--constraints">
      <div class="configuration-workbench__section-heading"><h3>工程约束</h3><small>只读</small></div>
      <div class="configuration-workbench__constraint-list"><span v-for="constraint in constraints" :key="constraint">{{ constraint }}</span></div>
    </section>
  </section>
</template>

<script setup lang="ts">
import { Setting } from "@element-plus/icons-vue";
defineEmits<{ configure: [] }>();
withDefaults(defineProps<{
  selectedTargets: readonly string[]; bands: readonly string[]; grid: string; roi: string;
  rgbBands: string; stretch: string; featureMetrics: string; saliency: string;
  constraints?: readonly string[]; locked: boolean;
}>(), { constraints: () => ["NOMINAL_RPC_NO_DEM", "accuracyStatus=UNVALIDATED", "CANDIDATE_ONLY"] });
const outputItems = [
  { key: "feature-extraction", label: "特征提取" },
  { key: "rgb-fusion", label: "RGB 融合" },
  { key: "anomaly-detection", label: "显著性检测" }
] as const;
</script>

<style scoped lang="less">
.configuration-workbench { padding: 16px; color: #20384a; background: #fff; border: 1px solid #d7e3e9; border-radius: 5px; }
.configuration-workbench__header, .configuration-workbench__section-heading { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }
.configuration-workbench__header { align-items: flex-start; padding-bottom: 14px; border-bottom: 1px solid #d7e3e9; }
.configuration-workbench__eyebrow { color: #147fa5; font-size: 10px; font-weight: 700; letter-spacing: 0.06em; }
.configuration-workbench h2 { margin: 4px 0; font-size: 17px; line-height: 1.3; }
.configuration-workbench p { margin: 0; color: #708493; font-size: 11px; }
.configuration-workbench__action { display: inline-flex; align-items: center; gap: 4px; min-height: 30px; padding: 0 9px; color: #147fa5; font-size: 11px; background: #fff; border: 1px solid #a9cbd9; border-radius: 4px; cursor: pointer; }
.configuration-workbench__action:hover { background: #e8f5fa; }
.configuration-workbench__section { padding: 14px 0; border-bottom: 1px solid #d7e3e9; }
.configuration-workbench__section:last-child { padding-bottom: 0; border-bottom: 0; }
.configuration-workbench h3 { margin: 0; font-size: 13px; }
.configuration-workbench__section-heading small { color: #708493; font-size: 11px; }
.configuration-workbench__band-list, .configuration-workbench__constraint-list { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 9px; }
.configuration-workbench__band-list span { display: inline-flex; width: fit-content; min-width: 42px; justify-content: center; padding: 4px 8px; color: #147fa5; font-family: Consolas, monospace; font-size: 11px; font-weight: 700; background: #e8f5fa; border: 1px solid #b8dce8; border-radius: 3px; }
.configuration-workbench__output-list { display: grid; gap: 6px; margin-top: 9px; }
.configuration-workbench__output-row { display: flex; min-height: 33px; align-items: center; gap: 9px; padding: 6px 9px; background: #f8fbfc; border: 1px solid #d7e3e9; border-radius: 4px; }
.configuration-workbench__check { display: grid; width: 16px; height: 16px; flex: 0 0 16px; place-items: center; border: 2px solid #78909d; border-radius: 3px; background: #fff; }
.configuration-workbench__check.is-selected { border-color: #147fa5; background: #147fa5; box-shadow: 0 0 0 2px rgb(20 127 165 / 15%); }
.configuration-workbench__check.is-selected::after { width: 7px; height: 4px; content: ""; border-bottom: 2px solid #fff; border-left: 2px solid #fff; transform: rotate(-45deg) translate(1px, -1px); }
.configuration-workbench__output-row strong { font-size: 12px; }.configuration-workbench__output-row small { margin-left: auto; color: #708493; font-size: 11px; }
.configuration-workbench__parameter-list { display: grid; gap: 0; margin: 9px 0 0; }.configuration-workbench__parameter-list div { display: grid; grid-template-columns: 70px minmax(0, 1fr); gap: 10px; padding: 7px 0; border-top: 1px solid #e6eef2; }
.configuration-workbench__parameter-list dt { color: #708493; font-size: 11px; }.configuration-workbench__parameter-list dd { min-width: 0; margin: 0; color: #20384a; font-size: 11px; font-weight: 600; overflow-wrap: anywhere; text-align: right; }
.configuration-workbench__constraint-list span { padding: 4px 6px; color: #557080; font-family: Consolas, monospace; font-size: 10px; background: #edf3f6; border: 1px solid #d7e3e9; border-radius: 3px; }
@media (max-width: 480px) { .configuration-workbench__header { display: grid; } .configuration-workbench__action { justify-self: start; } }
</style>

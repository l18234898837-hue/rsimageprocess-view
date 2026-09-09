<template>
  <div class="parameter-number-input" :class="{ 'is-disabled': disabled }">
    <button
      type="button"
      class="parameter-number-input__step"
      aria-label="减少数值"
      title="减少数值"
      :disabled="disabled || atMinimum"
      @click="stepDown"
    >
      -
    </button>
    <input
      ref="inputElement"
      :value="modelValue"
      type="number"
      :min="min"
      :max="max"
      :step="step"
      :disabled="disabled"
      @input="updateFromInput"
    />
    <button
      type="button"
      class="parameter-number-input__step"
      aria-label="增加数值"
      title="增加数值"
      :disabled="disabled || atMaximum"
      @click="stepUp"
    >
      +
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from "vue";

const props = withDefaults(
  defineProps<{
    modelValue: number | "";
    min?: number;
    max?: number;
    step?: number;
    disabled?: boolean;
  }>(),
  { disabled: false, step: 1 }
);

const emit = defineEmits<{ "update:modelValue": [value: number | ""] }>();
const inputElement = ref<HTMLInputElement>();

const numericValue = computed(() => Number(props.modelValue));
const hasNumericValue = computed(
  () => props.modelValue !== "" && Number.isFinite(numericValue.value)
);
const atMinimum = computed(
  () =>
    hasNumericValue.value &&
    props.min !== undefined &&
    numericValue.value <= props.min
);
const atMaximum = computed(
  () =>
    hasNumericValue.value &&
    props.max !== undefined &&
    numericValue.value >= props.max
);

function decimalPlaces(value: number) {
  const decimal = `${value}`.split(".")[1];
  return decimal?.length ?? 0;
}

function updateFromInput(event: Event) {
  const value = (event.target as HTMLInputElement).value;
  emit("update:modelValue", value === "" ? "" : Number(value));
}

function stepValue(direction: -1 | 1) {
  const current = hasNumericValue.value ? numericValue.value : props.min ?? 0;
  const rawValue = current + direction * props.step;
  const boundedValue = Math.min(
    props.max ?? Infinity,
    Math.max(props.min ?? -Infinity, rawValue)
  );
  const nextValue = Number(boundedValue.toFixed(decimalPlaces(props.step)));
  emit("update:modelValue", nextValue);
  notifyChange();
}

function stepDown() {
  stepValue(-1);
}

function stepUp() {
  stepValue(1);
}

function notifyChange() {
  nextTick(() =>
    inputElement.value?.dispatchEvent(new Event("change", { bubbles: true }))
  );
}
</script>

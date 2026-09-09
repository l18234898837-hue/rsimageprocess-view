<template>
  <small
    v-if="status.message"
    ref="statusElement"
    class="parameter-field__guide"
    :class="`is-${status.state}`"
    :role="status.state === 'invalid' ? 'alert' : undefined"
  >
    {{ status.message }}
  </small>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import {
  resolveParameterFieldStatus,
  type ParameterValidationIssue
} from "./parameterFieldStatus";
import { createParameterTouchState } from "./parameterTouchState";

const props = withDefaults(
  defineProps<{
    issues: readonly ParameterValidationIssue[];
    fields: readonly string[];
    guidance?: string;
    touched?: boolean;
  }>(),
  { guidance: "", touched: false }
);

const statusElement = ref<HTMLElement>();
const { touch, isTouched } = createParameterTouchState();
let fieldContainer: HTMLElement | null = null;

function markChanged(event: Event) {
  const target = event.target;
  if (
    target instanceof HTMLInputElement ||
    target instanceof HTMLSelectElement
  ) {
    touch("value");
  }
}

onMounted(() => {
  fieldContainer = statusElement.value?.closest("label, fieldset") ?? null;
  fieldContainer?.addEventListener("change", markChanged);
});

onBeforeUnmount(() => {
  fieldContainer?.removeEventListener("change", markChanged);
});

const status = computed(() =>
  resolveParameterFieldStatus(
    props.issues,
    props.fields,
    props.guidance,
    props.touched || isTouched("value")
  )
);
</script>

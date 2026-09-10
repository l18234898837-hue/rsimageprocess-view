<template>
  <small
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
import type { Ref } from "vue";
import {
  resolveParameterFieldStatus,
  type ParameterFieldPhase,
  type ParameterValidationIssue
} from "./parameterFieldStatus";

// Preserve each field's feedback while conditional rows are temporarily
// unmounted. The drawer element scopes state to a single workbench.
const phaseByScope = new WeakMap<
  HTMLElement,
  Ref<Map<string, ParameterFieldPhase>>
>();

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
let fieldContainer: HTMLElement | null = null;
const statusScope = ref<HTMLElement | null>(null);
const fieldKey = ref("");
let validationTimer: ReturnType<typeof setTimeout> | undefined;

function getPhases() {
  const scope = statusScope.value;
  if (!scope) return null;
  let phases = phaseByScope.get(scope);
  if (!phases) {
    phases = ref(new Map<string, ParameterFieldPhase>());
    phaseByScope.set(scope, phases);
  }
  return phases;
}

function currentPhase(): ParameterFieldPhase {
  if (props.touched) return "valid";
  return getPhases()?.value.get(fieldKey.value) ?? "empty";
}

function hasInitialValue() {
  const controls = fieldContainer?.querySelectorAll("input, select, textarea");
  if (!controls?.length) return false;
  return Array.from(controls).some(control => {
    if (control instanceof HTMLInputElement && control.type === "checkbox") {
      return control.checked;
    }
    return (
      (
        control as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      ).value.trim().length > 0
    );
  });
}

function setPhase(phase: ParameterFieldPhase) {
  const phases = getPhases();
  if (!phases || !fieldKey.value) return;
  const next = new Map(phases.value);
  next.set(fieldKey.value, phase);
  phases.value = next;
}

function isControl(target: EventTarget | null) {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLSelectElement ||
    target instanceof HTMLTextAreaElement
  );
}

function validateCurrentValue() {
  validationTimer = undefined;
  const hasIssue = props.issues.some(issue =>
    props.fields.includes(issue.field)
  );
  setPhase(hasIssue ? "invalid" : "valid");
}

function scheduleValidation(delay = 300) {
  if (validationTimer) clearTimeout(validationTimer);
  validationTimer = setTimeout(validateCurrentValue, delay);
}

function beginEditing(event: Event) {
  if (isControl(event.target)) setPhase("editing");
}

function markChanged(event: Event) {
  if (isControl(event.target)) {
    setPhase("editing");
    scheduleValidation();
  }
}

function finishEditing(event: FocusEvent) {
  if (!isControl(event.target)) return;
  if (
    event.relatedTarget instanceof Node &&
    fieldContainer?.contains(event.relatedTarget)
  ) {
    return;
  }
  scheduleValidation(0);
}

function getFieldKey() {
  const label = Array.from(fieldContainer?.children ?? []).find(
    child => child.tagName === "SPAN"
  )?.textContent;
  return `${props.fields.join("|")}::${label?.trim() ?? ""}`;
}

onMounted(() => {
  fieldContainer =
    statusElement.value?.closest(
      ".feature-metric-picker__parameter, label, fieldset"
    ) ?? null;
  statusScope.value =
    fieldContainer?.closest(".product-parameter-drawer, .l2a-console") ??
    fieldContainer;
  fieldKey.value = getFieldKey();
  setPhase(hasInitialValue() ? "default" : "empty");
  fieldContainer?.addEventListener("focusin", beginEditing);
  fieldContainer?.addEventListener("input", markChanged);
  fieldContainer?.addEventListener("change", markChanged);
  fieldContainer?.addEventListener("focusout", finishEditing);
});

onBeforeUnmount(() => {
  if (validationTimer) clearTimeout(validationTimer);
  fieldContainer?.removeEventListener("focusin", beginEditing);
  fieldContainer?.removeEventListener("input", markChanged);
  fieldContainer?.removeEventListener("change", markChanged);
  fieldContainer?.removeEventListener("focusout", finishEditing);
});

const status = computed(() =>
  resolveParameterFieldStatus(
    props.issues,
    props.fields,
    props.guidance,
    currentPhase()
  )
);
</script>

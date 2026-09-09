import { ref } from "vue";

export function createParameterTouchState() {
  const touchedFields = ref<ReadonlySet<string>>(new Set());

  function touch(...fields: string[]) {
    touchedFields.value = new Set([...touchedFields.value, ...fields]);
  }

  function isTouched(...fields: string[]) {
    return fields.some(field => touchedFields.value.has(field));
  }

  return { touch, isTouched };
}

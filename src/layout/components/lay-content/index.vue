<template>
  <router-view>
    <template #default="{ Component, route }">
      <transitionMain :route="route">
        <component :is="Component" :key="route.fullPath" class="main-content" />
      </transitionMain>
    </template>
  </router-view>
</template>

<script setup lang="ts">
import { h, computed, Transition, defineComponent } from "vue";

const transitions = computed(() => {
  return route => {
    return route.meta.transition;
  };
});

const transitionMain = defineComponent({
  props: {
    route: {
      type: undefined,
      required: true
    }
  },
  render() {
    const transitionName =
      transitions.value(this.route)?.name || "fade-transform";
    const enterTransition = transitions.value(this.route)?.enterTransition;
    const leaveTransition = transitions.value(this.route)?.leaveTransition;
    return h(
      Transition,
      {
        name: enterTransition ? "pure-classes-transition" : transitionName,
        enterActiveClass: enterTransition
          ? `animate__animated ${enterTransition}`
          : undefined,
        leaveActiveClass: leaveTransition
          ? `animate__animated ${leaveTransition}`
          : undefined,
        mode: "out-in",
        appear: true
      },
      {
        default: () => [this.$slots.default()]
      }
    );
  }
});
</script>

<template>
  <div class="mb-6">
    <div class="flex items-center justify-between">
      <div
        v-for="(step, idx) in steps"
        :key="step.id"
        class="flex-1 flex items-center"
      >
        <div class="flex flex-col items-center w-full">
          <div
            class="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200"
            :class="getStepClass(idx)"
          >
            <span v-if="idx < currentStep" class="text-aa-dark">
              <svg
                aria-hidden="true"
                class="w-5 h-5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fill-rule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clip-rule="evenodd"
                />
              </svg>
            </span>
            <span v-else class="text-sm font-bold">{{ idx + 1 }}</span>
          </div>
          <p
            class="mt-2 text-xs font-medium text-center"
            :class="getStepLabelClass(idx)"
          >
            {{ step.label }}
          </p>
        </div>
        <div
          v-if="idx < steps.length - 1"
          class="flex-1 h-1 transition-all duration-200"
          :class="getConnectorClass(idx)"
        ></div>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  steps: { type: Array, default: () => [] },
  currentStep: { type: Number, default: 0 },
});

function getStepClass(idx) {
  if (idx < props.currentStep) {
    return "bg-aa-success text-aa-success";
  }
  if (idx === props.currentStep) {
    return "bg-aa-orange text-aa-orange ring-2 ring-aa-orange ring-offset-2 ring-offset-aa-dark";
  }
  return "bg-aa-panel text-aa-muted";
}

function getStepLabelClass(idx) {
  if (idx < props.currentStep) return "text-aa-success";
  if (idx === props.currentStep) return "text-aa-orange";
  return "text-aa-muted";
}

function getConnectorClass(idx) {
  if (idx < props.currentStep - 1) {
    return "bg-aa-success";
  }
  if (idx === props.currentStep - 1) {
    return "bg-aa-orange";
  }
  return "bg-aa-border";
}
</script>

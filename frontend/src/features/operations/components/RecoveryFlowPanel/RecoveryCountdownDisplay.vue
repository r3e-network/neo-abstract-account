<template>
  <!-- Countdown display -->
  <div
    class="mb-5 rounded-lg border border-aa-border bg-aa-dark/60 p-6 text-center"
  >
    <p class="text-xs font-bold uppercase text-aa-muted mb-3">
      {{ t("recovery.timeRemaining", "Time Remaining") }}
    </p>
    <div class="flex items-center justify-center gap-2 mb-4">
      <span class="text-5xl font-bold font-mono text-aa-warning">{{
        formattedTimeRemaining
      }}</span>
    </div>
    <div class="relative h-2 rounded-full bg-aa-border max-w-md mx-auto">
      <div
        class="absolute left-0 top-0 h-2 rounded-full bg-aa-warning transition-all duration-1000"
        :style="{ width: timelockProgress + '%' }"
      ></div>
    </div>
  </div>
</template>

<script setup>
import { useI18n } from "@/i18n";

defineProps({
  formattedTimeRemaining: { type: String, default: "" },
  timelockProgress: { type: Number, default: 0 },
});

const { t } = useI18n();
</script>

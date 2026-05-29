<template>
  <div
    v-if="pendingUpdates.length > 0"
    class="mb-6 rounded-lg border border-aa-warning/30 bg-aa-warning/5 p-5"
  >
    <div class="flex items-center gap-2 mb-3">
      <svg
        aria-hidden="true"
        class="w-5 h-5 text-aa-warning"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
        ></path>
      </svg>
      <p class="text-xs font-bold uppercase text-aa-warning">
        {{ t("security.pendingUpdates", "Pending Updates") }}
      </p>
    </div>
    <div class="space-y-3">
      <div
        v-for="update in pendingUpdates"
        :key="update.id"
        class="flex items-start gap-3 rounded-lg bg-aa-dark/40 p-3"
      >
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-aa-text">{{ update.title }}</p>
          <p class="text-xs text-aa-muted mt-0.5">
            {{ update.description }}
          </p>
        </div>
        <div class="text-right shrink-0">
          <p class="text-sm font-mono" :class="update.timeRemainingClass">
            {{ update.timeRemaining }}
          </p>
          <button
            v-if="update.canCancel"
            class="mt-1 text-xs text-aa-warning hover:text-aa-warning-light transition-colors duration-200"
            @click="$emit('cancel-pending-update', update.id)"
          >
            {{ t("security.cancelUpdate", "Cancel") }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useI18n } from "@/i18n";

defineProps({
  pendingUpdates: { type: Array, default: () => [] },
});

defineEmits(["cancel-pending-update"]);

const { t } = useI18n();
</script>

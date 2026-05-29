<template>
  <div
    ref="overlayRef"
    class="modal-overlay"
    role="dialog"
    aria-modal="true"
    aria-labelledby="confirmation-dialog-title"
    @click.self="emit('cancel')"
    @keydown.escape="emit('cancel')"
    tabindex="-1"
  >
    <div class="modal-panel">
      <h3
        id="confirmation-dialog-title"
        class="text-lg font-bold text-aa-text font-outfit"
      >
        {{ title }}
      </h3>
      <p class="mt-3 text-sm text-aa-text leading-relaxed">
        {{ message }}
      </p>
      <div class="mt-6 flex gap-3 justify-end">
        <button class="btn-ghost" @click="emit('cancel')">
          {{ t("operations.confirmCancel", "Cancel") }}
        </button>
        <button class="btn-primary" @click="emit('confirm')">
          {{ t("operations.confirmProceed", "Confirm") }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { useI18n } from "@/i18n";

defineProps({
  open: {
    type: Boolean,
    default: false,
  },
  title: {
    type: String,
    default: "",
  },
  message: {
    type: String,
    default: "",
  },
});

const emit = defineEmits(["cancel", "confirm"]);

const { t } = useI18n();

const overlayRef = ref(null);

function focus() {
  overlayRef.value?.focus();
}

defineExpose({ focus });
</script>

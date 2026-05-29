<template>
  <div
    ref="overlayRef"
    role="dialog"
    aria-modal="true"
    aria-labelledby="shortcuts-title"
    class="modal-overlay"
    @click.self="emit('close')"
    @keydown.escape="emit('close')"
    tabindex="-1"
  >
    <div
      class="bg-aa-panel border border-aa-border rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4"
    >
      <div class="flex items-center justify-between mb-4">
        <h3
          id="shortcuts-title"
          class="text-lg font-bold font-outfit text-aa-text"
        >
          {{ t("shortcuts.title", "Keyboard Shortcuts") }}
        </h3>
        <button
          @click="emit('close')"
          :aria-label="t('shortcuts.close', 'Close keyboard shortcuts')"
          class="text-aa-muted hover:text-aa-text transition-colors duration-200"
        >
          <svg
            aria-hidden="true"
            class="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            ></path>
          </svg>
        </button>
      </div>
      <div class="space-y-3">
        <div class="flex items-center justify-between text-sm">
          <span class="text-aa-muted">{{
            t("shortcuts.toggle", "Toggle shortcuts")
          }}</span>
          <kbd
            class="px-2 py-1 rounded bg-aa-dark border border-aa-border text-xs font-mono text-aa-text"
            >?</kbd
          >
        </div>
        <div class="flex items-center justify-between text-sm">
          <span class="text-aa-muted">{{
            t("shortcuts.navigateSteps", "Navigate steps")
          }}</span>
          <div class="flex gap-1">
            <kbd
              class="px-2 py-1 rounded bg-aa-dark border border-aa-border text-xs font-mono text-aa-text"
              >Ctrl</kbd
            >
            <span class="text-aa-muted text-xs">+</span>
            <kbd
              class="px-2 py-1 rounded bg-aa-dark border border-aa-border text-xs font-mono text-aa-text"
              >1-5</kbd
            >
          </div>
        </div>
        <div class="flex items-center justify-between text-sm">
          <span class="text-aa-muted">{{
            t("shortcuts.saveDraft", "Save draft")
          }}</span>
          <div class="flex gap-1">
            <kbd
              class="px-2 py-1 rounded bg-aa-dark border border-aa-border text-xs font-mono text-aa-text"
              >Ctrl</kbd
            >
            <span class="text-aa-muted text-xs">+</span>
            <kbd
              class="px-2 py-1 rounded bg-aa-dark border border-aa-border text-xs font-mono text-aa-text"
              >S</kbd
            >
          </div>
        </div>
        <div class="flex items-center justify-between text-sm">
          <span class="text-aa-muted">{{
            t("shortcuts.broadcast", "Broadcast")
          }}</span>
          <div class="flex gap-1">
            <kbd
              class="px-2 py-1 rounded bg-aa-dark border border-aa-border text-xs font-mono text-aa-text"
              >Ctrl</kbd
            >
            <span class="text-aa-muted text-xs">+</span>
            <kbd
              class="px-2 py-1 rounded bg-aa-dark border border-aa-border text-xs font-mono text-aa-text"
              >Enter</kbd
            >
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { useI18n } from "@/i18n";

const emit = defineEmits(["close"]);

const { t } = useI18n();

const overlayRef = ref(null);

function focus() {
  overlayRef.value?.focus();
}

defineExpose({ focus });
</script>

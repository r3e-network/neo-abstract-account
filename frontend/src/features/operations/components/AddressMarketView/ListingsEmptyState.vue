<template>
  <div class="market-empty">
    <EmptyStateArt :size="160" :title="title" class="market-empty__art" />
    <p class="market-empty__title">{{ title }}</p>
    <p class="market-empty__subtitle">{{ subtitle }}</p>
  </div>
</template>

<script setup>
import { EmptyStateArt } from "@/components/illustrations";

defineProps({
  title: { type: String, default: "No listings yet" },
  subtitle: {
    type: String,
    default: "Be the first to list an AA address on the market.",
  },
});
</script>

<style scoped>
.market-empty {
  text-align: center;
  padding: 40px 24px 48px;
  color: var(--aa-text-muted, #8a92a6);
}
.market-empty__art {
  display: block;
  margin: 0 auto 12px;
}
.market-empty__title {
  font-size: 16px;
  font-weight: 700;
  color: var(--aa-text, #1e1e2e);
  margin: 0 0 6px;
}
.market-empty__subtitle {
  font-size: 13px;
  margin: 0;
}
</style>

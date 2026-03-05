<template>
  <section class="tx-info-page">
    <div class="tx-card">
      <h1>Transaction Details</h1>
      <p class="tx-help">Use the transaction hash below in your preferred Neo block explorer.</p>
      <code>{{ txid }}</code>
      <RouterLink to="/" class="tx-back">Back to Studio</RouterLink>
    </div>
  </section>
</template>

<script setup>
defineProps({
  txid: {
    type: String,
    default: ''
  }
});
</script>

<style scoped>
.tx-info-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  background: linear-gradient(145deg, #f0f4ef, #f9f7ef);
  padding: 1rem;
}

.tx-card {
  width: min(760px, 100%);
  border: 1px solid #ced8cd;
  border-radius: 16px;
  background: #fffef8;
  padding: 1.2rem;
  display: grid;
  gap: 0.7rem;
}

h1 {
  margin: 0;
}

.tx-help {
  margin: 0;
  color: #5f6a72;
}

code {
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  background: #f2f7f2;
  border: 1px solid #d1dbd2;
  border-radius: 12px;
  padding: 0.6rem;
  word-break: break-all;
}

.tx-back {
  color: #0e6962;
  font-weight: 600;
}
</style>

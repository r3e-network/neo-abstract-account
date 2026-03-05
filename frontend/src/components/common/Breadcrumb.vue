<template>
  <nav class="breadcrumb" aria-label="Breadcrumb">
    <ol>
      <li v-for="(item, index) in items" :key="`${item.label}-${index}`">
        <RouterLink v-if="item.to" :to="item.to">{{ item.label }}</RouterLink>
        <span v-else>{{ item.label }}</span>
        <span v-if="index < items.length - 1" class="sep">/</span>
      </li>
    </ol>
  </nav>
</template>

<script setup>
defineProps({
  items: {
    type: Array,
    default: () => []
  }
});
</script>

<style scoped>
.breadcrumb {
  margin-bottom: 0.75rem;
}

ol {
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  margin: 0;
  padding: 0;
  font-size: 0.84rem;
  color: #58656e;
}

a {
  color: #0f6760;
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}

.sep {
  margin-left: 0.15rem;
}
</style>

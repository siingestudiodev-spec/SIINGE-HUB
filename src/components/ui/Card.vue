<template>
  <div :class="['card', { 'card-elevated': elevated }]">
    <slot />
  </div>
</template>

<script setup>
defineProps({
  elevated: {
    type: Boolean,
    default: false
  }
})
</script>

<style scoped>
.card {
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: var(--r-3);
  padding: 1.5rem;
}

.card-elevated {
  box-shadow: var(--shadow-2);
}
</style>

<template>
  <component :is="tag" :class="['eyebrow', { 'eyebrow-muted': muted }]">
    <slot />
  </component>
</template>

<script setup>
defineProps({
  tag: {
    type: String,
    default: 'p',
    validator: (value) => ['p', 'span', 'label', 'div'].includes(value)
  },
  muted: {
    type: Boolean,
    default: true
  }
})
</script>

<style scoped>
.eyebrow {
  font-family: var(--font-sans);
  font-size: var(--fs-12);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: var(--tr-eyebrow);
  margin: 0;
  color: var(--text-muted);
}

.eyebrow-muted {
  color: var(--text-muted);
}

.eyebrow:not(.eyebrow-muted) {
  color: var(--text-main);
}
</style>

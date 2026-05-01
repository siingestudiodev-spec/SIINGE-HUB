<template>
  <component :is="tag" :class="['display', `display-${size}`]">
    <slot />
  </component>
</template>

<script setup>
defineProps({
  tag: {
    type: String,
    default: 'h1',
    validator: (value) => ['h1', 'h2', 'h3', 'div', 'span'].includes(value)
  },
  size: {
    type: String,
    default: 'md',
    validator: (value) => ['sm', 'md', 'lg'].includes(value)
  }
})
</script>

<style scoped>
.display {
  font-family: var(--font-sans);
  font-weight: 300;
  letter-spacing: -0.01em;
  line-height: 1.15;
  color: var(--text-main);
  margin: 0;
}

/* Small — 22px, weight 400 */
.display-sm {
  font-size: var(--fs-22);
  font-weight: 400;
  letter-spacing: -0.005em;
}

/* Medium — 28px, weight 300 */
.display-md {
  font-size: var(--fs-28);
  font-weight: 300;
  letter-spacing: -0.01em;
}

/* Large — 36px, weight 200 */
.display-lg {
  font-size: var(--fs-36);
  font-weight: 200;
  letter-spacing: -0.02em;
}
</style>

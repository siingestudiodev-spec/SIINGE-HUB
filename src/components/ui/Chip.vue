<template>
  <span :class="['chip', `chip-${tone}`]">
    <slot />
  </span>
</template>

<script setup>
defineProps({
  tone: {
    type: String,
    default: 'neutral',
    validator: (value) => ['neutral', 'positive', 'caution', 'critical', 'info', 'ember'].includes(value)
  }
})
</script>

<style scoped>
.chip {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-size: var(--fs-12);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  padding: 0.375rem 0.75rem;
  border-radius: var(--r-1);
  white-space: nowrap;
}

/* Neutral */
.chip-neutral {
  background: var(--border-light);
  color: var(--text-muted);
}

/* Positive */
.chip-positive {
  background: var(--positive-soft);
  color: var(--positive);
}

/* Caution */
.chip-caution {
  background: var(--caution-soft);
  color: var(--caution);
}

/* Critical */
.chip-critical {
  background: var(--critical-soft);
  color: var(--critical);
}

/* Info */
.chip-info {
  background: var(--info-soft);
  color: var(--info);
}

/* Ember */
.chip-ember {
  background: var(--ember-soft);
  color: var(--ember);
}
</style>

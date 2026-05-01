<template>
  <button :class="['btn', `btn-${variant}`, `btn-${size}`]" :disabled="disabled">
    <slot />
  </button>
</template>

<script setup>
defineProps({
  variant: {
    type: String,
    default: 'primary',
    validator: (value) => ['primary', 'ember', 'ghost', 'danger', 'text'].includes(value)
  },
  size: {
    type: String,
    default: 'md',
    validator: (value) => ['sm', 'md'].includes(value)
  },
  disabled: {
    type: Boolean,
    default: false
  }
})
</script>

<style scoped>
.btn {
  font-family: var(--font-sans);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  border: none;
  border-radius: var(--r-1);
  cursor: pointer;
  transition: all var(--dur-fast) var(--ease);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  white-space: nowrap;
}

/* Sizes */
.btn-sm {
  font-size: var(--fs-12);
  padding: 0.5rem 1rem;
  height: 32px;
}

.btn-md {
  font-size: var(--fs-12);
  padding: 0.625rem 1.5rem;
  height: 40px;
}

/* Primary — ink background */
.btn-primary {
  background: var(--ink);
  color: var(--paper);
  border: 1px solid var(--ink);
}

.btn-primary:hover:not(:disabled) {
  opacity: 0.88;
}

.btn-primary:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

/* Ember — CTA rare use */
.btn-ember {
  background: var(--ember);
  color: var(--paper);
  border: 1px solid var(--ember);
}

.btn-ember:hover:not(:disabled) {
  opacity: 0.88;
}

.btn-ember:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

/* Ghost — transparent + border */
.btn-ghost {
  background: transparent;
  color: var(--text-main);
  border: 1px solid var(--border-main);
}

.btn-ghost:hover:not(:disabled) {
  background: var(--bg-sunken);
  border-color: var(--text-main);
}

.btn-ghost:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

/* Danger — critical variant */
.btn-danger {
  background: var(--critical);
  color: var(--paper);
  border: 1px solid var(--critical);
}

.btn-danger:hover:not(:disabled) {
  opacity: 0.88;
}

.btn-danger:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

/* Text — minimal */
.btn-text {
  background: transparent;
  color: var(--text-main);
  border: none;
}

.btn-text:hover:not(:disabled) {
  opacity: 0.75;
}

.btn-text:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
</style>

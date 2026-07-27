<template>
  <div class="capsules-grid">
    <div
      v-for="(f, i) in folders"
      :key="f.id"
      class="capsule"
      :class="{ selected: f.id === selected, dragging: dragIndex === i, 'drop-target': dropIndex === i && dragIndex !== i }"
      :style="f.color ? { '--folder-color': f.color } : null"
      :draggable="isDraggable(f)"
      @click="$emit('update:selected', f.id === selected ? null : f.id)"
      @dragstart="onDragStart(i, $event)"
      @dragover.prevent="onDragOver(i)"
      @dragend="onDragEnd"
      @drop.prevent="onDrop"
    >
      <span class="capsule-stripe" :class="{ on: !!f.color }"></span>
      <Folder class="capsule-icon" :size="26" :stroke-width="1.4" />
      <div class="capsule-body">
        <span class="capsule-name">{{ f.name }}</span>
        <span class="capsule-count">{{ f.count }} {{ f.count === 1 ? itemLabel : itemLabelPlural }}</span>
      </div>
      <div v-if="isDraggable(f)" class="capsule-actions" @click.stop>
        <button @click="$emit('edit', f)" aria-label="Rename folder"><Pencil :size="13" :stroke-width="1.5" /></button>
        <button @click="$emit('delete', f.id)" aria-label="Delete folder"><Trash2 :size="13" :stroke-width="1.5" /></button>
      </div>
      <ChevronDown class="capsule-chevron" :size="15" :stroke-width="2" />

      <!-- Custom tooltip: the native title= attribute takes ~1s to appear, this is instant. -->
      <span class="capsule-tip">{{ f.name }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { Folder, Pencil, Trash2, ChevronDown } from 'lucide-vue-next'
import { moveItem } from '../lib/reorder'

const props = defineProps({
  folders: { type: Array, required: true },   // [{ id, name, count, color }]
  selected: { type: String, default: null },
  itemLabel: { type: String, default: 'item' },
  itemLabelPlural: { type: String, default: 'items' }
})
const emit = defineEmits(['update:selected', 'reorder', 'edit', 'delete'])

const dragIndex = ref(null)
const dropIndex = ref(null)

// "No Folder" is a virtual bucket with no DB row, so it can't be renamed, deleted or reordered.
const isDraggable = (f) => f.id !== 'no-folder'

function onDragStart(i, e) {
  dragIndex.value = i
  e.dataTransfer.effectAllowed = 'move'
  // Firefox refuses to start a drag unless some data is set.
  e.dataTransfer.setData('text/plain', String(i))
}

function onDragOver(i) {
  if (dragIndex.value === null || !isDraggable(props.folders[i])) return
  dropIndex.value = i
}

function onDrop() {
  const from = dragIndex.value
  const to = dropIndex.value
  if (from !== null && to !== null && from !== to) {
    const ids = props.folders.filter(isDraggable).map(f => f.id)
    emit('reorder', moveItem(ids, props.folders[from].id, props.folders[to].id))
  }
  onDragEnd()
}

function onDragEnd() {
  dragIndex.value = null
  dropIndex.value = null
}
</script>

<style scoped>
.capsules-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.capsule {
  --folder-color: var(--text-muted);
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.7rem;
  padding: 0.85rem 1rem 0.85rem 1.15rem;
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: var(--r-4);
  box-shadow: var(--shadow-1);
  cursor: pointer;
  user-select: none;
  overflow: hidden;
  transition: border-color var(--dur-fast) var(--ease),
              box-shadow var(--dur-fast) var(--ease),
              transform var(--dur-fast) var(--ease);
}
.capsule:hover { border-color: var(--border-main); box-shadow: var(--shadow-2); }
.capsule:active { cursor: grabbing; }

/* Colour label: a bar down the left edge, plus a tinted icon. */
.capsule-stripe {
  position: absolute;
  left: 0; top: 0; bottom: 0;
  width: 5px;
  background: var(--folder-color);
  opacity: 0;
  transition: opacity var(--dur-fast) var(--ease);
}
.capsule-stripe.on { opacity: 1; }
.capsule-stripe.on ~ .capsule-icon { color: var(--folder-color); }

.capsule.selected {
  border-color: var(--folder-color);
  background: var(--primary-soft);
  box-shadow: var(--shadow-2);
}
.capsule.selected .capsule-icon { color: var(--folder-color); }
.capsule.selected .capsule-chevron { transform: rotate(180deg); opacity: 1; }

.capsule.dragging { opacity: 0.4; }
.capsule.drop-target { border-color: var(--primary); transform: translateY(-2px); }

.capsule-icon { flex-shrink: 0; color: var(--text-muted); }

.capsule-body { display: flex; flex-direction: column; min-width: 0; flex: 1; }
.capsule-name {
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--text-main);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.capsule-count { font-size: 0.75rem; color: var(--text-muted); }

.capsule-chevron {
  flex-shrink: 0;
  color: var(--text-muted);
  opacity: 0.5;
  transition: transform var(--dur-base) var(--ease), opacity var(--dur-fast) var(--ease);
}

/* Edit/delete stay out of the way until the capsule is hovered, so the tile reads clean. */
.capsule-actions {
  position: absolute;
  top: 0.35rem;
  right: 0.35rem;
  display: flex;
  gap: 0.15rem;
  opacity: 0;
  transition: opacity var(--dur-fast) var(--ease);
}
.capsule:hover .capsule-actions { opacity: 1; }
.capsule-actions button {
  display: flex;
  padding: 3px;
  border: none;
  border-radius: var(--r-2);
  background: var(--bg-app);
  color: var(--text-muted);
  cursor: pointer;
}
.capsule-actions button:hover { color: var(--primary); }

.capsule-tip {
  position: absolute;
  left: 1.15rem;
  bottom: calc(100% - 0.5rem);
  z-index: 20;
  padding: 0.35rem 0.6rem;
  background: var(--text-main);
  color: var(--bg-card);
  font-size: 0.78rem;
  font-weight: 500;
  white-space: nowrap;
  border-radius: var(--r-3);
  box-shadow: var(--shadow-2);
  opacity: 0;
  pointer-events: none;
  transition: opacity var(--dur-fast) var(--ease);
}
.capsule:hover .capsule-tip { opacity: 1; }
/* The tooltip has to escape the tile, but the colour stripe needs the tile to clip. */
.capsule:hover { overflow: visible; }
.capsule:hover .capsule-stripe { border-radius: var(--r-4) 0 0 var(--r-4); }

@media (max-width: 640px) {
  .capsules-grid { grid-template-columns: 1fr; }
  .capsule-tip { display: none; }
}
</style>

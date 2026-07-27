// Move one id to another id's slot, the way a drag-and-drop list is expected to behave:
// the dragged item takes the target's position and everything in between shifts over.
// Returns a new array; the input is not mutated.
export function moveItem(ids, fromId, toId) {
  const from = ids.indexOf(fromId)
  const to = ids.indexOf(toId)
  if (from === -1 || to === -1 || from === to) return ids.slice()

  const next = ids.slice()
  const [moved] = next.splice(from, 1)
  // `to` is the target's index in the ORIGINAL array. Inserting there after the removal is
  // what makes a forward drag land past the target and a backward drag land on it.
  next.splice(to, 0, moved)
  return next
}

// Self-check: node src/lib/reorder.js
// (import.meta.filename is undefined in the browser, so this block never runs in the app.)
if (globalThis.process?.argv?.[1] && import.meta.filename === globalThis.process.argv[1]) {
  const { strict: assert } = await import('node:assert')
  const base = ['A', 'B', 'C', 'D']

  assert.deepEqual(moveItem(base, 'A', 'C'), ['B', 'C', 'A', 'D'], 'forward drag')
  assert.deepEqual(moveItem(base, 'D', 'B'), ['A', 'D', 'B', 'C'], 'backward drag')
  assert.deepEqual(moveItem(base, 'A', 'B'), ['B', 'A', 'C', 'D'], 'swap neighbours')
  assert.deepEqual(moveItem(base, 'A', 'D'), ['B', 'C', 'D', 'A'], 'drag to last')
  assert.deepEqual(moveItem(base, 'D', 'A'), ['D', 'A', 'B', 'C'], 'drag to first')
  assert.deepEqual(moveItem(base, 'B', 'B'), base, 'drop on itself is a no-op')
  assert.deepEqual(moveItem(base, 'Z', 'A'), base, 'unknown id is a no-op')
  assert.deepEqual(base, ['A', 'B', 'C', 'D'], 'input array is never mutated')

  console.log('reorder.js: all checks passed')
}

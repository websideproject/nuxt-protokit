/**
 * Y.js Document Size Growth & Compaction Analysis
 *
 * This script explores:
 * 1. How fast Y.js documents grow with incremental updates
 * 2. How encodeStateAsUpdate() compacts the state
 * 3. Whether compacting on one client breaks sync with stale clients
 * 4. The "dangerous scenario": ClientA compacts + edits, ClientB edits on old state, then syncs
 *
 * Run: node packages/nuxt-protokit/scripts/yjs-size-analysis.mjs
 */

import * as Y from 'yjs'

// ─── Helpers ────────────────────────────────────────────────────────────────

function sizeOf(doc) {
  return Y.encodeStateAsUpdate(doc).byteLength
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function syncDocs(from, to) {
  // Standard Y.js sync protocol:
  // 1. "to" sends its state vector to "from"
  // 2. "from" encodes only the diff (operations "to" hasn't seen)
  // 3. "to" applies the diff
  const sv = Y.encodeStateVector(to)
  const diff = Y.encodeStateAsUpdate(from, sv)
  Y.applyUpdate(to, diff)
  return diff.byteLength
}

function bidirectionalSync(a, b) {
  const ab = syncDocs(a, b) // a → b
  const ba = syncDocs(b, a) // b → a
  return { ab, ba }
}

// ─── Test 1: Size growth with incremental updates ───────────────────────────

console.log('═══════════════════════════════════════════════════════════════')
console.log('TEST 1: Document size growth with incremental Y.Map updates')
console.log('═══════════════════════════════════════════════════════════════\n')

{
  const doc = new Y.Doc()
  const map = doc.getMap('data')

  const milestones = [10, 50, 100, 500, 1000, 5000, 10000]
  let nextMilestone = 0

  // Simulate a form being edited: many small updates to the same fields
  for (let i = 0; i < 10001; i++) {
    doc.transact(() => {
      map.set('name', `User ${i}`)
      map.set('email', `user${i}@example.com`)
      map.set('age', 20 + (i % 50))
    })

    if (nextMilestone < milestones.length && i === milestones[nextMilestone]) {
      const size = sizeOf(doc)
      console.log(`  After ${String(i).padStart(5)} updates: ${formatBytes(size).padStart(10)}  (${map.size} keys in map)`)
      nextMilestone++
    }
  }

  console.log()
}

// ─── Test 2: Size growth — appending to Y.Array ─────────────────────────────

console.log('═══════════════════════════════════════════════════════════════')
console.log('TEST 2: Document size growth with Y.Array appends (collection)')
console.log('═══════════════════════════════════════════════════════════════\n')

{
  const doc = new Y.Doc()
  const arr = doc.getArray('items')

  const milestones = [10, 50, 100, 500, 1000, 5000]
  let nextMilestone = 0

  for (let i = 0; i < 5001; i++) {
    const item = new Y.Map()
    doc.transact(() => {
      arr.push([item])
      item.set('id', `item-${i}`)
      item.set('title', `Task #${i}: Do something important`)
      item.set('completed', i % 3 === 0)
      item.set('priority', ['low', 'medium', 'high'][i % 3])
    })

    if (nextMilestone < milestones.length && i === milestones[nextMilestone]) {
      const size = sizeOf(doc)
      console.log(`  After ${String(i).padStart(5)} items: ${formatBytes(size).padStart(10)}  (${arr.length} items in array)`)
      nextMilestone++
    }
  }

  console.log()
}

// ─── Test 3: Overwriting same keys — does GC help? ─────────────────────────

console.log('═══════════════════════════════════════════════════════════════')
console.log('TEST 3: Overwriting same keys — GC on vs off')
console.log('═══════════════════════════════════════════════════════════════\n')

for (const gcEnabled of [true, false]) {
  const doc = new Y.Doc({ gc: gcEnabled })
  const map = doc.getMap('form')

  // Simulate editing a 5-field form 1000 times
  for (let i = 0; i < 1000; i++) {
    doc.transact(() => {
      map.set('firstName', `Name${i}`)
      map.set('lastName', `Last${i}`)
      map.set('email', `user${i}@test.com`)
      map.set('phone', `555-${String(i).padStart(4, '0')}`)
      map.set('notes', `Updated notes iteration ${i}`)
    })
  }

  console.log(`  gc=${String(gcEnabled).padStart(5)}: ${formatBytes(sizeOf(doc)).padStart(10)} after 1000 overwrites of 5 fields`)
}

console.log()

// ─── Test 4: Incremental updates vs full state encoding ─────────────────────

console.log('═══════════════════════════════════════════════════════════════')
console.log('TEST 4: Accumulated incremental updates vs single full-state encode')
console.log('═══════════════════════════════════════════════════════════════\n')

{
  const doc = new Y.Doc()
  const map = doc.getMap('data')

  // Collect all incremental updates
  const updates = []
  doc.on('update', (update) => {
    updates.push(update)
  })

  for (let i = 0; i < 1000; i++) {
    doc.transact(() => {
      map.set('counter', i)
      map.set('label', `Value is ${i}`)
    })
  }

  const incrementalTotal = updates.reduce((sum, u) => sum + u.byteLength, 0)
  const fullState = Y.encodeStateAsUpdate(doc)
  const mergedUpdates = Y.mergeUpdates(updates)

  console.log(`  Incremental updates total:  ${formatBytes(incrementalTotal).padStart(10)} (${updates.length} updates)`)
  console.log(`  mergeUpdates() result:      ${formatBytes(mergedUpdates.byteLength).padStart(10)}`)
  console.log(`  encodeStateAsUpdate():      ${formatBytes(fullState.byteLength).padStart(10)}`)
  console.log(`  Compression ratio:          ${(incrementalTotal / fullState.byteLength).toFixed(1)}x`)
  console.log()
}

// ─── Test 5: THE CRITICAL SCENARIO — Compaction + Stale Client Sync ────────

console.log('═══════════════════════════════════════════════════════════════')
console.log('TEST 5: THE CRITICAL SCENARIO')
console.log('  ClientA compacts doc, makes edits.')
console.log('  ClientB (stale) makes edits on old version.')
console.log('  Both sync with backend. Does it break?')
console.log('═══════════════════════════════════════════════════════════════\n')

{
  // Step 1: Create a "backend" doc and two clients
  const backend = new Y.Doc()
  const clientA = new Y.Doc()
  const clientB = new Y.Doc()

  // Step 2: Initial shared state — all three in sync
  const bMap = backend.getMap('data')
  bMap.set('title', 'Original Title')
  bMap.set('count', 0)
  bMap.set('shared', 'initial value')

  bidirectionalSync(backend, clientA)
  bidirectionalSync(backend, clientB)

  console.log('  Step 1: All three docs in sync')
  console.log(`    Backend:  title="${backend.getMap('data').get('title')}", count=${backend.getMap('data').get('count')}`)
  console.log(`    ClientA:  title="${clientA.getMap('data').get('title')}", count=${clientA.getMap('data').get('count')}`)
  console.log(`    ClientB:  title="${clientB.getMap('data').get('title')}", count=${clientB.getMap('data').get('count')}`)
  console.log()

  // Step 3: ClientA makes MANY updates (simulating heavy editing)
  for (let i = 1; i <= 500; i++) {
    clientA.transact(() => {
      clientA.getMap('data').set('count', i)
      clientA.getMap('data').set('title', `Title v${i}`)
    })
  }

  console.log('  Step 2: ClientA makes 500 updates')
  console.log(`    ClientA size: ${formatBytes(sizeOf(clientA))}`)

  // Step 4: ClientA syncs with backend
  bidirectionalSync(clientA, backend)
  console.log(`    Backend size after sync: ${formatBytes(sizeOf(backend))}`)
  console.log()

  // Step 5: COMPACTION — simulate what y-indexeddb does
  // Create a new "compacted" doc from the full state
  const compactedA = new Y.Doc()
  Y.applyUpdate(compactedA, Y.encodeStateAsUpdate(clientA))

  console.log('  Step 3: ClientA "compacts" (re-encode full state into fresh doc)')
  console.log(`    Original ClientA size: ${formatBytes(sizeOf(clientA))}`)
  console.log(`    Compacted ClientA size: ${formatBytes(sizeOf(compactedA))}`)
  console.log()

  // Step 6: ClientA continues editing on compacted doc
  for (let i = 501; i <= 510; i++) {
    compactedA.transact(() => {
      compactedA.getMap('data').set('count', i)
      compactedA.getMap('data').set('title', `Title v${i} (post-compact)`)
    })
  }

  // Step 7: Meanwhile, ClientB (still on OLD version!) makes conflicting edits
  clientB.transact(() => {
    clientB.getMap('data').set('title', 'ClientB Title Override')
    clientB.getMap('data').set('shared', 'clientB was here')
    clientB.getMap('data').set('clientB_field', 'brand new field from B')
  })

  console.log('  Step 4: After compaction, ClientA edits more; ClientB edits on OLD state')
  console.log(`    CompactedA: title="${compactedA.getMap('data').get('title')}", count=${compactedA.getMap('data').get('count')}`)
  console.log(`    ClientB:    title="${clientB.getMap('data').get('title')}", count=${clientB.getMap('data').get('count')}`)
  console.log()

  // Step 8: THE DANGEROUS SYNC — ClientB syncs with backend first
  console.log('  Step 5: ClientB syncs with backend (stale client goes first)')
  const syncB = bidirectionalSync(clientB, backend)
  console.log(`    Diff B→Backend: ${formatBytes(syncB.ab)}, Backend→B: ${formatBytes(syncB.ba)}`)
  console.log(`    Backend: title="${backend.getMap('data').get('title')}", count=${backend.getMap('data').get('count')}, shared="${backend.getMap('data').get('shared')}"`)
  console.log()

  // Step 9: Then CompactedA syncs with backend
  console.log('  Step 6: CompactedA syncs with backend')
  const syncA = bidirectionalSync(compactedA, backend)
  console.log(`    Diff A→Backend: ${formatBytes(syncA.ab)}, Backend→A: ${formatBytes(syncA.ba)}`)
  console.log()

  // Step 10: Final state — did anything break?
  console.log('  ┌─────────────────────────────────────────────────────────┐')
  console.log('  │ FINAL STATE (after all syncs)                          │')
  console.log('  └─────────────────────────────────────────────────────────┘')

  const finalBackend = Object.fromEntries(backend.getMap('data').entries())
  const finalA = Object.fromEntries(compactedA.getMap('data').entries())
  const finalB = Object.fromEntries(clientB.getMap('data').entries())

  console.log(`    Backend:    ${JSON.stringify(finalBackend)}`)
  console.log(`    CompactedA: ${JSON.stringify(finalA)}`)
  console.log(`    ClientB:    ${JSON.stringify(finalB)}`)

  // Sync one more time to ensure convergence
  bidirectionalSync(compactedA, backend)
  bidirectionalSync(clientB, backend)
  bidirectionalSync(compactedA, clientB)

  const convergedBackend = Object.fromEntries(backend.getMap('data').entries())
  const convergedA = Object.fromEntries(compactedA.getMap('data').entries())
  const convergedB = Object.fromEntries(clientB.getMap('data').entries())

  const allEqual = JSON.stringify(convergedBackend) === JSON.stringify(convergedA)
    && JSON.stringify(convergedBackend) === JSON.stringify(convergedB)

  console.log()
  console.log('  After full convergence round:')
  console.log(`    Backend:    ${JSON.stringify(convergedBackend)}`)
  console.log(`    CompactedA: ${JSON.stringify(convergedA)}`)
  console.log(`    ClientB:    ${JSON.stringify(convergedB)}`)
  console.log(`    All equal?  ${allEqual ? '✅ YES — no data loss!' : '❌ NO — DIVERGENCE DETECTED'}`)
  console.log()
}

// ─── Test 6: DIFFERENT CLIENT IDS after compaction ──────────────────────────

console.log('═══════════════════════════════════════════════════════════════')
console.log('TEST 6: Compaction into a DIFFERENT Y.Doc (new clientID)')
console.log('  This simulates the backend receiving state, storing it,')
console.log('  and serving it to a new client later.')
console.log('═══════════════════════════════════════════════════════════════\n')

{
  const server = new Y.Doc()
  const clientA = new Y.Doc()
  const clientB = new Y.Doc()

  // Initial state
  clientA.getMap('tasks').set('task1', 'Buy groceries')
  clientA.getMap('tasks').set('task2', 'Write code')
  bidirectionalSync(clientA, server)
  bidirectionalSync(server, clientB)

  console.log('  Initial: A and B synced via server')

  // ClientA goes offline, makes many edits
  for (let i = 0; i < 200; i++) {
    clientA.transact(() => {
      clientA.getMap('tasks').set('task1', `Buy groceries (edited ${i})`)
    })
  }

  // ClientB also goes offline, makes different edits
  for (let i = 0; i < 150; i++) {
    clientB.transact(() => {
      clientB.getMap('tasks').set('task2', `Write code (edited ${i})`)
    })
  }

  console.log(`  After offline edits:`)
  console.log(`    ClientA size: ${formatBytes(sizeOf(clientA))}`)
  console.log(`    ClientB size: ${formatBytes(sizeOf(clientB))}`)
  console.log(`    Server size:  ${formatBytes(sizeOf(server))}`)

  // ClientA comes online, syncs
  bidirectionalSync(clientA, server)
  console.log(`\n  ClientA syncs → Server size: ${formatBytes(sizeOf(server))}`)

  // Server "compacts" by re-encoding (simulating a backend optimization)
  const serverState = Y.encodeStateAsUpdate(server)
  const compactedServer = new Y.Doc()
  Y.applyUpdate(compactedServer, serverState)

  console.log(`  Server compacts: ${formatBytes(sizeOf(server))} → ${formatBytes(sizeOf(compactedServer))}`)

  // ClientB comes online and syncs with the COMPACTED server
  const syncResult = bidirectionalSync(clientB, compactedServer)
  console.log(`\n  ClientB syncs with compacted server:`)
  console.log(`    Diff B→Server: ${formatBytes(syncResult.ab)}`)
  console.log(`    Diff Server→B: ${formatBytes(syncResult.ba)}`)

  // Check convergence
  bidirectionalSync(compactedServer, clientA)
  bidirectionalSync(compactedServer, clientB)

  const srvTasks = Object.fromEntries(compactedServer.getMap('tasks').entries())
  const aTasks = Object.fromEntries(clientA.getMap('tasks').entries())
  const bTasks = Object.fromEntries(clientB.getMap('tasks').entries())

  const converged = JSON.stringify(srvTasks) === JSON.stringify(aTasks)
    && JSON.stringify(srvTasks) === JSON.stringify(bTasks)

  console.log(`\n  Final state:`)
  console.log(`    Server:  ${JSON.stringify(srvTasks)}`)
  console.log(`    ClientA: ${JSON.stringify(aTasks)}`)
  console.log(`    ClientB: ${JSON.stringify(bTasks)}`)
  console.log(`    All converged? ${converged ? '✅ YES' : '❌ NO'}`)
  console.log()
}

// ─── Test 7: Size with text editing (Y.Text) ───────────────────────────────

console.log('═══════════════════════════════════════════════════════════════')
console.log('TEST 7: Y.Text — character-by-character typing (worst case)')
console.log('═══════════════════════════════════════════════════════════════\n')

{
  const doc = new Y.Doc()
  const text = doc.getText('content')

  const milestones = [100, 500, 1000, 5000, 10000]
  let nextMilestone = 0

  // Simulate typing character by character (worst case for growth)
  for (let i = 0; i < 10001; i++) {
    doc.transact(() => {
      text.insert(text.length, String.fromCharCode(97 + (i % 26)))
    })

    if (nextMilestone < milestones.length && i === milestones[nextMilestone]) {
      const size = sizeOf(doc)
      const ratio = size / text.length
      console.log(`  ${String(i).padStart(5)} chars: doc=${formatBytes(size).padStart(10)}, text=${formatBytes(text.length).padStart(10)}, overhead=${ratio.toFixed(1)}x`)
      nextMilestone++
    }
  }

  console.log()
}

// ─── Test 8: Practical prototyping scenario ─────────────────────────────────

console.log('═══════════════════════════════════════════════════════════════')
console.log('TEST 8: Realistic prototyping scenario')
console.log('  (CRUD on a collection of 50 items, 200 edit sessions)')
console.log('═══════════════════════════════════════════════════════════════\n')

{
  const doc = new Y.Doc()
  const items = doc.getArray('items')

  // Create 50 items
  for (let i = 0; i < 50; i++) {
    const item = new Y.Map()
    doc.transact(() => {
      items.push([item])
      item.set('id', `item-${i}`)
      item.set('name', `Product ${i}`)
      item.set('price', Math.round(Math.random() * 10000) / 100)
      item.set('description', `Description for product ${i}, which is a great product.`)
      item.set('category', ['Electronics', 'Clothing', 'Food', 'Books'][i % 4])
      item.set('inStock', i % 2 === 0)
    })
  }

  console.log(`  After creating 50 items: ${formatBytes(sizeOf(doc))}`)

  // Simulate 200 edit sessions: each session modifies 3-5 random items
  for (let session = 0; session < 200; session++) {
    const numEdits = 3 + Math.floor(Math.random() * 3)
    for (let e = 0; e < numEdits; e++) {
      const idx = Math.floor(Math.random() * items.length)
      const item = items.get(idx)
      doc.transact(() => {
        item.set('name', `Product ${idx} (rev ${session})`)
        item.set('price', Math.round(Math.random() * 10000) / 100)
      })
    }
  }

  console.log(`  After 200 edit sessions:  ${formatBytes(sizeOf(doc))}`)

  // Delete 10 items and add 10 new ones
  for (let i = 0; i < 10; i++) {
    doc.transact(() => {
      items.delete(0)
      const newItem = new Y.Map()
      items.push([newItem])
      newItem.set('id', `new-item-${i}`)
      newItem.set('name', `New Product ${i}`)
      newItem.set('price', 99.99)
    })
  }

  console.log(`  After delete+add cycle:   ${formatBytes(sizeOf(doc))}`)
  console.log(`  Current items in array:   ${items.length}`)
  console.log()
}

// ─── Test 9: TASK MANAGER with large descriptions ───────────────────────────

console.log('═══════════════════════════════════════════════════════════════')
console.log('TEST 9: Task Manager — realistic heavy usage')
console.log('  100 tasks with long descriptions, comments, subtasks')
console.log('  Heavy editing: rename, re-describe, add comments, reorder')
console.log('═══════════════════════════════════════════════════════════════\n')

{
  const doc = new Y.Doc()
  const tasks = doc.getArray('tasks')

  // Generate a realistic long description (500-2000 chars)
  function makeDescription(i) {
    const paragraphs = [
      `Task ${i}: This is a detailed description of the work that needs to be done. It includes acceptance criteria, technical notes, and context about why this work matters for the project.`,
      `Background: The current implementation has several issues that need to be addressed. Users have reported that the existing behavior is confusing and doesn't match their expectations. We've gathered feedback from 15 users and the consensus is clear.`,
      `Acceptance criteria:\n- The feature should handle edge cases gracefully\n- Performance should not degrade by more than 5%\n- All existing tests should continue to pass\n- New tests should be added for the new behavior\n- Documentation should be updated to reflect changes`,
      `Technical notes: This will require changes to the API layer, the database schema, and the frontend components. Consider using a migration strategy to avoid breaking existing data. The estimated complexity is medium-high.`,
      `Related tickets: PROJ-${100 + i}, PROJ-${200 + i}. See also the design doc linked in the project wiki. Previous attempts to fix this were reverted in commit abc123 due to performance regressions.`,
    ]
    // Each task gets 2-5 paragraphs (varying sizes)
    const numParagraphs = 2 + (i % 4)
    return paragraphs.slice(0, numParagraphs).join('\n\n')
  }

  // Create 100 tasks with rich data
  for (let i = 0; i < 100; i++) {
    const task = new Y.Map()
    doc.transact(() => {
      tasks.push([task])
      task.set('id', `task-${i}`)
      task.set('title', `Implement feature ${i}: ${['User auth', 'Dashboard', 'API refactor', 'Search', 'Notifications', 'Settings', 'Export', 'Import', 'Billing', 'Analytics'][i % 10]}`)
      task.set('description', makeDescription(i))
      task.set('status', ['todo', 'in_progress', 'review', 'done'][i % 4])
      task.set('priority', ['low', 'medium', 'high', 'critical'][i % 4])
      task.set('assignee', `user${i % 5}@company.com`)
      task.set('labels', JSON.stringify(['frontend', 'backend', 'urgent', 'tech-debt'].slice(0, 1 + (i % 4))))
      task.set('createdAt', new Date(2025, 0, 1 + i).toISOString())
      task.set('dueDate', new Date(2025, 3, 1 + i).toISOString())
      task.set('estimate', `${1 + (i % 8)}h`)

      // Some tasks have comments (as a nested Y.Array of Y.Maps)
      if (i % 3 === 0) {
        const comments = new Y.Array()
        task.set('comments', comments)
        for (let c = 0; c < 3 + (i % 5); c++) {
          const comment = new Y.Map()
          comments.push([comment])
          comment.set('author', `user${c % 5}@company.com`)
          comment.set('text', `Comment ${c}: I think we should consider the implications of this change. It might affect the ${['auth', 'cache', 'UI', 'API'][c % 4]} layer. Let me know what you think. I've also checked the related code and found a few potential issues we should discuss in the next standup.`)
          comment.set('createdAt', new Date(2025, 1, c + 1).toISOString())
        }
      }

      // Some tasks have subtasks
      if (i % 4 === 0) {
        const subtasks = new Y.Array()
        task.set('subtasks', subtasks)
        for (let s = 0; s < 5; s++) {
          const sub = new Y.Map()
          subtasks.push([sub])
          sub.set('title', `Subtask ${s}: ${['Write tests', 'Update docs', 'Code review', 'Deploy', 'QA testing'][s]}`)
          sub.set('done', s < 2)
        }
      }
    })
  }

  const sizeAfterCreate = sizeOf(doc)
  console.log(`  After creating 100 rich tasks:    ${formatBytes(sizeAfterCreate)}`)

  // --- Heavy editing phase 1: Rewrite descriptions (simulates user iterating on content) ---
  for (let round = 0; round < 20; round++) {
    for (let t = 0; t < 100; t += 5) { // Edit every 5th task
      const task = tasks.get(t)
      doc.transact(() => {
        task.set('description', makeDescription(t) + `\n\n--- Updated in round ${round} ---\nAdditional context added after discussion with the team. We decided to change the approach slightly based on new requirements from the product owner.`)
      })
    }
  }

  const sizeAfterDescEdits = sizeOf(doc)
  console.log(`  After 20 rounds of desc rewrites: ${formatBytes(sizeAfterDescEdits)} (+${formatBytes(sizeAfterDescEdits - sizeAfterCreate)})`)

  // --- Heavy editing phase 2: Status changes (simulates kanban board drag) ---
  const statuses = ['todo', 'in_progress', 'review', 'done', 'in_progress', 'review', 'done']
  for (const status of statuses) {
    for (let t = 0; t < 100; t++) {
      doc.transact(() => {
        tasks.get(t).set('status', status)
        tasks.get(t).set('updatedAt', new Date().toISOString())
      })
    }
  }

  const sizeAfterStatusChanges = sizeOf(doc)
  console.log(`  After 700 status changes:         ${formatBytes(sizeAfterStatusChanges)} (+${formatBytes(sizeAfterStatusChanges - sizeAfterDescEdits)})`)

  // --- Heavy editing phase 3: Add more comments over time ---
  for (let round = 0; round < 10; round++) {
    for (let t = 0; t < 100; t += 3) {
      const task = tasks.get(t)
      let comments = task.get('comments')
      if (!comments) {
        comments = new Y.Array()
        doc.transact(() => { task.set('comments', comments) })
      }
      const comment = new Y.Map()
      doc.transact(() => {
        comments.push([comment])
        comment.set('author', `user${round % 5}@company.com`)
        comment.set('text', `Follow-up ${round}: After investigating further, I found that the root cause is in the ${['auth', 'cache', 'rendering', 'state management'][round % 4]} module. Here's my proposed fix and the reasoning behind it. I've also added a regression test to prevent this from happening again. Please review when you get a chance.`)
        comment.set('createdAt', new Date(2025, 2 + round, 1).toISOString())
      })
    }
  }

  const sizeAfterComments = sizeOf(doc)
  console.log(`  After 340 new comments:           ${formatBytes(sizeAfterComments)} (+${formatBytes(sizeAfterComments - sizeAfterStatusChanges)})`)

  // --- Heavy editing phase 4: Title renames (common in real usage) ---
  for (let round = 0; round < 50; round++) {
    const t = round % 100
    const task = tasks.get(t)
    doc.transact(() => {
      task.set('title', `[${['WIP', 'BLOCKED', 'READY', 'URGENT'][round % 4]}] ${task.get('title')}`)
    })
  }

  const sizeAfterRenames = sizeOf(doc)
  console.log(`  After 50 title renames:           ${formatBytes(sizeAfterRenames)} (+${formatBytes(sizeAfterRenames - sizeAfterComments)})`)

  // --- Heavy editing phase 5: Delete and recreate tasks (churn) ---
  for (let i = 0; i < 20; i++) {
    doc.transact(() => {
      tasks.delete(0) // delete first
      const newTask = new Y.Map()
      tasks.push([newTask])
      newTask.set('id', `replacement-${i}`)
      newTask.set('title', `Replacement task ${i}`)
      newTask.set('description', makeDescription(i))
      newTask.set('status', 'todo')
    })
  }

  const sizeAfterChurn = sizeOf(doc)
  console.log(`  After 20 delete+recreate cycles:  ${formatBytes(sizeAfterChurn)} (+${formatBytes(sizeAfterChurn - sizeAfterRenames)})`)

  console.log()
  console.log(`  ┌─────────────────────────────────────────────────────────┐`)
  console.log(`  │ TOTAL DOCUMENT SIZE:  ${formatBytes(sizeAfterChurn).padEnd(35)} │`)
  console.log(`  │ Current task count:   ${String(tasks.length).padEnd(35)} │`)
  console.log(`  └─────────────────────────────────────────────────────────┘`)

  // Calculate what the "current state" size would be (no history)
  const rawDataDoc = new Y.Doc()
  Y.applyUpdate(rawDataDoc, Y.encodeStateAsUpdate(doc))
  const compactedSize = sizeOf(rawDataDoc)

  // Also calculate: what if we just JSON-stringified the current data?
  let jsonSize = 0
  const jsonTasks = []
  for (let i = 0; i < tasks.length; i++) {
    const t = tasks.get(i)
    const obj = {}
    for (const [k, v] of t.entries()) {
      if (v instanceof Y.Array) {
        obj[k] = []
        for (let j = 0; j < v.length; j++) {
          const item = v.get(j)
          if (item instanceof Y.Map) {
            obj[k].push(Object.fromEntries(item.entries()))
          }
          else {
            obj[k].push(item)
          }
        }
      }
      else {
        obj[k] = v
      }
    }
    jsonTasks.push(obj)
  }
  jsonSize = JSON.stringify(jsonTasks).length

  console.log()
  console.log(`  Comparison:`)
  console.log(`    Y.js doc (with history):  ${formatBytes(sizeAfterChurn)}`)
  console.log(`    Y.js compacted:           ${formatBytes(compactedSize)}`)
  console.log(`    Raw JSON of current data: ${formatBytes(jsonSize)}`)
  console.log(`    Y.js overhead vs JSON:    ${(compactedSize / jsonSize).toFixed(1)}x`)
  console.log()
}

// ─── Test 10: Extreme case — what if descriptions are edited char-by-char? ──

console.log('═══════════════════════════════════════════════════════════════')
console.log('TEST 10: WORST CASE — Y.Text descriptions edited char-by-char')
console.log('  10 tasks, each description rewritten 50 times with Y.Text')
console.log('═══════════════════════════════════════════════════════════════\n')

{
  const doc = new Y.Doc()
  const tasks = doc.getArray('tasks')

  // Create 10 tasks using Y.Text for descriptions
  for (let i = 0; i < 10; i++) {
    const task = new Y.Map()
    const desc = new Y.Text()
    doc.transact(() => {
      tasks.push([task])
      task.set('id', `task-${i}`)
      task.set('title', `Task ${i}`)
      task.set('description', desc)
      desc.insert(0, `Initial description for task ${i}. This is a moderately long text that describes what needs to be done.`)
    })
  }

  console.log(`  After creating 10 tasks with Y.Text: ${formatBytes(sizeOf(doc))}`)

  // Simulate rewriting descriptions by clearing and retyping char by char
  for (let rewrite = 0; rewrite < 50; rewrite++) {
    const taskIdx = rewrite % 10
    const task = tasks.get(taskIdx)
    const desc = task.get('description')

    // Delete all content
    doc.transact(() => {
      desc.delete(0, desc.length)
    })

    // Type new content character by character (worst case!)
    const newText = `Rewrite ${rewrite}: This task has been updated with new requirements. The acceptance criteria have changed and we need to reconsider the approach. Let me describe the new plan in detail here so everyone is aligned on what we're building.`
    for (let c = 0; c < newText.length; c++) {
      doc.transact(() => {
        desc.insert(c, newText[c])
      })
    }
  }

  const finalSize = sizeOf(doc)
  console.log(`  After 50 full rewrites (char-by-char): ${formatBytes(finalSize)}`)

  // Compare: same thing but using Y.Map.set (string replacement, not Y.Text)
  const doc2 = new Y.Doc()
  const tasks2 = doc2.getArray('tasks')

  for (let i = 0; i < 10; i++) {
    const task = new Y.Map()
    doc2.transact(() => {
      tasks2.push([task])
      task.set('id', `task-${i}`)
      task.set('title', `Task ${i}`)
      task.set('description', `Initial description for task ${i}. This is a moderately long text that describes what needs to be done.`)
    })
  }

  for (let rewrite = 0; rewrite < 50; rewrite++) {
    const taskIdx = rewrite % 10
    const task = tasks2.get(taskIdx)
    doc2.transact(() => {
      task.set('description', `Rewrite ${rewrite}: This task has been updated with new requirements. The acceptance criteria have changed and we need to reconsider the approach. Let me describe the new plan in detail here so everyone is aligned on what we're building.`)
    })
  }

  const mapSetSize = sizeOf(doc2)
  console.log(`  Same thing with Y.Map.set (string): ${formatBytes(mapSetSize)}`)
  console.log(`  Y.Text is ${(finalSize / mapSetSize).toFixed(1)}x larger than Y.Map.set for full rewrites`)
  console.log()
  console.log(`  💡 Insight: If descriptions are replaced wholesale (not collaboratively`)
  console.log(`     edited), Y.Map.set is far more efficient than Y.Text.`)
  console.log()
}

// ─── Summary ────────────────────────────────────────────────────────────────

console.log('═══════════════════════════════════════════════════════════════')
console.log('SUMMARY & RECOMMENDATIONS')
console.log('═══════════════════════════════════════════════════════════════')
console.log(`
Key findings:

1. SIZE GROWTH: Y.js docs grow primarily from the HISTORY of changes,
   not the current state. Overwriting the same key 1000 times stores
   all 1000 values (with GC, deleted content becomes metadata-only).

2. GC HELPS: With gc=true (default), deleted content is replaced with
   compact GC structs. This significantly reduces size for overwrite-heavy
   workloads.

3. COMPACTION IS SAFE: encodeStateAsUpdate() + applyUpdate() into a fresh
   doc is the standard compaction technique. The state vector is preserved,
   so stale clients can still sync via differential updates.

4. THE "DANGEROUS SCENARIO" IS SAFE: Y.js state vectors track exactly
   which operations each client has seen. Even after compaction:
   - Stale ClientB sends its diff → backend applies it correctly
   - Backend sends its diff → ClientB gets caught up
   - No data loss, no divergence

5. y-indexeddb ALREADY COMPACTS: After 500 incremental updates, it
   re-encodes the full state and replaces all stored updates.

6. FOR PROTOTYPING WORKLOADS: A doc with 50 items edited 200 times
   stays well under 100KB — compaction is nice-to-have, not critical.

RECOMMENDATION: For nuxt-protokit's use case (prototyping), the built-in
y-indexeddb compaction (every 500 updates) + Y.js GC is sufficient.
If you want server-side compaction, the pattern is simple:
  const state = Y.encodeStateAsUpdate(doc)
  const compacted = new Y.Doc()
  Y.applyUpdate(compacted, state)
  // Store encodeStateAsUpdate(compacted) — state vectors preserved
`)

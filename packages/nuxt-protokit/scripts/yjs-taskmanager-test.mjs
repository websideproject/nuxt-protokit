/**
 * Y.js Task Manager — Realistic heavy usage simulation
 * 100 tasks with long descriptions, comments, subtasks.
 * Heavy editing: rename, re-describe, add comments, status churn.
 *
 * Run: node packages/nuxt-protokit/scripts/yjs-taskmanager-test.mjs
 */
import * as Y from 'yjs'

function sizeOf(doc) { return Y.encodeStateAsUpdate(doc).byteLength }
function fmt(b) { return b < 1024 ? b + ' B' : b < 1048576 ? (b / 1024).toFixed(1) + ' KB' : (b / 1048576).toFixed(1) + ' MB' }

const doc = new Y.Doc()
const tasks = doc.getArray('tasks')

function makeDesc(i) {
  const p = [
    `Task ${i}: Detailed description of the work that needs to be done. It includes acceptance criteria, technical notes, and context about why this work matters for the overall project. Users have reported that the existing behavior is confusing and doesn't match their expectations. We've gathered feedback from 15 different stakeholders.`,
    `Background: The current implementation has several issues that need to be addressed urgently. The team has discussed multiple approaches and we need to settle on one. Previous attempts were reverted due to performance regressions that affected the production environment.`,
    `Acceptance criteria:\n- The feature should handle edge cases gracefully without crashing\n- Performance should not degrade by more than 5% under normal load\n- All existing integration and unit tests should continue to pass\n- New tests should be added covering the new behavior and edge cases\n- Documentation should be updated to reflect all changes made`,
    `Technical notes: This will require changes to the API layer, the database schema (migration needed), and multiple frontend components. Consider using a phased migration strategy to avoid breaking existing data for current users. The estimated complexity is medium-high and will likely require 2-3 sprint cycles.`,
    `Related tickets: PROJ-${100 + i}, PROJ-${200 + i}, PROJ-${300 + i}. See also the design doc linked in the project wiki. The architecture review board has approved the general approach but wants to see benchmarks before we proceed to production.`,
  ]
  return p.slice(0, 2 + (i % 4)).join('\n\n')
}

console.log('═══════════════════════════════════════════════════════════════')
console.log('TASK MANAGER — Realistic heavy usage simulation')
console.log('═══════════════════════════════════════════════════════════════\n')

// ─── Create 100 tasks with rich data ────────────────────────────────────────
for (let i = 0; i < 100; i++) {
  const task = new Y.Map()
  doc.transact(() => {
    tasks.push([task])
    task.set('id', `task-${i}`)
    task.set('title', `Implement feature ${i}: ${['User authentication', 'Dashboard redesign', 'API refactoring', 'Full-text search', 'Push notifications', 'Settings page', 'CSV export', 'Data import', 'Billing integration', 'Analytics dashboard'][i % 10]}`)
    task.set('description', makeDesc(i))
    task.set('status', ['todo', 'in_progress', 'review', 'done'][i % 4])
    task.set('priority', ['low', 'medium', 'high', 'critical'][i % 4])
    task.set('assignee', `user${i % 5}@company.com`)
    task.set('labels', JSON.stringify(['frontend', 'backend', 'urgent', 'tech-debt'].slice(0, 1 + (i % 4))))
    task.set('dueDate', `2025-04-${String(1 + (i % 28)).padStart(2, '0')}`)
    task.set('estimate', `${1 + (i % 8)}h`)

    if (i % 3 === 0) {
      const comments = new Y.Array()
      task.set('comments', comments)
      for (let c = 0; c < 3 + (i % 5); c++) {
        const cm = new Y.Map()
        comments.push([cm])
        cm.set('author', `user${c % 5}@company.com`)
        cm.set('text', `Comment ${c}: I think we should carefully consider the implications of this change on the overall system architecture. It might affect the ${['authentication', 'caching layer', 'UI rendering pipeline', 'API gateway'][c % 4]} significantly. I've reviewed the related code and found several potential issues we should discuss in the next team standup meeting.`)
        cm.set('createdAt', `2025-02-${String(c + 1).padStart(2, '0')}`)
      }
    }

    if (i % 4 === 0) {
      const subs = new Y.Array()
      task.set('subtasks', subs)
      for (let s = 0; s < 5; s++) {
        const sub = new Y.Map()
        subs.push([sub])
        sub.set('title', `Subtask ${s}: ${['Write comprehensive tests', 'Update documentation', 'Code review and feedback', 'Deploy to staging', 'QA testing and sign-off'][s]}`)
        sub.set('done', s < 2)
      }
    }
  })
}
const s1 = sizeOf(doc)
console.log(`  After creating 100 rich tasks:      ${fmt(s1)}`)

// ─── Phase 1: Rewrite descriptions 20 rounds ───────────────────────────────
for (let r = 0; r < 20; r++) {
  for (let t = 0; t < 100; t += 5) {
    doc.transact(() => {
      tasks.get(t).set('description', makeDesc(t) + `\n\n--- Updated in round ${r} ---\nAdditional context added after discussion. The team decided to change the approach based on new requirements from the product owner. We also need to consider backward compatibility.`)
    })
  }
}
const s2 = sizeOf(doc)
console.log(`  After 20 rounds of desc rewrites:   ${fmt(s2)}  (+${fmt(s2 - s1)})`)

// ─── Phase 2: 700 status changes ────────────────────────────────────────────
for (const st of ['todo', 'in_progress', 'review', 'done', 'in_progress', 'review', 'done']) {
  for (let t = 0; t < 100; t++) {
    doc.transact(() => {
      tasks.get(t).set('status', st)
      tasks.get(t).set('updatedAt', new Date().toISOString())
    })
  }
}
const s3 = sizeOf(doc)
console.log(`  After 700 status changes:           ${fmt(s3)}  (+${fmt(s3 - s2)})`)

// ─── Phase 3: Add ~340 comments ─────────────────────────────────────────────
for (let r = 0; r < 10; r++) {
  for (let t = 0; t < 100; t += 3) {
    const task = tasks.get(t)
    let comments = task.get('comments')
    if (!comments) {
      comments = new Y.Array()
      doc.transact(() => { task.set('comments', comments) })
    }
    const cm = new Y.Map()
    doc.transact(() => {
      comments.push([cm])
      cm.set('author', `user${r % 5}@company.com`)
      cm.set('text', `Follow-up ${r}: After investigating further, I found that the root cause is in the ${['authentication', 'caching', 'rendering', 'state management'][r % 4]} module. Here's my proposed fix and the reasoning behind it. I've also added a regression test to prevent this from happening again in the future.`)
      cm.set('createdAt', `2025-${String(3 + r).padStart(2, '0')}-01`)
    })
  }
}
const s4 = sizeOf(doc)
console.log(`  After ~340 new comments:            ${fmt(s4)}  (+${fmt(s4 - s3)})`)

// ─── Phase 4: 50 title renames ──────────────────────────────────────────────
for (let r = 0; r < 50; r++) {
  const task = tasks.get(r % 100)
  doc.transact(() => {
    task.set('title', `[${['WIP', 'BLOCKED', 'READY', 'URGENT'][r % 4]}] ${task.get('title')}`)
  })
}
const s5 = sizeOf(doc)
console.log(`  After 50 title renames:             ${fmt(s5)}  (+${fmt(s5 - s4)})`)

// ─── Phase 5: Delete + recreate 20 tasks ────────────────────────────────────
for (let i = 0; i < 20; i++) {
  doc.transact(() => {
    tasks.delete(0)
    const nt = new Y.Map()
    tasks.push([nt])
    nt.set('id', `replacement-${i}`)
    nt.set('title', `Replacement task ${i}: New work item`)
    nt.set('description', makeDesc(i))
    nt.set('status', 'todo')
  })
}
const s6 = sizeOf(doc)
console.log(`  After 20 delete+recreate cycles:    ${fmt(s6)}  (+${fmt(s6 - s5)})`)

// ─── Results ────────────────────────────────────────────────────────────────

console.log()
console.log(`  ┌───────────────────────────────────────────────────────────┐`)
console.log(`  │ TOTAL DOC SIZE:   ${fmt(s6).padEnd(40)}│`)
console.log(`  │ Task count:       ${String(tasks.length).padEnd(40)}│`)
console.log(`  └───────────────────────────────────────────────────────────┘`)

// Compare to raw JSON
const jsonTasks = []
for (let i = 0; i < tasks.length; i++) {
  const t = tasks.get(i)
  const obj = {}
  for (const [k, v] of t.entries()) {
    if (v instanceof Y.Array) {
      obj[k] = []
      for (let j = 0; j < v.length; j++) {
        const item = v.get(j)
        obj[k].push(item instanceof Y.Map ? Object.fromEntries(item.entries()) : item)
      }
    } else {
      obj[k] = v
    }
  }
  jsonTasks.push(obj)
}
const jsonSize = JSON.stringify(jsonTasks).length

console.log()
console.log(`  Comparison:`)
console.log(`    Y.js doc (with full history): ${fmt(s6)}`)
console.log(`    Raw JSON of current state:    ${fmt(jsonSize)}`)
console.log(`    Y.js overhead vs JSON:        ${(s6 / jsonSize).toFixed(1)}x`)
console.log()

// ─── Bonus: What if someone uses this for 2 YEARS? ─────────────────────────

console.log('═══════════════════════════════════════════════════════════════')
console.log('BONUS: Simulating 2 years of daily task manager usage')
console.log('  5 tasks created/day, 20 status changes/day, 10 edits/day')
console.log('═══════════════════════════════════════════════════════════════\n')

{
  const doc2 = new Y.Doc()
  const tasks2 = doc2.getArray('tasks')
  let taskCounter = 0

  const days = 365 * 2 // 2 years
  const checkpoints = [30, 90, 180, 365, 545, 730]
  let nextCheck = 0

  for (let day = 0; day < days; day++) {
    // Create 5 tasks per day
    for (let i = 0; i < 5; i++) {
      const task = new Y.Map()
      doc2.transact(() => {
        tasks2.push([task])
        task.set('id', `t-${taskCounter++}`)
        task.set('title', `Daily task ${taskCounter}`)
        task.set('description', `Description for task created on day ${day}. Contains typical task details, acceptance criteria, and notes from the team discussion.`)
        task.set('status', 'todo')
        task.set('priority', ['low', 'medium', 'high'][taskCounter % 3])
      })
    }

    // 20 status changes on random existing tasks
    const len = tasks2.length
    for (let i = 0; i < 20 && len > 0; i++) {
      const idx = Math.floor(Math.random() * len)
      doc2.transact(() => {
        tasks2.get(idx).set('status', ['todo', 'in_progress', 'review', 'done'][Math.floor(Math.random() * 4)])
      })
    }

    // 10 description edits
    for (let i = 0; i < 10 && len > 0; i++) {
      const idx = Math.floor(Math.random() * len)
      doc2.transact(() => {
        tasks2.get(idx).set('description', `Updated on day ${day}: Revised requirements and acceptance criteria. The team agreed on the new approach during today's standup.`)
      })
    }

    // Complete and archive 3 tasks per day (delete oldest)
    if (len > 50) {
      for (let i = 0; i < 3; i++) {
        doc2.transact(() => { tasks2.delete(0) })
      }
    }

    if (nextCheck < checkpoints.length && day + 1 === checkpoints[nextCheck]) {
      console.log(`  Day ${String(day + 1).padStart(4)} (${String(Math.round((day + 1) / 30)).padStart(2)} months): ${fmt(sizeOf(doc2)).padStart(10)}  (${tasks2.length} active tasks, ${taskCounter} total created)`)
      nextCheck++
    }
  }

  console.log()
  console.log(`  Final: ${fmt(sizeOf(doc2))} after 2 years of daily usage`)
  console.log(`  Active tasks: ${tasks2.length}, Total created: ${taskCounter}`)
  console.log()
}

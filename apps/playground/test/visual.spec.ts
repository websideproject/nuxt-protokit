import { expect, test } from '@playwright/test'
import type { Locator, Page } from '@playwright/test'

/**
 * Screenshots of the playground, compared against committed baselines. The baselines are also the images the docs
 * show (apps/docs/public/screenshots/, see playwright.config.ts), so a page that changes fails here until its picture
 * is refreshed — the docs cannot quietly go stale.
 *
 * Nothing in a picture may depend on when or where it was taken:
 *   - storage: protokit keeps every prototype in IndexedDB, and each test runs in a new browser context, so every
 *     page starts from its schema defaults and seed data — never from what an earlier test typed;
 *   - clock: the browser's is pinned below (the calendars open on "today"); the server runs with TZ=UTC;
 *   - data: demo pages use fixed data, never Math.random();
 *   - locale, timezone, colour scheme, motion: pinned in playwright.config.ts.
 * The playground runs with `serverSync: false`, so a page must send no write at all — each test checks.
 *
 * A shot's `act` steps are what a user does before the picture (open a panel, switch a view), written with the
 * locators a person would use, so they double as a script for recording the demo.
 *
 * Run and refresh: scripts/visual-baseline.sh.
 */

// A Wednesday; the item-panels samples log weekly metrics up to the day before
const FIXED_NOW = new Date('2026-03-11T10:00:00Z')

const VIEWPORTS = [
  { width: 1440, height: 900 },
]

interface Shot {
  /** The image name, `<name>-<width>.png`, which is also the test title a refresh filters on. */
  name: string
  path: string
  /** Text the page shows once it has rendered (most demos render client-side): the picture waits for it. */
  says: string
  /** What a user does before the picture. Each step waits for what it produced, so the picture never races it. */
  act?: (page: Page) => Promise<void>
  /** Photograph one part of the page instead of the whole content column: a README-sized picture of one feature. */
  crop?: (page: Page) => Locator
  /**
   * Keep the app shell at the viewport's height instead of letting the content flow. For pages that scroll inside
   * themselves: the calendar's month view is a virtualized ±5-year list, and unbounded it would lay out every row.
   */
  keepHeight?: boolean
  /**
   * Start the clock at FIXED_NOW and let it run, instead of freezing it there. Vue ignores an event whose timestamp
   * is not later than the moment its listener was attached, so with `Date.now()` frozen a listener added after the
   * page loaded never fires once an ancestor's listener has stamped the event: the calendar's form opens in a
   * popover, and the colour select inside it would not open. The seconds that pass do not reach the picture.
   */
  clockRuns?: boolean
}

/** A card: the rounded, bordered box around a heading or title text. */
const card = (page: Page, title: string) =>
  page.locator('main div.rounded-lg, main div.rounded-xl').filter({ hasText: title }).last()

const dialog = (page: Page) => page.getByRole('dialog')

// ─── Collections: add rows through the inline form ───────────────────────────
const COMPETITORS = [
  { name: 'Linear', url: 'https://linear.app', price: '8' },
  { name: 'Height', url: 'https://height.app', price: '7' },
  { name: 'Shortcut', url: 'https://shortcut.com', price: '9' },
]
const openAddCompetitor = async (page: Page) => {
  await page.getByRole('button', { name: 'Add', exact: true }).click()
  await expect(page.getByRole('textbox', { name: 'Company Name' })).toBeVisible()
}
const addCompetitors = async (page: Page) => {
  for (const c of COMPETITORS) {
    await openAddCompetitor(page)
    await page.getByRole('textbox', { name: 'Company Name' }).fill(c.name)
    await page.getByRole('textbox', { name: 'Website' }).fill(c.url)
    await page.getByRole('spinbutton', { name: 'Starting Price' }).fill(c.price)
    await page.locator('main').getByRole('button', { name: 'Add', exact: true }).last().click()
    await expect(page.getByRole('textbox', { name: 'Company Name' })).toBeHidden()
    await expect(page.locator('main')).toContainText(c.name)
  }
}

// ─── Calendar: events drawn on the grid, on the pinned "today" ────────────────
const EVENTS = [
  { title: 'Sprint planning', day: '2026-03-09', start: ['09', '00'], end: ['10', '30'], color: 'violet' },
  { title: 'Design review', day: '2026-03-11', start: ['13', '00'], end: ['14', '00'], color: 'pink' },
  { title: 'Customer call — Acme', day: '2026-03-11', start: ['15', '30'], end: ['16', '15'], color: 'amber' },
  { title: 'Release 0.1.0', day: '2026-03-12', start: ['11', '00'], end: ['12', '00'], color: 'emerald' },
  { title: 'Retro', day: '2026-03-13', start: ['16', '00'], end: ['17', '00'], color: 'sky' },
]
/** A time field's hour and minute, typed the way a person does: click the segment, type the digits. */
const setTime = async (form: Locator, field: string, [hour, minute]: string[]) => {
  const group = form.getByRole('group', { name: field })
  await group.getByRole('spinbutton', { name: /^hour/ }).click()
  await form.page().keyboard.type(hour!)
  await group.getByRole('spinbutton', { name: /^minute/ }).click()
  await form.page().keyboard.type(minute!)
}
const addEvents = async (page: Page) => {
  for (const e of EVENTS) {
    // A double click on a day in the month view drafts a one-hour event at 9:00 and opens its form beside it.
    // Low in the cell, clear of the events already in it
    const cell = page.locator(`[data-date="${e.day}"]`).first()
    const box = (await cell.boundingBox())!
    await cell.dblclick({ position: { x: box.width / 2, y: box.height - 10 } })
    const form = dialog(page)
    await expect(form).toBeVisible()
    // The end first: the start typed first would briefly sit after the draft's 10:00 end
    await setTime(form, 'End time', e.end)
    await setTime(form, 'Start time', e.start)
    await form.getByRole('combobox', { name: 'Colour' }).click()
    await page.getByRole('option', { name: e.color, exact: true }).click()
    // Enter in the title saves the draft and closes the form
    await form.getByPlaceholder('New Event').fill(e.title)
    await form.getByPlaceholder('New Event').press('Enter')
    await expect(dialog(page)).toBeHidden()
    await expect(page.locator('main')).toContainText(e.title)
  }
}

// ─── Tasks typed into an input ────────────────────────────────────────────────
const TASKS = ['Write the launch post', 'Record the demo video', 'Update pricing page']
const addTasks = async (page: Page, placeholder: string) => {
  const input = page.getByPlaceholder(placeholder)
  for (const t of TASKS) {
    await input.fill(t)
    await input.press('Enter')
    await expect(page.locator('main')).toContainText(t)
  }
  await input.blur()
}

const SHOTS: Shot[] = [
  { name: 'home', path: '/', says: 'Quick start' },

  // ── Calculators ────────────────────────────────────────────────────────────
  { name: 'break-even', path: '/break-even', says: 'Break-Even Calculator' },
  { name: 'resource-estimator', path: '/resource-estimator', says: 'Resource Cost Estimator' },
  { name: 'runway', path: '/runway', says: 'Available Funds' },
  { name: 'saas-dashboard', path: '/saas-dashboard', says: 'Key Metrics' },

  // ── Collections ────────────────────────────────────────────────────────────
  { name: 'competitors-add', path: '/competitors', says: 'Competitor Tracker', act: openAddCompetitor },
  { name: 'competitors', path: '/competitors', says: 'Competitor Tracker', act: addCompetitors },

  // ── Components ─────────────────────────────────────────────────────────────
  { name: 'calendar', path: '/calendar', says: 'March 2026', keepHeight: true, clockRuns: true, act: addEvents },
  {
    name: 'calendar-week', path: '/calendar', says: 'March 2026', keepHeight: true, clockRuns: true,
    act: async (page) => {
      await addEvents(page)
      await page.getByRole('tab', { name: 'Week' }).click()
      await expect(page.locator('[data-week-grid]')).toContainText('Customer call — Acme')
    },
  },
  {
    name: 'calendar-event', path: '/calendar', says: 'March 2026', keepHeight: true, clockRuns: true, crop: dialog,
    act: async (page) => {
      await addEvents(page)
      // Clicking an event opens its form in place, already holding the event
      await page.getByRole('button', { name: /^Design review/ }).first().click()
      await expect(dialog(page).getByPlaceholder('New Event')).toHaveValue('Design review')
    },
  },
  {
    name: 'calendar-tasks', path: '/calendar-tasks', says: 'March 2026', keepHeight: true, clockRuns: true,
    act: async (page) => {
      await addTasks(page, 'New task...')
      // Dropped on the day's cell (the day number is a button of its own, not a drop target), it becomes an event
      const thursday = page.locator('[data-date="2026-03-12"]').first()
      const box = (await thursday.boundingBox())!
      await page.getByText(TASKS[0]!, { exact: true }).dragTo(thursday, { targetPosition: { x: box.width / 2, y: box.height - 10 } })
      await expect(page.locator('[data-event]').filter({ hasText: TASKS[0]! })).toBeVisible()
    },
  },
  { name: 'charts', path: '/charts', says: 'Q4 Kickoff' },
  {
    name: 'item-panels', path: '/item-panels', says: 'Content Pieces',
    act: async (page) => {
      await page.getByRole('button', { name: 'Load samples' }).click()
      await page.getByText('How to Reduce SaaS Churn by 40%').first().click()
      await expect(page.locator('main')).not.toContainText('Select a content piece')
    },
  },

  // ── Features ───────────────────────────────────────────────────────────────
  { name: 'tab-sync', path: '/tab-sync', says: 'How this works' },
  { name: 'bricks-gallery', path: '/bricks-gallery', says: 'First Paying Customer' },
  // Every built-in field type in one form, for the fields reference
  { name: 'field-types', path: '/bricks-gallery', says: 'All Field Types', crop: page => card(page, 'All Field Types') },
  { name: 'corruption-recovery', path: '/corruption-recovery', says: 'Contribution Margin' },
  {
    name: 'corruption-recovery-modal', path: '/corruption-recovery', says: 'Contribution Margin', crop: dialog,
    act: async (page) => {
      await page.getByRole('button', { name: 'Corrupt the stored document' }).click()
      await expect(dialog(page)).toContainText('Data Recovery Needed')
    },
  },
  { name: 'custom-extensions', path: '/custom-extensions', says: 'Health Score Gauge' },
  {
    name: 'schema-migration', path: '/schema-migration', says: 'Schema Migration Demo',
    // Write three items in the v0 shape, reload: the v0 → v1 → v2 migrations run on the stored items
    act: async (page) => {
      await page.getByRole('button', { name: 'Seed v0 data' }).click()
      await page.getByRole('button', { name: 'Reload to migrate' }).click()
      await expect(page.locator('main')).toContainText('Fix login redirect bug')
    },
  },
  { name: 'permissions', path: '/permissions', says: 'Project Details' },
  { name: 'encryption', path: '/encryption', says: 'How encryption works here' },
  {
    name: 'encryption-unlocked', path: '/encryption', says: 'How encryption works here',
    act: async (page) => {
      await page.getByPlaceholder('Enter a password to unlock your data').fill('correct horse battery staple')
      await page.getByRole('button', { name: 'Unlock / Create' }).click()
      await expect(page.locator('main')).toContainText('Unlocked')
    },
  },
  {
    name: 'namespace-isolation', path: '/namespace-isolation', says: 'How namespace isolation works',
    act: async (page) => {
      await page.getByRole('button', { name: 'Log in as Alice' }).click()
      await expect(page.locator('main')).toContainText('User Plan')
    },
  },

  // ── Headless mode ──────────────────────────────────────────────────────────
  { name: 'headless-settings', path: '/headless-settings', says: 'Headless settings store' },
  { name: 'headless-tasks', path: '/headless-tasks', says: 'Headless task list', act: page => addTasks(page, 'New task…') },
  {
    name: 'headless-notes', path: '/headless-notes', says: 'Headless notes',
    act: async (page) => {
      await page.locator('main textarea').first().fill('Launch checklist\n\n- Record the demo video\n- Publish 0.1.0 to npm\n- Sync the docs to websideproject.com')
      await page.locator('main textarea').first().blur()
      await expect(page.locator('main')).toContainText('Launch checklist')
    },
  },
]

for (const viewport of VIEWPORTS) {
  test.describe(`${viewport.width}px`, () => {
    test.use({ viewport })

    for (const shot of SHOTS) {
      const image = `${shot.name}-${viewport.width}`

      test(image, async ({ page }) => {
        if (shot.clockRuns) await page.clock.setSystemTime(FIXED_NOW)
        else await page.clock.setFixedTime(FIXED_NOW)

        // serverSync is off: any request other than a read means a page talks to a server it should not
        const writes: string[] = []
        page.on('request', (r) => {
          const method = r.method()
          if (method !== 'GET' && method !== 'HEAD') writes.push(`${method} ${r.url()}`)
        })
        const errors: string[] = []
        page.on('console', (m) => {
          if (/hydration/i.test(m.text()) || m.type() === 'error') errors.push(m.text())
        })
        page.on('pageerror', e => errors.push(e.message))

        await page.goto(shot.path, { waitUntil: 'networkidle' })
        await expect(page.locator('main')).toContainText(shot.says)
        if (shot.act) {
          await shot.act(page)
          await page.mouse.move(0, 0)
        }
        await page.evaluate(() => document.fonts.ready)

        expect(writes, 'the playground runs with serverSync: false, so nothing may be sent').toEqual([])
        // A mismatch leaves the server's HTML and the client's render mixed, differently on every run
        expect(errors, 'console errors or hydration mismatches').toEqual([])
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth),
          'the page overflows the viewport horizontally',
        ).toBeLessThanOrEqual(viewport.width)

        // The layout is a fixed-height shell whose <main> scrolls; let the content flow so a tall page is captured
        // whole, then photograph the content without the sidebar.
        if (!shot.keepHeight) {
          await page.addStyleTag({ content: '.h-screen { height: auto !important; } main { overflow: visible !important; }' })
        }
        const target = shot.crop ? shot.crop(page) : page.locator('main > *').first()
        await expect(target).toHaveScreenshot(`${image}.png`)
      })
    }
  })
}

// The server renders with its own locale; a visitor's browser may use another. Everything protokit prints on a
// server-rendered page must come out the same in both, or the page hydrates with mismatches.
test.describe('another locale', () => {
  test.use({ locale: 'de-DE', viewport: VIEWPORTS[0] })

  test('the charts page hydrates without mismatches in de-DE', async ({ page }) => {
    const mismatches: string[] = []
    page.on('console', (m) => {
      if (/hydration/i.test(m.text())) mismatches.push(m.text().slice(0, 200))
    })
    await page.goto('/charts', { waitUntil: 'networkidle' })
    await expect(page.locator('main')).toContainText('Q4 Kickoff')
    expect(mismatches).toEqual([])
  })
})

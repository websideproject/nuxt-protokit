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

// ─── Calendar: events through the event modal, on the pinned "today" ──────────
const EVENTS = [
  { title: 'Sprint planning', start: '2026-03-09T09:00', end: '2026-03-09T10:30', color: 'violet' },
  { title: 'Design review', start: '2026-03-11T13:00', end: '2026-03-11T14:00', color: 'pink' },
  { title: 'Customer call — Acme', start: '2026-03-11T15:30', end: '2026-03-11T16:15', color: 'amber' },
  { title: 'Release 0.1.0', start: '2026-03-12T11:00', end: '2026-03-12T12:00', color: 'emerald' },
  { title: 'Retro', start: '2026-03-13T16:00', end: '2026-03-13T17:00', color: 'sky' },
]
const addEvents = async (page: Page) => {
  for (const e of EVENTS) {
    await page.getByRole('button', { name: 'Add Event' }).first().click()
    const d = dialog(page)
    await expect(d).toContainText('New Event')
    await d.getByPlaceholder('Add title').fill(e.title)
    await d.locator('input[type="datetime-local"]').nth(0).fill(e.start)
    await d.locator('input[type="datetime-local"]').nth(1).fill(e.end)
    await d.locator(`button[title="${e.color}"]`).click()
    await d.getByRole('button', { name: 'Add Event' }).click()
    await expect(dialog(page)).toBeHidden()
  }
  await expect(page.locator('main')).toContainText('Release 0.1.0')
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
  { name: 'calendar', path: '/calendar', says: 'March 2026', act: addEvents },
  {
    name: 'calendar-week', path: '/calendar', says: 'March 2026',
    act: async (page) => {
      await addEvents(page)
      await page.getByRole('button', { name: 'week', exact: true }).click()
      await expect(page.locator('main')).toContainText('Customer call — Acme')
    },
  },
  {
    name: 'calendar-event', path: '/calendar', says: 'March 2026', crop: dialog,
    act: async (page) => {
      await addEvents(page)
      // The event's text ignores the pointer (its wrapper handles the click), so click where a person would
      await page.getByText('Design review').first().click({ force: true })
      await expect(dialog(page)).toContainText('Edit Event')
    },
  },
  {
    name: 'calendar-tasks', path: '/calendar-tasks', says: 'March 2026',
    act: async (page) => {
      await addTasks(page, 'New task...')
      await page.getByText(TASKS[0]!, { exact: true }).dragTo(page.getByText('12', { exact: true }).first())
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
        await page.clock.setFixedTime(FIXED_NOW)

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
        await page.addStyleTag({ content: '.h-screen { height: auto !important; } main { overflow: visible !important; }' })
        const target = shot.crop ? shot.crop(page) : page.locator('main > *').first()
        await expect(target).toHaveScreenshot(`${image}.png`)
      })
    }
  })
}

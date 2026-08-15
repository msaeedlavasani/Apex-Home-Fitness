import {expect, test, type Page} from '@playwright/test';

/**
 * Quiz dark-mode contrast regression (WCAG AA) — desktop + mobile.
 *
 * Regression context: the quiz route shell hard-coded `bg-slate-50
 * text-slate-900` while the quiz component colors come from the semantic
 * `apex-*` tokens (globals.css), which flip to white text in dark mode. In
 * dark mode the result was white text on a light `#f8fafc` page — a ~1.05:1
 * contrast ratio (invisible text). The fix paints the route shell with
 * `bg-apex-surface` / `text-apex-text-primary` and raises dark cards/inputs
 * to `--apex-card`, so every surface flips with `.dark`.
 *
 * This spec locks the computed-style contract:
 *   - dark desktop (en + fa, 1440x900): every quiz text element keeps a
 *     WCAG AA contrast ratio >= 4.5 against its effective background, and
 *     the page background is actually dark (no stale light shell);
 *   - the Visual-style step still applies Dark/Light immediately (RTL);
 *   - light desktop text stays readable (no light-mode regression);
 *   - mobile dark (390x844) has no horizontal overflow and the controls
 *     remain visible.
 */

const MIN_RATIO = 4.5; // WCAG AA normal text

/**
 * Browser-side snapshot: for each selector, compute the WCAG relative-
 * luminance contrast between the element's color and its effective
 * background (transparent layers composited up the ancestor chain), plus
 * the <main> background luminance so a stale light shell is caught too.
 */
function contrastSnapshot() {
  type RGB = {r: number; g: number; b: number; a: number}

  const parseColor = (s: string | null): RGB | null => {
    if (!s) return null
    const m = s.trim().match(/rgba?\(([^)]+)\)/)
    if (!m) return null
    const parts = m[1]
      .split(/[,\s]+/)
      .map(parseFloat)
      .filter((n) => !Number.isNaN(n))
    if (parts.length < 3) return null
    return {r: parts[0], g: parts[1], b: parts[2], a: parts.length > 3 ? parts[3] : 1}
  }
  const composite = (fg: RGB, bg: RGB): RGB => {
    const a = fg.a
    return {r: fg.r * a + bg.r * (1 - a), g: fg.g * a + bg.g * (1 - a), b: fg.b * a + bg.b * (1 - a), a: 1}
  }
  const effectiveBg = (el: Element): RGB => {
    let node: Element | null = el
    let acc: RGB | null = null
    while (node) {
      const bg = parseColor(getComputedStyle(node).backgroundColor)
      if (bg && bg.a > 0) {
        acc = acc ? composite(bg, acc) : bg
        if (bg.a >= 1) return acc
      }
      node = node.parentElement
    }
    return acc || {r: 255, g: 255, b: 255, a: 1}
  }
  const luminance = (c: RGB): number => {
    const f = (v: number): number => {
      v /= 255
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
    }
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b)
  }
  const ratio = (a: RGB, b: RGB): number => {
    const l1 = luminance(a)
    const l2 = luminance(b)
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)
  }

  const targets: Record<string, string> = {
    title: '.quiz__title',
    subtitle: '.quiz__subtitle',
    medicalTitle: '.quiz-medical__title',
    medicalBody: '.quiz-medical__body',
    stepTitle: '.quiz-step__title',
    stepSubtitle: '.quiz-step__subtitle',
    optionTitle: '.quiz-option__title',
    optionDesc: '.quiz-option__description',
    progressLabel: '.quiz-progress__label',
    nextBtn: '.quiz-nav__next',
  }

  const elements: Record<string, number | null> = {}
  for (const [name, sel] of Object.entries(targets)) {
    const el = document.querySelector(sel)
    if (!el) continue
    const fg = parseColor(getComputedStyle(el).color)
    elements[name] = fg ? ratio(fg, effectiveBg(el)) : null
  }

  const main = document.querySelector('main')
  const mainBg = main ? parseColor(getComputedStyle(main).backgroundColor) : null

  return {
    htmlClass: document.documentElement.className,
    mainBg: mainBg ? `rgba(${Math.round(mainBg.r)},${Math.round(mainBg.g)},${Math.round(mainBg.b)},${mainBg.a})` : null,
    mainBgLuminance: mainBg ? luminance(mainBg) : null,
    elements,
  }
}

/** Preset the persisted theme before any page script runs (ThemeScript). */
async function setTheme(page: Page, theme: string) {
  await page.addInitScript((value: string) => {
    try {
      window.localStorage.setItem('theme', value)
    } catch (e) {
      // private mode / blocked storage — ignore
    }
  }, theme)
}

test.describe('Quiz — dark desktop contrast (1440x900)', () => {
  for (const locale of ['en', 'fa'] as const) {
    test(`/${locale}/quiz keeps every text element readable in dark`, async ({page}) => {
      await page.setViewportSize({width: 1440, height: 900})
      await setTheme(page, 'dark')
      await page.goto(`/${locale}/quiz`)
      await expect(page.locator('.quiz')).toBeVisible()
      await expect(page.locator('html')).toHaveClass(/dark/)
      await expect(page.locator('main')).toHaveCSS('background-color', 'rgb(28, 28, 30)')

      const snap = await page.evaluate(contrastSnapshot)

      // The theme must actually be applied…
      expect(snap.htmlClass).toContain('dark')
      // …and the page shell must be dark (regression: bg-slate-50 shell).
      expect(snap.mainBgLuminance).toBeLessThan(0.2)
      expect(snap.mainBg).not.toBe('rgba(248,250,252,1)')

      // Every visible text element meets WCAG AA (4.5:1).
      for (const [name, value] of Object.entries(snap.elements)) {
        expect(value, `${name} contrast in ${locale} dark`).toBeGreaterThanOrEqual(MIN_RATIO)
      }
    })
  }
})

test.describe('Quiz — Visual style step', () => {
  test('Dark/Light options apply the theme immediately (fa, RTL)', async ({page}) => {
    await page.setViewportSize({width: 1440, height: 900})
    await setTheme(page, 'light')
    await page.goto('/fa/quiz')
    await expect(page.locator('.quiz')).toBeVisible()

    // Start light → the dark class is absent and text is dark.
    await expect(page.locator('html')).not.toHaveClass(/dark/)

    // Selecting "تیره" (Dark) flips the shell + tokens immediately.
    await page.getByRole('button', {name: /^تیره/}).click()
    await expect(page.locator('html')).toHaveClass(/dark/)
    await expect(page.locator('main')).toHaveCSS('background-color', 'rgb(28, 28, 30)')
    await expect(page.locator('.quiz-option--selected .quiz-option__title')).toHaveCSS('color', 'rgb(255, 255, 255)')
    await expect.poll(
      async () => {
        const snapshot = await page.evaluate(contrastSnapshot)
        const values = Object.values(snapshot.elements).filter((value): value is number => value !== null)
        return Math.min(...values)
      },
      {timeout: 5_000, intervals: [100, 250, 500]},
    ).toBeGreaterThanOrEqual(MIN_RATIO)
    let snap = await page.evaluate(contrastSnapshot)
    expect(snap.mainBgLuminance).toBeLessThan(0.2)
    for (const [name, value] of Object.entries(snap.elements)) {
      expect(value, `${name} contrast after selecting Dark`).toBeGreaterThanOrEqual(MIN_RATIO)
    }

    // Selecting "روشن" (Light) flips back immediately.
    await page.getByRole('button', {name: /^روشن/}).click()
    await expect(page.locator('html')).not.toHaveClass(/dark/)
    snap = await page.evaluate(contrastSnapshot)
    expect(snap.mainBgLuminance).toBeGreaterThan(0.5)
  })
})

test.describe('Quiz — light desktop sanity', () => {
  for (const locale of ['en', 'fa'] as const) {
    test(`/${locale}/quiz text stays readable in light mode`, async ({page}) => {
      await page.setViewportSize({width: 1440, height: 900})
      await setTheme(page, 'light')
      await page.goto(`/${locale}/quiz`)
      await expect(page.locator('.quiz')).toBeVisible()

      const snap = await page.evaluate(contrastSnapshot)
      expect(snap.htmlClass).not.toContain('dark')
      // Page shell is light; skip the nextBtn (brand orange + white passes
      // 3:1 large-text but is a design-token decision, not this regression).
      const {nextBtn, ...textElements} = snap.elements
      for (const [name, value] of Object.entries(textElements)) {
        expect(value, `${name} contrast in ${locale} light`).toBeGreaterThanOrEqual(MIN_RATIO)
      }
    })
  }
})

test.describe('Quiz — mobile dark smoke (390x844)', () => {
  test('no horizontal overflow and controls stay visible', async ({page}) => {
    await page.setViewportSize({width: 390, height: 844})
    await setTheme(page, 'dark')
    await page.goto('/en/quiz')
    await expect(page.locator('.quiz')).toBeVisible()
    await expect(page.locator('html')).toHaveClass(/dark/)

    const metrics = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      nextVisible: (() => {
        const el = document.querySelector('.quiz-nav__next')
        if (!el) return false
        const cs = getComputedStyle(el)
        return cs.display !== 'none' && cs.visibility !== 'hidden'
      })(),
    }))

    expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth)
    expect(metrics.nextVisible).toBe(true)
  })
})

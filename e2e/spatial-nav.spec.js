import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

async function enableSoftwareWebGLFor3d(
  page,
  { hardwareConcurrency = 8, deviceMemory = 8 } = {},
) {
  await page.addInitScript(({ hardwareConcurrency, deviceMemory }) => {
    // GitHub-hosted runners currently expose only two logical CPUs to the
    // browser. Production correctly treats that as a low-end device and starts
    // in 2D, but tests that explicitly exercise the 3D path need to isolate
    // renderer behavior from the independent CPU/memory recommendation.
    Object.defineProperties(navigator, {
      hardwareConcurrency: { configurable: true, value: hardwareConcurrency },
      deviceMemory: { configurable: true, value: deviceMemory },
    })
    if (navigator.connection) {
      Object.defineProperty(navigator.connection, 'saveData', {
        configurable: true,
        value: false,
      })
    }

    const originalGetContext = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function getContext(type, options) {
      const safeOptions =
        type === 'webgl' || type === 'webgl2'
          ? { ...options, failIfMajorPerformanceCaveat: false }
          : options
      const context = originalGetContext.call(this, type, safeOptions)
      if (context && (type === 'webgl' || type === 'webgl2')) {
        const originalGetExtension = context.getExtension.bind(context)
        context.getExtension = (name) =>
          name === 'WEBGL_debug_renderer_info' ? null : originalGetExtension(name)
        window.__eEraDrawCalls ??= 0
        window.__eEraCurrentFrameDrawCalls ??= 0
        window.__eEraFramePeak ??= 0
        if (!window.__eEraFrameMeterStarted) {
          window.__eEraFrameMeterStarted = true
          const sampleFrame = () => {
            window.__eEraFramePeak = Math.max(
              window.__eEraFramePeak,
              window.__eEraCurrentFrameDrawCalls,
            )
            window.__eEraCurrentFrameDrawCalls = 0
            requestAnimationFrame(sampleFrame)
          }
          requestAnimationFrame(sampleFrame)
        }
        ;['drawArrays', 'drawElements', 'drawArraysInstanced', 'drawElementsInstanced'].forEach(
          (method) => {
            if (typeof context[method] !== 'function' || context[`__wrapped_${method}`]) return
            const originalDraw = context[method].bind(context)
            context[method] = (...args) => {
              window.__eEraDrawCalls += 1
              window.__eEraCurrentFrameDrawCalls += 1
              return originalDraw(...args)
            }
            context[`__wrapped_${method}`] = true
          },
        )
      }
      return context
    }
  }, { hardwareConcurrency, deviceMemory })
}

test('保留 17 个语义入口并通过基础无障碍审计', async ({ page }, testInfo) => {
  await page.goto('/')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  const helpButton = page.getByRole('button', { name: '导航操作帮助' })
  await helpButton.click()
  const helpDialog = page.getByRole('dialog', { name: '如何使用服务导航' })
  await expect(helpDialog).toBeVisible()
  await expect(helpDialog.getByText('操作说明与快捷键')).toBeVisible()
  await helpDialog.getByRole('button', { name: '关闭' }).click()
  await expect(helpDialog).not.toBeVisible()
  await expect(helpButton).toBeFocused()
  await expect(page.getByTestId('service-card')).toHaveCount(17)
  await expect(page.getByRole('heading', { name: '选择服务，快速访问' })).toBeVisible()
  await expect(page.locator('.brand strong')).toHaveText('E时代社团服务导航')
  const heroLines = page.locator('#hero-title > span')
  await expect(heroLines).toHaveText(['E时代社团', '服务导航'])
  expect(
    await heroLines.evaluateAll((elements) =>
      elements.every((element) => getComputedStyle(element).whiteSpace === 'nowrap'),
    ),
  ).toBe(true)
  await expect(page.getByRole('button', { name: /收藏/ })).toHaveCount(0)
  await expect(page.getByText('收藏', { exact: true })).toHaveCount(0)
  expect(
    await page.evaluate(() =>
      Object.keys(localStorage).some((key) => key.toLowerCase().includes('favorite')),
    ),
  ).toBe(false)
  await expect(page.getByRole('navigation', { name: '当前服务路径' })).toHaveCount(0)
  const headerBox = await page.locator('.command-bar').boundingBox()
  expect(headerBox.height).toBeGreaterThanOrEqual(60)
  expect(headerBox.height).toBeLessThanOrEqual(76)
  if (testInfo.project.name.startsWith('mobile')) {
    const trigger = page.getByRole('button', { name: '打开搜索' })
    await expect(trigger).toBeVisible()
    await expect(page.locator('.search-console')).not.toBeVisible()
    await trigger.click()
    await expect(page.locator('.search-console')).toBeVisible()
    expect((await page.locator('.search-console').boundingBox()).height).toBeGreaterThanOrEqual(44)
    await page.getByRole('button', { name: '关闭搜索' }).click()
  } else {
    const searchBox = await page.locator('.search-console').boundingBox()
    expect(searchBox.height).toBeGreaterThanOrEqual(44)
    if (testInfo.project.name === 'desktop') {
      expect(
        Math.abs(searchBox.x + searchBox.width / 2 - page.viewportSize().width / 2),
      ).toBeLessThanOrEqual(2)
    }
  }
  const actionBoxes = await page
    .locator('.command-actions button:visible')
    .evaluateAll((elements) =>
      elements.map((element) => {
        const box = element.getBoundingClientRect()
        return { width: box.width, height: box.height }
      }),
    )
  actionBoxes.forEach(({ width, height }) => {
    expect(width).toBeGreaterThanOrEqual(44)
    expect(height).toBeGreaterThanOrEqual(44)
  })

  const jsonLd = await page.locator('script[type="application/ld+json"]').textContent()
  const graph = JSON.parse(jsonLd)['@graph']
  expect(graph.find((entry) => entry['@type'] === 'ItemList').numberOfItems).toBe(17)

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  expect(overflow).toBeLessThanOrEqual(1)

  if (testInfo.project.name === 'desktop') {
    const results = await new AxeBuilder({ page }).analyze()
    expect(results.violations).toEqual([])
  }
})

test('品牌 Logo 本地加载且 17 项使用原版 icon 映射', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop')
  await page.addInitScript(() => {
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
      configurable: true,
      value: () => null,
    })
  })
  await page.goto('/')

  const brandLogo = page.getByAltText('E时代品牌标识')
  if ((await brandLogo.count()) === 0) await page.reload()
  await expect(brandLogo).toBeVisible()
  expect(new URL(await brandLogo.getAttribute('src'), page.url()).origin).toBe(
    new URL(page.url()).origin,
  )

  const expectedIcons = [
    'lock',
    'code',
    'cloud',
    'shield',
    'globe',
    'id-card',
    'clipboard',
    'check-orbit',
    'image',
    'message',
    'git',
    'monitor',
    'users',
    'globe',
    'bulb',
    'terminal',
    'flask',
  ]
  const cards = page.getByTestId('service-card')
  await expect(cards).toHaveCount(17)
  const cardFaces = page.locator('.service-card-face--directory')
  expect(
    await cardFaces.evaluateAll((elements) =>
      elements.map((element) => element.getAttribute('data-original-icon')),
    ),
  ).toEqual(expectedIcons)
  await expect(page.locator('.service-card-face__icon > svg')).toHaveCount(17)
  await page.addStyleTag({ content: 'html { filter: grayscale(1); }' })
  await page.screenshot({
    path: 'artifacts/screenshots/desktop-original-icons-grayscale.png',
    fullPage: true,
  })
})

test('2D 服务区块单击与 Enter 直接安全导航', async ({ page }, testInfo) => {
  test.skip(!['desktop', 'mobile-390'].includes(testInfo.project.name))
  if (testInfo.project.name === 'desktop') await enableSoftwareWebGLFor3d(page)
  await page.goto('/')
  if (testInfo.project.name === 'desktop') {
    await expect(page.locator('#service-directory a[data-direct-service]')).toHaveCount(0)
    await expect(
      page.getByRole('button', { name: '查看 E时代云服务 详情' }),
    ).toBeVisible()
    await page.getByRole('button', { name: '切换到2D模式' }).click()
  }

  const links = page.locator('#service-directory a[data-direct-service]')
  await expect(links).toHaveCount(17)
  expect(
    await links.evaluateAll((elements) =>
      elements.every(
        (element) =>
          element.href.startsWith('https://') &&
          element.target === '_blank' &&
          element.rel === 'noopener noreferrer nofollow',
      ),
    ),
  ).toBe(true)

  await page.evaluate(() => {
    window.__direct2d = []
    document.addEventListener(
      'click',
      (event) => {
        const link = event.target.closest('a[data-direct-service]')
        if (!link) return
        event.preventDefault()
        window.__direct2d.push({
          slug: link.dataset.directService,
          href: link.href,
        })
      },
      true,
    )
  })
  await page.getByRole('link', { name: '打开 E时代云服务' }).click()
  expect(await page.evaluate(() => window.__direct2d)).toEqual([
    { slug: 'era-cloud', href: 'https://cloud.emoera.com/' },
  ])
  await expect(page.getByRole('dialog', { name: 'E时代云服务' })).toHaveCount(0)
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem('e-era:recent'))[0]),
  ).toBe('era-cloud')

  const keyboardLink = page.getByRole('link', { name: '打开 E时代IDE' })
  await keyboardLink.focus()
  await page.keyboard.press('Enter')
  expect(await page.evaluate(() => window.__direct2d)).toEqual([
    { slug: 'era-cloud', href: 'https://cloud.emoera.com/' },
    { slug: 'era-ide', href: 'https://ide.emoera.com/' },
  ])
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('输出原版 2D icon、3D 正视与 3D 斜视的 17 项 catalog', {
  tag: '@visual',
}, async ({ page, browser }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop')
  test.setTimeout(120_000)
  await enableSoftwareWebGLFor3d(page)
  const frontContext = await browser.newContext({
    viewport: page.viewportSize(),
    reducedMotion: 'reduce',
  })
  const frontPage = await frontContext.newPage()
  await enableSoftwareWebGLFor3d(frontPage)
  await page.goto('/')
  await frontPage.goto('/')
  await expect(page.getByTestId('spatial-scene')).toHaveAttribute('data-webgl-ready', 'true', { timeout: 15000 })
  await expect(frontPage.getByTestId('spatial-scene')).toHaveAttribute(
    'data-webgl-ready',
    'true',
  )
  const entries = await page.getByTestId('service-card').evaluateAll((elements) =>
    elements.map((element) => ({
      slug: element.getAttribute('data-service'),
      category: element.closest('.directory-region')?.id.replace('region-', ''),
      name: element.querySelector('.service-card-face__copy strong')?.textContent,
    })),
  )
  const directoryIcons = page.locator(
    '.service-card-face--directory .service-card-face__icon',
  )
  const originalCards = []
  for (let index = 0; index < entries.length; index += 1) {
    originalCards.push(
      (await directoryIcons.nth(index).screenshot({ omitBackground: true })).toString('base64'),
    )
  }
  await page.evaluate(() => window.scrollTo(0, 0))
  const diagnosticStyles =
    '.command-bar,.hero-copy,.region-legend,.scene-region-label,.scene-node-hud,.gesture-hint,.directory-jump,.site-footer { visibility: hidden !important; } .modal { opacity: 0 !important; } .modal::backdrop { background: transparent !important; backdrop-filter: none !important; }'
  await page.addStyleTag({ content: diagnosticStyles })
  await frontPage.addStyleTag({ content: diagnosticStyles })
  const captureGeometry = async (targetPage) => {
    const capture = await targetPage.evaluate(() => {
      const [icon] = window.__eEraReadGeometryAudit()
      const canvas = document.querySelector('.scene-canvas').getBoundingClientRect()
      const padding = 32
      const left = canvas.left + icon.screenBounds.left
      const top = canvas.top + icon.screenBounds.top
      const right = canvas.left + icon.screenBounds.right
      const bottom = canvas.top + icon.screenBounds.bottom
      const clip = {
        x: Math.max(0, left - padding),
        y: Math.max(0, top - padding),
        width: Math.min(window.innerWidth, right + padding) - Math.max(0, left - padding),
        height: Math.min(window.innerHeight, bottom + padding) - Math.max(0, top - padding),
      }
      return {
        clip,
        margins: {
          left: left - clip.x,
          top: top - clip.y,
          right: clip.x + clip.width - right,
          bottom: clip.y + clip.height - bottom,
        },
      }
    })
    Object.values(capture.margins).forEach((margin) => {
      expect(margin).toBeGreaterThanOrEqual(24)
    })
    return targetPage.screenshot({ clip: capture.clip })
  }
  const rendered = []
  try {
    for (const entry of entries) {
      for (const targetPage of [frontPage, page]) {
        await targetPage.evaluate(({ slug, category }) => {
          history.pushState({}, '', `/?category=${category}&service=${slug}`)
          dispatchEvent(new PopStateEvent('popstate'))
        }, entry)
        await expect(
          targetPage.locator(`.scene-node-hud[data-service="${entry.slug}"]`),
        ).toContainText(entry.name)
        await targetPage.waitForTimeout(320)
      }
      const [frontAudit] = await frontPage.evaluate(() =>
        window.__eEraReadGeometryAudit(),
      )
      const [angleAudit] = await page.evaluate(() =>
        window.__eEraReadGeometryAudit(),
      )
      expect(Math.abs(frontAudit.poseY), `${entry.slug}:front`).toBeLessThan(0.01)
      expect(Math.abs(angleAudit.poseY), `${entry.slug}:angle`).toBeGreaterThan(0.45)
      const front = await captureGeometry(frontPage)
      const angle = await captureGeometry(page)
      expect(angle.equals(front), entry.slug).toBe(false)
      rendered.push({
        ...entry,
        original: originalCards[rendered.length],
        front: front.toString('base64'),
        angle: angle.toString('base64'),
      })
    }
  } finally {
    await frontContext.close()
  }
  await page.setContent(`
    <!doctype html><html lang="zh-CN"><head><style>
      *{box-sizing:border-box}body{margin:0;padding:32px;background:#edf2ef;color:#142522;font-family:-apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif}
      h1{margin:0 0 24px;font-size:28px}.catalog{display:grid;grid-template-columns:repeat(2,1fr);gap:14px}
      article{overflow:hidden;border:1px solid #ccd8d4;border-radius:16px;background:#fff}
      h2{margin:0;padding:12px 14px;border-bottom:1px solid #e2e9e7;font-size:14px}
      .compare{display:grid;grid-template-columns:.7fr 1fr 1fr;min-height:180px}.source,.render{position:relative;display:grid;place-items:center;overflow:hidden;border-right:1px solid #e2e9e7;background:#f8fbfa}
      .source img{width:72px;height:72px;object-fit:contain}.render{background:#e8f1f4}.render img{width:100%;height:100%;object-fit:cover}
      .tag{position:absolute;left:8px;bottom:8px;padding:4px 7px;border-radius:999px;background:rgba(255,255,255,.9);font-size:10px}
    </style></head><body><h1>原版 2D icon → 真实 3D Mesh</h1><main class="catalog">
      ${rendered
        .map(
          (entry) => `<article><h2>${entry.name}</h2><div class="compare"><div class="source"><img alt="${entry.name} 原版 2D icon" src="data:image/png;base64,${entry.original}"><span class="tag">原版 2D</span></div><div class="render"><img alt="${entry.name} 3D 正视" src="data:image/png;base64,${entry.front}"><span class="tag">3D 正视</span></div><div class="render"><img alt="${entry.name} 3D 斜视" src="data:image/png;base64,${entry.angle}"><span class="tag">3D 斜视</span></div></div></article>`,
        )
        .join('')}
    </main></body></html>
  `)
  await page.screenshot({
    path: 'artifacts/screenshots/icon-mesh-2d-front-angle-catalog.png',
    fullPage: true,
  })
})

test('输出六个可见厚度的 3D icon Mesh focus 近景', {
  tag: '@visual',
}, async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop')
  await enableSoftwareWebGLFor3d(page)
  const focusModels = [
    ['era-passport', 'E时代通行证'],
    ['era-cloud', 'E时代云服务'],
    ['era-registration', 'E时代比赛报名系统'],
    ['era-git', 'E时代Git'],
    ['miaoji-lab', '妙计实验室'],
    ['qifa-lab', '启发实验室'],
  ]

  for (const [slug, name] of focusModels) {
    await page.goto('/')
    await expect(page.getByTestId('spatial-scene')).toHaveAttribute('data-webgl-ready', 'true', { timeout: 15000 })
    await page.getByRole('combobox', { name: '搜索服务' }).fill(name)
    await page.getByRole('option', { name: new RegExp(name) }).click()
    await expect(
      page.locator(`.scene-node-hud[data-service="${slug}"]`),
    ).toContainText(`${name}`)
    await page.addStyleTag({
      content:
        '.command-bar,.hero-copy,.region-legend,.scene-region-label,.gesture-hint,.directory-jump,.site-footer { visibility: hidden !important; } .modal { opacity: 0 !important; } .modal::backdrop { background: transparent !important; backdrop-filter: none !important; }',
    })
    await page.evaluate(
      () =>
        new Promise((resolve) => {
          requestAnimationFrame(() => requestAnimationFrame(resolve))
        }),
    )
    await page.waitForTimeout(320)
    const [audit] = await page.evaluate(() => window.__eEraReadGeometryAudit())
    expect(audit.depth).toBeGreaterThan(0.05)
    expect(Math.abs(audit.poseY)).toBeGreaterThan(0.45)
    await page.locator('.spatial-stage').screenshot({
      path: `artifacts/screenshots/focus-mesh-${slug}.png`,
    })
  }
})

test('搜索命中真实 3D Mesh 且禁止 icon 贴图与 DOM 替身', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop')
  await enableSoftwareWebGLFor3d(page)
  await page.goto('/')
  await expect(page.getByTestId('spatial-scene')).toHaveAttribute('data-webgl-ready', 'true', { timeout: 15000 })
  await expect
    .poll(() =>
      page.evaluate(() => window.__eEraReadGeometryAudit?.().length || 0),
    )
    .toBe(17)
  const overviewAudit = await page.evaluate(() => window.__eEraReadGeometryAudit())
  expect(
    overviewAudit.every(
      (icon) =>
        icon.renderKind === 'blender-gltf' &&
        icon.isMesh &&
        icon.hasPosition &&
        icon.hasNormal &&
        icon.hasIndex &&
        icon.depth > 0.05 &&
        !icon.hasTexture,
    ),
  ).toBe(true)
  await expect(page.locator('.scene-canvas img')).toHaveCount(0)
  await expect(page.locator('.scene-canvas .service-card-face')).toHaveCount(0)
  await page.evaluate(
    () =>
      new Promise((resolve) => {
        let previous = -1
        let stableFrames = 0
        let frames = 0
        const check = () => {
          const current = window.__eEraDrawCalls || 0
          stableFrames = current === previous ? stableFrames + 1 : 0
          previous = current
          frames += 1
          if (stableFrames >= 3 || frames >= 90) resolve()
          else requestAnimationFrame(check)
        }
        requestAnimationFrame(check)
      }),
  )
  await page.evaluate(() => {
    window.__eEraFramePeak = 0
    window.__eEraCurrentFrameDrawCalls = 0
  })
  await page.getByRole('combobox', { name: '搜索服务' }).fill('E时代Git')
  await page.getByRole('option', { name: /E时代Git/ }).click()
  const selectedHud = page.locator('.scene-node-hud[data-service="era-git"]')
  await expect(selectedHud).toContainText('Git 分支 · 3D 实体')
  await expect
    .poll(() =>
      page.evaluate(() => window.__eEraReadGeometryAudit?.().length || 0),
    )
    .toBe(1)
  await expect.poll(() => page.evaluate(() => Math.abs(window.__eEraReadGeometryAudit()[0].poseY))).toBeGreaterThan(0.45)
  await page.evaluate(
    () =>
      new Promise((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(resolve))
      }),
  )
  expect(await page.evaluate(() => window.__eEraFramePeak || 0)).toBeLessThanOrEqual(110)
})

test('搜索打开详情并一次访问且浏览器历史恢复', async ({ page }, testInfo) => {
  await page.goto('/')
  const search = page.getByRole('combobox', { name: '搜索服务' })
  await page.keyboard.press('Meta+K')
  await expect(search).toBeFocused()
  await search.fill('E时代Git')
  await page.getByRole('option', { name: /E时代Git/ }).click()

  await expect(page).toHaveURL(/category=ecosystem&service=era-git/)
  const details = page.getByRole('dialog', { name: 'E时代Git' })
  await expect(details).toBeVisible()
  const visit = details.getByRole('link', { name: '访问服务' })
  await expect(visit).toHaveAttribute(
    'href',
    'https://git.emoera.com/explore/repos',
  )
  await expect(visit).toHaveAttribute('target', '_blank')
  await expect(visit).toHaveAttribute('rel', 'noopener noreferrer nofollow')
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem('e-era:recent') || '[]')),
  ).not.toContain('era-git')
  await page.evaluate(() => {
    window.__launchedService = []
    document.addEventListener(
      'click',
      (event) => {
        const link = event.target.closest('a[data-service-launch]')
        if (!link) return
        event.preventDefault()
        window.__launchedService.push({
          slug: link.dataset.serviceLaunch,
          href: link.href,
        })
      },
      true,
    )
  })
  await visit.focus()
  await page.keyboard.press('Enter')
  expect(await page.evaluate(() => window.__launchedService)).toEqual([
    {
      slug: 'era-git',
      href: 'https://git.emoera.com/explore/repos',
    },
  ])
  await expect(
    page.getByRole('dialog', { name: '即将离开 E时代导航' }),
  ).toHaveCount(0)
  await expect(details).not.toBeVisible()
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem('e-era:recent'))[0]),
  ).toBe('era-git')
  await expect(page).toHaveURL(/category=ecosystem(?!.*service)/)

  await page.goBack()
  await expect(page).not.toHaveURL(/service=/)
  await page.goForward()
  await expect(page).toHaveURL(/category=ecosystem(?!.*service)/)
  if (testInfo.project.name === 'desktop') {
    await page.screenshot({
      path: 'artifacts/screenshots/desktop-search-detail.png',
      fullPage: false,
    })
  }
})

test('WebGL 不可用时自动进入高质量 2D 服务列表', async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
      configurable: true,
      value: () => null,
    })
  })
  await page.goto('/')

  await expect(page.getByRole('button', { name: '切换到3D模式' })).toBeVisible()
  await expect(page.getByText('已根据设备能力启用轻量 2D 模式。')).toBeVisible()
  await expect(page.getByTestId('service-card')).toHaveCount(17)
  await expect(page.locator('#service-directory a[data-direct-service]')).toHaveCount(17)
  await page.screenshot({
    path: `artifacts/screenshots/${testInfo.project.name}-2d-fallback.png`,
    fullPage: true,
  })
})

test('WebGL 上下文丢失时即时降级且保持 17 个入口', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop')
  await enableSoftwareWebGLFor3d(page)
  await page.goto('/')
  await expect(page.getByTestId('spatial-scene')).toHaveAttribute('data-webgl-ready', 'true', { timeout: 15000 })
  const canvas = page.locator('.scene-canvas canvas')
  await expect(canvas).toBeVisible()
  await canvas.evaluate((element) => {
    element.dispatchEvent(new Event('webglcontextlost', { cancelable: true }))
  })
  await expect(page.getByText('WebGL 上下文丢失，已切换到 2D 服务列表。')).toBeVisible()
  await expect(page.getByTestId('service-card')).toHaveCount(17)
  await expect(page.locator('#service-directory a[data-direct-service]')).toHaveCount(17)
})

test('reduced motion 保持完整导航与静态反馈', async ({ page }, testInfo) => {
  if (testInfo.project.name === 'desktop') await enableSoftwareWebGLFor3d(page)
  await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'dark' })
  await page.goto('/?category=products')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  const help = page.getByRole('button', { name: '导航操作帮助' })
  await help.click()
  await expect(page.getByRole('dialog', { name: '如何使用服务导航' })).toBeVisible()
  await page.getByRole('dialog', { name: '如何使用服务导航' }).getByRole('button', {
    name: '关闭',
  }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)

  if (testInfo.project.name === 'desktop') {
    await expect(page.getByTestId('spatial-scene')).toHaveAttribute('data-reduced-motion', 'true')
  }
  await expect(page.getByRole('button', { name: '聚焦产品服务' })).toBeVisible()
  if (testInfo.project.name === 'desktop') {
    await page.getByRole('button', { name: '查看 E时代云服务 详情' }).click()
    await expect(page.getByRole('dialog', { name: 'E时代云服务' })).toBeVisible()
    await expect
      .poll(() =>
        page.evaluate(() => window.__eEraReadGeometryAudit?.().length || 0),
      )
      .toBe(1)
    const audit = await page.evaluate(() => window.__eEraReadGeometryAudit())
    expect(Math.abs(audit[0].poseY)).toBeLessThan(0.01)
    await page.screenshot({
      path: 'artifacts/screenshots/desktop-dark-reduced.png',
      fullPage: false,
    })
    await page.addStyleTag({
      content:
        '.command-bar,.hero-copy,.region-legend,.scene-region-label,.gesture-hint,.directory-jump { visibility: hidden !important; } .modal { opacity: 0 !important; } .modal::backdrop { background: transparent !important; backdrop-filter: none !important; }',
    })
    await page.locator('.spatial-stage').screenshot({
      path: 'artifacts/screenshots/desktop-dark-mesh-reduced.png',
    })
  } else {
    await expect(page.getByRole('link', { name: '打开 E时代云服务' })).toHaveAttribute(
      'href',
      'https://cloud.emoera.com/',
    )
    await expect(page.getByRole('dialog')).toHaveCount(0)
  }
})

test('详情阻断背景快捷键并由 Escape 关闭恢复焦点', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop')
  await enableSoftwareWebGLFor3d(page)
  await page.goto('/')
  const trigger = page.getByRole('button', { name: '查看 E时代云服务 详情' })
  await trigger.focus()
  await trigger.click()
  const details = page.getByRole('dialog', { name: 'E时代云服务' })
  await expect(details).toBeVisible()
  const before = page.url()
  await page.keyboard.press('Alt+h')
  expect(page.url()).toBe(before)
  await expect(page.getByRole('dialog')).toHaveCount(1)
  await expect(
    page.getByRole('dialog', { name: '即将离开 E时代导航' }),
  ).toHaveCount(0)
  await page.keyboard.press('Escape')
  await expect(details).not.toBeVisible()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(trigger).toBeFocused()
})

test('移动端单指保留页面滚动且离屏暂停场景', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-390')
  await enableSoftwareWebGLFor3d(page)
  await page.goto('/')
  await page.getByRole('button', { name: '切换到3D模式' }).click()
  const scene = page.getByTestId('spatial-scene')
  const canvas = scene.locator('canvas')
  await expect(canvas).toBeVisible()
  await expect(scene).toHaveAttribute('data-quality-tier', 'low')
  expect(await canvas.evaluate((element) => getComputedStyle(element).touchAction)).toBe('pan-y')

  await page.getByRole('link', { name: '浏览服务列表' }).click()
  await page.getByRole('button', { name: '查看 E时代通行证 详情' }).scrollIntoViewIfNeeded()
  await expect(scene).toHaveAttribute('data-render-active', 'false')
})

test('四核四 GB 桌面自动使用低画质三维预算', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop')
  await enableSoftwareWebGLFor3d(page, {
    hardwareConcurrency: 4,
    deviceMemory: 4,
  })
  await page.goto('/')
  await expect(page.getByTestId('spatial-scene')).toHaveAttribute('data-quality-tier', 'low')
})

test('主线程帧预算和首屏交互保持可用', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop')
  await enableSoftwareWebGLFor3d(page)
  await page.goto('/')
  await expect(page.getByTestId('spatial-scene')).toHaveAttribute('data-webgl-ready', 'true', { timeout: 15000 })
  await expect(page.getByTestId('spatial-scene')).toHaveAttribute('data-quality-tier', 'high')
  const sample = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const times = []
        const start = performance.now()
        const tick = (time) => {
          times.push(time)
          if (times.length < 45) requestAnimationFrame(tick)
          else {
            const elapsed = times.at(-1) - start
            resolve({
              elapsed,
              averageFrameMs: elapsed / times.length,
            })
          }
        }
        requestAnimationFrame(tick)
      }),
  )
  const session = await page.context().newCDPSession(page)
  await session.send('Performance.enable')
  const performanceMetrics = await session.send('Performance.getMetrics')
  const metric = (name) =>
    performanceMetrics.metrics.find((entry) => entry.name === name)?.value ?? 0

  // Headless Chromium uses software rendering and can be timer-throttled.
  // This catches a stalled main thread and runaway geometry/DOM memory.
  expect(sample.averageFrameMs).toBeLessThan(180)
  expect(metric('JSHeapUsedSize')).toBeLessThan(160 * 1024 * 1024)
  expect(metric('Nodes')).toBeLessThan(6000)
  expect(await page.evaluate(() => window.__eEraDrawCalls || 0)).toBeLessThan(5000)
  await expect(page.getByRole('combobox', { name: '搜索服务' })).toBeEnabled()
})

test('生成关键视口视觉截图', { tag: '@visual' }, async ({ page }, testInfo) => {
  if (testInfo.project.name === 'desktop') await enableSoftwareWebGLFor3d(page)
  await page.goto('/')
  await expect(page.locator('.scene-canvas canvas, .two-d-backdrop').first()).toBeVisible()
  if (testInfo.project.name === 'desktop') {
    await expect
      .poll(() =>
        page.evaluate(() => window.__eEraReadGeometryAudit?.().length || 0),
      )
      .toBe(17)
    await page.evaluate(
      () =>
        new Promise((resolve) => {
          requestAnimationFrame(() => requestAnimationFrame(resolve))
        }),
    )
  }
  await page.screenshot({
    path: `artifacts/screenshots/${testInfo.project.name}-overview.png`,
    fullPage: testInfo.project.name !== 'desktop',
  })
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
})

test('聚焦态显示上下文路径并可就地返回总览', async ({ page }, testInfo) => {
  await page.goto('/?category=team&service=era-oj')
  const path = page.getByRole('navigation', { name: '当前服务路径' })
  await expect(path).toBeVisible()
  await expect(path).toContainText('总览/团队与官网/E时代OJ')
  await expect(path.locator('[aria-current="page"]')).toHaveText('E时代OJ')
  if (testInfo.project.name === 'desktop') {
    await expect(page.locator('.breadcrumbs--desktop')).toBeVisible()
    await expect(page.locator('.breadcrumbs--mobile')).not.toBeVisible()
  } else {
    await expect(page.locator('.breadcrumbs--mobile')).toBeVisible()
  }

  await page.addStyleTag({
    content:
      '.modal { opacity: 0 !important; } .modal::backdrop { background: transparent !important; backdrop-filter: none !important; }',
  })
  await page.screenshot({
    path: `artifacts/screenshots/${testInfo.project.name}-focused-header.png`,
    fullPage: false,
  })

  await page.getByRole('dialog', { name: 'E时代OJ' }).getByRole('button', {
    name: '关闭',
  }).click()
  const categoryPath = page.getByRole('navigation', { name: '当前服务路径' })
  await categoryPath.getByRole('button', { name: '总览' }).click()
  await expect(page.getByRole('navigation', { name: '当前服务路径' })).toHaveCount(0)
  expect(new URL(page.url()).search).toBe('')
})

test('Blender 模型请求失败时恢复到完整服务目录', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop')
  await enableSoftwareWebGLFor3d(page)
  await page.route('**/assets/navigation-sculptures-*.glb', (route) => route.abort())
  await page.goto('/')
  await expect(page.getByRole('button', { name: '切换到3D模式' })).toBeVisible()
  await expect(page.locator('#service-directory a[data-direct-service]')).toHaveCount(17)
})

test('宽屏慢网加载时背景完整、标题不重叠且可以先用列表', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop')
  await enableSoftwareWebGLFor3d(page)
  await page.setViewportSize({ width: 1920, height: 1080 })
  let release
  const held = new Promise((resolve) => { release = resolve })
  await page.route('**/assets/navigation-sculptures-*.glb', async (route) => {
    await held
    await route.abort()
  })
  try {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    const scene = page.getByTestId('spatial-scene')
    await expect(scene).toHaveAttribute('data-models-ready', 'false')
    await expect(page.getByTestId('model-loading')).toBeVisible()
    await expect(scene.locator('canvas')).toHaveCSS('opacity', '0')
    await expect(scene).toHaveCSS('background-color', 'rgb(232, 241, 244)')
    const hero = await page.locator('.hero-copy').boundingBox()
    const modelArea = await scene.boundingBox()
    expect(modelArea.x).toBeGreaterThanOrEqual(hero.x + hero.width + 24)
    await page.getByRole('button', { name: '先用 2D 服务列表' }).click()
    await expect(page.locator('#service-directory a[data-direct-service]')).toHaveCount(17)
  } finally { release() }
})

test('压缩模型只下载一次并完成场景呈现', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop')
  await enableSoftwareWebGLFor3d(page)
  const requests = []
  page.on('request', (request) => {
    if (/\/assets\/navigation-sculptures-[^/]+\.glb$/.test(request.url())) requests.push(request.url())
  })
  await page.goto('/')
  await expect(page.getByTestId('spatial-scene')).toHaveAttribute('data-models-ready', 'true', { timeout: 15000 })
  await expect(page.getByTestId('model-loading')).toHaveCount(0)
  await expect.poll(() => page.evaluate(() => window.__eEraReadGeometryAudit?.().length || 0)).toBe(17)
  expect(requests).toHaveLength(1)
})

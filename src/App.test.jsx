import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { preferenceKeys } from './lib/preferences'
import { detectCapabilities } from './lib/capabilities'

vi.mock('./scene/SpatialScene', () => ({
  default: ({ onCategory, onService, onFallback }) => (
    <div data-testid="spatial-scene">
      <button type="button" onClick={() => onCategory('products')}>
        模拟聚焦产品区
      </button>
      <button type="button" onClick={() => onService('era-cloud')}>
        模拟聚焦云服务
      </button>
      <button type="button" onClick={() => onFallback('模拟上下文丢失')}>
        模拟 WebGL 丢失
      </button>
    </div>
  ),
}))

vi.mock('./lib/capabilities', () => ({
  detectCapabilities: vi.fn(() => ({
    webgl: true,
    hardwareConcurrency: 8,
    deviceMemory: 8,
    saveData: false,
    recommendedMode: '3d',
  })),
}))

describe('E时代社团服务导航', () => {
  beforeEach(() => {
    localStorage.clear()
    window.history.replaceState({}, '', '/')
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: true,
    })
  })

  it('保留完整 17 个入口和三个服务分类', async () => {
    render(<App />)

    expect(await screen.findByTestId('spatial-scene')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '服务导航' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: '刷题导航' })).toHaveAttribute('href', '/oj/')
    expect(screen.getByRole('heading', { level: 1, name: '服务导航' })).toBeVisible()
    expect(screen.getByText('社团产品、通行证生态与团队入口')).toBeVisible()
    expect(screen.getAllByTestId('service-card')).toHaveLength(17)
    expect(screen.getByRole('navigation', { name: '服务分类' })).not.toHaveTextContent('成员项目')
    expect(screen.queryByText('渡鸦笔记')).not.toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: '服务分类' })).toHaveTextContent('产品服务')
    expect(screen.getByRole('group', { name: '服务展示方式' })).toBeVisible()
  })

  it('手机端默认显示 3D，忽略旧版本留下的 2D 偏好', async () => {
    localStorage.setItem(preferenceKeys.renderMode, '2d')
    const originalMatchMedia = window.matchMedia
    const media = vi.spyOn(window, 'matchMedia').mockImplementation(query => ({
      ...originalMatchMedia(query),
      matches: query === '(max-width: 720px)',
    }))
    try {
      render(<App />)
      expect(await screen.findByTestId('spatial-scene')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '切换到3D模式' })).toHaveAttribute('aria-pressed', 'true')
    } finally {
      media.mockRestore()
    }
  })

  it('无 WebGL 时保留完整服务列表和提示', () => {
    vi.mocked(detectCapabilities).mockReturnValueOnce({ webgl: false, recommendedMode: '2d' })
    render(<App />)
    expect(screen.queryByTestId('spatial-scene')).not.toBeInTheDocument()
    expect(screen.getAllByTestId('service-card')).toHaveLength(17)
    expect(screen.getByText('当前设备无法显示 3D，已为你打开服务列表。')).toBeVisible()
  })

  it('使用本地品牌资产且不把品牌 Logo 用作模块图形', async () => {
    const { container } = render(<App />)
    await screen.findByTestId('spatial-scene')

    expect(screen.getByAltText('E时代品牌标识')).toHaveAttribute(
      'src',
      '/brand/e-era-logo-96.png',
    )
    const serviceIcons = [...container.querySelectorAll('[data-original-icon]')]
    expect(serviceIcons).toHaveLength(17)
    expect(new Set(serviceIcons.map((element) => element.dataset.originalIcon)).size).toBe(16)
    expect(container.querySelector('[src*="we.emoera.com"]')).not.toBeInTheDocument()
  })

  it('Cmd/Ctrl+K、方向键和 Enter 可搜索并聚焦目标', async () => {
    render(<App />)
    await screen.findByTestId('spatial-scene')

    fireEvent.keyDown(window, { key: 'k', metaKey: true })
    const search = screen.getByRole('combobox', { name: '搜索服务' })
    expect(search).toHaveFocus()
    fireEvent.change(search, { target: { value: '图' } })
    fireEvent.keyDown(search, { key: 'ArrowDown' })
    fireEvent.keyDown(search, { key: 'ArrowUp' })
    fireEvent.keyDown(search, { key: 'Enter' })

    expect(
      screen.getByRole('navigation', { name: '当前服务路径' }),
    ).toHaveTextContent('总览/通行证生态链/E时代图床')
  })

  it('完全移除收藏入口但保留最近访问', async () => {
    render(<App />)
    await screen.findByTestId('spatial-scene')

    expect(screen.queryByRole('button', { name: /收藏/ })).not.toBeInTheDocument()
    expect(screen.queryByText('收藏')).not.toBeInTheDocument()
    expect(preferenceKeys.favorites).toBeUndefined()

    fireEvent.click(screen.getByRole('button', { name: '模拟聚焦云服务' }))
    const serviceDialog = screen.getByRole('dialog', { name: 'E时代云服务' })
    const visit = within(serviceDialog).getByRole('link', { name: '访问服务' })
    expect(visit).toHaveAttribute('href', 'https://cloud.emoera.com/')
    expect(visit).toHaveAttribute('target', '_blank')
    expect(visit).toHaveAttribute('rel', 'noopener noreferrer nofollow')
    fireEvent.click(visit)
    expect(
      screen.queryByRole('dialog', { name: '即将离开 E时代导航' }),
    ).not.toBeInTheDocument()
    expect(JSON.parse(localStorage.getItem(preferenceKeys.recent))[0]).toBe(
      'era-cloud',
    )
  })

  it('可返回首页并手动切换完整 2D 服务列表', async () => {
    render(<App />)
    await screen.findByTestId('spatial-scene')

    fireEvent.click(screen.getByRole('button', { name: '模拟聚焦产品区' }))
    expect(
      screen.getByRole('navigation', { name: '当前服务路径' }),
    ).toHaveTextContent('总览/产品服务')
    fireEvent.click(screen.getByRole('button', { name: '返回导航首页' }))
    expect(
      screen.queryByRole('navigation', { name: '当前服务路径' }),
    ).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '切换到2D模式' }))
    expect(screen.getByText('已手动切换为 2D 服务列表。')).toBeInTheDocument()
    expect(screen.getAllByTestId('service-card')).toHaveLength(17)
  })

  it('WebGL 运行失败时自动降级且功能不丢失', async () => {
    const firstVisit = render(<App />)
    await screen.findByTestId('spatial-scene')

    fireEvent.click(screen.getByRole('button', { name: '模拟 WebGL 丢失' }))
    expect(screen.getByText('模拟上下文丢失')).toBeInTheDocument()
    expect(screen.getAllByTestId('service-card')).toHaveLength(17)
    expect(localStorage.getItem(preferenceKeys.renderMode)).toBeNull()
    firstVisit.unmount()
    render(<App />)
    expect(await screen.findByTestId('spatial-scene')).toBeInTheDocument()
  })

  it('默认不弹操作提示，仅显式帮助动作打开并恢复焦点', () => {
    render(<App />)

    expect(
      screen.queryByRole('dialog', { name: '服务导航' }),
    ).not.toBeInTheDocument()
    const helpButton = screen.getByRole('button', { name: '公告' })
    helpButton.focus()
    fireEvent.click(helpButton)
    const dialog = screen.getByRole('dialog', { name: '服务导航' })
    const announcementTab = within(dialog).getByRole('tab', { name: '公告' })
    const guideTab = within(dialog).getByRole('tab', { name: '操作说明与快捷键' })
    expect(announcementTab).toHaveAttribute('aria-selected', 'true')
    expect(within(dialog).getByRole('tabpanel', { name: '公告' })).toHaveTextContent(
      '新同学记得点击链接加入我们在牛客的团队',
    )
    fireEvent.keyDown(announcementTab, { key: 'ArrowRight' })
    expect(guideTab).toHaveAttribute('aria-selected', 'true')
    expect(guideTab).toHaveFocus()
    expect(within(dialog).getByRole('tabpanel', { name: '操作说明与快捷键' })).toBeInTheDocument()
    expect(within(dialog).getByText('按分类浏览')).toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole('button', { name: '关闭' }))
    expect(
      screen.queryByRole('dialog', { name: '服务导航' }),
    ).not.toBeInTheDocument()
    expect(helpButton).toHaveFocus()
  })

  it('支持明暗主题切换', async () => {
    render(<App />)
    await screen.findByTestId('spatial-scene')
    fireEvent.click(screen.getByRole('button', { name: '切换到深色主题' }))
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')

    // 切换按钮渲染成图标按钮：可重复切换，点击触发以按钮为圆心的涟漪过渡。
    const switch_ = screen.getByRole('button', { name: '切换到浅色主题' })
    expect(switch_.className).toMatch(/theme-button/)

    // 不支持 View Transitions 的环境也能直接切：data-theme 立刻翻转。
    const originalStartViewTransition = document.startViewTransition
    Object.defineProperty(document, 'startViewTransition', {
      configurable: true,
      value: undefined,
    })
    fireEvent.click(switch_)
    expect(document.documentElement).toHaveAttribute('data-theme', 'light')
    Object.defineProperty(document, 'startViewTransition', {
      configurable: true,
      value: originalStartViewTransition,
    })
  })

  it('搜索无结果时提供状态反馈并可清除', async () => {
    render(<App />)
    await screen.findByTestId('spatial-scene')
    const search = screen.getByRole('combobox', { name: '搜索服务' })

    fireEvent.change(search, { target: { value: '不存在的社团服务' } })
    expect(screen.getByText('没有匹配的服务')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '清除搜索' }))
    expect(search).toHaveValue('')
  })

  it('组合快捷键可导航区域、返回、回家和打开帮助', async () => {
    render(<App />)
    await screen.findByTestId('spatial-scene')

    fireEvent.keyDown(window, { key: '1', altKey: true })
    expect(window.location.search).toContain('category=products')
    fireEvent.keyDown(window, { key: 'b', altKey: true })
    expect(window.location.search).toBe('')
    fireEvent.keyDown(window, { key: '3', altKey: true })
    expect(window.location.search).toContain('category=team')
    fireEvent.keyDown(window, { key: 'h', altKey: true })
    expect(window.location.search).toBe('')
    fireEvent.keyDown(window, { key: '?', altKey: true })
    expect(
      screen.getByRole('dialog', { name: '服务导航' }),
    ).toBeInTheDocument()
    const dialog = screen.getByRole('dialog', { name: '服务导航' })
    expect(
      within(dialog).getByRole('tab', { name: '操作说明与快捷键' }),
    ).toHaveAttribute('aria-selected', 'true')
    expect(within(dialog).getByText('按分类浏览')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '关闭' }))
  })

  it('手动 2D 与 3D 模式可往返切换', async () => {
    render(<App />)
    await screen.findByTestId('spatial-scene')

    fireEvent.click(screen.getByRole('button', { name: '切换到2D模式' }))
    fireEvent.click(screen.getByRole('button', { name: '切换到3D模式' }))
    expect(await screen.findByTestId('spatial-scene')).toBeInTheDocument()
    expect(localStorage.getItem(preferenceKeys.renderMode)).toBeNull()
  })

  it('2D 卡片直接链接，搜索仍保持详情流程', async () => {
    const open = vi.spyOn(window, 'open')
    render(<App />)
    await screen.findByTestId('spatial-scene')
    fireEvent.click(screen.getByRole('button', { name: '切换到2D模式' }))

    const direct = screen.getByRole('link', { name: '打开 E时代云服务' })
    expect(direct).toHaveAttribute('href', 'https://cloud.emoera.com/')
    expect(direct).toHaveAttribute('target', '_blank')
    expect(direct).toHaveAttribute('rel', 'noopener noreferrer nofollow')
    fireEvent.click(direct)
    expect(screen.queryByRole('dialog', { name: 'E时代云服务' })).not.toBeInTheDocument()
    expect(JSON.parse(localStorage.getItem(preferenceKeys.recent))[0]).toBe('era-cloud')

    const search = screen.getByRole('combobox', { name: '搜索服务' })
    fireEvent.change(search, { target: { value: 'E时代Git' } })
    fireEvent.keyDown(search, { key: 'Enter' })
    expect(screen.getByRole('dialog', { name: 'E时代Git' })).toBeInTheDocument()
    expect(open).not.toHaveBeenCalled()
    open.mockRestore()
  })

  it('浏览器 popstate 可恢复安全深链状态', async () => {
    render(<App />)
    await screen.findByTestId('spatial-scene')
    window.history.pushState(
      {},
      '',
      '/?category=team&service=era-oj',
    )
    fireEvent.popState(window)
    expect(screen.getByRole('dialog', { name: 'E时代OJ' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '关闭' }))
    expect(window.location.search).toBe('?category=team')
  })

  it('离线时保留浏览但禁止外链访问', async () => {
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: false,
    })
    render(<App />)
    await screen.findByTestId('spatial-scene')

    expect(screen.getByText(/当前离线/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '模拟聚焦云服务' }))
    expect(
      screen.getByRole('button', { name: '访问服务' }),
    ).toBeDisabled()
  })

  it('持久栏目不与显示模式混淆，后退恢复分类并清除过期提示', async () => {
    render(<App />)
    await screen.findByTestId('spatial-scene')
    const nav = screen.getByRole('navigation', { name: '导航栏目' })
    expect(within(nav).getByRole('link', { name: '服务导航' })).toHaveAttribute('aria-current', 'page')
    expect(within(nav).getByRole('link', { name: '刷题导航' })).not.toHaveAttribute('aria-current')
    fireEvent.click(screen.getByRole('button', { name: '切换到2D模式' }))
    expect(within(nav).queryByRole('button')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '产品服务', exact: true }))
    expect(screen.getAllByTestId('service-card')).toHaveLength(6)
    window.history.replaceState({}, '', '/')
    fireEvent.popState(window)
    expect(screen.getAllByTestId('service-card')).toHaveLength(17)
    expect(screen.queryByText('已手动切换为 2D 服务列表。')).not.toBeInTheDocument()
    expect(document.title).toBe('服务导航 · E时代导航')
  })
})

import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Box,
  ChevronRight,
  Megaphone,
  Monitor,
  Search,
  WifiOff,
  X,
} from 'lucide-react'
import './SpatialApp.css'
import SiteHeader from './components/SiteHeader'
import SiteFooter from './components/SiteFooter'
import './ServicePage.css'
import Directory from './components/Directory'
import Modal from './components/Modal'
import SceneErrorBoundary from './components/SceneErrorBoundary'
import sculptureUrl from './assets/navigation-sculptures.glb?url'
import ServiceCardFace from './components/ServiceCardFace'
import { ANNOUNCEMENT } from './data/announcement'
import { categories, categoryBySlug, serviceBySlug, services } from './data/services'
import { detectCapabilities } from './lib/capabilities'
import {
  buildLocation,
  createSpatialState,
  isSafeExternalUrl,
  parseLocation,
  spatialParent,
} from './lib/navigation'
import {
  addRecentService,
  getStoredArray,
  getStoredValue,
  preferenceKeys,
  setStoredValue,
} from './lib/preferences'
const SpatialScene = lazy(() => import('./scene/SpatialScene'))

function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches)

  useEffect(() => {
    const media = window.matchMedia(query)
    const update = () => setMatches(media.matches)
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [query])

  return matches
}

function normalize(value) {
  return value.toLocaleLowerCase('zh-CN').replace(/\s+/g, '')
}

function BreadcrumbTrail({
  category,
  service,
  onHome,
  onCategory,
  className = '',
}) {
  if (!category) return null
  return (
    <nav className={`breadcrumbs ${className}`} aria-label="当前服务路径">
      <button type="button" onClick={onHome}>
        总览
      </button>
      <span className="breadcrumbs__separator" aria-hidden="true">
        /
      </span>
      {service ? (
        <>
          <button type="button" onClick={() => onCategory(category.slug)}>
            {category.name}
          </button>
          <span className="breadcrumbs__separator" aria-hidden="true">
            /
          </span>
          <span aria-current="page">{service.name}</span>
        </>
      ) : (
        <span aria-current="page">{category.name}</span>
      )}
    </nav>
  )
}

function App() {
  const capabilities = useMemo(() => detectCapabilities(), [])
  const initialState = useMemo(() => parseLocation(window.location.search), [])
  const [spatialState, setSpatialState] = useState(() => initialState)
  const [theme, setTheme] = useState(() => {
    const stored = getStoredValue(preferenceKeys.theme)
    if (stored === 'light' || stored === 'dark') return stored
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })
  // Start each visit in 3D; an old preference or a previous GPU failure must not hide it.
  // Small devices use the scene's low-quality tier instead of losing the model entirely.
  const [renderMode, setRenderMode] = useState(() => capabilities.recommendedMode)
  const [modeNotice, setModeNotice] = useState(() =>
    capabilities.recommendedMode === '2d'
        ? '当前设备无法显示 3D，已为你打开服务列表。'
        : '',
  )
  const [recent, setRecent] = useState(() => getStoredArray(preferenceKeys.recent))
  const [query, setQuery] = useState('')
  const [activeSearchIndex, setActiveSearchIndex] = useState(0)
  const [helpOpen, setHelpOpen] = useState(false)
  const [helpTab, setHelpTab] = useState('guide')
  const [online, setOnline] = useState(navigator.onLine)
  const [cameraRevision, setCameraRevision] = useState(0)
  const searchRef = useRef(null)
  const helpTriggerRef = useRef(null)
  const announcementTabRef = useRef(null)
  const guideTabRef = useRef(null)
  const themeButtonRef = useRef(null)
  const helpWasOpenedRef = useRef(false)
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')

  const activeServiceBySlug = serviceBySlug
  const activeCategoryBySlug = categoryBySlug
  const activeServices = services
  const activeCategories = categories

  const selectedService = activeServiceBySlug[spatialState.service] || null
  const selectedCategory = activeCategoryBySlug[spatialState.category] || null
  const modalOpen = Boolean(selectedService || helpOpen)
  const openInfoPanel = useCallback((tab) => {
    helpWasOpenedRef.current = true
    setHelpTab(tab)
    setHelpOpen(true)
  }, [])

  const handleHelpTabKeyDown = (event) => {
    let nextTab
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      nextTab = helpTab === 'announcement' ? 'guide' : 'announcement'
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      nextTab = helpTab === 'guide' ? 'announcement' : 'guide'
    } else if (event.key === 'Home') {
      nextTab = 'announcement'
    } else if (event.key === 'End') {
      nextTab = 'guide'
    } else {
      return
    }

    event.preventDefault()
    setHelpTab(nextTab)
    const nextRef = nextTab === 'announcement' ? announcementTabRef : guideTabRef
    nextRef.current?.focus()
  }

  const renderAnnouncement = (text) => {
    const urlPattern = /(https?:\/\/[^\s，。、！？]+)/g
    return text.split('\n').map((line, lineIndex) => {
      const nodes = []
      let last = 0
      let match
      urlPattern.lastIndex = 0
      while ((match = urlPattern.exec(line)) !== null) {
        if (match.index > last) nodes.push(line.slice(last, match.index))
        nodes.push(
          <a
            key={`${lineIndex}-${match.index}`}
            href={match[0]}
            target="_blank"
            rel="noopener noreferrer"
          >
            {match[0]}
          </a>,
        )
        last = match.index + match[0].length
      }
      if (last < line.length) nodes.push(line.slice(last))
      return <p key={lineIndex}>{nodes}</p>
    })
  }

  const searchResults = useMemo(() => {
    const needle = normalize(query)
    if (!needle) return []
    return activeServices
      .filter((service) => {
        const category = activeCategoryBySlug[service.category]
        return normalize(
          `${service.name}${service.description}${category ? category.name : ''}`,
        ).includes(needle)
      })
      .slice(0, 7)
  }, [query, activeServices, activeCategoryBySlug])

  const navigateSpatial = useCallback((nextState, replace = false) => {
    const safeState = createSpatialState(
      nextState?.category,
      nextState?.service,
      nextState?.namespace ?? spatialState.namespace,
    )
    const currentState = parseLocation(window.location.search)
    if (
      currentState.namespace === safeState.namespace &&
      currentState.category === safeState.category &&
      currentState.service === safeState.service
    ) {
      setSpatialState(safeState)
      return
    }
    const method = replace ? 'replaceState' : 'pushState'
    window.history[method]({ eraSpatial: safeState }, '', buildLocation(safeState))
    setSpatialState(safeState)
  }, [spatialState.namespace])

  const focusCategory = useCallback(
    (slug) => {
      navigateSpatial(
        createSpatialState(slug, null, spatialState.namespace),
      )
    },
    [navigateSpatial, spatialState.namespace],
  )

  const focusService = useCallback(
    (slug) => {
      const service = activeServiceBySlug[slug]
      if (!service) return
      setQuery('')
      navigateSpatial(
        createSpatialState(service.category, service.slug, spatialState.namespace),
      )
    },
    [activeServiceBySlug, navigateSpatial, spatialState.namespace],
  )

  const goHome = useCallback(
    () => {
      setCameraRevision((revision) => revision + 1)
      navigateSpatial(createSpatialState(null, null, spatialState.namespace))
    },
    [navigateSpatial, spatialState.namespace],
  )

  const toggleThemeRipple = useCallback(() => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark'
    const button = themeButtonRef.current
    const root = document.documentElement

    if (typeof document.startViewTransition !== 'function' || !button) {
      setTheme(nextTheme)
      return
    }

    const rect = button.getBoundingClientRect()
    const originX = rect.left + rect.width / 2
    const originY = rect.top + rect.height / 2
    const maxRadius = Math.hypot(
      Math.max(originX, window.innerWidth - originX),
      Math.max(originY, window.innerHeight - originY),
    )

    root.style.setProperty('--theme-origin-x', `${originX}px`)
    root.style.setProperty('--theme-origin-y', `${originY}px`)
    root.style.setProperty('--theme-origin-r', `${maxRadius}px`)

    const transition = document.startViewTransition(() => {
      setTheme(nextTheme)
    })

    transition.finished
      .catch(() => {
        // 状态已经被 startViewTransition 内的回调切换，无需手动回退。
      })
      .finally(() => {
        root.style.removeProperty('--theme-origin-x')
        root.style.removeProperty('--theme-origin-y')
        root.style.removeProperty('--theme-origin-r')
      })
  }, [theme])

  const goBack = useCallback(
    () => navigateSpatial(spatialParent(spatialState), true),
    [navigateSpatial, spatialState],
  )

  const closeService = useCallback(() => {
    navigateSpatial(spatialParent(spatialState), true)
  }, [navigateSpatial, spatialState])

  useEffect(() => {
    document.title = '服务导航 · E时代导航'
    window.history.replaceState({ ...window.history.state, eraSpatial: spatialState }, '', buildLocation(spatialState))
    const handlePopState = () => {
      setHelpOpen(false)
      setSpatialState(parseLocation(window.location.search))
      setQuery('')
      setModeNotice('')
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
    // Initial state is intentionally canonicalized once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.style.colorScheme = theme
    setStoredValue(preferenceKeys.theme, theme)
  }, [theme])

  useEffect(() => {
    if (helpOpen || !helpWasOpenedRef.current) return
    helpWasOpenedRef.current = false
    helpTriggerRef.current?.focus()
  }, [helpOpen])

  useEffect(() => {
    const handleOnline = () => setOnline(true)
    const handleOffline = () => setOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  useEffect(() => {
    const handleShortcut = (event) => {
      if (modalOpen) return
      const target = event.target
      const editing =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement
      if (editing && event.key !== 'Escape') return

      if (event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        searchRef.current?.focus()
        searchRef.current?.scrollIntoView({ block: 'center' })
      } else if (event.altKey && event.key.toLowerCase() === 'h') {
        goHome()
      } else if (event.altKey && event.key.toLowerCase() === 'b') {
        goBack()
      } else if (event.altKey && event.key === '?') {
        openInfoPanel('guide')
      } else if (event.altKey && event.key.toLowerCase() === 'o') {
        window.location.assign('/oj/')
      } else if (
        event.altKey &&
        ['1', '2', '3', '4'].includes(event.key) &&
        activeCategories[Number(event.key) - 1]
      ) {
        focusCategory(activeCategories[Number(event.key) - 1].slug)

      }
    }

    window.addEventListener('keydown', handleShortcut)
    return () => window.removeEventListener('keydown', handleShortcut)
  }, [
    activeCategories,
    focusCategory,
    goBack,
    goHome,
    modalOpen,
    openInfoPanel,
  ])

  const switchRenderMode = () => {
    if (renderMode === '2d') {
      if (!capabilities.webgl) {
        setModeNotice('此设备无法建立 WebGL 上下文，继续使用 2D 服务列表。')
        return
      }
      setRenderMode('3d')
      setModeNotice('')
      return
    }
    setRenderMode('2d')
    setModeNotice('已手动切换为 2D 服务列表。')
  }

  const fallbackTo2d = useCallback((reason) => {
    setRenderMode('2d')
    setModeNotice(reason)
  }, [])

  const recordVisit = (slug) => {
    setRecent(addRecentService(preferenceKeys.recent, slug))
  }

  const closeHelp = () => {
    setHelpOpen(false)
    setStoredValue(preferenceKeys.introSeen, 'true')
  }

  return (
    <div className="app-shell service-page">
      <a className="skip-link" href="#service-directory">跳到可访问服务目录</a>
      <SiteHeader section="services" theme={theme} onTheme={toggleThemeRipple} themeRef={themeButtonRef}>
        <button ref={helpTriggerRef} type="button" className="icon-button help-button" onClick={() => openInfoPanel('announcement')} aria-label="公告">
          <Megaphone aria-hidden="true" />
        </button>
      </SiteHeader>
      <main className="site-main">
        <div className={`service-hero ${renderMode === '3d' ? 'has-scene' : ''}`}>
        <div className="page-intro">
          <div><h1 id="hero-title">服务导航</h1><p>社团产品、通行证生态与团队入口</p></div>
        <div className="catalog-search search-console" id="global-search">
          <Search aria-hidden="true" />
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setActiveSearchIndex(0)
            }}
            onKeyDown={(event) => {
              if (event.key === 'ArrowDown' && searchResults.length) {
                event.preventDefault()
                setActiveSearchIndex((index) => (index + 1) % searchResults.length)
              }
              if (event.key === 'ArrowUp' && searchResults.length) {
                event.preventDefault()
                setActiveSearchIndex(
                  (index) => (index - 1 + searchResults.length) % searchResults.length,
                )
              }
              if (event.key === 'Enter' && searchResults[activeSearchIndex]) {
                event.preventDefault()
                focusService(searchResults[activeSearchIndex].slug)
              }
              if (event.key === 'Escape') {
                setQuery('')
                event.currentTarget.blur()
              }
            }}
            placeholder="搜索社团服务…"
            aria-label="搜索服务"
            role="combobox"
            aria-expanded={searchResults.length > 0}
            aria-controls="search-results"
            aria-autocomplete="list"
            aria-activedescendant={
              searchResults[activeSearchIndex]
                ? `search-${searchResults[activeSearchIndex].slug}`
                : undefined
            }
          />
          {query && (
            <button type="button" onClick={() => setQuery('')} aria-label="清除搜索">
              <X aria-hidden="true" />
            </button>
          )}
          {!query && (
            <kbd className="search-shortcut" aria-hidden="true">
              ⌘K
            </kbd>
          )}
          {searchResults.length > 0 && (
            <div className="search-results" id="search-results" role="listbox">
              {searchResults.map((service, index) => (
                <button
                  id={`search-${service.slug}`}
                  key={service.slug}
                  type="button"
                  role="option"
                  aria-selected={index === activeSearchIndex}
                  className={index === activeSearchIndex ? 'is-active' : ''}
                  onMouseEnter={() => setActiveSearchIndex(index)}
                  onClick={() => focusService(service.slug)}
                >
                  <ServiceCardFace service={service} variant="search" showArrow={false} />
                </button>
              ))}
            </div>
          )}
          {query && searchResults.length === 0 && (
            <div className="search-results search-empty" role="status">
              没有匹配的服务
            </div>
          )}
        </div>
        </div>
        {renderMode === '3d' && (
          <section className={`spatial-stage spatial-stage--3d ${spatialState.category ? 'is-focused' : ''}`} aria-label="3D 服务展示">
            <SceneErrorBoundary onError={() => fallbackTo2d('3D 加载失败，已切换到服务列表。')} fallback={null}>
              <link rel="preload" href={sculptureUrl} as="fetch" crossOrigin="anonymous" />
              <Suspense fallback={<div className="scene-loading" role="status"><span />正在加载 3D 服务模型…</div>}>
                <SpatialScene spatialState={spatialState} onCategory={focusCategory} onService={focusService}
                  onFallback={fallbackTo2d} theme={theme} reducedMotion={reducedMotion} cameraRevision={cameraRevision}
                  paused={modalOpen} performanceProfile={capabilities} />
              </Suspense>
            </SceneErrorBoundary>
            <div className="scene-tools">
              <span><span className="scene-hint-desktop">拖拽查看</span><span className="scene-hint-mobile">双指旋转 · 单指滚动</span> · 点击图标了解服务</span>
              <button type="button" onClick={goHome} aria-label="返回导航首页">重置视角</button>
            </div>
          </section>
        )}
        </div>
        <div className="service-toolbar">
          <nav className="catalog-filters region-legend" aria-label="服务分类">
            <button type="button" aria-pressed={!spatialState.category} onClick={goHome}>全部 <small>{services.length}</small></button>
            {categories.map(category => (
              <button type="button" key={category.slug} aria-pressed={spatialState.category === category.slug}
                style={{ '--category-color': category.accent }}
                onClick={() => focusCategory(category.slug)}>
                <span className="category-dot" aria-hidden="true" />
                {category.shortName}
              </button>
            ))}
          </nav>
          <div className="view-switch" role="group" aria-label="服务展示方式">
            <button type="button" aria-label="切换到3D模式" aria-pressed={renderMode === '3d'}
              onClick={() => renderMode !== '3d' && switchRenderMode()}><Box aria-hidden="true" />3D</button>
            <button type="button" aria-label="切换到2D模式" aria-pressed={renderMode === '2d'}
              onClick={() => renderMode !== '2d' && switchRenderMode()}><Monitor aria-hidden="true" />列表</button>
          </div>
        </div>
        <BreadcrumbTrail category={selectedCategory} service={selectedService} onHome={goHome} onCategory={focusCategory} />
        {!online && <div className="system-banner" role="status"><WifiOff aria-hidden="true" />当前离线，仍可浏览服务目录，恢复网络后可访问服务。</div>}
        {modeNotice && <div className="system-banner system-banner--neutral" role="status">{modeNotice}</div>}
        <Directory spatialState={spatialState} recent={recent} query={query} direct={online}
          onService={focusService} onDirectVisit={recordVisit} onReset={() => { setQuery(''); goHome() }} />
      </main>
      <SiteFooter />

      <Modal
        open={Boolean(selectedService && !helpOpen)}
        title={selectedService?.name || ''}
        eyebrow={selectedCategory?.name}
        onClose={closeService}
        className={`service-modal ${renderMode === '3d' ? 'service-modal--sculpture' : ''}`}
      >
        {selectedService && (
          <>
            <div className="service-detail">
              <ServiceCardFace
                service={selectedService}
                variant="detail"
                showArrow={false}
              />
              <dl>
                <div>
                  <dt>所属区域</dt>
                  <dd>{selectedCategory.name}</dd>
                </div>
                <div>
                  <dt>目标域名</dt>
                  <dd>{new URL(selectedService.url).hostname}</dd>
                </div>
              </dl>
            </div>
            <div className="modal__actions">
              {online && isSafeExternalUrl(selectedService.url, spatialState.namespace) ? (
                <a
                  className="primary-action"
                  href={selectedService.url}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  data-service-launch={selectedService.slug}
                  onClick={() => {
                    recordVisit(selectedService.slug)
                    closeService()
                  }}
                >
                  访问服务
                  <ChevronRight aria-hidden="true" />
                </a>
              ) : (
                <button type="button" className="primary-action" disabled>
                  访问服务
                  <ChevronRight aria-hidden="true" />
                </button>
              )}
            </div>
          </>
        )}
      </Modal>

      <Modal open={helpOpen} title="服务导航" onClose={closeHelp}>
        <div
          className="panel-tabs"
          role="tablist"
          aria-label="面板切换"
          onKeyDown={handleHelpTabKeyDown}
        >
          <button
            ref={announcementTabRef}
            id="service-panel-tab-announcement"
            type="button"
            role="tab"
            aria-selected={helpTab === 'announcement'}
            aria-controls="service-panel-announcement"
            tabIndex={helpTab === 'announcement' ? 0 : -1}
            className={`panel-tab${helpTab === 'announcement' ? ' is-active' : ''}`}
            onClick={() => setHelpTab('announcement')}
          >
            公告
          </button>
          <button
            ref={guideTabRef}
            id="service-panel-tab-guide"
            type="button"
            role="tab"
            aria-selected={helpTab === 'guide'}
            aria-controls="service-panel-guide"
            tabIndex={helpTab === 'guide' ? 0 : -1}
            className={`panel-tab${helpTab === 'guide' ? ' is-active' : ''}`}
            onClick={() => setHelpTab('guide')}
          >
            操作说明与快捷键
          </button>
        </div>

        {helpTab === 'guide' ? (
          <div
            id="service-panel-guide"
            role="tabpanel"
            aria-labelledby="service-panel-tab-guide"
          >
            <div className="help-grid">
              <div>
                <span>01</span>
                <strong>按分类浏览</strong>
                <p>
                  按产品服务、通行证生态链、团队与官网查看社团入口。
                </p>
              </div>
              <div>
                <span>02</span>
                <strong>搜索资源</strong>
                <p>
                  输入服务名称或说明，直接找到对应的社团服务卡片。
                </p>
              </div>
              <div>
                <span>03</span>
                <strong>切换栏目</strong>
                <p>顶部的服务导航与刷题导航始终可见，下划线标明当前栏目。</p>
              </div>
            </div>
            <dl className="shortcut-list">
              <div>
                <dt>⌘/Ctrl K</dt>
                <dd>搜索</dd>
              </div>
              <div>
                <dt>Alt H</dt>
                <dd>回到总览</dd>
              </div>
              <div>
                <dt>Alt B</dt>
                <dd>返回上一级</dd>
              </div>
              <div>
                <dt>Alt O</dt>
                <dd>切换栏目</dd>
              </div>
              <div>
                <dt>Alt 1–3</dt>
                <dd>聚焦区域</dd>
              </div>
              <div>
                <dt>Alt ?</dt>
                <dd>帮助</dd>
              </div>
            </dl>
            <button type="button" className="primary-action help-confirm" onClick={closeHelp}>
              开始使用
            </button>
          </div>
        ) : (
          <div
            id="service-panel-announcement"
            role="tabpanel"
            aria-labelledby="service-panel-tab-announcement"
          >
            <div className="announcement-body">{renderAnnouncement(ANNOUNCEMENT)}</div>
            <button type="button" className="primary-action help-confirm" onClick={closeHelp}>
              知道了
            </button>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default App

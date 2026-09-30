const element = (tag, attrs) => ({ tag, attrs })

import { OJ_ICON_DEFINITIONS, OJ_ICON_REGISTRY } from './ojIconRegistry'

export const ICON_DEFINITIONS = {
  lock: {
    label: '锁',
    elements: [
      element('rect', { x: 3, y: 11, width: 18, height: 11, rx: 2 }),
      element('path', { d: 'M7 11V7a5 5 0 0 1 10 0v4' }),
    ],
  },
  code: {
    label: '代码括号',
    elements: [
      element('polyline', { points: '16 18 22 12 16 6' }),
      element('polyline', { points: '8 6 2 12 8 18' }),
    ],
  },
  cloud: {
    label: '云',
    elements: [element('path', { d: 'M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z' })],
  },
  shield: {
    label: '盾牌',
    elements: [element('path', { d: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z' })],
  },
  globe: {
    label: '地球',
    elements: [
      element('circle', { cx: 12, cy: 12, r: 10 }),
      element('line', { x1: 2, y1: 12, x2: 22, y2: 12 }),
      element('path', { d: 'M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z' }),
    ],
  },
  'id-card': {
    label: '身份卡',
    elements: [
      element('rect', { x: 2, y: 4, width: 20, height: 16, rx: 2 }),
      element('line', { x1: 8, y1: 10, x2: 16, y2: 10 }),
      element('circle', { cx: 7, cy: 16, r: 2 }),
      element('path', { d: 'M11 15h6' }),
    ],
  },
  clipboard: {
    label: '剪贴板',
    elements: [
      element('rect', { x: 8, y: 2, width: 8, height: 4, rx: 1 }),
      element('path', { d: 'M16 4h1a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3h1' }),
      element('path', { d: 'M9 12h6' }),
      element('path', { d: 'M9 16h6' }),
    ],
  },
  'check-orbit': {
    label: '报名勾选',
    elements: [
      element('path', { d: 'M9 12l2 2 4-4' }),
      element('path', { d: 'M21 12c-1 0-2-1-2-2s1-2 2-2 2 1 2 2-1 2-2 2z' }),
      element('path', { d: 'M3 12c1 0 2-1 2-2S4 8 3 8s-2 1-2 2 1 2 2 2z' }),
      element('path', { d: 'M12 3c0 1-1 2-2 2S8 4 8 3s1-2 2-2 2 1 2 2z' }),
      element('path', { d: 'M12 21c0-1 1-2 2-2s2 1 2 2-1 2-2 2-2-1-2-2z' }),
    ],
  },
  image: {
    label: '图片',
    elements: [
      element('rect', { x: 3, y: 3, width: 18, height: 18, rx: 2 }),
      element('circle', { cx: 8.5, cy: 8.5, r: 1.5 }),
      element('polyline', { points: '21 15 16 10 5 21' }),
    ],
  },
  message: {
    label: '对话',
    elements: [
      element('path', { d: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z' }),
      element('line', { x1: 9, y1: 10, x2: 15, y2: 10 }),
      element('line', { x1: 9, y1: 14, x2: 13, y2: 14 }),
    ],
  },
  git: {
    label: 'Git 分支',
    elements: [
      element('circle', { cx: 18, cy: 18, r: 3 }),
      element('circle', { cx: 6, cy: 6, r: 3 }),
      element('circle', { cx: 6, cy: 18, r: 3 }),
      element('line', { x1: 8.59, y1: 7.51, x2: 15.42, y2: 16.49 }),
      element('line', { x1: 8.59, y1: 16.49, x2: 15.42, y2: 7.51 }),
    ],
  },
  monitor: {
    label: '显示器',
    elements: [
      element('rect', { x: 2, y: 3, width: 20, height: 14, rx: 2 }),
      element('line', { x1: 8, y1: 21, x2: 16, y2: 21 }),
      element('line', { x1: 12, y1: 17, x2: 12, y2: 21 }),
    ],
  },
  users: {
    label: '团队',
    elements: [
      element('path', { d: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2' }),
      element('circle', { cx: 9, cy: 7, r: 4 }),
      element('path', { d: 'M23 21v-2a4 4 0 0 0-3-3.87' }),
      element('path', { d: 'M16 3.13a4 4 0 0 1 0 7.75' }),
    ],
  },
  bulb: {
    label: '灯泡',
    elements: [element('path', { d: 'M12 2a7 7 0 0 0-7 7c0 2.38 1.19 4.48 3 5.74V20a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-5.26c1.81-1.26 3-3.36 3-5.74a7 7 0 0 0-7-7z' })],
  },
  terminal: {
    label: '终端',
    elements: [
      element('rect', { x: 2, y: 3, width: 20, height: 18, rx: 2 }),
      element('path', { d: 'M8 7l4 4-4 4' }),
      element('line', { x1: 12, y1: 15, x2: 16, y2: 15 }),
    ],
  },
  flask: {
    label: '烧瓶',
    elements: [element('path', { d: 'M9 3v5l-4 7a5 5 0 0 0 4 8h6a5 5 0 0 0 4-8l-4-7V3' })],
  },
}

// ICON_DEFINITIONS 顶层不再整体冻结，以便副导航继续追加本地矢量。
// 每个 definition 仍冻结，保证属性不被改动。
Object.values(ICON_DEFINITIONS).forEach((definition) => {
  definition.viewBox = '0 0 24 24'
  definition.strokeWidth = 2
  definition.elements.forEach((item) => Object.freeze(item.attrs))
  definition.elements.forEach(Object.freeze)
  Object.freeze(definition.elements)
  Object.freeze(definition)
})
// 注意：保留「16 种原图标」这一事实描述，但顶层不再冻结以便扩展注册。

export const ALL_ICON_DEFINITIONS = Object.freeze({
  ...ICON_DEFINITIONS,
  ...OJ_ICON_DEFINITIONS,
})

export const SERVICE_ICON_REGISTRY = {
  'era-passport': { originalIcon: 'lock', geometry: { source: 'lock', color: '#3b82f6' } },
  'era-ide': { originalIcon: 'code', geometry: { source: 'code', color: '#22c55e' } },
  'era-cloud': { originalIcon: 'cloud', geometry: { source: 'cloud', color: '#f59e0b' } },
  'era-trust': { originalIcon: 'shield', geometry: { source: 'shield', color: '#ef4444' } },
  'era-lottery': { originalIcon: 'globe', geometry: { source: 'globe', color: '#a855f7' } },
  'era-id': { originalIcon: 'id-card', geometry: { source: 'id-card', color: '#14b8a6' } },
  'era-clipboard': { originalIcon: 'clipboard', geometry: { source: 'clipboard', color: '#3b82f6' } },
  'era-registration': { originalIcon: 'check-orbit', geometry: { source: 'check-orbit', color: '#22c55e' } },
  'era-image-host': { originalIcon: 'image', geometry: { source: 'image', color: '#f59e0b' } },
  'era-forum': { originalIcon: 'message', geometry: { source: 'message', color: '#ef4444' } },
  'era-git': { originalIcon: 'git', geometry: { source: 'git', color: '#a855f7' } },
  'acm-team': { originalIcon: 'monitor', geometry: { source: 'monitor', color: '#8b5cf6' } },
  'era-team': { originalIcon: 'users', geometry: { source: 'users', color: '#06b6d4' } },
  'era-developer': { originalIcon: 'globe', geometry: { source: 'globe', color: '#f43f5e' } },
  'miaoji-lab': { originalIcon: 'bulb', geometry: { source: 'bulb', color: '#fb923c' } },
  'era-oj': { originalIcon: 'terminal', geometry: { source: 'terminal', color: '#0ea5e9' } },
  'qifa-lab': { originalIcon: 'flask', geometry: { source: 'flask', color: '#10b981' } },
}

Object.values(SERVICE_ICON_REGISTRY).forEach((config) => {
  Object.freeze(config.geometry)
  Object.freeze(config)
})
Object.freeze(SERVICE_ICON_REGISTRY)

export const SERVICE_ICON_MAP = Object.freeze(
  Object.fromEntries(
    Object.entries(SERVICE_ICON_REGISTRY).map(([serviceId, config]) => [
      serviceId,
      config.originalIcon,
    ]),
  ),
)

const escapeAttribute = (value) =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')

const allowedTags = new Set(['path', 'rect', 'circle', 'line', 'polyline'])
const allowedAttributes = new Set([
  'd',
  'x',
  'y',
  'width',
  'height',
  'rx',
  'cx',
  'cy',
  'r',
  'x1',
  'y1',
  'x2',
  'y2',
  'points',
])

export function getIconSvgMarkup(iconId) {
  const definition = ALL_ICON_DEFINITIONS[iconId]
  if (!definition) throw new Error(`Unknown original icon: ${iconId}`)
  const children = definition.elements
    .map(({ tag, attrs }) => {
      if (!allowedTags.has(tag)) throw new Error(`Unsafe SVG tag: ${tag}`)
      if (Object.keys(attrs).some((name) => !allowedAttributes.has(name))) {
        throw new Error(`Unsafe SVG attribute in ${iconId}`)
      }
      if (
        typeof attrs.d === 'string' &&
        (attrs.d.length > 1200 || /[<>{}]/.test(attrs.d))
      ) {
        throw new Error(`Unsafe SVG path in ${iconId}`)
      }
      const attributes = Object.entries(attrs)
        .map(([name, value]) => `${name}="${escapeAttribute(value)}"`)
        .join(' ')
      return `<${tag} ${attributes}/>`
    })
    .join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${definition.viewBox}" fill="none" stroke="#000000" stroke-width="${definition.strokeWidth}" stroke-linecap="round" stroke-linejoin="round">${children}</svg>`
}

export function getServiceIconConfig(serviceId) {
  return SERVICE_ICON_REGISTRY[serviceId] || OJ_ICON_REGISTRY[serviceId] || null
}

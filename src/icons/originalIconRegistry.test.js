import { describe, expect, it } from 'vitest'
import { services } from '../data/services'
import {
  ALL_ICON_DEFINITIONS,
  ICON_DEFINITIONS,
  SERVICE_ICON_REGISTRY,
  SERVICE_ICON_MAP,
  getIconSvgMarkup,
} from './originalIconRegistry'

const expectedMapping = {
  'era-passport': 'lock',
  'era-ide': 'code',
  'era-cloud': 'cloud',
  'era-trust': 'shield',
  'era-lottery': 'globe',
  'era-id': 'id-card',
  'era-clipboard': 'clipboard',
  'era-registration': 'check-orbit',
  'era-image-host': 'image',
  'era-forum': 'message',
  'era-git': 'git',
  'acm-team': 'monitor',
  'era-team': 'users',
  'era-developer': 'globe',
  'miaoji-lab': 'bulb',
  'era-oj': 'terminal',
  'qifa-lab': 'flask',
}

describe('original icon registry', () => {
  it('audits all 17 service-to-icon assignments exactly', () => {
    expect(SERVICE_ICON_MAP).toEqual(expectedMapping)
    expect(Object.keys(SERVICE_ICON_MAP)).toHaveLength(17)
    expect(ICON_DEFINITIONS.book).toBeUndefined()
    services.forEach((service) => {
      expect(service.icon).toBe(SERVICE_ICON_MAP[service.slug])
      expect(ICON_DEFINITIONS[service.icon]).toBeDefined()
    })
    expect(Object.isFrozen(ALL_ICON_DEFINITIONS)).toBe(true)
    expect(Object.isFrozen(ICON_DEFINITIONS.lock.elements)).toBe(true)
    expect(Object.isFrozen(SERVICE_ICON_REGISTRY)).toBe(true)
  })

  it('preserves the original HEAD line geometry and key negative spaces', () => {
    expect(ICON_DEFINITIONS.lock.elements).toContainEqual({
      tag: 'rect',
      attrs: { x: 3, y: 11, width: 18, height: 11, rx: 2 },
    })
    expect(ICON_DEFINITIONS.code.elements.map((element) => element.attrs.points)).toEqual([
      '16 18 22 12 16 6',
      '8 6 2 12 8 18',
    ])
    expect(ICON_DEFINITIONS.image.elements.map((element) => element.tag)).toEqual([
      'rect',
      'circle',
      'polyline',
    ])
    expect(ICON_DEFINITIONS.git.elements.filter((element) => element.tag === 'circle')).toHaveLength(
      3,
    )
  })

  it('serializes only trusted local vector elements with shared geometry metadata', () => {
    const allowedTags = new Set(['path', 'rect', 'circle', 'line', 'polyline'])
    Object.keys(ICON_DEFINITIONS).forEach((iconId) => {
      expect(ICON_DEFINITIONS[iconId].viewBox).toBe('0 0 24 24')
      expect(ICON_DEFINITIONS[iconId].strokeWidth).toBe(2)
      expect(ICON_DEFINITIONS[iconId].elements.length).toBeLessThanOrEqual(5)
      ICON_DEFINITIONS[iconId].elements.forEach(({ tag, attrs }) => {
        expect(allowedTags.has(tag)).toBe(true)
        expect(Object.keys(attrs).some((name) => /^on|href$/i.test(name))).toBe(false)
      })
      const markup = getIconSvgMarkup(iconId)
      expect(markup).toMatch(/^<svg[^>]+viewBox="0 0 24 24"/)
      expect(markup).toContain('stroke-width="2"')
      expect(markup).not.toMatch(/<script|foreignObject|href=/i)
    })
    expect(() => getIconSvgMarkup('missing-icon')).toThrow(/Unknown original icon/)
    Object.values(SERVICE_ICON_REGISTRY).forEach((config) => {
      expect(config.geometry.source).toBe(config.originalIcon)
      expect(config.geometry.color).toMatch(/^#[0-9a-f]{6}$/i)
    })
  })
})

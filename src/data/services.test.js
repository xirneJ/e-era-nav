import { describe, expect, it } from 'vitest'
import { categories, services } from './services'

const expectedUrls = {
  'era-passport': 'https://account.emoera.com/',
  'era-ide': 'https://ide.emoera.com/',
  'era-cloud': 'https://cloud.emoera.com/',
  'era-trust': 'https://trust.emoera.com/',
  'era-lottery': 'https://choujiang.emoera.com/',
  'era-id': 'https://neweid.emoera.com/',
  'era-clipboard': 'https://code.emoera.cn/',
  'era-registration': 'https://acm.emoera.cn/',
  'era-image-host': 'https://image.emoera.cn/',
  'era-forum': 'https://ideawit.com/',
  'era-git': 'https://git.emoera.com/explore/repos',
  'acm-team': 'https://acm.emoera.com/',
  'era-team': 'https://we.emoera.com/',
  'era-developer': 'https://developer.emoera.com/',
  'miaoji-lab': 'https://home.miaojilab.cn/',
  'era-oj': 'https://oj.emoera.com/',
  'qifa-lab': 'https://www.qifalab.cn/qifalab-v1/',
}

describe('service catalog', () => {
  it('preserves all 17 services in three regions', () => {
    expect(categories).toHaveLength(3)
    expect(services).toHaveLength(17)
    expect(
      categories.map((category) => services.filter((service) => service.category === category.slug).length),
    ).toEqual([6, 5, 6])
  })

  it('lays out the three category regions as an equilateral triangle centered at the origin', () => {
    const positions = categories.map((category) => category.position)
    const distance = (start, end) => Math.hypot(start[0] - end[0], start[2] - end[2])
    const sides = [
      distance(positions[0], positions[1]),
      distance(positions[1], positions[2]),
      distance(positions[2], positions[0]),
    ]
    const centroid = positions.reduce(
      (sum, position) => [sum[0] + position[0] / positions.length, sum[1] + position[2] / positions.length],
      [0, 0],
    )

    expect(Math.max(...sides) - Math.min(...sides)).toBeLessThan(0.001)
    expect(centroid[0]).toBeCloseTo(0, 3)
    expect(centroid[1]).toBeCloseTo(0, 3)
    expect(positions[0][2]).toBeLessThan(positions[2][2])
    expect(positions[1][2]).toBeLessThan(positions[2][2])
  })

  it('keeps every service inside its category region', () => {
    const categoryBySlug = Object.fromEntries(categories.map((category) => [category.slug, category]))

    services.forEach((service) => {
      const center = categoryBySlug[service.category].position
      expect(
        Math.hypot(service.position[0] - center[0], service.position[2] - center[2]),
        service.slug,
      ).toBeLessThanOrEqual(2.75)
    })
  })

  it('uses unique stable slugs and HTTPS destinations', () => {
    expect(new Set(services.map((service) => service.slug)).size).toBe(17)
    services.forEach((service) => {
      expect(service.url).toMatch(/^https:\/\//)
      expect(service.name).toBeTruthy()
      expect(service.description).toBeTruthy()
      expect(service.position).toHaveLength(3)
    })
  })

  it('retains the current production destinations', () => {
    expect(
      Object.fromEntries(services.map(({ slug, url }) => [slug, url])),
    ).toEqual(
      expectedUrls,
    )
  })
})

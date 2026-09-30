export const categories = [
  {
    slug: 'products',
    name: '产品服务',
    shortName: '产品服务',
    description: 'E时代社团产品与基础服务',
    accent: '#2f7f78',
    glow: '#79c9bd',
    position: [-4.992, 0, -2.882],
    camera: [-6.4, 6.8, 14],
  },
  {
    slug: 'ecosystem',
    name: '通行证生态链',
    shortName: '通行证生态',
    description: '已接入 E时代通行证的一键登录产品',
    accent: '#b77b2f',
    glow: '#e9bd72',
    position: [4.992, 0, -2.882],
    camera: [6.4, 6.6, 14],
  },
  {
    slug: 'team',
    name: '团队与官网',
    shortName: '团队与官网',
    description: '社团团队、实验室与开发入口',
    accent: '#7d5b78',
    glow: '#c7a2c0',
    position: [0, 0, 5.764],
    camera: [6.4, 6.8, -4],
  },
]

export const services = [
  {
    slug: 'era-passport',
    category: 'products',
    name: 'E时代通行证',
    description: '统一身份认证与安全管理平台',
    url: 'https://account.emoera.com/',
    icon: 'lock',
    tags: ['身份认证', '账号', '基础服务'],
    badge: 'core',
    position: [-4.992, 0.75, -2.882],
  },
  {
    slug: 'era-ide',
    category: 'products',
    name: 'E时代IDE',
    description: '高效智能的云端开发环境',
    url: 'https://ide.emoera.com/',
    icon: 'code',
    tags: ['云端开发', '开发工具'],
    badge: 'core',
    position: [-4.992, 0.75, -1.010],
  },
  {
    slug: 'era-cloud',
    category: 'products',
    name: 'E时代云服务',
    description: '高性能云端数据存储与计算',
    url: 'https://cloud.emoera.com/',
    icon: 'cloud',
    tags: ['存储', '计算', '云服务'],
    position: [-4.992, 0.75, -4.754],
  },
  {
    slug: 'era-trust',
    category: 'products',
    name: 'E时代信任中心',
    description: '安全可信的认证体系，为您的数字信息保驾护航',
    url: 'https://trust.emoera.com/',
    icon: 'shield',
    tags: ['安全', '认证'],
    position: [-6.864, 0.75, -2.882],
  },
  {
    slug: 'era-lottery',
    category: 'products',
    name: 'E时代抽奖',
    description: '智能随机抽取与活动管理系统',
    url: 'https://choujiang.emoera.com/',
    icon: 'globe',
    tags: ['活动', '随机抽取'],
    position: [-3.12, 0.75, -2.882],
  },
  {
    slug: 'era-id',
    category: 'products',
    name: 'E时代ID',
    description: '社团内部的身份卡系统',
    url: 'https://neweid.emoera.com/',
    icon: 'id-card',
    tags: ['数字身份', '成员服务'],
    position: [-6.864, 0.75, -1.010],
  },
  {
    slug: 'era-clipboard',
    category: 'ecosystem',
    name: 'E时代云剪贴板',
    description: '快速分享，支持代码/文件分享与权限控制，让分享更简单',
    url: 'https://code.emoera.cn/',
    icon: 'clipboard',
    tags: ['临时分享', '代码片段', '协作'],
    badge: 'passport',
    position: [4.992, 0.75, -1.010],
  },
  {
    slug: 'era-registration',
    category: 'ecosystem',
    name: 'E时代比赛报名系统',
    description: '便捷的竞赛活动报名与管理平台',
    url: 'https://acm.emoera.cn/',
    icon: 'check-orbit',
    tags: ['竞赛报名', '活动管理'],
    badge: 'passport',
    position: [4.992, 0.75, -2.882],
  },
  {
    slug: 'era-image-host',
    category: 'ecosystem',
    name: 'E时代图床',
    description: '高效稳定的图片托管服务，快速上传与分享',
    url: 'https://image.emoera.cn/',
    icon: 'image',
    tags: ['图片托管', '分享'],
    badge: 'passport',
    position: [4.992, 0.75, -4.754],
  },
  {
    slug: 'era-forum',
    category: 'ecosystem',
    name: 'E时代论坛',
    description: '技术交流与知识分享的社区平台',
    url: 'https://ideawit.com/',
    icon: 'message',
    tags: ['社区', '知识分享'],
    badge: 'passport',
    position: [3.12, 0.75, -2.882],
  },
  {
    slug: 'era-git',
    category: 'ecosystem',
    name: 'E时代Git',
    description: '代码托管与协作平台',
    url: 'https://git.emoera.com/explore/repos',
    icon: 'git',
    tags: ['代码仓库', '版本控制', '协作'],
    badge: 'passport',
    position: [6.864, 0.75, -2.882],
  },
  {
    slug: 'acm-team',
    category: 'team',
    name: 'ACM算法团队',
    description: 'E时代ACM算法竞赛团队介绍与成员展示',
    url: 'https://acm.emoera.com/',
    icon: 'monitor',
    tags: ['算法竞赛', '团队'],
    position: [0, 0.75, 5.764],
  },
  {
    slug: 'era-team',
    category: 'team',
    name: 'E时代团队',
    description: '全校最强编程类社团的团队展示页面',
    url: 'https://we.emoera.com/',
    icon: 'users',
    tags: ['官网', '社团'],
    position: [-1.872, 0.75, 5.764],
  },
  {
    slug: 'era-developer',
    category: 'team',
    name: 'E时代 Developer',
    description: 'E时代开发者平台与资源入口',
    url: 'https://developer.emoera.com/',
    icon: 'globe',
    tags: ['开发者', '资源入口'],
    position: [1.872, 0.75, 5.764],
  },
  {
    slug: 'miaoji-lab',
    category: 'team',
    name: '妙计实验室',
    description: '前沿技术与算法研究，推动技术创新升级',
    url: 'https://home.miaojilab.cn/',
    icon: 'bulb',
    tags: ['实验室', '技术研究'],
    position: [0, 0.75, 7.636],
  },
  {
    slug: 'era-oj',
    category: 'team',
    name: 'E时代OJ',
    description: '在线编程练习平台，提升算法与编程能力',
    url: 'https://oj.emoera.com/',
    icon: 'terminal',
    tags: ['在线评测', '算法'],
    position: [0, 0.75, 3.892],
  },
  {
    slug: 'qifa-lab',
    category: 'team',
    name: '启发实验室',
    description: 'E时代研发中心，专注企业级解决方案',
    url: 'https://www.qifalab.cn/qifalab-v1/',
    icon: 'flask',
    tags: ['研发', '解决方案'],
    position: [1.872, 0.75, 3.892],
  },
]

export const badgeLabels = {
  core: '核心服务',
  passport: '已接入通行证',
}

function createSafeRecord(entries) {
  const record = Object.create(null)
  entries.forEach(([key, value]) => {
    record[key] = value
  })
  return record
}

export const categoryBySlug = createSafeRecord(
  categories.map((category) => [category.slug, category]),
)
export const serviceBySlug = createSafeRecord(
  services.map((service) => [service.slug, service]),
)
export const servicesByCategory = createSafeRecord(
  categories.map((category) => [
    category.slug,
    services.filter((service) => service.category === category.slug),
  ]),
)

export const overviewCamera = {
  position: [0, 20, 22],
  target: [0, 0, 0],
}

export const siteStats = {
  services: services.length,
  categories: categories.length,
  passport: services.filter((service) => service.badge === 'passport').length,
  domains: new Set(services.map((service) => new URL(service.url).hostname)).size,
}

export const onboardingSteps = [
  {
    step: '01',
    slug: 'era-passport',
    title: '开通通行证',
    detail: '用于登录已接入通行证的服务，先在通行证中心完成注册。',
  },
  {
    step: '02',
    slug: 'era-ide',
    title: '打开云端 IDE',
    detail: '在浏览器中进入社团云端开发环境，开始编写和保存代码。',
  },
  {
    step: '03',
    slug: 'era-git',
    title: '提交你的项目',
    detail: '通过社团 Git 管理代码，并按项目展示要求提交作品信息。',
  },
]

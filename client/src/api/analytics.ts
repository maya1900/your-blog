import { http } from './http'

const VISITOR_KEY = 'moji:visitor-id'
let lastTrackedPath = ''

function randomId(): string {
  if (crypto.randomUUID) return crypto.randomUUID().replace(/-/g, '')
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 14)}`
}

function visitorId(): string {
  const existing = localStorage.getItem(VISITOR_KEY)
  if (existing) return existing

  const next = randomId()
  localStorage.setItem(VISITOR_KEY, next)
  return next
}

function shouldTrack(path: string): boolean {
  return ![
    '/admin',
    '/login',
    '/register',
    '/write',
    '/me',
  ].some((prefix) => path === prefix || path.startsWith(`${prefix}/`))
}

export function trackPageview(path: string) {
  if (!shouldTrack(path) || path === lastTrackedPath) return
  lastTrackedPath = path

  void http.post('/analytics/pageview', {
    visitorId: visitorId(),
    path,
    referrer: document.referrer || null,
  }).catch(() => undefined)
}

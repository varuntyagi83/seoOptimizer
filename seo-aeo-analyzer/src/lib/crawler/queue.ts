import type { CrawlJob } from '@/types/crawler'

const SKIP_EXTENSIONS = /\.(pdf|jpg|jpeg|png|gif|svg|webp|ico|css|js|woff|woff2|ttf|eot|mp4|mp3|zip|gz|tar|exe|dmg)$/i
const TRACKING_PARAMS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'ref', 'fbclid', 'gclid']

export function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url)
    // Remove fragments
    parsed.hash = ''
    // Remove tracking params
    TRACKING_PARAMS.forEach(p => parsed.searchParams.delete(p))
    // Remove trailing slash from path (except root)
    if (parsed.pathname !== '/' && parsed.pathname.endsWith('/')) {
      parsed.pathname = parsed.pathname.slice(0, -1)
    }
    return parsed.toString()
  } catch {
    return url
  }
}

export function shouldSkipUrl(url: string): boolean {
  return SKIP_EXTENSIONS.test(url)
}

export class CrawlQueue {
  private queue: CrawlJob[] = []
  private seen = new Set<string>()
  private completed = new Set<string>()
  private failed = new Set<string>()
  private maxPages: number

  constructor(maxPages: number) {
    this.maxPages = maxPages
  }

  enqueue(job: Omit<CrawlJob, 'status' | 'retries'>): boolean {
    const normalized = normalizeUrl(job.url)

    if (this.seen.has(normalized)) return false
    if (shouldSkipUrl(normalized)) return false
    if (this.seen.size >= this.maxPages) return false

    this.seen.add(normalized)
    this.queue.push({
      ...job,
      url: normalized,
      status: 'pending',
      retries: 0,
    })

    // Keep sorted by priority (lower number = higher priority)
    this.queue.sort((a, b) => a.priority - b.priority)
    return true
  }

  dequeue(): CrawlJob | null {
    const job = this.queue.find(j => j.status === 'pending')
    if (!job) return null
    job.status = 'crawling'
    return job
  }

  has(url: string): boolean {
    return this.seen.has(normalizeUrl(url))
  }

  markComplete(url: string): void {
    const normalized = normalizeUrl(url)
    this.completed.add(normalized)
    const job = this.queue.find(j => j.url === normalized)
    if (job) job.status = 'complete'
  }

  markFailed(url: string, error: string): void {
    const normalized = normalizeUrl(url)
    this.failed.add(normalized)
    const job = this.queue.find(j => j.url === normalized)
    if (job) {
      job.status = 'failed'
      job.error = error
    }
  }

  get pendingCount(): number {
    return this.queue.filter(j => j.status === 'pending').length
  }

  get completedCount(): number {
    return this.completed.size
  }

  get failedCount(): number {
    return this.failed.size
  }

  get totalSeen(): number {
    return this.seen.size
  }

  isFull(): boolean {
    return this.seen.size >= this.maxPages
  }

  isEmpty(): boolean {
    return this.queue.filter(j => j.status === 'pending' || j.status === 'crawling').length === 0
  }
}

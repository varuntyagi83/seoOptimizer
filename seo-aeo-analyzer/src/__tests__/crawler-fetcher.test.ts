import { describe, it, expect, beforeEach } from 'vitest'
import { CircuitBreaker } from '@/lib/crawler/fetcher'

describe('CircuitBreaker', () => {
  let cb: CircuitBreaker

  beforeEach(() => {
    cb = new CircuitBreaker(3, 100) // 3 failures, 100ms recovery
  })

  it('starts CLOSED', () => {
    expect(cb.getState()).toBe('CLOSED')
    expect(cb.isOpen()).toBe(false)
  })

  it('stays CLOSED under failure threshold', () => {
    cb.recordFailure()
    cb.recordFailure()
    expect(cb.getState()).toBe('CLOSED')
    expect(cb.isOpen()).toBe(false)
  })

  it('opens after hitting failure threshold', () => {
    cb.recordFailure()
    cb.recordFailure()
    cb.recordFailure()
    expect(cb.getState()).toBe('OPEN')
    expect(cb.isOpen()).toBe(true)
  })

  it('resets to CLOSED on success', () => {
    cb.recordFailure()
    cb.recordFailure()
    cb.recordSuccess()
    expect(cb.getState()).toBe('CLOSED')
    expect(cb.isOpen()).toBe(false)
  })

  it('resets failure count on success', () => {
    cb.recordFailure()
    cb.recordFailure()
    cb.recordSuccess()
    // Now 2 more failures should not open it yet (counter reset)
    cb.recordFailure()
    cb.recordFailure()
    expect(cb.getState()).toBe('CLOSED')
  })

  it('transitions OPEN → HALF_OPEN after recovery timeout', async () => {
    cb.recordFailure()
    cb.recordFailure()
    cb.recordFailure()
    expect(cb.isOpen()).toBe(true)

    // Wait for recovery timeout
    await new Promise(r => setTimeout(r, 150))
    expect(cb.isOpen()).toBe(false)
    expect(cb.getState()).toBe('HALF_OPEN')
  })
})

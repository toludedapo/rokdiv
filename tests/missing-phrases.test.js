import { describe, it, expect, beforeEach, vi } from 'vitest'

process.env.TELEGRAM_BOT_TOKEN = 'test-token'
process.env.ADMIN_CHAT_ID = '1268896075'

let handler
let capturedMessages = []
let supabaseCalls = []

beforeEach(async () => {
  vi.resetModules()
  capturedMessages = []
  supabaseCalls = []
  global.fetch = async (url, opts) => {
    const method = opts?.method || 'GET'
    if (url.includes('api.telegram.org') && url.includes('sendMessage')) {
      capturedMessages.push(JSON.parse(opts.body))
      return { ok: true, json: async () => ({ ok: true }) }
    }
    if (url.includes('api.telegram.org')) return { ok: true, json: async () => ({ ok: true }) }
    if (url.includes('groq.com')) {
      // Force fallback to patternMatch for every test in this file, since
      // we are specifically testing the regex fallback's coverage.
      return { ok: true, json: async () => ({ choices: [{ message: { content: '{}' } }] }) }
    }
    if (url.includes('supabase.co')) {
      supabaseCalls.push({ method, url, body: opts?.body ? JSON.parse(opts.body) : null })
      if (method === 'GET') return { ok: true, json: async () => [] }
      if (method === 'POST') return { ok: true, json: async () => ([{}]) }
    }
    throw new Error('Unexpected fetch: ' + url)
  }
  const mod = await import('../api/telegram.js?t=' + Date.now())
  handler = mod.default
})

function buildMsg(text) {
  return {
    req: { method: 'POST', body: { message: { from: { id: 1268896075 }, chat: { id: 1268896075 }, text } } },
    res: { statusCode: null, body: null, status(c) { this.statusCode = c; return this }, json(d) { this.body = d; return this } }
  }
}

describe('REGRESSION: "100k" shorthand expands correctly everywhere', () => {
  it('"sold 30 crates to Lapato for 100k" saves ₦100,000, not ₦100', async () => {
    const { req, res } = buildMsg('sold 30 crates to Lapato for 100k')
    await handler(req, res)
    const insertCall = supabaseCalls.find(c => c.method === 'POST' && c.url.includes('/sales'))
    expect(insertCall.body.amount).toBe(100000)
  })

  it('"sold 90 crates to Hillary at 4k per crate" expands to ₦4,000/crate = ₦360,000 total', async () => {
    const { req, res } = buildMsg('sold 90 crates to Hillary at 4k per crate')
    await handler(req, res)
    const insertCall = supabaseCalls.find(c => c.method === 'POST' && c.url.includes('/sales'))
    expect(insertCall.body.amount).toBe(360000)
  })

  it('"spent 15k on feed" saves ₦15,000, not ₦15', async () => {
    const { req, res } = buildMsg('spent 15k on feed')
    await handler(req, res)
    const insertCall = supabaseCalls.find(c => c.method === 'POST' && c.url.includes('/expenses'))
    expect(insertCall.body.amount).toBe(15000)
  })
})

describe('REGRESSION: "bought" works as a synonym for "sold"', () => {
  it('"Hillary bought 30 crates for 100000" is recognized as a sale, not unknown', async () => {
    const { req, res } = buildMsg('Hillary bought 30 crates for 100000')
    await handler(req, res)
    const insertCall = supabaseCalls.find(c => c.method === 'POST' && c.url.includes('/sales'))
    expect(insertCall).toBeDefined()
    expect(insertCall.body.amount).toBe(100000)
  })
})

describe('REGRESSION: "at PRICE" works without the word "per crate" or "for"', () => {
  it('"sold 30 crates to Lapato at 3500" is parsed as a flat-price sale', async () => {
    const { req, res } = buildMsg('sold 30 crates to Lapato at 3500')
    await handler(req, res)
    const insertCall = supabaseCalls.find(c => c.method === 'POST' && c.url.includes('/sales'))
    expect(insertCall).toBeDefined()
    expect(insertCall.body.amount).toBe(3500)
  })
})

describe('REGRESSION: "brought back" works as a synonym for "returned"', () => {
  it('"Hillary brought back 5 crates" is recognized as a crate return', async () => {
    const { req, res } = buildMsg('Hillary brought back 5 crates')
    await handler(req, res)
    // crate_return looks up existing sales first; with none mocked, expect
    // the "no crates on record" message rather than "I didn't understand"
    expect(capturedMessages[0].text.toLowerCase()).toContain('no crates on record')
  })
})

describe('REGRESSION: additional balance-check phrasings all route correctly', () => {
  it('"Hillary owes how much" does not fall through to unknown/status', async () => {
    const { req, res } = buildMsg('Hillary owes how much')
    await handler(req, res)
    expect(capturedMessages[0].text).not.toContain('ROKDIV Status')
    expect(capturedMessages[0].text).not.toContain("didn't understand")
  })

  it('"Hillary owing" does not fall through to unknown/status', async () => {
    const { req, res } = buildMsg('Hillary owing')
    await handler(req, res)
    expect(capturedMessages[0].text).not.toContain('ROKDIV Status')
    expect(capturedMessages[0].text).not.toContain("didn't understand")
  })

  it('"is Hillary owing me" does not fall through to unknown/status', async () => {
    const { req, res } = buildMsg('is Hillary owing me')
    await handler(req, res)
    expect(capturedMessages[0].text).not.toContain('ROKDIV Status')
    expect(capturedMessages[0].text).not.toContain("didn't understand")
  })
})

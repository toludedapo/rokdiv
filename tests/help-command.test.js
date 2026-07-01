import { describe, it, expect, beforeEach, vi } from 'vitest'

process.env.TELEGRAM_BOT_TOKEN = 'test-token'
process.env.ADMIN_CHAT_ID = '1268896075'

let handler
let capturedMessages = []

beforeEach(async () => {
  vi.resetModules()
  capturedMessages = []
  global.fetch = async (url, opts) => {
    if (url.includes('api.telegram.org') && url.includes('sendMessage')) {
      const body = JSON.parse(opts.body)
      capturedMessages.push(body)
      return { ok: true, json: async () => ({ ok: true }) }
    }
    if (url.includes('api.telegram.org')) {
      return { ok: true, json: async () => ({ ok: true }) }
    }
    // Any Supabase/Groq call during this test is unexpected for a pure help check
    throw new Error('Unexpected fetch: ' + url)
  }
  const mod = await import('../api/telegram.js?t=' + Date.now())
  handler = mod.default
})

function buildHelpMessage(fromId, text) {
  return {
    req: {
      method: 'POST',
      body: {
        message: {
          from: { id: fromId, is_bot: false },
          chat: { id: fromId },
          text,
        }
      }
    },
    res: {
      statusCode: null,
      body: null,
      status(c) { this.statusCode = c; return this },
      json(d) { this.body = d; return this },
    }
  }
}

describe('REGRESSION: help command', () => {
  it('"help" returns the command list without touching Groq or Supabase', async () => {
    const { req, res } = buildHelpMessage(1268896075, 'help')
    await handler(req, res)
    expect(res.statusCode).toBe(200)
    expect(capturedMessages).toHaveLength(1)
    expect(capturedMessages[0].text).toContain('Available Commands')
  })

  it('is case-insensitive and trims whitespace', async () => {
    const { req, res } = buildHelpMessage(1268896075, '  HELP  ')
    await handler(req, res)
    expect(capturedMessages[0].text).toContain('Available Commands')
  })

  it('/help also works', async () => {
    const { req, res } = buildHelpMessage(1268896075, '/help')
    await handler(req, res)
    expect(capturedMessages[0].text).toContain('Available Commands')
  })

  it('lists every real intent, including set_crates which was missing from the old fallback', async () => {
    const { req, res } = buildHelpMessage(1268896075, 'help')
    await handler(req, res)
    const text = capturedMessages[0].text
    expect(text).toContain('collected 150')
    expect(text).toContain('sold 90 eggs')
    expect(text).toContain('paid 20000')
    expect(text).toContain('returned 2 crates')
    expect(text).toContain('spent 15000')
    expect(text).toContain('status')
    expect(text).toContain('debtors')
    expect(text).toContain('crates')
    expect(text).toContain('set crates 200')
  })

  it('an unauthorized user gets rejected before reaching help (access control still applies)', async () => {
    const { req, res } = buildHelpMessage(99999999, 'help')
    await handler(req, res)
    expect(capturedMessages[0].text).toContain('not authorized')
    expect(capturedMessages[0].text).not.toContain('Available Commands')
  })
})

describe('REGRESSION: help text includes per-crate pricing example', () => {
  it('mentions "per crate" pricing, not just flat "for X" pricing', async () => {
    const { req, res } = buildHelpMessage(1268896075, 'help')
    await handler(req, res)
    const text = capturedMessages[0].text
    expect(text).toContain('per crate')
    expect(text).toContain('4000 per crate')
  })
})

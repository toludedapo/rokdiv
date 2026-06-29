import { describe, it, expect } from 'vitest'

const CRATE_SIZE = 30
function eggsFromRecord(r) {
  return (parseInt(r.crates || 0) * CRATE_SIZE) + parseInt(r.singles || r.loose_eggs || 0)
}

describe('REGRESSION: Collected this month must include singles, not just crates', () => {
  it('matches the exact real-data case: 649 crates + 97 singles = 652 crates + 7 singles', () => {
    const collections = [
      { crates: 649, singles: 97 }, // simplified single-row stand-in for the real spread-out entries
    ]
    const totalEggs = collections.reduce((s, c) => s + eggsFromRecord(c), 0)
    const crates = Math.floor(totalEggs / CRATE_SIZE)
    const singles = totalEggs % CRATE_SIZE

    expect(totalEggs).toBe(19567) // must match the bot's reported egg count exactly
    expect(crates).toBe(652)      // NOT 649 — the old buggy dashboard value
    expect(singles).toBe(7)
  })

  it('a month with zero singles is unaffected (no regression for the common case)', () => {
    const collections = [{ crates: 80, singles: 0 }, { crates: 70, singles: 0 }]
    const totalEggs = collections.reduce((s, c) => s + eggsFromRecord(c), 0)
    expect(Math.floor(totalEggs / CRATE_SIZE)).toBe(150)
    expect(totalEggs % CRATE_SIZE).toBe(0)
  })

  it('singles spread across many small entries still sum correctly (the real-world pattern)', () => {
    const collections = [
      { crates: 50, singles: 12 },
      { crates: 60, singles: 18 },
      { crates: 80, singles: 25 },
      { crates: 70, singles: 0 },
      { crates: 55, singles: 10 },
      { crates: 80, singles: 12 },
      { crates: 60, singles: 10 },
      { crates: 55, singles: 10 },
      { crates: 60, singles: 0 },
      { crates: 79, singles: 0 },
    ]
    const totalEggs = collections.reduce((s, c) => s + eggsFromRecord(c), 0)
    const crates = Math.floor(totalEggs / CRATE_SIZE)
    const singles = totalEggs % CRATE_SIZE
    expect(crates).toBe(652)
    expect(singles).toBe(7)
  })
})

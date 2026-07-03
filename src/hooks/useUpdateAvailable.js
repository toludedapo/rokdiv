import { useState, useEffect, useRef } from 'react'

/**
 * Detects when a newer deploy is live while this tab is still running an
 * older build — without a service worker (this project deliberately avoids
 * one; see the SW-unregister script in index.html) and without any Vite
 * build-config changes.
 *
 * How it works: every running instance knows which hashed bundle it's
 * actually executing, via import.meta.url (Vite rewrites this correctly at
 * build time to the real deployed chunk URL). We periodically re-fetch the
 * live index.html — bypassing every cache with { cache: 'no-store' } — and
 * check whether it now references a *different* hashed bundle filename. If
 * so, a new deploy has gone out since this tab first loaded.
 *
 * Deliberately non-intrusive: this never force-reloads on its own. Silently
 * yanking someone mid-form-entry is the exact mistake already fixed once
 * this session (the SIGNED_IN handler firing on a background token refresh
 * and resetting people to Home mid-task) — this hook only ever *offers* the
 * update via the returned flag; the actual reload stays a deliberate,
 * person-initiated tap.
 *
 * Honest caveat: import.meta.url matching the top-level entry script tag
 * relies on standard Vite single-entry build behavior. In the very unlikely
 * case a build config uses unusual code-splitting where this doesn't line
 * up, the worst-case failure mode is an occasional unnecessary "update
 * available" banner — never a crash, never lost data, never a forced reload.
 */
export function useUpdateAvailable() {
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const currentBundleRef = useRef(null)

  useEffect(() => {
    // Capture which bundle THIS tab is actually running, once, on load.
    currentBundleRef.current = import.meta.url

    async function checkForUpdate() {
      try {
        const res = await fetch('/', { cache: 'no-store' })
        const html = await res.text()
        const match = html.match(/src="([^"]*\/assets\/[^"]*\.js)"/)
        if (!match) return

        const currentFile = currentBundleRef.current?.split('/').pop()
        const latestFile  = match[1].split('/').pop()
        if (currentFile && latestFile && currentFile !== latestFile) {
          setUpdateAvailable(true)
        }
      } catch {
        // Silent — a failed check (offline, flaky connection) just means we
        // try again next interval. Never surface a false positive from a
        // network hiccup.
      }
    }

    checkForUpdate()
    const interval = setInterval(checkForUpdate, 10 * 60 * 1000) // every 10 min
    const onVisible = () => {
      // The highest-value moment to check: the app just came back from the
      // background (phone unlocked, tab refocused) — exactly the scenario
      // that surfaced this whole caching issue in the first place.
      if (document.visibilityState === 'visible') checkForUpdate()
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  return updateAvailable
}

import { useState, useEffect } from 'react'

/**
 * A drop-in replacement for useState that persists data to localStorage.
 * @param {string} key - The localStorage key
 * @param {*} initialValue - Default value if nothing is stored yet
 */
export function useLocalStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch (error) {
      console.warn(`useLocalStorage: could not read key "${key}"`, error)
      return initialValue
    }
  })

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(storedValue))
    } catch (error) {
      console.warn(`useLocalStorage: could not write key "${key}"`, error)
    }
  }, [key, storedValue])

  return [storedValue, setStoredValue]
}

export function useLowStockThreshold() {
  // Persisted in localStorage so it's shared across all pages
  const threshold = useLocalStorage('low-stock-threshold', 10)
  return { threshold }
}

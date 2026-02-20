/**
 * Global barcode scanner detector.
 * USB HID scanners type characters VERY fast (< 50ms between each char).
 * We detect this speed difference vs human typing to intercept scanner input
 * globally, regardless of which element has focus.
 */
export function useBarcodeScanner(
  onScan: (barcode: string) => void,
  onBuffer?: (value: string) => void
) {
  const SCANNER_SPEED_MS = 50
  const MIN_BARCODE_LENGTH = 4 // minimum chars to be considered a barcode
  const RESET_AFTER_MS = 300 // reset buffer if no chars come in

  let buffer = ''
  let lastTime = 0
  let resetTimer: ReturnType<typeof setTimeout> | null = null
  let isScanning = false

  function clearCharsFromActiveInput(count: number) {
    const el = document.activeElement as HTMLInputElement
    if (
      el
      && 'value' in el
      && el.type !== 'checkbox'
      && el.type !== 'radio'
      && !el.hasAttribute('data-barcode-input')
    ) {
      const newVal = el.value.slice(0, Math.max(0, el.value.length - count))
      el.value = newVal
      // Trigger Vue's reactivity
      el.dispatchEvent(new Event('input', { bubbles: true }))
      el.blur()
    }
  }

  function handleKeyDown(e: KeyboardEvent) {
    // If the focused element is our manual barcode input, let it handle itself
    const active = document.activeElement
    if (active && active.hasAttribute('data-barcode-input')) return

    const now = Date.now()
    const gap = lastTime ? now - lastTime : Infinity

    if (e.key === 'Enter') {
      if (isScanning && buffer.length >= MIN_BARCODE_LENGTH) {
        e.preventDefault()
        e.stopImmediatePropagation()
        const code = buffer
        buffer = ''
        lastTime = 0
        isScanning = false
        if (resetTimer) {
          clearTimeout(resetTimer)
          resetTimer = null
        }
        onScan(code)
        onBuffer?.('')
      } else {
        buffer = ''
        isScanning = false
      }
      return
    }

    // Ignore non-printable keys
    if (e.key.length !== 1) return

    if (gap <= SCANNER_SPEED_MS) {
      // Fast keypress - could be a scanner
      if (!isScanning && buffer.length >= 1) {
        // Second fast char confirms it's a scanner
        isScanning = true
        clearCharsFromActiveInput(buffer.length)
      }
      buffer += e.key
      lastTime = now
      onBuffer?.(buffer)
      if (isScanning) {
        e.preventDefault()
        e.stopImmediatePropagation()
      }
    } else {
      // Slow keypress - human typing, reset
      buffer = e.key
      lastTime = now
      isScanning = false
    }

    if (resetTimer) clearTimeout(resetTimer)
    resetTimer = setTimeout(() => {
      buffer = ''
      lastTime = 0
      isScanning = false
      onBuffer?.('')
    }, RESET_AFTER_MS)
  }

  onMounted(() => {
    // Use capture phase (true) to intercept before other handlers
    document.addEventListener('keydown', handleKeyDown, true)
  })

  onUnmounted(() => {
    document.removeEventListener('keydown', handleKeyDown, true)
    if (resetTimer) clearTimeout(resetTimer)
  })
}

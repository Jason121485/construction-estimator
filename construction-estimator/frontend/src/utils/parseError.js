/**
 * Extract a human-readable error message from an axios error.
 * - No response (network/timeout/CORS): server warmup message
 * - String detail: use it directly
 * - Anything else: fall back to the provided default
 */
export function parseApiError(err, fallback = 'Request failed. Please try again.') {
  if (!err.response) {
    return 'Server is starting up — please wait a moment and try again.'
  }
  const detail = err.response?.data?.detail
  if (typeof detail === 'string') return detail
  // FastAPI 422 returns detail as an array of validation errors
  if (Array.isArray(detail) && detail.length > 0) {
    return detail[0]?.msg ?? fallback
  }
  return `${fallback} (HTTP ${err.response.status})`
}

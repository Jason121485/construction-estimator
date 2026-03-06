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
  return typeof detail === 'string' ? detail : fallback
}

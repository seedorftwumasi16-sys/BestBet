export function extractApiErrorMessage(
  body: Record<string, unknown>,
  status: number,
  statusText: string,
  path: string
): string {
  if (typeof body.error === "string" && body.error.trim()) return body.error;
  if (typeof body.message === "string" && body.message.trim()) return body.message;
  if (typeof body.detail === "string" && body.detail.trim()) return body.detail;
  if (typeof body.reason === "string" && body.reason.trim()) return body.reason;

  if (status === 502) return "API gateway error — the backend may be restarting. Try again shortly.";
  if (status === 503) return "Service temporarily unavailable. Please try again in a moment.";
  if (status === 504) return "Request timed out — the server took too long to respond.";
  if (status === 404) return `Not found: ${path}`;
  if (status === 500) return statusText ? `Server error (${statusText})` : "Internal server error";
  if (status === 0) return "Network error — unable to reach the API";

  return statusText?.trim() || `Request failed (${status})`;
}

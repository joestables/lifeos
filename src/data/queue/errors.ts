/** A write the server didn't accept. Permanent: retrying won't help (OFF-004). */
export class WriteError extends Error {
  readonly permanent: boolean

  constructor(message: string, permanent: boolean) {
    super(message)
    this.name = 'WriteError'
    this.permanent = permanent
  }
}

/**
 * Sorts a failed request: no connection, a server fault, an expired session
 * or rate limiting is worth retrying; anything else the server refused.
 */
export function isTransient(status: number): boolean {
  return (
    status === 0 ||
    status === 401 ||
    status === 408 ||
    status === 425 ||
    status === 429 ||
    status >= 500
  )
}

/**
 * A write refused because its own id is taken: an earlier send of it was
 * applied (a reload sent it again while the first was still on its way).
 * Every write's ids are made on the device, so nothing else takes them.
 */
export function alreadyApplied(error: { code?: string; message: string }): boolean {
  return error.code === '23505' && /_pkey"/.test(error.message)
}

export class BrokerError extends Error {
  constructor(
    readonly status: 401 | 403 | 404 | 502,
    message: string
  ) {
    super(message)
  }
}

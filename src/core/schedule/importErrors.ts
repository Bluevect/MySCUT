export type ScheduleImportErrorCode =
  | 'qms-invalid-json'
  | 'qms-invalid-structure'
  | 'compressed-qms-invalid-base64'
  | 'compressed-qms-invalid-zstd'

export class ScheduleImportError extends Error {
  readonly code: ScheduleImportErrorCode
  readonly cause?: unknown

  constructor(code: ScheduleImportErrorCode, message: string, cause?: unknown) {
    super(message)
    this.name = 'ScheduleImportError'
    this.code = code
    this.cause = cause
  }
}

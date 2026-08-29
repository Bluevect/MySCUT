type ScutJwImportDiagnostic = {
  stage: ScutJwImportDiagnosticStage
  origin?: string
  status?: number
  responseLength?: number
  courseCount?: number
  lessonCount?: number
}

export type ScutJwImportDiagnosticStage =
  | 'mock-target-selected'
  | 'session-opening'
  | 'session-opened'
  | 'session-open-failed'
  | 'session-closed'
  | 'session-cleanup-failed'
  | 'session-close-failed'
  | 'cancelled-session-close-failed'
  | 'unmounted-session-close-failed'
  | 'manual-session-close-failed'
  | 'page-origin-changed'
  | 'page-loaded'
  | 'button-injection-failed'
  | 'button-state-update-failed'
  | 'page-captured'
  | 'capture-rejected'
  | 'duplicate-capture-ignored'
  | 'capture-processing-failed'
  | 'parse-started'
  | 'parse-completed'
  | 'save-started'
  | 'save-completed'
  | 'import-failed'
  | 'duplicate-import-ignored'

type ScutJwImportDiagnosticInput = Omit<ScutJwImportDiagnostic, 'origin'> & {
  targetUrl?: string
}

function sanitizeOrigin(rawUrl: string | undefined) {
  if (!rawUrl) {
    return undefined
  }

  try {
    const url = new URL(rawUrl)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return undefined
    }

    return url.origin
  } catch {
    return undefined
  }
}

export function buildScutJwImportDiagnostic(
  input: ScutJwImportDiagnosticInput,
): ScutJwImportDiagnostic {
  const diagnostic: ScutJwImportDiagnostic = {
    stage: input.stage,
  }
  const origin = sanitizeOrigin(input.targetUrl)

  if (origin) {
    diagnostic.origin = origin
  }
  if (typeof input.status === 'number') {
    diagnostic.status = input.status
  }
  if (typeof input.responseLength === 'number') {
    diagnostic.responseLength = input.responseLength
  }
  if (typeof input.courseCount === 'number') {
    diagnostic.courseCount = input.courseCount
  }
  if (typeof input.lessonCount === 'number') {
    diagnostic.lessonCount = input.lessonCount
  }

  return diagnostic
}

export function logScutJwImportDiagnostic(input: ScutJwImportDiagnosticInput) {
  if (!import.meta.env.DEV) {
    return
  }

  console.info('[ScutJwImport]', buildScutJwImportDiagnostic(input))
}

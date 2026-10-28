/** Reads one stage's credentials; the stage's own `CredentialService` already knows how to open them with its vault. */
export interface StageCredentials {
  get(connector: string, userId: string | null): Promise<string | null>
}

export interface StageContext {
  projectId: string
  stage: string
  allowedConnectors: string[]
  credentials: StageCredentials
}

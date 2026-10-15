import { DatabaseSync } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

export type StudioAuditEvent = {
  at: string
  type: string
  subject: string | null
  project: string | null
  outcome: 'success' | 'failed'
}

export class StudioAudit {
  private db: DatabaseSync

  constructor(home: string) {
    mkdirSync(home, { recursive: true })
    this.db = new DatabaseSync(join(home, 'audit.db'))
    this.db.exec('PRAGMA journal_mode = WAL')
    this.db.exec(`
      create table if not exists studio_audit (
        seq integer primary key autoincrement,
        at text not null,
        type text not null,
        subject text,
        project text,
        outcome text not null
      )
    `)
    this.db.exec("update studio_audit set subject = 'cloud' where type = 'ai.choose' and subject = 'fabric'")
  }

  record(type: string, outcome: StudioAuditEvent['outcome'], subject: string | null = null, project: string | null = null) {
    try {
      this.db.prepare('insert into studio_audit (at, type, subject, project, outcome) values (?, ?, ?, ?, ?)').run(new Date().toISOString(), type, subject, project, outcome)
    } catch {}
  }

  read(limit: number, project?: string): StudioAuditEvent[] {
    const rows = this.db
      .prepare(
        `select at, type, subject, project, outcome from studio_audit
         ${project ? 'where project is null or project = ?' : ''}
         order by seq desc limit ?`,
      )
      .all(...(project ? [project, limit] : [limit])) as StudioAuditEvent[]
    return rows
  }
}

type Recorded<T> = (...args: any[]) => Promise<T>

const wrap = <T extends object, K extends keyof T>(target: T, method: K, after: (args: any[], result: unknown, failed: boolean) => void) => {
  const original = (target[method] as unknown as Recorded<unknown>).bind(target)
  ;(target as any)[method] = async (...args: any[]) => {
    try {
      const result = await original(...args)
      after(args, result, false)
      return result
    } catch (error) {
      after(args, undefined, true)
      throw error
    }
  }
}

const instrumented = new WeakSet<object>()

export const instrumentStudio = (
  audit: StudioAudit,
  core: {
    studioAi: { set: Recorded<unknown> }
    studioProjects: { pollSignIn: Recorded<unknown>; signOut: Recorded<unknown> }
    studioPublisher: { deploy: Recorded<unknown> }
  },
) => {
  if (instrumented.has(core.studioAi)) return
  instrumented.add(core.studioAi)
  wrap(core.studioAi, 'set', (args, _r, failed) => {
    if (!failed) audit.record('ai.choose', 'success', (args[0] as { kind?: string })?.kind ?? null)
  })
  wrap(core.studioProjects, 'pollSignIn', (_a, result, failed) => {
    if (!failed && result === 'confirmed') audit.record('account.sign_in', 'success')
  })
  wrap(core.studioProjects, 'signOut', (_a, _r, failed) => {
    if (!failed) audit.record('account.sign_out', 'success')
  })
  wrap(core.studioPublisher, 'deploy', (args, _r, failed) => {
    audit.record('project.publish', failed ? 'failed' : 'success', null, String(args[0]))
  })
}

import { execFileSync } from 'node:child_process'
import { appendFileSync, readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { fxRatesChanged, porcelainPaths, shouldPublish } from '../shared/publish.ts'

function git(root: string, args: string[]): string {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
}

function headFile(root: string, path: string): string | null {
  try {
    return git(root, ['show', `HEAD:${path}`])
  } catch {
    return null
  }
}

function worktreeFile(root: string, path: string): string | null {
  try {
    return readFileSync(`${root}/${path}`, 'utf8')
  } catch {
    return null
  }
}

export function inspectRepository(root: string): { publish: boolean; reason: string } {
  const porcelain = git(root, ['status', '--porcelain', '-uall', '--', 'data'])
  const changedPaths = porcelainPaths(porcelain)
  const fxChanged = ['data/fx/latest.json', 'data/fx/frankfurter.json'].some((path) =>
    fxRatesChanged(headFile(root, path), worktreeFile(root, path)),
  )
  return shouldPublish({ changedPaths, fxRatesChanged: fxChanged })
}

const entry = process.argv[1]
if (entry && import.meta.url === pathToFileURL(entry).href) {
  const decision = inspectRepository(process.cwd())
  const output = process.env.GITHUB_OUTPUT
  const body = `publish=${decision.publish}\nreason=${decision.reason}\n`
  if (output) appendFileSync(output, body)
  else process.stdout.write(body)
}

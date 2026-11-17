import { filesForDataset } from '../shared/files.ts'
import type { DatasetFile } from '../shared/types.ts'

export async function readDataset(key: string): Promise<DatasetFile> {
  return JSON.parse(await Deno.readTextFile(`data/${key}/latest.json`)) as DatasetFile
}

export async function writeText(relativePath: string, contents: string): Promise<void> {
  const directory = relativePath.split('/').slice(0, -1).join('/')
  if (directory) await Deno.mkdir(directory, { recursive: true })
  const temporary = `${relativePath}.${crypto.randomUUID()}.tmp`
  await Deno.writeTextFile(temporary, contents)
  await Deno.rename(temporary, relativePath)
}

export async function writeDataset(dataset: DatasetFile): Promise<void> {
  const files = filesForDataset(dataset)
  for (const [relativePath, contents] of Object.entries(files)) {
    await writeText(relativePath, contents)
  }
}

export async function restoreOrRemove(relativePath: string): Promise<void> {
  const checkout = await new Deno.Command('git', {
    args: ['checkout', '--', relativePath],
    stdout: 'null',
    stderr: 'null',
  }).output()
  if (!checkout.success) {
    try {
      await Deno.remove(relativePath)
    } catch {
      // The failed download was never written.
    }
  }
}

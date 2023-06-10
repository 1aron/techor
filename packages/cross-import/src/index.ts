import path from 'path'
import fg from 'fast-glob'
import extend from '@techor/extend'
import jiti from 'jiti'
import { transform } from 'sucrase'
import { fileURLToPath } from 'url'

const currentFilename = typeof __filename === 'undefined'
    ? fileURLToPath(import.meta.url)
    : __filename

export default function crossImport(
    source: string | fg.Pattern[],
    options?: fg.Options
): any {
    options = extend({ cwd: process.cwd() }, options)
    if (!source) return
    const filePath = fg.sync(source, options)[0]
    if (!filePath) return
    const resolvedFilePath = path.resolve(options.cwd, filePath)
    if (process.env.DEBUG) {
        console.log('[crossImport] resolvedFilePath:', resolvedFilePath)
    }
    try {
        delete require.cache[resolvedFilePath]
        return require(resolvedFilePath)
    } catch {
        return jiti(currentFilename, {
            interopDefault: true,
            transform: (options) => {
                return transform(options.source, {
                    transforms: ['imports', 'typescript'],
                })
            }
        })(resolvedFilePath)
    }
}

export { crossImport }
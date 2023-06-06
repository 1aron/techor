import log from '@techor/log'
import type { Pattern } from 'fast-glob'
import { crossImport } from 'cross-import'
import extend from '@techor/extend'
import { exploreConfigPath } from './explore-config-path'

export default function exploreConfig(
    sources: Pattern | Pattern[],
    options?: {
        cwd?: string,
        keys?: string[],
        on?: {
            found?: (foundPath: string) => void,
            notFound?: () => void
        }
    }
) {
    options = extend({
        cwd: process.cwd(),
        keys: ['config', 'default'],
        on: {
            found: (foundPath: string) => log.ok`**${foundPath}** config file found`,
            notFound: () => log.i`No **${sources}** config file found`
        }
    }, options)
    const { cwd, on, keys } = options
    let foundConfig: any
    try {
        const foundPath = exploreConfigPath(sources, options)
        if (foundPath) {
            const foundConfigModule = crossImport(foundPath, { cwd })
            for (const key of keys) {
                foundConfig = foundConfigModule[key]
                if (foundConfig) {
                    break
                }
            }
            if (!foundConfig) {
                foundConfig = foundConfigModule
            }
            on.found?.(foundPath)
        } else {
            on.notFound?.()
        }
    } catch (err) {
        log.error(err)
    }
    return foundConfig
}
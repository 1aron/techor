import crossImport from 'cross-import'
import { existsSync } from 'fs'
import { resolve } from 'path'

export interface ExploreConfigOptions {
    extensions?: ('js' | 'ts' | 'cjs' | 'cts' | 'mjs' | 'mts')[]
    resolvedKeys?: string[]
    cwd?: string
    found?: (basename: string, configPath: string) => void
}

export default function exploreConfig(name: string, options: ExploreConfigOptions = {}) {
    options = Object.assign({
        extensions: ['js', 'mjs', 'ts', 'cjs', 'cts', 'mts'],
        resolvedKeys: ['config', 'default'],
    }, options)
    let config: any
    // try to find the config file with the given name and options.extensions
    let foundConfigPath: string | undefined
    let foundBasename: string | undefined
    for (const eachExtension of options.extensions) {
        const eachBasename = name + '.' + eachExtension
        const eachPath = resolve(options.cwd || '', eachBasename)
        if (existsSync(eachPath)) {
            foundConfigPath = eachPath
            foundBasename = eachBasename
            break
        }
    }
    if (foundConfigPath) {
        const configModule = crossImport(foundConfigPath)
        for (const eachResolvedKey of options.resolvedKeys) {
            config = configModule[eachResolvedKey]
            if (config) break
        }
        if (!config) config = configModule
        options?.found?.(foundBasename, foundConfigPath)
    }
    return config
}

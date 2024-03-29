#!/usr/bin/env node

import yargsParser from 'yargs-parser'
import log from '@techor/log'
import { readJSONFileSync } from '@techor/fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

const { version, name, description } = readJSONFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '../../package.json'))

switch (process.argv.slice(2)[0]) {
    case 'build':
    case 'dev':
        import('../commands/build').then(({ default: build }) => build())
        break
    case 'version':
        import('../commands/version').then(({ default: version }) => version())
        break
    default:
        const { _, ...flags } = yargsParser(process.argv.slice(1), { alias: { v: 'version' } })
        if (flags.version) {
            log.i(`${name} version: **${version || 'workspace'}**`)
        }
}
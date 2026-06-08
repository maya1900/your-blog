#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const packageFiles = ['package.json', 'client/package.json', 'server/package.json']

function parseArgs() {
  const [, , flag, value] = process.argv
  if (flag === '--to' && value) return { mode: 'set', version: value }
  if (flag === '--patch') return { mode: 'patch' }
  throw new Error('Usage: node scripts/bump-patch-version.mjs --patch | --to x.y.z')
}

function assertSemver(version) {
  if (!/^\d+\.\d+\.\d+$/.test(version)) {
    throw new Error(`Expected semver x.y.z, got "${version}"`)
  }
}

function readPackage(file) {
  const path = resolve(root, file)
  return { path, json: JSON.parse(readFileSync(path, 'utf8')) }
}

function bumpPatch(version) {
  assertSemver(version)
  const [major, minor, patch] = version.split('.').map(Number)
  return `${major}.${minor}.${patch + 1}`
}

const args = parseArgs()
const packages = packageFiles.map(readPackage)
const currentVersion = packages[0].json.version
assertSemver(currentVersion)

const nextVersion = args.mode === 'set' ? args.version : bumpPatch(currentVersion)
assertSemver(nextVersion)

for (const pkg of packages) {
  pkg.json.version = nextVersion
  writeFileSync(pkg.path, `${JSON.stringify(pkg.json, null, 2)}\n`)
}

console.log(nextVersion)

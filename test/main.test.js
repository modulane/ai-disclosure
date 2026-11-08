import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'

const main = fileURLToPath(new URL('../src/main.js', import.meta.url))

// Runs the entry point as the action does, with only the given variables.
function run(vars) {
  const dir = mkdtempSync(join(tmpdir(), 'ai-disclosure-'))
  const output = join(dir, 'output')
  writeFileSync(output, '')
  const { status, stdout } = spawnSync(process.execPath, [main], {
    env: { PATH: process.env.PATH, GITHUB_OUTPUT: output, ...vars },
    encoding: 'utf8',
  })
  return { status, stdout, output: readFileSync(output, 'utf8') }
}

describe('main', () => {
  it('passes and sets the result output', () => {
    const { status, output } = run({
      BODY: '## AI use\n\n- [x] No AI tool was used\n',
      AUTHOR: 'versnic',
    })
    assert.equal(status, 0)
    assert.equal(output, 'result=none\n')
  })

  it('fails with an error annotation', () => {
    const { status, stdout, output } = run({
      BODY: 'No section here.',
      AUTHOR: 'versnic',
    })
    assert.equal(status, 1)
    assert.match(
      stdout,
      /^::error::The description has no "## AI use" section/m,
    )
    assert.equal(output, 'result=missing\n')
  })

  it('lets exempt authors through without a description', () => {
    const { status, output } = run({
      BODY: '',
      AUTHOR: 'dependabot[bot]',
      EXEMPT_AUTHORS: 'dependabot[bot]',
    })
    assert.equal(status, 0)
    assert.equal(output, 'result=exempt\n')
  })

  it('passes the custom wording and threshold on', () => {
    const { status } = run({
      BODY: '## Use of AI\n\n- [x] Used: Claude\n',
      AUTHOR: 'versnic',
      SECTION: 'Use of AI',
      USED_BOX: 'Used',
      MIN_DETAILS: '6',
    })
    assert.equal(status, 0)
  })

  it('falls back to the defaults for empty or invalid inputs', () => {
    const { status } = run({
      BODY: '## AI use\n\n- [ ] No AI tool was used\n- [x] AI tools were used: Claude\n',
      AUTHOR: 'versnic',
      SECTION: '',
      MIN_DETAILS: 'many',
    })
    assert.equal(status, 1)
  })
})

import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'

const main = fileURLToPath(new URL('../src/main.js', import.meta.url))

// Runs the entry point as the runner does, with only the given inputs.
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
      INPUT_BODY: '## AI use\n\n- [x] No AI tool was used\n',
      INPUT_AUTHOR: 'versnic',
    })
    assert.equal(status, 0)
    assert.equal(output, 'result=none\n')
  })

  it('fails with an error annotation', () => {
    const { status, stdout, output } = run({
      INPUT_BODY: 'No section here.',
      INPUT_AUTHOR: 'versnic',
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
      INPUT_BODY: '',
      INPUT_AUTHOR: 'dependabot[bot]',
      'INPUT_EXEMPT-AUTHORS': 'dependabot[bot]',
    })
    assert.equal(status, 0)
    assert.equal(output, 'result=exempt\n')
  })

  it('passes the custom wording and threshold on', () => {
    const { status } = run({
      INPUT_BODY: '## Use of AI\n\n- [x] Used: Claude\n',
      INPUT_AUTHOR: 'versnic',
      INPUT_SECTION: 'Use of AI',
      'INPUT_USED-BOX': 'Used',
      'INPUT_MIN-DETAILS': '6',
    })
    assert.equal(status, 0)
  })

  it('escapes the error annotation so it stays on one line', () => {
    const { status, stdout } = run({
      INPUT_BODY: '',
      INPUT_AUTHOR: 'versnic',
      INPUT_SECTION: '100% AI\nuse',
    })
    assert.equal(status, 1)
    assert.match(stdout, /^::error::.*"## 100%25 AI%0Ause" section/m)
  })

  it('falls back to the defaults for empty or invalid inputs', () => {
    const { status } = run({
      INPUT_BODY:
        '## AI use\n\n- [ ] No AI tool was used\n- [x] AI tools were used: Claude\n',
      INPUT_AUTHOR: 'versnic',
      INPUT_SECTION: '',
      'INPUT_MIN-DETAILS': 'many',
    })
    assert.equal(status, 1)
  })
})

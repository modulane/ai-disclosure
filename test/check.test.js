import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { checkDisclosure, isExempt } from '../src/check.js'

const template = (none, used, details = '') => `## What and why

Fixes the header.

## AI use

<!-- Required, for everyone. Tick exactly one box. -->

- [${none}] No AI tool was used
- [${used}] AI tools were used, as described here:

${details}

## Checklist

- [x] The title follows Conventional Commits
`

describe('checkDisclosure', () => {
  it('passes when no AI tool was used', () => {
    const check = checkDisclosure(template('x', ' '))
    assert.equal(check.ok, true)
    assert.equal(check.result, 'none')
  })

  it('accepts an uppercase X and an asterisk bullet', () => {
    const body =
      '## AI use\n\n* [X] No AI tool was used\n* [ ] AI tools were used\n'
    assert.equal(checkDisclosure(body).ok, true)
  })

  it('passes when AI tools were used and described under the box', () => {
    const check = checkDisclosure(
      template(
        ' ',
        'x',
        'Claude Code wrote the first draft of the tests; I reviewed them.',
      ),
    )
    assert.equal(check.ok, true)
    assert.equal(check.result, 'used')
  })

  it('accepts the description on the same line, after a colon', () => {
    const body =
      '## AI use\n\n- [ ] No AI tool was used\n- [x] AI tools were used: Copilot completed the parser loops.\n'
    assert.equal(checkDisclosure(body).result, 'used')
  })

  it('fails when AI tools were used without a description', () => {
    const check = checkDisclosure(template(' ', 'x'))
    assert.equal(check.ok, false)
    assert.match(check.message, /name each tool/)
  })

  it('does not count the template comment as a description', () => {
    const body = template(
      ' ',
      'x',
      '<!-- If AI tools were used, name each one and what it did, for example: "Claude Code wrote the tests". -->',
    )
    assert.equal(checkDisclosure(body).ok, false)
  })

  it('does not count the next section as a description', () => {
    const body =
      '## AI use\n\n- [ ] No AI tool was used\n- [x] AI tools were used\n\n## Checklist\n\n- [x] Tests cover the change, or it needs none\n'
    assert.equal(checkDisclosure(body).ok, false)
  })

  it('fails when no box is ticked', () => {
    const check = checkDisclosure(template(' ', ' '))
    assert.equal(check.ok, false)
    assert.match(check.message, /tick exactly one box/)
  })

  it('fails when both boxes are ticked', () => {
    const check = checkDisclosure(
      template('x', 'x', 'Claude Code wrote the first draft.'),
    )
    assert.equal(check.ok, false)
    assert.match(check.message, /tick exactly one box/)
  })

  it('fails without an AI use section', () => {
    for (const body of [
      '## What and why\n\nFixes the header.\n',
      '',
      null,
      undefined,
    ]) {
      const check = checkDisclosure(body)
      assert.equal(check.ok, false)
      assert.match(check.message, /no "## AI use" section/)
    }
  })

  it('ignores boxes outside the section', () => {
    const body =
      '## Checklist\n\n- [x] No AI tool was used\n\n## AI use\n\n- [ ] No AI tool was used\n'
    assert.equal(checkDisclosure(body).ok, false)
  })

  it('ignores a section that only exists inside a comment', () => {
    const body = '<!--\n## AI use\n- [x] No AI tool was used\n-->\n'
    assert.equal(checkDisclosure(body).ok, false)
  })

  it('reads the section to the end of the description', () => {
    const body =
      '## AI use\r\n\r\n- [x] No AI tool was used\r\n- [ ] AI tools were used'
    assert.equal(checkDisclosure(body).ok, true)
  })

  it('matches the heading without regard to case', () => {
    assert.equal(
      checkDisclosure('## ai USE\n\n- [x] No AI tool was used\n').ok,
      true,
    )
  })

  it('does not match a longer heading', () => {
    assert.equal(
      checkDisclosure('## AI use policy\n\n- [x] No AI tool was used\n').ok,
      false,
    )
  })

  it('accepts custom wording, with characters that mean something in a pattern', () => {
    const options = {
      section: 'AI (use)',
      noneBox: 'None.',
      usedBox: 'Used:',
      minDetails: 5,
    }
    const body = '## AI (use)\n\n- [ ] None.\n- [x] Used: Claude, tests\n'
    assert.equal(checkDisclosure(body, options).result, 'used')
    assert.equal(
      checkDisclosure('## AI use\n\n- [x] None.\n', options).ok,
      false,
    )
  })

  it('lets min-details lower or raise the bar', () => {
    const body =
      '## AI use\n\n- [ ] No AI tool was used\n- [x] AI tools were used: Claude\n'
    assert.equal(checkDisclosure(body).ok, false)
    assert.equal(checkDisclosure(body, { minDetails: 6 }).ok, true)
  })
})

describe('isExempt', () => {
  it('matches a login from a comma or line separated list, ignoring case', () => {
    assert.equal(isExempt('dependabot[bot]', 'dependabot[bot]'), true)
    assert.equal(
      isExempt('Renovate[bot]', 'dependabot[bot], renovate[bot]'),
      true,
    )
    assert.equal(
      isExempt('github-actions[bot]', 'dependabot[bot]\ngithub-actions[bot]\n'),
      true,
    )
  })

  it('needs the whole login', () => {
    assert.equal(isExempt('dependabot', 'dependabot[bot]'), false)
    assert.equal(isExempt('versnic', ''), false)
    assert.equal(isExempt('', ''), false)
  })
})

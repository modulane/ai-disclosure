// Entry point of the action. The runner passes each input in an INPUT_*
// environment variable, so no input is ever interpolated into a script.
import { appendFileSync } from 'node:fs'
import { checkDisclosure, defaults, isExempt } from './check.js'

const input = name => process.env[`INPUT_${name.toUpperCase()}`] ?? ''

const output = result => {
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, `result=${result}\n`)
  }
}

// Workflow commands end at a line break, so escape it, and "%" before it.
const escapeData = text =>
  text.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A')

const author = input('author')

if (isExempt(author, input('exempt-authors'))) {
  console.log(`${author} is exempt: no disclosure needed.`)
  output('exempt')
  process.exit(0)
}

const minDetails = Number.parseInt(input('min-details'), 10)
const check = checkDisclosure(input('body'), {
  section: input('section') || defaults.section,
  noneBox: input('none-box') || defaults.noneBox,
  usedBox: input('used-box') || defaults.usedBox,
  minDetails: Number.isNaN(minDetails) ? defaults.minDetails : minDetails,
})

if (!check.ok) {
  console.log(`::error::${escapeData(check.message)}`)
  output('missing')
  process.exit(1)
}

console.log(check.message)
output(check.result)

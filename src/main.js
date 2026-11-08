// Entry point of the action. The inputs arrive through environment variables
// set in action.yml, never interpolated into a script.
import { appendFileSync } from 'node:fs'
import { checkDisclosure, defaults, isExempt } from './check.js'

const env = process.env
const output = result => {
  if (env.GITHUB_OUTPUT) appendFileSync(env.GITHUB_OUTPUT, `result=${result}\n`)
}

if (isExempt(env.AUTHOR ?? '', env.EXEMPT_AUTHORS ?? '')) {
  console.log(`${env.AUTHOR} is exempt: no disclosure needed.`)
  output('exempt')
  process.exit(0)
}

const minDetails = Number.parseInt(env.MIN_DETAILS ?? '', 10)
const check = checkDisclosure(env.BODY, {
  section: env.SECTION || defaults.section,
  noneBox: env.NONE_BOX || defaults.noneBox,
  usedBox: env.USED_BOX || defaults.usedBox,
  minDetails: Number.isNaN(minDetails) ? defaults.minDetails : minDetails,
})

if (!check.ok) {
  console.log(`::error::${check.message}`)
  output('missing')
  process.exit(1)
}

console.log(check.message)
output(check.result)

/**
 * Checks the "AI use" section of a pull request description.
 *
 * The section holds two boxes: one saying no AI tool was used, and one
 * saying AI tools were used, followed by each tool and what it did. Exactly
 * one box must be ticked, and the second needs that description.
 */

export const defaults = Object.freeze({
  section: 'AI use',
  noneBox: 'No AI tool was used',
  usedBox: 'AI tools were used',
  minDetails: 20,
})

const escape = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const box = /^[ \t]*[-*][ \t]+\[([ xX])\][ \t]+(.*)$/

/**
 * @param {string | null | undefined} body The pull request description.
 * @param {Partial<typeof defaults>} [options]
 * @returns {{ ok: true, result: 'none' | 'used', message: string } | { ok: false, message: string }}
 */
export function checkDisclosure(body, options = {}) {
  const { section, noneBox, usedBox, minDetails } = { ...defaults, ...options }
  const text = (body ?? '').replace(/<!--[\s\S]*?-->/g, '')

  // From the "## AI use" heading to the next level-two heading, or the end.
  const heading = new RegExp(
    `^##[ \\t]+${escape(section)}[ \\t]*$([\\s\\S]*?)(?=^##[ \\t]|(?![\\s\\S]))`,
    'im',
  )
  const match = text.match(heading)
  if (!match) {
    return {
      ok: false,
      message: `The description has no "## ${section}" section. Copy it from the pull request template and tick one box.`,
    }
  }

  const startsWith = label => new RegExp(`^${escape(label)}`, 'i')
  const isNone = startsWith(noneBox)
  const isUsed = startsWith(usedBox)

  const lines = match[1].split(/\r?\n/)
  const ticked = lines
    .map(line => line.match(box))
    .filter(m => m && m[1] !== ' ')
  const none = ticked.some(m => isNone.test(m[2]))
  const used = ticked.some(m => isUsed.test(m[2]))

  if (none === used) {
    return {
      ok: false,
      message: `In the "${section}" section, tick exactly one box: "${noneBox}" or "${usedBox}".`,
    }
  }

  if (none) {
    return {
      ok: true,
      result: 'none',
      message: 'Disclosed: no AI tool was used.',
    }
  }

  // The description can follow the box on its line, after a colon, or sit
  // on the lines under it. Other boxes are not part of it.
  const details = lines
    .map(line => {
      const m = line.match(box)
      if (!m) return line
      return isUsed.test(m[2]) ? m[2].replace(/^[^:]*:?/, '') : ''
    })
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (details.length < minDetails) {
    return {
      ok: false,
      message: `"${usedBox}" is ticked: under it, name each tool and what it did.`,
    }
  }

  return {
    ok: true,
    result: 'used',
    message: 'Disclosed: AI tools were used, and how.',
  }
}

/**
 * @param {string} author The pull request author's login.
 * @param {string} list Logins separated by commas or new lines.
 */
export function isExempt(author, list) {
  const logins = list
    .split(/[\n,]/)
    .map(login => login.trim().toLowerCase())
    .filter(Boolean)
  return logins.includes(author.trim().toLowerCase())
}

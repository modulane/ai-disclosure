# ai-disclosure

A GitHub Action that fails a pull request until its description says whether AI tools were used, and how.

Reviewers read AI-assisted code differently, and more and more projects ask contributors to say when they used it. A line in the contributing guide is easy to miss. This check makes the question part of every pull request: one box to tick, a few words when AI helped, and nothing for bots.

- **A required answer, not a reminder.** As a required status check, it blocks the merge until the author answers, either way.
- **No judgement.** It never guesses whether code was written by AI. It only asks the author to say so.
- **Safe on forks.** It reads the description from the event: no token, no checkout, no code from the pull request.
- **Plain Markdown.** The disclosure is two boxes in your pull request template, worded as you like.

## How it works

The pull request template gets an **AI use** section with two boxes:

```markdown
## AI use

<!-- Required, for everyone. Tick exactly one box. -->

- [ ] No AI tool was used
- [ ] AI tools were used, as described here:

<!-- If AI tools were used, name each one and what it did. -->
```

The check passes when exactly one box is ticked. With **AI tools were used**, the author also writes which tools and what they did, after the box on the same line or on the lines under it. Comments from the template never count as that description, and neither do the boxes or sections around it.

Editing the description runs the check again. Make it a required status check, and a pull request cannot be merged without a disclosure.

The action reads the description from the event. It needs no token and no checkout, and it never runs code from the pull request. Dependabot needs no disclosure, and other bots can be exempted too.

## Usage

```yaml
# .github/workflows/ai-disclosure.yml
name: AI disclosure

on:
  pull_request:
    types: [opened, edited, reopened, synchronize]

permissions: {}

jobs:
  check:
    name: AI disclosure
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - uses: modulane/ai-disclosure@v1
```

`@v1` follows every 1.x release. To pin a release exactly, use its commit SHA with a `# v1.2.3` comment, and let Dependabot keep it up to date.

Then add the **AI use** section above to `.github/PULL_REQUEST_TEMPLATE.md`, and require the check: in **Settings → Rules → Rulesets** (or branch protection), add a status check named `AI disclosure`.

With a merge queue, also trigger the workflow on `merge_group` and skip the step there with `if: github.event_name == 'pull_request'`. The pull request was already checked, and a merge group has no description to read.

## Inputs

| Input            | Default                         | What it does                                                         |
| ---------------- | ------------------------------- | -------------------------------------------------------------------- |
| `exempt-authors` | `dependabot[bot]`               | Logins that need no disclosure, separated by commas or new lines     |
| `section`        | `AI use`                        | The level-two heading of the section that holds the boxes            |
| `none-box`       | `No AI tool was used`           | The start of the box that says no AI tool was used                   |
| `used-box`       | `AI tools were used`            | The start of the box that says AI tools were used                    |
| `min-details`    | `20`                            | The fewest characters that describe the tools used and what they did |
| `body`           | The pull request description    | The text to check                                                    |
| `author`         | The pull request author's login | The login compared with `exempt-authors`                             |

Headings and box texts are matched without regard to case. Change `section`, `none-box` and `used-box` together with your pull request template.

## Outputs

| Output   | Value                                                                     |
| -------- | ------------------------------------------------------------------------- |
| `result` | `none`, `used` or `exempt` when the check passes, `missing` when it fails |

## Development

```bash
corepack enable
yarn install
yarn check   # formatting and tests, as CI runs them
```

CI also runs the action itself on Linux, Windows and macOS, with known descriptions given through `body`.

## License

[MIT](LICENSE)

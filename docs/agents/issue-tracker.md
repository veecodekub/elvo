# Issue Tracker: GitHub

Issues and specs live in GitHub Issues for `veecodekub/elvo`.
Use the `gh` CLI from this repository; prefix shell commands with `rtk`.

## Operations

- Create: `rtk gh issue create --title "..." --body-file <path>`
- Read: `rtk gh issue view <number> --comments`
- List: `rtk gh issue list --state open --json number,title,labels`
- Comment: `rtk gh issue comment <number> --body-file <path>`
- Label: `rtk gh issue edit <number> --add-label "needs-triage"`
- Remove label: `rtk gh issue edit <number> --remove-label "needs-triage"`
- Close: `rtk gh issue close <number> --comment "..."`

Use a temporary Markdown file for multiline issue bodies and comments.
When a skill says “publish to the issue tracker,” create a GitHub issue.
When it says “fetch the relevant ticket,” read the issue and its comments.

## Pull Requests as a Triage Surface

PRs as a request surface: no.

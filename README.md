# Blamebot for VS Code

Track provenance of AI-authored code. `git blame` tells you *who* and *when*. **Blamebot** tells you *why* — the prompt and reasoning behind every AI edit, right inside VS Code.

## Prerequisites

Install the [blamebot CLI](https://github.com/JensRoland/blamebot) (`git-blamebot`) and enable it in your repo.

## Features

### Gutter Icons

Lines edited by AI get a sparkle icon in the gutter. Green for lines whose content still matches the original AI edit; amber for lines that have been modified since.

### Inline Annotations

Move your cursor to an AI-edited line to see the reason for the edit displayed inline, similar to GitLens blame annotations.

### Hover Cards

Hover over any AI-edited line to see the full detail:

- **Prompt** — your original request
- **Reason** — a one-sentence explanation of why the AI made this change
- **Change** — a compact diff summary
- **Author**, **tool**, and **timestamp**
- **View Full Trace** link to see the complete reasoning chain

### CodeLens

Functions and methods that contain AI-edited code show a CodeLens above them with the most recent AI prompt that touched them.

### Trace Viewer

Click "View Full Trace" from any hover card or CodeLens to open the agent's full thinking and response in a side panel.

## Extension Settings

| Setting                      | Default | Description                                 |
| ---------------------------- | ------- | ------------------------------------------- |
| `blamebot.enabled`           | `true`  | Enable/disable all Blamebot annotations     |
| `blamebot.gutterIcons`       | `true`  | Show gutter icons on AI-edited lines        |
| `blamebot.inlineAnnotations` | `true`  | Show inline reason text on the current line |
| `blamebot.codeLens`          | `true`  | Show CodeLens above AI-edited functions     |
| `blamebot.cliPath`           | `"git"` | Path to the git executable                  |

## Commands

- **Blamebot: Refresh** — Clear caches and re-query all annotations
- **Blamebot: Toggle Annotations** — Enable/disable all annotations
- **Blamebot: Show Reasoning Trace** — View the full reasoning trace for a record

## Development

```bash
npm install
npm run compile    # one-time build
npm run watch      # watch mode for development
```

Press F5 in VS Code to launch the Extension Development Host.

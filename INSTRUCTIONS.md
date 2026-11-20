# Buckshot Roulette Tracker

A companion tracker for Buckshot Roulette (the Steam game by Mike Klubnika). It records what you know, what came out, and how the remaining odds change as a round progresses. It is a single self-contained HTML file with no install and no server needed.

## Files

| File | What it is |
|---|---|
| `buckshot-roulette-tracker.html` | The tracker. Open it in any browser. |
| `index.html` | A one-line redirect to the tracker, so a GitHub Pages site opens it at the root address. |
| `buckshot-tracker-tests.js` | Automated test suite. Run with `node buckshot-tracker-tests.js`. |
| `preview-server.js` | Optional local web server for previewing (see below). |
| `INSTRUCTIONS.md` | This file. |

## Quick use

1. Choose the number of live and blank shells (max 8 total) and start the round.
2. Work left to right. The current shell is the first unresolved shell; later shells stay locked until earlier ones are resolved.
3. Record what happened with the rows, then tap the glowing **Action** cell to enter what came out.
4. Watch the probability panel and the count table update.
5. Use **Undo** (↩) under a resolved shell to rewind to that point.

## Rows (top to bottom)

The table is split into three groups by horizontal lines.

**Group 1: what you know**

| Row | Behavior |
|---|---|
| **Dealer** 🤵 | Marks the shell as a dealer turn. Hides Phone, Mirror and Fire/Eject and clears anything already set there. Resolve it with the ✅ Action cell. |
| **Phone** ☎️ | A burner-phone prediction. Available on every shell except shell 1. Counts as a claim for probability right away. Tap again to clear. |
| **Mirror** 🪞 | A peek at the current shell only. Counts as a claim. Clearing it falls back to the Phone value if there is one. |
| **Claimed** | The two mini shells show the claimed type (red live, blue blank). `?` means unknown; `?!` means the ejected result did not match the claim. The claim you entered is never overwritten. |
| **Invert** 🔄 | Arms the inverter for your fire or beer action. Armed-but-unresolved inverters do not change the count table; the probability panel swaps live and blank for that shell. |

**Group 2: what you do**

| Row | Behavior |
|---|---|
| **Fire/Eject** | Choose 💥 fire or 🍺 beer eject. Tap again to change or clear. Shows only the method, never inversion icons. |
| **Action** | Glows when the current shell is ready. Tap it and pick what actually came out. This prompt appears for every resolution type (fire, beer, dealer), including after Phone or Mirror. Blind fire shows 💀. |

**Group 3: what came out**

| Row | Behavior |
|---|---|
| **Ejected** | Fills in only after the action is completed. This is the source of truth for counts and probability. A 🔄 under the shell number means an inverter flipped it. |
| **Undo** ↩ | Rewinds to that shell and clears everything from there on. Phone predictions on later shells are kept. |

## Important logic

- **Ejected wins.** If the claim and the ejected value disagree, the claim stays displayed with `?!`, and the math uses the ejected value.
- **Phone and Mirror stay selected** after a shell is resolved, so you can see what you knew at the time.
- **Inverter on your turn:** the loaded type is the opposite of what came out. If a claim plus an armed inverter predicted one result and the other came out, the shell is flagged `?!` and the claim is kept.
- **Inversions are counted every time an inverter completes**, including mismatches. The `+` and `−` columns and the Actual totals reflect them.
- **Impossible options are disabled** in the outcome prompt, based on what is left in the tube.
- **Dealer inverter** (you can't arm it yourself):
  - If both answers are possible, the tracker asks "Did the dealer use the inverter?" (Yes / No).
  - If the ejected type is impossible without an inverter, the inverter is recorded automatically.
  - If only the no-inverter answer is possible (for example the last shell, with only live left), it resolves without asking, so counts can never go negative.
- **The last shell is not auto-filled.** A Phone or Mirror value you entered stays as entered.
- **Probability depends on your entries**, especially Ejected. Check the event log if something looks wrong.

## Event log

Turn on **Show event log** to see a history of peeks, outcomes and undos, with 1-based shell numbers. **Copy log** copies it, which is useful for reporting bugs.

## Testing

```bash
node buckshot-tracker-tests.js
```

It loads `buckshot-roulette-tracker.html` from the same folder (or pass another file: `node buckshot-tracker-tests.js some-other.html`) and runs the main flows in a simulated page: Phone, Mirror, Dealer (including endgame auto-resolve), inverter math and mismatches, count-table invariants, undo, last-shell rules, event log numbering, and row layout. It prints `All tracker tests passed` at the end, or stops at the first failure.

## Preview server (optional)

`node preview-server.js` serves this folder at `http://127.0.0.1:5177` (Ctrl+C to stop). The tracker works fine by double-clicking the HTML file, so this is only for previewing it the way a website would load it, or for browser tools that need an `http://` address. It only listens on your own computer.

## Publishing on GitHub Pages

1. Create a public repository on GitHub and upload `index.html` and `buckshot-roulette-tracker.html` (the other files are optional).
2. In the repository, go to **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to **Deploy from a branch**, choose **main** and **/(root)**, and click **Save**.
4. After a minute or two the site is live at `https://<your-username>.github.io/<repo-name>/`.

To update the site later, upload the new `buckshot-roulette-tracker.html` over the old one.

## Version history

**v1.1.0** (current): the clean starting point, based on the last working version (`v1_0_0_18_3`).
- Renamed to `buckshot-roulette-tracker.html`; added `index.html` for GitHub Pages.
- Group separators now end at the last shell for any shell count (they were sized for 8).
- Tests point at the new file name and cover dealer endgame auto-resolve, Phone/Mirror staying selected, and row layout.
- This document rewritten to match the current row order and behavior.

**v1.0.0.18_3**: the dealer prompt is skipped when only one answer is possible (fixes negative counts in a 4/4 endgame).
**v1.0.0.18_2**: the Help text matches the new row order.
**v1.0.0.18_1**: Phone and Mirror stay selected after resolving; the dealer prompt was shortened to "Did the dealer use the inverter?".
**v1.0.0.x** (5/10): rows reordered into three groups with separators; Claimed moved after Mirror; inverter count and mismatch fixes; claims kept on inverted mismatches.

## Not tracked

Dealer items other than the inverter, who was shot, health, saw damage, and multi-round state.

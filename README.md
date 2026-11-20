# Buckshot Roulette Tracker

A companion tracker for [Buckshot Roulette](https://store.steampowered.com/app/2835570/Buckshot_Roulette/), the game by Mike Klubnika. Record what you know about each shell, what actually came out, and watch the odds for the next shell update as the round plays out.

**▶ Use it here: https://ras5429.github.io/bshotroul-tracker/**

It is a single HTML file with no install, no account, no tracking and no network calls. It also works offline: download `buckshot-roulette-tracker.html` and open it in any browser.

## What it does

- **Next-shell probability.** It shows a live/blank pie chart for the shell in the chamber, using everything you've entered.
- **Shell counts.** Starting counts, gains and losses from the inverter, actual totals, how many are left in the tube, and how many have been ejected.
- **Item tracking.** It tracks the burner phone (peek a future shell), the magnifying glass/mirror (peek the current shell), the inverter, and beer ejects.
- **Dealer turns.** Record what the dealer ejected. If the counts prove the dealer must have used the inverter, the tracker records it automatically. It only asks when it can't tell.
- **Error catching.** If what came out doesn't match what you claimed, the shell is flagged `?!`, and the real result is used for the math.
- **Undo** back to any shell, and an optional **event log** you can copy.
- Light and dark mode.

## How to use

1. Pick the number of live and blank shells (up to 8 total) and start the round.
2. Work left to right. For each shell, mark any peeks (Phone, Mirror), arm the Inverter if you used one, and choose Fire or Beer. For a dealer turn, toggle Dealer instead.
3. Tap the glowing **Action** cell and pick what came out.
4. Read the probability panel before your next decision.

The **Help** button in the app explains every row. [`INSTRUCTIONS.md`](INSTRUCTIONS.md) has the full behavior reference.

The odds are only as good as what you enter. If something looks impossible, check the event log.

## Files

| File | Purpose |
|---|---|
| `buckshot-roulette-tracker.html` | The app (everything in one file). |
| `index.html` | Forwards the site's root address to the app. |
| `INSTRUCTIONS.md` | Detailed behavior reference. |
| `buckshot-tracker-tests.js` | Automated tests (Node.js). |
| `preview-server.js` | Optional local preview server. |

## Development

You need [Node.js](https://nodejs.org/) for the tests and preview server only, not to use the app.

```bash
node buckshot-tracker-tests.js   # run the test suite; ends with "All tracker tests passed"
node preview-server.js           # preview at http://127.0.0.1:5177
```

## Credits

Built with Claude (Anthropic). Buckshot Roulette is the work of Mike Klubnika; this is an unofficial fan tool and is not affiliated with the game or its publisher.

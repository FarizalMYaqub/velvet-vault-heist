[![make.fun](https://make.fun/badge/best-heist-game-20261122-0559.svg)](https://make.fun/bounty/best-heist-game-20261122-0559)
[![rank](https://make.fun/badge/best-heist-game-20261122-0559/FarizalMYaqub/velvet-vault-heist/rank.svg)](https://make.fun/bounty/best-heist-game-20261122-0559)
[![reward](https://make.fun/badge/best-heist-game-20261122-0559/FarizalMYaqub/velvet-vault-heist/reward.svg)](https://make.fun/bounty/best-heist-game-20261122-0559)

# Velvet Vault — a heist game

You are **Vesper**, a cat-burglar. The Meridian Vault sleeps — but its
guards do not. Take the **Crimson Diamond**, the **Meridian Ledger** and
the **Gold Bullion**, then slip out the green EXIT unseen.

## How to play

- **WASD / arrow keys** — move
- **Shift** — run (fast, but loud: guards come to listen)
- **C** — sneak (slow, silent, harder to spot)
- **E (hold)** — pick the vault lock, grab loot, crawl a vent
- **Q / click** — smoke pellet (blinds eyes for a few seconds)
- **F** — EMP burst (kills cameras and lasers for a few seconds)
- **Space** — begin the job · **Esc** — pause · **R** — restart · **M** — mute

## The heist

- **Vision cones**: yellow is calm, orange is wary, red means RUN. A guard
  who fills his suspicion meter chases you; if he catches you, the night is
  over.
- **Shadowed floor hides you** — a guard spots you half as fast in the dark.
  Lamp light exposes you, so cross it quickly.
- **Cameras sweep** the halls. Time your crossing, trip one and the alarm
  climbs. An EMP shuts them down for a while.
- **Laser grids** guard the vault antechamber. They blink on and off in a
  rhythm — cross on the dark beat, or trip one and every guard comes
  looking.
- **The alarm meter** climbs while you are seen and falls while you are
  not. At 75 the vault locks down and the exit seals until it cools off.
- **Vents** link the main hall to the laser grid: a second route past the
  patrols, for a thief patient enough to crawl.
- **Patrols can be learned**: each guard walks a fixed route and pauses to
  look around. Wait for the gap, then move.

## Scoring

- Each prize: **+500**. Finish without ever being chased: **+600**.
  Finish without any guard ever growing suspicious: **+300**. Time bonus
  up to **+500**.

## Run it

No build step, no network — plain static files under `game/`:

```sh
node serve.ts
# open http://localhost:8080
```

Screenshots in `screenshots/` are real renders of the game in a browser.

## Entry

Built for [make.fun's best heist game bounty](https://make.fun/bounty/best-heist-game-20261122-0559).
`main.ts` hands the game in: it copies `game/` and `screenshots/` to
`/output` and writes `/output/dossier.json` with `vendor/makefun-game.ts`.

License: MIT.

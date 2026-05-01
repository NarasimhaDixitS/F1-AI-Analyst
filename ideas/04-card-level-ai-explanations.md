# Card-Level AI Explanations

## Concept

Each dashboard card should have an Analyze or Explain action that asks AI to explain only what that card is showing.

This is more useful and cheaper than asking AI to analyze the whole race every time.

## Example Card Actions

- Explain
- What mattered?
- Beginner explanation
- What could have gone better?
- Technical view

## Examples

### Tyre Strategy Card

AI should explain:

- Which compounds were used.
- How long each stint was.
- Whether the strategy was aggressive or conservative.
- How it compared to the winner or teammate.
- What may have worked better.

### Race Timeline Card

AI should explain:

- What major events happened.
- Whether safety car or red flag periods changed the race.
- Which drivers or teams likely benefited.
- Why timing mattered.

### Telemetry Card

AI should explain:

- Where one driver was faster.
- Whether speed gains came from straights, corners, braking, or traction.
- What the chart suggests, without overclaiming.

## Backend Shape

Add an endpoint like:

```text
POST /api/explain-card
{
  "card": "tyre_strategy",
  "level": "beginner",
  "context": {
    "year": 2024,
    "race": "British Grand Prix",
    "session": "Race"
  },
  "data": { "...": "card payload only" }
}
```

## Important Rule

Do not send raw telemetry arrays to AI. Convert the card data into a compact summary first.

Good AI payload:

```json
{
  "driver1": "VER",
  "driver2": "HAM",
  "lap_delta_seconds": -0.231,
  "sector_winners": {
    "S1": "VER",
    "S2": "HAM",
    "S3": "VER"
  },
  "max_speed_delta_kph": 4.2
}
```

Bad AI payload:

```json
{
  "speed": [321, 322, 318, "... thousands more points"]
}
```

## Why This Works

- Faster AI responses.
- Lower AI cost.
- Easier to cache.
- More focused explanations.
- Better user control.


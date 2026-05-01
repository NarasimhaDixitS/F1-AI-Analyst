# AI Cost And Monetization Controls

## Problem

AI calls cost money and add latency. If every dashboard load triggers multiple AI calls, the app will become expensive quickly.

## Recommended Principle

Use deterministic data and summaries by default. Use AI on demand.

```text
Default: structured data + deterministic summaries
On demand: AI card explanation
Paid or limited: deep race reports
```

## Avoid AI For Parsing When Possible

Structured controls should reduce the need for AI extraction.

Natural language can remain useful, but mainly to prefill controls.

## Never Send Raw Telemetry To AI

Compute compact summaries first.

Good:

```json
{
  "driver1": "VER",
  "driver2": "HAM",
  "lap_time_delta": -0.231,
  "sector_winners": {
    "S1": "VER",
    "S2": "HAM",
    "S3": "VER"
  },
  "max_speed_delta_kph": 4.2,
  "key_events": ["Safety Car lap 23"]
}
```

Bad:

```json
{
  "speed": [321, 322, 318, "... thousands more points"]
}
```

## Cache AI Responses

Cache every AI explanation by:

```text
card_type + year + race + session + driver/team + explanation_level
```

If 100 users ask for the same Monaco 2024 strategy explanation, pay once.

## Meter Free Usage

Free users can get a limited number of AI explanations.

Example:

```text
Free: 5 AI explanations per day
Plus: higher limits or unlimited reasonable use
```

## Paid AI Features

Reserve expensive AI features for paid users:

- Full race reports
- Deep strategy review
- Saved notebooks
- Compare multiple races
- Advanced what-if analysis
- Downloadable reports

## Best Early Strategy

Start with:

- Deterministic dashboard for everyone.
- AI explanation buttons on cards.
- Cache AI responses.
- Add usage limits before launch.
- Add paid deeper reports after proving engagement.


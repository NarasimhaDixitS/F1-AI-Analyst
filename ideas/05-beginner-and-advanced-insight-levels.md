# Beginner And Advanced Insight Levels

## Concept

Let users choose how explanations are written.

New fans need simple explanations. Existing fans may want technical detail. The same data can support both if the explanation style changes.

## Suggested Levels

### Beginner

Plain-language explanations with minimal jargon.

Should explain F1 concepts inline:

- Undercut
- Overcut
- Safety car
- VSC
- Tyre degradation
- Track position
- Dirty air
- DRS

### Fan

Normal F1 fan explanation.

Can use common terms, but still keeps reasoning clear.

### Technical

More detailed analysis.

Can discuss:

- Sector deltas
- Stint length
- Pace trends
- Speed traces
- Braking zones
- Tyre offset
- Strategy tradeoffs

## UI Direction

Use a simple control:

```text
Explanation Level: Beginner | Fan | Technical
```

This can apply globally or per card.

## Example

Same tyre data, different explanations:

### Beginner

> Norris stayed out longer before changing tyres. That gave him more flexibility later, but older tyres usually lose grip, so he may have been slower before the pit stop.

### Technical

> Norris extended the first stint, likely prioritizing track position and a shorter final stint. The tradeoff is exposure to tyre degradation before the stop, especially if the medium compound dropped off sharply.

## Why This Matters

This is one of the clearest ways to serve both new and existing fans without building separate products.


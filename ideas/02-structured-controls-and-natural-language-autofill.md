# Structured Controls And Natural Language Autofill

## Concept

Use structured controls as the reliable primary input method, while keeping natural language as a smart shortcut.

The current app starts with natural language and tries to extract drivers, race, year, and session. That works as a prototype, but it can fail when the user phrases something unexpectedly or when AI extraction is unavailable.

## Recommended UX

Primary controls:

- Year dropdown
- Race dropdown
- Session dropdown
- Analysis mode selector
- Optional driver/team selectors depending on mode

Natural language input:

- Lets users type a question.
- Extracts likely fields.
- Prefills the structured controls.
- Lets the user review before analysis.

## Example

User types:

```text
Why was VER faster than HAM in Silverstone 2024 qualifying?
```

The app fills:

```text
Year: 2024
Race: British Grand Prix
Session: Qualifying
Mode: Head to Head
Driver 1: VER
Driver 2: HAM
```

The user can then hit Analyze.

## Backend Shape

Keep the natural-language endpoint:

```text
POST /api/analyze
{ "query": "Why was VER faster than HAM in Silverstone 2024 qualifying?" }
```

Add structured endpoints:

```text
POST /api/race
{
  "year": 2024,
  "race": "British Grand Prix",
  "session": "Race"
}
```

```text
POST /api/compare
{
  "year": 2024,
  "race": "British Grand Prix",
  "session": "Qualifying",
  "driver1": "VER",
  "driver2": "HAM"
}
```

## Why This Is Better

- Fewer failed queries.
- Easier validation.
- Easier caching.
- Better user discovery.
- AI becomes a convenience layer rather than a reliability dependency.


# FastF1 Performance And Caching

## Problem

FastF1 data loading can be slow, especially the first time a race/session is requested.

The current backend also loads the same session multiple times during one analysis request.

Example repeated loads:

- Compare drivers loads selected session.
- Results loads selected session.
- Race results loads Race.
- Head-to-head loads Qualifying and Race.
- Race timeline loads Race.
- Team battles loads Race.
- Race context loads Race and Qualifying.
- Speed trap loads selected session.
- Tyre strategy loads Race.

This can make one user request much slower than necessary.

## Recommended Solution

Use layered caching.

```text
Layer 1: FastF1 raw cache
Layer 2: in-memory loaded session cache
Layer 3: derived JSON cache
Layer 4: precomputed popular/latest races
```

## Step 1: Load Each Session Once Per Request

Create a request-level session registry:

```python
sessions = {
    "Race": loaded_race_session,
    "Qualifying": loaded_quali_session,
}
```

Then pass session objects to analysis functions instead of calling `load_session` repeatedly.

## Step 2: Cache Loaded Sessions In Memory

Use a process-level cache keyed by:

```text
year:race:session:weather
```

This helps repeated requests while the server is running.

## Step 3: Cache Derived JSON

Cache processed outputs such as:

```text
race_overview:2024:British Grand Prix:Race
strategy:2024:British Grand Prix:Race
h2h:2024:British Grand Prix:Qualifying:VER:HAM
telemetry:2024:British Grand Prix:Qualifying:VER:HAM
```

Start with local files or SQLite. Later use Redis/Postgres/object storage.

## Step 4: Precompute Race Weekends

Do not make users trigger every expensive load.

After each race, run a job that precomputes:

- Race overview
- Results
- Timeline
- Race context
- Tyre strategies
- Team battles
- Common head-to-head comparisons
- Latest race summary

## Step 5: Load Dashboard Cards Independently

Avoid one endpoint that loads everything.

Better endpoints:

```text
/api/race-overview
/api/results
/api/timeline
/api/strategy
/api/head-to-head
/api/telemetry
/api/explain-card
```

The frontend can show fast cards first and let heavier telemetry cards load later.

## Step 6: Background Jobs For Slow Uncached Requests

For slow first-time requests:

```text
User requests race
-> Backend returns job_id
-> Frontend shows card-level loading states
-> Cards appear as they finish
```

## Expected Impact

- Much faster repeat usage.
- Better perceived performance.
- Lower duplicate work.
- Easier scaling on the internet.


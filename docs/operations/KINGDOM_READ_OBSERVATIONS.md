# Read-only Kingdom observations

The Kingdom status page optionally shows local recent job records, peer recent
job records, and local/peer service record counts. These are bounded metadata
snapshots, not completed work, model availability, application correctness or
permissions to control services.

Only the Centipede host's verified local-admin GET proxy can access the new reads:

| Proxy suffix | Kingdom source | Projection |
| --- | --- | --- |
| `/orchestration/activity` | same path | Local recent job-record count |
| `/hierarchy` | same path | Current signed peer report job/service counts |
| `/service-nodes/discovery` | same path | Local service-record count and observation scope |

All suffixes are below `/api/v1/kingdom`. Upstream credentials stay server-side.
The server projects responses into `ObservationSummary`; it never forwards node
configuration, job prompts/answers/arguments, service names or worker/model labels
through these three routes. The broader `/orchestration` endpoint is excluded.
No programme endpoint, service action, grant, start/stop or update is added.

Local observation age is validated against Kingdom's upstream HTTP Date, never
against the Centipede host clock. Missing/invalid HTTP clock evidence is
unavailable. Peer freshness uses Kingdom receiver's `current`/stale assessment;
executor timestamps are not compared across computers. The browser stamps each
received summary on its own clock and expires it after 60 seconds; future receipt
times are rejected. Connection changes clear summaries and discard old reads.

Old observations, missing reports, invalid responses, denied access and older
Kingdom versions returning 404 show stale or unavailable rather than zero. An
explicitly observed empty list can show zero. Service discovery in
a container may be unsupported; this does not suppress valid peer activity.
Service counts cover the reported scope, which can be user services rather than
all system services. Counts marked `+` represent truncated source lists. Direct
backend/mobile connections do not acquire these optional proxy reads.

This source change does not update installed devices or satisfy graphical OS
installer acceptance gates.

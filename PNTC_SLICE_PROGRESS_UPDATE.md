# PNTC SLICE Progress — Update

*(Drop-in replacement for the "PNTC SLICE Progress" section of the group report —
the previous "Next Steps" list is now out of date, since the first three items on it
are done.)*

## Completed since last update

**Closed the loop between Anomaly Detection and Slicing (was the #1 item on our old
Next Steps list).** When the anomaly detector flags a switch, the dashboard now
automatically resolves the real host attached to it, checks whether that host belongs to
an existing slice, and installs a host-scoped OpenFlow DROP rule for just that host —
not the whole switch, so the rest of the slice keeps working. The result is verified by
reading the flow back from the controller, not just assumed. Ran this end-to-end against
a real synthetic attack (flood traffic → detected → host identified → drop rule installed
→ confirmed present on the switch) and it worked. If the controller isn't OpenDaylight
(e.g. ONOS is active), it fails and reports that honestly instead of pretending to block
anything — we don't have this wired for ONOS yet.

**Made the Intent Engine's reasoning visible.** The dashboard now shows, next to any
parsed sentence, exactly which words the keyword parser matched and the resulting policy
it compiled — so "is this really understanding language or just keyword matching" has a
visible, honest answer instead of a black box. While building this we also caught and
fixed a real bug: the parser's regex for "host 3" style hints was matching the bare
letter "h" inside ordinary words (e.g. "traffic **wit­h** 20000 Kbps" was silently
producing a phantom host). Fixed with a word-boundary check.

**Added a real enforcement-verification panel per slice.** Previously a slice showing
"Active" only meant the app's own local state said so. Now there's a "View Enforcement"
button that live-reads the actual flow table and, for low-latency slices, the actual OVS
queue/meter — and reports "not fully verified" if the live read doesn't back up the
claim, rather than always showing green.

**Fixed the OVS priority-queue bug the instructor flagged.** This was the main technical
gap: our QoS queue was being provisioned only on the host's own ingress port, but OVS's
`linux-htb` queues only affect *egress* traffic — so the queue we were creating had
**zero actual effect** on real traffic. Also, only a `min-rate` floor was ever set, no
`max-rate` ceiling. Both are fixed: we now provision the queue on every real egress
(uplink) port of the switch, with both a real floor and a real ceiling.

**Proved the fix with a real congestion test (per the instructor's testing-plan ask).**
Saturated the link with a 700 Mbit/s flood, then sent identical ping traffic marked
DSCP 46 vs. unmarked, concurrently, through the same congestion. Real measured result:

| | DSCP 46 (queued) | Unmarked |
|---|---|---|
| Packet loss | 10% | 25% |
| Avg RTT | 3292 ms | 3322 ms |

Honest read: the queue **does** meaningfully cut packet loss (less than half), but at
this level of oversubscription (~350× the queue's provisioned rate) it does **not**
meaningfully cut latency — the queue itself is full regardless of priority, so priority
only decides who gets dropped first, not how fast survivors move. We're reporting that
plainly rather than claiming a clean win on both metrics.

## Next Steps

- Re-run the congestion test at a more realistic oversubscription ratio (e.g. flood at
  3–5× the queue's rate instead of 350×) to see whether latency separation shows up more
  clearly under a load that resembles a real network rather than a worst-case flood.
- Extend closed-loop mitigation to ONOS (currently ODL-only by design).
- Auto-recovery: right now a resolved incident is only logged — the DROP rule still has
  to be removed manually. Automating that removal once a host is confirmed clean is next.
- Address the isolation gap the instructor pointed out: current isolation is QoS/DSCP-
  based only; add real hard isolation (VLAN/VXLAN segmentation) between slices so traffic
  from one slice genuinely can't reach another beyond just being deprioritized.
- Fix a persistence gap we found: OVS QoS queues can become orphaned (unreferenced by any
  live port) after the environment is rebuilt following a reboot, because nothing
  currently re-provisions QoS automatically after infrastructure changes. Currently
  cleaned up manually when noticed; needs an auto-heal step.

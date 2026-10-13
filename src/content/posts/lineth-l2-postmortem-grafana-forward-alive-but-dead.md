---
title: "Lineth L2 Lab Postmortems (4) - Alive but Dead: 12 Hours Without Grafana"
description: "A supervised kubectl port-forward lost its stream during a node memory stall and logged the same error 1,929 times over 12 hours. The process stayed alive, so its supervisor never restarted it. A Google SRE format postmortem on monitoring the monitoring, with the logs and a fix tested by injecting the failure."
pubDatetime: 2026-10-13T22:30:00+09:00
tags:
  - SRE Postmortem
  - SRE
  - Postmortem
  - Incident Response
  - Observability
  - Grafana
  - Kubernetes
  - macOS
---

*Part 4 of a series of postmortems from my Lineth L2 lab: one incident per failure type. [Part 3](/posts/lineth-l2-postmortem-startup-dns-peer-lost/) was startup order; this one is an observability failure: the system was fine, the view of it was not.*

The lab's Grafana runs inside the kind cluster. On the Mac it is reached at `127.0.0.1:23000` through a `kubectl port-forward` that launchd keeps running (`KeepAlive`), so it survives logouts and crashes. Format: the [Google SRE postmortem template](https://sre.google/sre-book/example-postmortem/), blameless.

## Summary

| | |
|---|---|
| Incident | INC-2026-10-11-09 |
| Status | Resolved |
| Severity | SEV-3: the operator's dashboards were gone for ~12 h; the system and its alert evaluation were fine |
| Impact | Grafana unreachable from 2026-10-11 12:06 to 2026-10-12 00:00 UTC; 1,929 failed requests in the forward's log |
| Trigger | A node memory stall (a prover peak took the kind node near zero free memory) broke the forward's connection to the API server |
| Root cause | The supervisor checked "is the process alive", not "does the forward work". A wedged `kubectl port-forward` never exits, so `KeepAlive` never fired |
| Resolution | A wrapper under launchd that health-checks Grafana *through* the forward and exits after 3 failures, so launchd starts a fresh one. Tested by freezing the forward on purpose |

## Impact

| what | how much |
|---|---|
| Grafana at `127.0.0.1:23000` | unreachable ~12 h |
| Not affected | the Grafana pod (0 restarts, Ready), Prometheus, Loki, Tempo, alert evaluation |

**Error budget.** None: no SLO covers the operator's tooling. That is the point of this postmortem. During those 12 hours, anyone opening a dashboard to check on the system would have had nothing to look at, and nothing said so.

## Root causes and trigger

**Trigger.** At 12:00 and 12:05 UTC the prover hit two large-mode memory peaks (the trace-limit problem from [Part 2](/posts/lineth-l2-postmortem-prover-trace-limit-host-memory/), not yet found then). The kind node's available memory fell to 0.45 and 0.68 GiB; kubelet lease renewals timed out and containerd streams failed. The port-forward lost its stream one minute later. Its log (klog timestamps are local time, UTC+9):

```text
E1011 21:06:05.252894 24120 portforward.go:455] "Unhandled Error" err="error creating error stream for port 23000 -> 3000: Timeout occurred"
E1011 21:06:37.172643 24120 portforward.go:455] "Unhandled Error" err="error creating error stream for port 23000 -> 3000: Timeout occurred"
E1011 21:07:10.155332 24120 portforward.go:455] "Unhandled Error" err="error creating error stream for port 23000 -> 3000: Timeout occurred"
E1011 21:08:46.148072 24120 portforward.go:478] "Unhandled Error" err="error creating forwarding stream for port 23000 -> 3000: Timeout occurred"
```

and then the same error on every request: **1,929** lines over 12 hours.

**Root cause: liveness instead of function.** `kubectl port-forward` does not exit when its API server connection breaks this way. It keeps the local port open, accepts each connection, fails to open a stream, logs an error, and waits for the next one. launchd's `KeepAlive` restarts a job only when its process *exits*. The process never exited, so from launchd's view everything was fine.

This is the same shape as two other incidents in the lab: an RPC node that was up with zero peers ([Part 3](/posts/lineth-l2-postmortem-startup-dns-peer-lost/)), and a consensus client that was up with a full Java heap. In each case, "the process is running" was true and useless.

## Resolution

launchd now runs a small wrapper instead of `kubectl` directly. It starts the forward, checks Grafana's health endpoint *through the forward* every 30 s, and exits after three failures in a row so launchd starts a fresh one:

```bash
"$HOME/.local/bin/kubectl" --kubeconfig "$HOME/.kube/lineth-local.yaml" --context kind-lineth-local \
  -n monitoring port-forward service/monitoring-grafana "$PORT:80" --address=127.0.0.1 &
pf=$!
trap 'kill -9 $pf 2>/dev/null' EXIT
sleep 10
fails=0
while kill -0 "$pf" 2>/dev/null; do
  if curl -sf -o /dev/null -m 5 "http://127.0.0.1:$PORT/api/health"; then fails=0; else fails=$((fails + 1)); fi
  if [ "$fails" -ge 3 ]; then
    echo "$(date -u +%FT%TZ) grafana-forward: health check failed 3x, exiting so launchd restarts it" >&2
    exit 1
  fi
  sleep 30
done
```

**Tested by injecting the failure, not by restarting.** A restart only proves the happy path. Instead, the forward was frozen with `kill -STOP` on the `kubectl` child at 00:01:39, which reproduces "alive but not forwarding". The wrapper gave up after three failed checks and launchd brought up a new forward:

```text
2026-10-12T00:03:17Z grafana-forward: health check failed 3x, exiting so launchd restarts it
```

`127.0.0.1:23000` answered 200 again right after.

## Detection

| | time (UTC) |
|---|---|
| Forward breaks | 10-11 12:06:05 |
| Noticed (a new helper script got HTTP 000 from 23000) | ~10-11 23:50 |
| Root-caused | 10-11 23:59 |
| Fixed and verified | 10-12 00:03:17 |

Nothing watched the local port, so detection depended on someone opening Grafana. Detection took ~12 h; once someone looked, the fix took ~13 minutes.

## Lessons learned

**What went well**
- The fix was verified by causing the exact failure (`SIGSTOP`), not by a restart that would have passed with the old setup too.
- The old launchd definition was backed up before it was replaced.

**What went wrong**
- A supervisor that checks liveness instead of function gave false confidence for 12 hours.
- Nothing monitored the operator's own access path.
- The trigger (prover memory peaks starving the node) was the same as in two other incidents that week and had not been fixed yet.

**Where we got lucky**
- Nothing else was going wrong during those 12 hours. Alert evaluation runs inside the cluster and kept working, so the system was not unmonitored, only unviewable.

## Action items

| # | action | type | status |
|---|---|---|---|
| 1 | Health-checked forward wrapper under launchd | mitigate | done |
| 2 | Remove the trigger: node memory headroom for the prover | prevent | done (Part 2: normal-mode batches, VM sized for the host) |
| 3 | Ad-hoc port-forwards can wedge the same way: kill and re-create rather than trust an existing one | process | documented |
| 4 | Monitor the operator path itself: alert when the local Grafana endpoint stops answering, not only when the process exits | detect | open |

## Timeline (UTC)

| time | event |
|---|---|
| 10-11 12:00, 12:05 | Prover large-mode memory peaks; node MemAvailable 0.45 / 0.68 GiB |
| 10-11 12:06:05 | First `error creating error stream for port 23000 -> 3000: Timeout occurred` |
| 10-11 12:06 – 10-12 00:00 | 1,929 identical errors; the process stays alive, launchd sees nothing |
| 10-11 ~23:50 | A new query helper gets HTTP 000 from 23000 |
| 10-11 23:59 | Root cause: launchd job alive, forward wedged |
| 10-12 00:01:39 | Wrapper deployed; failure injected with `kill -STOP` on `kubectl` |
| 10-12 00:03:17 | Wrapper exits after 3 failed checks; launchd starts a new forward; 23000 → 200 |

## Takeaways

- **Supervise the function, not the process.** "Restart if it exits" is not enough for anything that can hang. Check the thing users actually use, from where they use it.
- **Test a recovery mechanism by causing the failure it is for.** `kill -STOP` turns "process alive, work stopped" into a one-line test.
- **Monitor the monitoring path.** Dashboards, forwards, alert routes: if the view of the system can fail silently, it eventually will, right when you need it.

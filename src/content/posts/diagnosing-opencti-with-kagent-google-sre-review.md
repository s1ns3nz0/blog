---
title: "Diagnosing OpenCTI with Kagent (5) - Reviewing the Setup Against Google SRE"
description: I reviewed the L402 payment gate's monitoring and on-call agent against the Google SRE Book and Workbook. Eight practices, what the review found, what changed, and the gaps that are still open.
pubDatetime: 2026-09-30T20:50:00+09:00
tags:
  - AI
  - Kagent
  - Kubernetes
  - SRE
  - SLO
  - Prometheus
  - Grafana
  - Incident Response
  - Playbook
  - L402
  - Aperture
---

*Part 5 of the series. [Part 4](/posts/rehearsing-incidents-with-an-llm-agent/) rehearsed incidents against the agent and found gaps in my own alerts. This part takes those findings further.*

After the first rehearsal, I reviewed the whole setup around the L402 payment gate against the Google SRE Book and Workbook: the playbooks, alerts, dashboard, agent, and the way it's all tested.

For each practice below: what Google recommends, what the review found, what I changed, and the result. Findings are numbered F1 to F10 as they came up in the review.

One caveat up front: this is not a live service. It runs in a rehearsal lab with synthetic traffic and no customers, so a lot still needs work before it would hold up in production, especially the numbers. The SLO target, the error budget, and the burn-rate thresholds below are standard starting points checked with real arithmetic, but they haven't been tuned against real traffic, and the lab's own availability figures mean little because every drill breaks something on purpose.

## 1. Playbooks: mitigate first, find the root cause later

**Google SRE.** A playbook should help the on-call engineer stop the customer impact first and debug second. Every alert should link to one.

**Found.** My documents were step lists ordered around debugging. They had no impact assessment and no mitigation step, and the alerts didn't link to them.

**Changed.**

- Both documents were rewritten as playbooks in Google's order: impact → mitigate first → triage → diagnose → fix and verify → escalate → limits → worked examples.
- Every alert now carries a `runbook_url`.
- The vocabulary is fixed: a playbook is for judgment, a runbook is fixed steps.
- Tests keep the tool output and the playbook text in sync, so the agent can't be told about a field the tool no longer returns.

## 2. What changed? Most outages come from changes

**Google SRE.** Check recent changes first. Rolling back is the safest general mitigation.

**Found (F1, F2).** The agent could see that a workload was broken, but not what had changed recently. The playbooks never offered rollback.

**Changed.**

- The workload tool from [Part 2](/posts/diagnosing-opencti-with-kagent-tools/) now reports each Deployment's revision, images, and last change time, plus a list of changes in the last 6 hours.
- Both playbooks start triage with "What changed recently?" and list rollback as an approved mitigation.

## 3. SLOs and burn-rate alerting

**Google SRE.** Alert on symptoms tied to an SLO, using multiwindow, multi-burn-rate alerts. For low-traffic services, add synthetic probes.

**Found (F3).** In a drill, my counter-based alert took 16 minutes to fire. Traffic was so low that older successes kept the 15-minute window looking healthy.

**Changed.**

- A blackbox probe checks every component on the payment path once a minute.
- A 99.5% SLO is defined on that probe.
- Two alerts follow Google's multiwindow pattern:

| Alert | Burn rate | Windows | Action |
|---|---:|---|---|
| Fast burn | 14.4× | 1 h and 5 m | Page |
| Slow burn | 6× | 6 h and 30 m | Ticket |

The long window shows the budget is really burning; the short window makes the alert stop soon after recovery.

**Result.** Measured in a rehearsal, detection went from 16 min 22 s to 5 min 14 s.

### SLI, SLO, and SLA in numbers

**SLI: what is measured.**

| SLI | Definition | Used for |
|---|---|---|
| Component health probe (main) | Every 60 s, the blackbox exporter checks 3 components. A minute counts as good only if all 3 pass: `l402_probe:up = min(probe_success)` | SLO and alerts |
| Real-traffic invoice success | Invoices issued vs requests without a token (Aperture counters) | Reporting only, no target: too noisy at low traffic |

The three probe checks:

- `pricer`: `GET payment-aperture-services:8090/health` returns 200.
- `lnd_merchant`: `GET https://lnd-merchant:8080/v1/state` returns `SERVER_ACTIVE`.
- `aperture`: a TCP connection to `l402-aperture:8081` succeeds.

**SLO: the target.**

| Item | Value |
|---|---|
| Target | 99.5% probe availability |
| Window | Rolling 30 days |
| Error budget | 0.5% = 216 minutes (3.6 h) of downtime per 30 days |
| Why not 99.9% | At 60 probes an hour, a single failed probe would page. Too sensitive for a single-replica MVP |

The 99.9% point is plain arithmetic. With a 0.1% budget, the fast-burn threshold is 14.4 × 0.1% = 1.44% errors over an hour. One failed probe out of 60 is already 1.67%.

**Alerts on the budget.** The burn rate is how many times faster than allowed the budget is being spent. At a burn rate of 1, the budget lasts exactly 30 days.

| Alert | Condition | Error ratio | What it means | Severity |
|---|---|---|---|---|
| `ProbeFastBurn` | Burn ≥ 14.4 over 1 h and 5 m | ≥ 7.2% | 2% of the monthly budget gone in 1 hour; a full outage pages in about 5 min | Critical (page) |
| `ProbeSlowBurn` | Burn ≥ 6 over 6 h and 30 m, for 5 m | ≥ 3% | 5% of the budget gone in 6 hours; a persistent partial failure | Warning (ticket) |
| `ProbeAbsent` | No probe data for 10 m | — | Unobserved, which is not the same as healthy | Warning |

The 14.4 and 6 multipliers and the 1 h + 5 m and 6 h + 30 m windows are the Google SRE Workbook's standard multiwindow numbers. They're a starting point, not values tuned for this service.

**SLA: the promise to customers.** None is defined. An SLA is a contract with customers, with refunds or credits if it's missed. That's a business decision, not something monitoring sets, and OpenCTI is still an MVP with no customer contract. When one comes, the SLA should be looser than the SLO, for example an SLA of 99.0% against an SLO of 99.5%, so internal alerts fire well before a contract is breached.

**The lab's current numbers.**

| Metric | Value |
|---|---|
| Probe availability | 86.6% (about 11 h of lab history, not 30 days) |
| Error budget remaining | −2,576% (about 26× overspent) |

That's expected in the lab, where every drill breaks something on purpose. In production, a single incident like drill 2, about 26 minutes down, would use 12% of the monthly budget. These figures show the arithmetic works; they say nothing yet about how the service would do under real load.

## 4. No data is not healthy

**Google SRE.** Missing monitoring data must never look like success.

**Found.** If metrics stopped arriving, the verdict could read as "quiet" rather than "unobserved".

**Changed.**

- Alerts fire when Aperture metrics or probe data are absent.
- The agent reports `unknown` instead of healthy, and the playbook explains every `unknown` reason.

This extends a rule from Part 2, where the tool code already refused to treat a failed lookup as healthy.

## 5. Dashboards that follow the debugging path

**Google SRE.** A dashboard should answer the on-call engineer's questions in order, and show the same signals the alerts use.

**Found (F9).** There was no dashboard for the payment gate, only raw queries.

**Changed.**

- A Grafana dashboard laid out in triage order: Is it up? → Funnel → Security signal → Is it observed?
- It uses exactly the same queries as the agent and the alerts, and a test enforces that. The human, the agent, and the alert always see the same numbers.

## 6. Practice: Wheel of Misfortune

**Google SRE.** On-call engineers train on role-played incidents before they face real ones.

**Found.** There was no safe place to practise, and no way to check whether the agent followed the playbook.

**Changed.**

- A local rehearsal lab injects real faults: a crash-looping pricer, invoice failures, rejection spikes, missing metrics.
- A drill guide and a scorecard.

**Result.** The first drill found 13 problems in the tooling and the agent, and they were fixed. [Part 4](/posts/rehearsing-incidents-with-an-llm-agent/) walks through that drill.

## 7. Test the monitoring like code

**Google SRE.** Alert rules and automation must be tested, not trusted.

**Found.** The agent's answers were judged by eye, and invented components and numbers went unnoticed.

**Changed.**

- Alert rules are unit-tested with Prometheus's own test tool, including how long they take to fire.
- An evaluation harness grades the agent automatically over 5 scenarios × 5 runs, and the grader is itself tested against labelled examples.

**Result.** The pass rate went from 47% to 72–80%.

The lesson: at this model size, putting facts into the tool output worked better than adding rules to the prompt.

## 8. Safe automation

**Google SRE.** Automation must be bounded, and a human stays in control of risky actions.

This one was already in place, and the review kept and strengthened it:

- The agent is read-only: allowlisted queries, a narrow Kubernetes Role, and a restricted NetworkPolicy, as covered in [Part 2](/posts/diagnosing-opencti-with-kagent-tools/) and [Part 3](/posts/diagnosing-opencti-with-kagent-access-control/).
- It names the approval each suggested action needs, and never claims to have acted.

## Found in the review, not fixed yet

| Google SRE practice | Gap |
|---|---|
| Pages must reach a human (F8) | Critical alerts reach only the Alertmanager UI; nobody is notified. Top priority. |
| Four golden signals (F4, F5) | No latency or HTTP error metrics for Aperture |
| Incident management (F6) | No criteria for declaring an incident, and no roles |
| Blameless postmortems (F7) | No trigger criteria or template |
| Escalation paths (F10) | "Escalate" has no destination |
| Error budget policy | The budget is measured, but nothing says what happens when it runs out |

F8 comes first. A fast-burn page that nobody receives only makes the detection time look good on paper.

## Summary

Following Google SRE practice, I reworked the documentation, detection, dashboard, practice, and testing around the payment gate. Detection went from 16 minutes to 5, and the agent's accuracy is now measured instead of eyeballed, and higher.

What's left is the human side of incident response: notification, roles, postmortems, and escalation.

Next: [Diagnosing OpenCTI with Kagent (6) - Drill 2: Invoice Failure After the SRE Upgrades](/posts/diagnosing-opencti-with-kagent-drill-2/)

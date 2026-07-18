---
title: CACAO Playbook
description: Standarize and represent incident response workflow as JSON 
pubDatetime: 2026-07-19T01:29:45+09:00
tags:
  - CACAO Playbook
  - OASIS
  - SOC
featured: true
---
A **CACAO Playbook** generally refers to the **OASIS CACAO Security Playbooks** standard in the cybersecurity field.

CACAO stands for **Collaborative Automated Course of Action Operations**. It is a standard designed to represent incident-response procedures in a structured format that computer systems can interpret, exchange, and execute, rather than leaving them only as human-readable documents.

## Table of contents


## 1. What Is a CACAO Playbook?

Security teams often maintain response procedures such as:

> When a phishing email is detected, verify the sender, analyze the attachment, quarantine the message if it is malicious, lock the affected account, and notify the security administrator.

Traditional security playbooks are usually written as Word documents, wiki pages, PDFs, or checklists. The problem is that security systems cannot directly execute these documents, and each organization may describe its procedures differently.

CACAO converts these procedures into a standardized structure that can be:

* Represented in a predefined data model
* Stored and exchanged in JSON format
* Organized into sequential, conditional, parallel, and iterative workflows
* Used for both human approval and automated actions
* Understood by different organizations and security products

A CACAO Playbook is therefore more than a simple response manual. It is better understood as a **machine-readable blueprint for a cybersecurity response workflow**.

## 2. Why Is CACAO Needed?

### Problems with Traditional Playbooks

Organizations often use different formats for their security playbooks:

* Company A uses Word documents.
* Company B uses workflows built into a SOAR platform.
* Company C uses Python scripts.
* Company D uses checklists in a ticketing system.

As a result, transferring a playbook between organizations or security products can be difficult. Organizations may also become dependent on a specific SOAR platform or vendor-specific format.

CACAO aims to address these problems.

### Interoperability

Different security products and organizations can understand the same playbook structure.

### Automation

SOAR platforms, EDR products, firewalls, IAM systems, and other tools can automate tasks that security analysts would otherwise perform manually.

### Reusability

A response procedure can be reused in different environments or adapted to similar incident types.

### Auditability

It becomes easier to record and review which actions were performed, when they were performed, and who or what performed them.

### Knowledge Sharing

Incident-response expertise can be preserved as a standardized organizational asset instead of remaining only as the personal knowledge of experienced analysts.

CACAO provides a common, machine-processable schema for exchanging and orchestrating cybersecurity operations.

## 3. Core Components of a CACAO Playbook

A CACAO Playbook typically consists of the following major components.

### 3.1 Metadata

Metadata describes the playbook itself.

Examples include:

* Playbook name
* Description
* Author
* Creation and modification dates
* Version
* Incident type
* Severity
* Applicable industry or environment
* Initial workflow step
* Distribution and sharing restrictions

Metadata helps organizations understand the purpose, scope, ownership, and potential impact of a playbook.

### 3.2 Workflow Steps

Workflow steps define the actual response procedure.

Common step types include:

* Start step
* Action step
* Condition step
* Parallel-processing step
* Iteration step
* Waiting step
* Approval or manual-processing step
* End step

CACAO can represent control logic similar to that used in programming languages.

```text
IF the file is malicious:
    Isolate the host
    Disable the user account
ELSE:
    Record the analysis result
END
```

A CACAO Playbook can express sequential processing, conditional branching, repetition, parallel execution, and other workflow logic.

### 3.3 Commands

Commands define the actions that must be performed at each step.

Examples include:

* Block an IP address
* Disable a user account
* Quarantine an email
* Run an EDR scan
* Add a firewall rule
* Delete a malicious file
* Create an incident ticket
* Send a Slack or email notification
* Submit a file to a malware sandbox

Commands may be expressed in formats appropriate for a particular execution environment, such as:

* HTTP API calls
* Bash commands
* PowerShell
* Python
* Ansible
* SOAR-specific commands

### 3.4 Targets

Targets identify where or to whom a command should be applied.

Examples include:

* A specific server
* An endpoint
* A firewall
* An email-security system
* An IAM platform
* A cloud account
* A security analyst
* An external sandbox service

A command describes **what should be done**, while a target describes **where the action should be performed or who should perform it**.

### 3.5 Agents

Agents are the entities that execute or relay commands.

Examples include:

* A SOAR platform
* A security-automation agent
* An EDR management server
* A cloud-automation system
* A security analyst

Agents and targets may refer to authentication objects when access to an external system requires credentials.

### 3.6 Variables

Variables store data used during playbook execution.

For example:

```text
suspicious_ip = 203.0.113.10
user_account = employee01
incident_id = INC-2026-00124
malware_hash = abcdef...
```

Variables allow the output of one step to be passed to later steps.

For example, a threat-intelligence lookup may produce a risk score that is subsequently used by a condition step.

### 3.7 Authentication Information

Authentication information represents the credentials or authorization details required to access APIs, servers, or security devices.

Examples include:

* API tokens
* Usernames
* Certificates
* OAuth information
* References to secret keys

For security reasons, actual secret values should generally not be embedded directly in the playbook. Instead, the playbook should refer to a secure credential or secrets-management system.

### 3.8 Data Markings

Data markings specify how widely a playbook and its contents may be shared.

Examples include:

* Internal use only
* Shareable with partner organizations
* Publicly shareable
* Restricted to a specific department
* Restricted according to the Traffic Light Protocol, or TLP

This is important because incident-response procedures and indicators of compromise may contain sensitive operational information.

### 3.9 Extensions

Extensions allow organizations or vendors to add capabilities that are not included in the core CACAO specification.

For example, an organization may define an extension object for a command that is supported only by its internal security platform or a particular SOAR product.

The major CACAO components can therefore be summarized as metadata, workflow steps, commands, targets, agents, variables, authentication information, data markings, and extensions.

## 4. Simple Operational Example

A suspicious-login response playbook might look like this:

```text
Start
  ↓
Collect suspicious login event
  ↓
Check the user and IP reputation
  ↓
[Condition]
Is the risk score 80 or higher?
  ├─ No → Record the event → End
  └─ Yes
       ↓
     Terminate active user sessions
       ↓
     Temporarily lock the account
       ↓
     Request identity verification from the user
       ↓
     Create a security-team ticket
       ↓
     Wait for administrator approval
       ↓
     Restore or permanently block the account
       ↓
     End
```

This workflow combines automation with human judgment.

* IP reputation lookup: automated
* Session termination: automated
* Account locking: automated or approval-based
* Permanent account blocking: security-administrator approval
* User verification: manual or integrated with an identity-verification system

An important characteristic of CACAO is that it does not require every action to be fully automated. Human-approval steps can be inserted before high-risk operations.

## 5. What Does the JSON Structure Look Like?

The following is a highly simplified example intended only to illustrate the general structure. The actual CACAO 2.0 specification contains additional fields and more rigorous object requirements.

```json
{
  "type": "playbook",
  "name": "Suspicious Login Response",
  "description": "Protects an account after a suspicious login is detected",
  "workflow_start": "step--start",
  "workflow": {
    "step--start": {
      "type": "start",
      "on_completion": "step--check-risk"
    },
    "step--check-risk": {
      "type": "action",
      "name": "Check risk score",
      "on_completion": "step--decision"
    },
    "step--decision": {
      "type": "condition",
      "condition": "risk_score >= 80",
      "on_true": "step--disable-account",
      "on_false": "step--log-event"
    },
    "step--disable-account": {
      "type": "action",
      "name": "Temporarily disable account",
      "on_completion": "step--notify"
    },
    "step--notify": {
      "type": "action",
      "name": "Notify security team",
      "on_completion": "step--end"
    },
    "step--log-event": {
      "type": "action",
      "name": "Record event",
      "on_completion": "step--end"
    },
    "step--end": {
      "type": "end"
    }
  }
}
```

Each step has a unique identifier and refers to the next step or to different branches based on a condition. The playbook therefore represents the overall process as a directed workflow graph.

## 6. Relationship Between CACAO and SOAR

CACAO and SOAR are related, but they are not the same thing.

| Category          | CACAO                              | SOAR                                             |
| ----------------- | ---------------------------------- | ------------------------------------------------ |
| Nature            | Standard and data model            | Security-operations product                      |
| Role              | Represents and exchanges playbooks | Executes and manages playbooks                   |
| Example           | Standardized JSON playbook         | Cortex XSOAR, Splunk SOAR, and similar platforms |
| Primary goal      | Interoperability                   | Automation and orchestration                     |
| Vendor dependency | Designed to reduce dependency      | May depend on product-specific functionality     |

A useful analogy is:

* CACAO is the standardized musical score.
* SOAR is the musician or system that performs the score.

A SOAR engine that supports CACAO may import a standardized playbook and execute it after mapping it to the organization’s environment.

In practice, however, different platforms may support different parts of the specification or rely on proprietary extensions. Full compatibility is therefore not always guaranteed.

## 7. Difference Between CACAO and STIX

CACAO is frequently discussed alongside STIX.

### STIX Describes Threat Intelligence

STIX can represent information such as:

* Malicious IP addresses
* File hashes
* Threat actors
* Campaigns
* Malware
* Attack techniques

### CACAO Describes the Response

CACAO can represent actions such as:

* Block the IP address
* Isolate the host
* Lock the account
* Collect evidence
* Notify an administrator

The distinction can be summarized as follows:

```text
STIX = What is the threat?
CACAO = What should be done about the threat?
```

For example, a malicious IP address received as a STIX object could be passed into a CACAO Playbook as an input variable and then blocked through a firewall action.

## 8. Common Use Cases

### Phishing Response

* Analyze email headers
* Analyze URLs and attachments in a sandbox
* Quarantine malicious messages
* Search for and remove identical messages
* Investigate affected user accounts
* Share indicators of compromise

### Ransomware Response

* Isolate infected hosts from the network
* Run EDR scans
* Terminate malicious processes
* Collect file hashes
* Block access to shared folders
* Check backup status
* Activate the incident-response team

### Account-Takeover Response

* Review login history
* Terminate active sessions
* Reset the password
* Re-register multifactor authentication
* Review permission changes
* Restore the account after administrator approval

### Malicious-IP Response

* Query threat-intelligence services
* Search internal network logs
* Block the IP address on firewalls and proxies
* Investigate related assets
* Verify that the block was successfully applied

### Cloud-Incident Response

* Disable access keys
* Modify IAM policies
* Isolate cloud instances
* Collect logs and snapshots
* Apply temporary security groups
* Create a forensic-analysis environment

## 9. How to Create a CACAO Playbook

A practical implementation process may follow these steps.

### Step 1: Define the Incident Scenario

For example:

```text
Target scenario: Execution of a phishing attachment
Trigger: Malicious process detected by EDR
Objective: Isolate the host and protect the account within 10 minutes
```

### Step 2: Break Down the Existing Response Procedure

Divide the current procedure into small, individual tasks.

```text
Review alert
→ Identify asset
→ Confirm malicious activity
→ Isolate host
→ Lock account
→ Collect evidence
→ Report incident
```

### Step 3: Classify the Automation Level

Each task can be categorized as:

* Fully automated
* Conditionally automated
* Automated after approval
* Manual
* Not suitable for automation

### Step 4: Define Inputs and Outputs

Specify what each step receives and what it produces.

```text
Inputs: Host ID, user ID, and file hash
Outputs: Analysis result, risk score, and isolation status
```

### Step 5: Define Conditions and Exceptions

The playbook should include failure paths as well as the normal path.

```text
If EDR isolation fails:
1. Block the host IP address at the firewall.
2. Create an urgent ticket for the network-operations team.
3. Request manual intervention from an analyst.
```

### Step 6: Convert the Procedure into CACAO Objects

The playbook should then be expressed through:

* Metadata
* Workflow steps
* Commands
* Targets
* Agents
* Variables
* Authentication information
* Data markings

### Step 7: Validate and Test the Playbook

At a minimum, verify the following:

* Is the schema valid?
* Are all workflow steps connected?
* Could an infinite loop occur?
* Does an end step exist?
* Are variable types consistent?
* Is there an alternative path when an action fails?
* Do high-risk actions require approval?

### Step 8: Apply Version Control

Playbooks should be managed in a similar way to software code.

```text
v1.0: Initial release
v1.1: Added EDR-isolation failure handling
v1.2: Added cloud-account response actions
v2.0: Updated for the organization’s new IAM system
```

## 10. Advantages

### Reduced Vendor Dependency

A standardized playbook is easier to transfer between platforms than a workflow written only in a vendor-specific SOAR format.

### Consistent Incident Response

CACAO helps reduce differences in response quality between individual analysts.

### Less Repetitive Work

Repeated tasks such as lookups, blocking, isolation, and ticket creation can be automated.

### Faster Response

Initial containment actions can be performed within seconds or minutes.

### Preservation of Organizational Knowledge

The expertise of experienced analysts can be documented and reused across the organization.

### Easier External Sharing

Playbooks can potentially be shared more efficiently among managed security service providers, subsidiaries, partner organizations, and industry information-sharing groups.

## 11. Limitations and Considerations

Implementing CACAO does not automatically produce a complete security-automation environment.

### An Execution Engine Is Required

CACAO primarily defines how a playbook is represented. A CACAO-compatible interpreter, SOAR platform, or conversion layer is required to execute it.

### Product-Specific Command Mapping

The concept of “isolate the host” may be consistent, but each security product uses a different API.

For example:

```text
CrowdStrike API
Microsoft Defender API
SentinelOne API
Internal EDR API
```

An adapter is therefore needed between the standardized playbook and the actual product commands.

### Automation Risk

Incorrect conditions may cause damaging actions, such as:

* Locking large numbers of legitimate accounts
* Disconnecting production servers
* Deleting legitimate files
* Applying incorrect firewall rules

High-risk commands should include approval steps, target restrictions, validation controls, and rollback procedures.

### Limited Graphical Modeling Support

CACAO provides a machine-readable workflow structure, but the core specification itself does not necessarily provide a convenient graphical notation for process design.

For this reason, researchers and tool developers have explored ways to connect CACAO with graphical process-modeling approaches such as BPMN.

### Organizational Processes Must Be Defined First

If the existing response process is unclear or differs from one analyst to another, automating it may only execute confusion more quickly.

Organizations should first standardize their incident-response procedures and then represent them in CACAO.

## 12. Recent Technical Trends

Recent research has explored using large language models to analyze natural-language playbooks written in Word, PDF, or other document formats and convert them into CACAO-compatible structures.

The main challenge is not simply generating syntactically valid JSON. The converted playbook must accurately preserve:

* Execution order
* Conditional branches
* Inputs and outputs
* Dependencies between steps
* Human-approval requirements
* Failure and exception paths

There is also growing interest in tools that support the creation, storage, discovery, version management, testing, and execution-history tracking of CACAO Playbooks.

## Summary

A **CACAO Playbook is an OASIS cybersecurity standard that represents incident-response procedures as standardized, JSON-based workflows so that they can be shared, interpreted, and automated across different organizations and security products.**


---
title: NIST SP 800-218(SSDF)
description: Secure Software Development Framework enhanced by Software Supply Chain Attack.
pubDatetime: 2026-07-20T18:08:24+09:00
tags:
  - SSDF
  - NIST
  - NIST SP 800-218
  - DevSecOps
featured: true
---

Due to numerous successful attacks through the supply chain, the U.S.government issued an order establishing new requirements for secure software development. NIST had already been developing a secure software development framework by that time, and this order accelerated and enhanced that publication, with a specific focus on supply chain security

## Table of contents

## How to Integrate Security with your develope pipeline?
When an organization is asked to improve software security, one of the first actions it often takes is to introduce security tools such as SAST, DAST, and SCA. The organization then adds scanning stages to its CI/CD pipeline and configures the build to fail when high-severity vulnerabilities are detected.

These measures are certainly necessary, but they are not enough to establish a secure software development practice.

Vulnerable code is not produced repeatedly simply because an organization lacks security scanners. The underlying causes may include undefined security requirements, missing threat analysis during design, excessive permissions in development and build environments, unverified third-party package provenance, or a failure to incorporate lessons from recurring vulnerabilities into development standards.

NIST Special Publication 800-218, the **Secure Software Development Framework**, or **SSDF**, provides a framework for addressing these problems throughout the software development lifecycle.

SSDF does not require organizations to adopt a new development methodology. Instead, it provides a common set of practices that can be integrated into existing Agile, Scrum, DevOps, and CI/CD processes. It also helps organizations identify gaps in their current software development practices.

This article examines the four SSDF practice groups from the perspective of developers, DevSecOps engineers, application security engineers, and security architects. It also explains how these practices can be applied to real-world development and deployment pipelines.

## SSDF Is Not a List of Security Tools

The first thing to understand about SSDF is that it is not a standard that mandates specific security products or implementation technologies.

For example, SSDF does not require organizations to use a particular static analysis tool, adopt a specific CI/CD platform, or deploy applications on Kubernetes.

Instead, it focuses on security outcomes such as the following:

* Are software security requirements clearly defined?
* Are development environments and build systems adequately protected?
* Can the organization trace the provenance and modification history of software components?
* Are vulnerabilities prevented and detected during design and implementation?
* Can the organization respond effectively to vulnerabilities discovered after release?
* Are root causes analyzed and incorporated into development process improvements?

Organizations may choose the technologies and procedures that best fit their environment to achieve these outcomes.

An organization using GitHub Actions may implement the practices differently from one using Jenkins. Similarly, the required controls may differ between a monolithic application and a microservices-based platform.

SSDF should therefore be used as a framework for identifying missing security activities rather than as a way to standardize every implementation detail.

## The Four SSDF Practice Groups

SSDF v1.1 organizes secure software development practices into four groups:

* **PO: Prepare the Organization**
* **PS: Protect the Software**
* **PW: Produce Well-Secured Software**
* **RV: Respond to Vulnerabilities**

These groups should not be treated as isolated, sequential phases. They form an interconnected operating model.

The PO group establishes organizational policies, responsibilities, and development environments. The PS group protects source code and build artifacts. The PW group covers secure design, implementation, and verification. Finally, the RV group feeds lessons from operational vulnerabilities back into the development process.

## PO: Prepare the Organization

The PO group focuses on preparing the people, processes, and technologies required to develop secure software.

For a secure development program to operate effectively, every team must understand which security activities it is responsible for. If the organization depends entirely on individual developer experience or manual reviews by the security team, security quality will vary significantly across projects.

### Define Security Requirements Before Writing Code

Security requirements should not be treated as items to inspect after development is complete. They should be defined alongside functional requirements.

For example, a functional requirement for an authentication feature might state:

> Users must be able to sign in using their email address and password.

That requirement alone is insufficient. It should be accompanied by security requirements such as:

* Passwords must be stored using an approved one-way password hashing algorithm.
* The number of failed sign-in attempts must be limited.
* Multi-factor authentication must be required for administrator accounts.
* User sessions must have defined expiration periods.
* Authorization checks must be performed on the server side.
* Successful and failed authentication events must be recorded in audit logs.
* Error messages must not reveal whether a user account exists.

These requirements can be managed as security acceptance criteria within user stories or through a separate security requirements template.

### Clearly Define Roles and Responsibilities

Secure software development is not solely the responsibility of the application security team.

Developers are responsible for secure implementation and vulnerability remediation. Platform teams are responsible for protecting CI/CD and build environments. Security teams establish standards, verification processes, and supporting policies. Product owners participate in risk acceptance and prioritization decisions.

A practical division of responsibilities may look like this:

| Role                    | Primary Responsibilities                                                                  |
| ----------------------- | ----------------------------------------------------------------------------------------- |
| Developer               | Implement security requirements, perform code reviews, remediate vulnerabilities          |
| Technical Lead          | Review security design, request exceptions, prioritize remediation                        |
| Application Security    | Define standards, support threat modeling, manage tool policies, validate vulnerabilities |
| Platform or DevOps Team | Protect repositories, CI/CD systems, build environments, and deployment infrastructure    |
| Product Owner           | Evaluate business risk and prioritize security requirements                               |
| Operations Team         | Perform monitoring, patching, deployment, and incident response                           |

When responsibilities are unclear, teams may lose valuable time determining who owns remediation and who has the authority to approve risk exceptions.

### Standardize Secure Development Environments

The development environment includes source code repositories, developer workstations, package repositories, CI/CD systems, build servers, and secret management systems.

At minimum, organizations should consider the following controls:

* Require multi-factor authentication for developer and administrator accounts.
* Apply the principle of least privilege to repositories and CI/CD systems.
* Remove unused accounts and long-lived tokens.
* Configure protected branches and mandatory review policies.
* Separate development permissions from production deployment permissions.
* Record audit logs for source code and pipeline configuration changes.
* Prevent secrets from being stored directly in source code or pipeline definitions.
* Provide approved build images and development tools.
* Keep developer workstations and build environments securely patched.

CI/CD systems often hold production credentials and deployment permissions. They should therefore be protected at a higher level than ordinary development servers.

## PS: Protect the Software

The PS group focuses on protecting software from unauthorized access, modification, and disclosure.

In software supply chain attacks, threat actors may avoid attacking the application directly. Instead, they may compromise developer accounts or build pipelines and insert malicious code into otherwise legitimate release artifacts.

Organizations must therefore protect not only source code but also the build process and the integrity of released artifacts.

### Minimize Repository Access

Not every developer needs write access to every repository. Read, write, and administrative privileges should be assigned according to project responsibilities and job roles.

For sensitive repositories, organizations may apply policies such as:

* Prohibit direct pushes to the default branch.
* Require changes to be submitted through pull requests.
* Require approval from at least one reviewer.
* Require approval from designated code owners.
* Require signed commits or signed tags.
* Allow merging only after CI checks pass.
* Restrict administrators from bypassing branch policies.
* Disable force pushes and branch deletion.

Files that directly affect security, such as pipeline definitions, infrastructure-as-code templates, and access control policies, should require approval from designated security or platform code owners.

### Separate Secrets from Source Code

API keys, database passwords, cloud credentials, and certificate private keys may remain in repository history even after they are deleted from the latest version of the code.

Practical controls include:

* Use a dedicated secrets management system.
* Prefer short-lived credentials and dynamically generated tokens.
* Scan for secrets before commits are created.
* Perform server-side repository scanning.
* Mask sensitive values in CI logs.
* Separate credentials by environment.
* Rotate keys regularly.
* Establish automated revocation and response procedures for exposed credentials.

When a secret is committed to a repository, deleting the string is not sufficient. The credential must be revoked, replaced, and investigated for signs of unauthorized use.

### Establish Reproducible Builds and Artifact Integrity

Consistent artifacts should be generated from the same source code and build environment. This makes it easier to verify that release artifacts have not been altered.

Organizations may use the following techniques:

* Pin build tools and dependency versions.
* Use isolated build environments with restricted external downloads.
* Use ephemeral build workers.
* Pin build images by version and digest.
* Digitally sign build artifacts.
* Record artifact hashes.
* Use only approved artifact repositories.
* Separate development, testing, and production deployment paths.
* Retain build logs and provenance information.

Container images should be identified by immutable digests rather than tags alone. Mutable tags such as `latest` may point to different images over time.

### Manage SBOMs and Software Provenance

Modern applications consist not only of internally developed code but also of open-source libraries, container images, runtimes, operating system packages, and external tools.

If an organization does not know which components are in its software, it cannot quickly determine whether a newly disclosed vulnerability affects its products.

The build process can collect information such as:

* Component name
* Version
* Package identifier
* Supplier or repository
* License
* Cryptographic hash
* Direct and transitive dependencies
* Build or inclusion path

Generating a Software Bill of Materials, or SBOM, is only the first step. The SBOM must be connected to the actual deployed release so that affected products can be identified when new vulnerability information becomes available.

## PW: Produce Well-Secured Software

The PW group focuses on designing and implementing software with as few vulnerabilities as reasonably possible.

Security testing is essential, but problems become more expensive to fix after architectural decisions and trust boundaries have already been established. Secure design, implementation, and verification practices must therefore operate together.

### Include Threat Modeling in the Design Process

Not every feature requires an extensive threat modeling document. However, high-risk capabilities should be reviewed before implementation.

These commonly include:

* Authentication
* Authorization
* Payment processing
* Personal data processing
* File uploads
* Administrative functionality
* External API integrations

A practical threat modeling discussion can begin with questions such as:

* Which assets must be protected?
* Where does external input enter the system?
* Where do trust boundaries change?
* Which data could an attacker spoof or modify?
* Is there a path that could allow privilege escalation?
* Could sensitive information appear in logs or error messages?
* Could expensive operations be abused for denial-of-service attacks?
* What would happen if an external service or package were compromised?

Teams may use methodologies such as STRIDE with data flow diagrams, but the primary objective is not to follow a particular methodology. The objective is to document threats, security decisions, and the controls selected to address them.

### Use Approved Software Components

When selecting third-party libraries, checking only whether the package is up to date is not enough.

Organizations should also evaluate:

* Known vulnerabilities
* Maintenance activity and recent releases
* Security policies and vulnerability reporting channels
* Download source
* Package signatures and integrity
* Licensing requirements
* Dependency size and complexity
* Availability of alternative components
* Project trustworthiness and maintainer changes

To reduce the risk of typosquatting and dependency confusion attacks, organizations can prevent developers from downloading packages directly from arbitrary public registries. Instead, they can use approved internal registries or controlled package proxies.

### Convert Secure Coding Standards into Automated Rules

A policy that simply tells developers to “write secure code” will not produce consistent results.

Organizations should define language-specific and framework-specific practices that clearly identify prohibited and recommended patterns.

Examples include:

* Do not construct SQL queries through string concatenation.
* Restrict deserialization to approved formats and types.
* Do not construct file paths directly from untrusted input.
* Do not log passwords, access tokens, or other secrets.
* Always perform authorization checks on the server side.
* Define approved cryptographic algorithms and key lengths.
* Restrict dangerous functions and APIs.
* Validate file extensions and MIME types for uploaded files.
* Restrict destinations for server-side outbound URL requests.
* Apply context-aware output encoding in templates.

Where possible, these rules should be enforced through linters, compiler options, SAST policies, secure code templates, and reusable libraries.

### Add Security Questions to Code Reviews

Code reviews should not focus only on functionality, readability, and maintainability.

Security-oriented code review questions may include:

* Does this change introduce a new external input?
* Is input validation performed at the correct trust boundary?
* Are authentication and authorization enforced on the server side?
* Could sensitive information appear in responses, logs, or exceptions?
* Are operating system commands or database queries constructed through string concatenation?
* Are cryptographic and random number generation methods appropriate?
* Does the change introduce a new dependency?
* Does the application fail securely when an error occurs?
* Could the change introduce a concurrency or race condition?
* Does the change expand infrastructure or pipeline privileges?

Requiring the application security team to review every pull request does not scale. A more practical approach is to require security approval only for high-risk changes while allowing ordinary changes to be reviewed by development teams, security champions, and automated policies.

### Combine Multiple Types of Security Testing

No single security tool can identify every class of vulnerability.

Each tool has its own strengths and limitations.

| Test Type           | Primary Detection Area                                       | Typical Stage                           |
| ------------------- | ------------------------------------------------------------ | --------------------------------------- |
| SAST                | Vulnerable code patterns and data flow issues                | Development and build                   |
| SCA                 | Vulnerabilities in open-source and third-party packages      | Dependency addition and build           |
| Secret Scanning     | Credentials stored in code and configuration                 | Pre-commit and repository scanning      |
| DAST                | Vulnerabilities in running applications                      | After deployment to a test environment  |
| IAST                | Runtime behavior combined with code-level analysis           | Integration testing                     |
| Fuzzing             | Crashes and unexpected behavior caused by malformed input    | Component and system testing            |
| Container Scanning  | Vulnerabilities in operating system and application packages | After container image creation          |
| IaC Scanning        | Cloud and infrastructure configuration issues                | Before deployment                       |
| Penetration Testing | Business logic flaws and complex attack paths                | Major releases or scheduled assessments |

When introducing tools, organizations should consider not only the number of findings but also false positives, remediation capacity, and workflow integration.

If every result is configured to block the build while the tools still produce large numbers of false positives, developers may begin ignoring or bypassing the security controls.

### Design Risk-Based Build Gates

Treating every vulnerability in the same way makes pipeline operation difficult.

Build-blocking decisions should consider more than severity scores. Relevant factors may include:

* Whether the vulnerable code is reachable
* Whether the functionality is exposed to the internet
* The level of access required for exploitation
* The sensitivity of the data involved
* Whether working exploit code exists
* Whether compensating controls are present
* Whether the component is included in the production runtime
* Whether a fixed version is available

For example, a high-severity vulnerability in an unused development dependency should not necessarily receive the same priority as a high-severity vulnerability in a public authentication API.

A phased policy could include the following:

* Block all newly introduced critical vulnerabilities.
* Block newly introduced high-severity vulnerabilities in internet-facing services.
* Require existing vulnerabilities to be remediated within defined deadlines.
* Assign an owner and expiration date to every exception.
* Automatically review expired exceptions.
* Require additional validation for findings with low practical exploitability.

## RV: Respond to Vulnerabilities

The RV group focuses on handling vulnerabilities discovered after release and using those incidents to improve the development process.

Even mature secure development practices cannot guarantee that every vulnerability will be identified before release. Organizations therefore need procedures for receiving, analyzing, fixing, and deploying vulnerability reports.

### Establish a Clear Vulnerability Reporting Channel

External researchers and customers should know how to report a potential security vulnerability.

Organizations can publish or document the following information:

* Security contact email address or reporting portal
* Products and systems included in the reporting scope
* Information required to reproduce the issue
* Expected communication and response process
* Coordinated disclosure policy
* Safe harbor policy
* Encrypted communication options
* Policy for unsupported or end-of-life products

For public-facing services, organizations may also use a `security.txt` file to publish security contact and disclosure information.

### Operate a Vulnerability Triage and Prioritization Process

CVSS scores alone may not provide enough context to determine remediation priority.

A complete prioritization process should consider:

* Affected products and versions
* Whether the affected version is deployed in production
* Exploitation requirements and attack paths
* Evidence of active exploitation
* Internet exposure
* Data sensitivity
* Required user privileges
* Potential impact
* Available mitigations
* Complexity of remediation and deployment

The findings should be delivered to development teams in a form that supports remediation.

Instead of providing only the vulnerability name and severity, the report should ideally include:

* Reproduction steps
* Vulnerable code locations
* Attack scenarios
* Recommended remediation approaches
* Verification criteria

### Verify That Patches Are Securely Deployed

Vulnerability remediation does not end when the source code is changed.

Teams should also confirm the following:

* Does the change address the root cause?
* Does the same vulnerable pattern exist elsewhere?
* Could the change introduce a regression?
* Has a security regression test been added?
* Is the patched artifact signed?
* Have affected customers been informed?
* Has the patch actually been deployed to production?
* Can users still download the vulnerable version?

Even after a patch is released, the risk remains if customers do not install it. Depending on the product, organizations may need automated update mechanisms, emergency patch processes, and clearly defined end-of-support policies.

### Perform Root Cause Analysis

One of the most important SSDF concepts is using vulnerability findings to improve the development process.

Suppose an insecure direct object reference, or IDOR, vulnerability is discovered. The organization should not stop after fixing the authorization check in the affected API.

It should also ask:

* Why was the authorization requirement missing during design?
* Why was a shared authorization component not used?
* Did the code review checklist include authorization checks?
* Did existing tests cover privilege escalation scenarios?
* Does the same pattern exist in other APIs?
* Can secure defaults be enforced at the framework level?
* Can SAST rules or automated tests detect the issue in the future?

Based on the answers, the organization may update shared libraries, coding standards, test cases, project templates, and developer training materials.

## Mapping SSDF Practices to a CI/CD Pipeline

When implementing SSDF, organizations should connect security activities to existing development workflows rather than creating a separate security process.

The following is an example of how SSDF practices can be mapped to a typical CI/CD pipeline.

### Requirements and Design

* Define security requirements.
* Classify data.
* Perform threat modeling.
* Review risks associated with external integrations.
* Conduct security architecture reviews.
* Select approved technologies and components.

### Developer Workstation

* Run security linters.
* Scan for secrets before committing code.
* Pin dependency versions.
* Prevent the use of unapproved packages.
* Write security-focused unit tests.

### Pull Request

* Require code review.
* Require code owner approval.
* Run SAST.
* Run SCA.
* Run secret scanning.
* Scan infrastructure-as-code definitions.
* Check test coverage.
* Block newly introduced high-risk vulnerabilities.

### Build

* Use isolated build runners.
* Use approved build images.
* Verify dependency integrity.
* Generate an SBOM.
* Generate artifact hashes.
* Record build provenance.
* Digitally sign artifacts.

### Test Environment

* Run DAST.
* Perform integration security testing.
* Run fuzz tests.
* Test authentication and authorization.
* Scan container images.
* Validate runtime configuration.

### Deployment

* Deploy only signed artifacts.
* Deploy only from approved repositories.
* Separate deployment permissions by environment.
* Dynamically inject production secrets.
* Record deployment logs and change history.
* Verify rollback capability.

### Operations

* Match vulnerability intelligence against SBOM data.
* Monitor security events.
* Prioritize patches.
* Receive vulnerability reports.
* Conduct root cause analysis.
* Improve development rules and automated tests.

This workflow is not a universal implementation blueprint. Each organization should adjust it based on its development model, product risk, regulatory obligations, and operating environment.

## Assessing the Current State of SSDF Adoption

Before introducing a large number of new tools and procedures, organizations should map their existing activities to SSDF tasks.

For each SSDF task, the organization can evaluate the following:

| Assessment Area | Question                                                        |
| --------------- | --------------------------------------------------------------- |
| Execution       | Is the activity currently performed?                            |
| Scope           | Is it applied to selected projects or all projects?             |
| Ownership       | Is an owner responsible for execution and approval?             |
| Automation      | Is the process manual, partially automated, or fully automated? |
| Evidence        | Are execution results and approval records retained?            |
| Exceptions      | Do exceptions have an approver and expiration date?             |
| Measurement     | Is the effectiveness of the activity measured?                  |

A simplified maturity model may look like this:

* **Level 0:** The activity does not exist.
* **Level 1:** The activity is performed inconsistently by individual contributors.
* **Level 2:** The activity is documented and performed repeatedly.
* **Level 3:** The activity is broadly automated and applied across projects.
* **Level 4:** Results are measured and continuously optimized.

The objective is not to achieve the highest possible score in every area. The objective is to identify controls that are insufficient relative to the risk of the product and prioritize improvements accordingly.

## Common Implementation Failures

### Treating Tool Installation as Completion

Connecting a security tool does not provide meaningful protection if its findings are not reviewed or if most results are permanently excluded.

For each tool, organizations should define:

* Who reviews the findings?
* Which findings block the build?
* How are false positives handled?
* How are remediation deadlines established?
* Who approves exceptions?
* When do exceptions expire?
* Does the pipeline fail if the security tool does not run?

### Blocking Every Finding Immediately

If every security warning becomes a build blocker from the beginning, development pipelines may become unusable.

A more practical approach is to separate existing vulnerabilities from newly introduced vulnerabilities and begin by blocking new high-risk issues.

### Requiring AppSec to Review Everything

When a small application security team is responsible for every design review and code change, it quickly becomes a bottleneck.

The application security team should focus on high-risk systems and complex architectural reviews. Repetitive checks should be automated, while security champions within development teams can support routine reviews and secure development education.

### Measuring Only the Number of Fixed Vulnerabilities

If performance is measured only by the number of closed findings, teams may prioritize easy issues or suppress alerts rather than reduce actual risk.

More meaningful metrics include:

* Percentage of vulnerabilities discovered after production deployment
* Recurrence rate of the same vulnerability classes
* Mean time to remediate high-risk vulnerabilities
* Number of vulnerabilities introduced in new code
* Number of expired security exceptions
* Number of unapproved components in use
* Percentage of high-risk features with documented security requirements
* Percentage of threat modeling findings reflected in implementation
* Time from vulnerability discovery to production patch deployment

## A Practical SSDF Adoption Sequence

Organizations that cannot implement the entire SSDF at once can begin with the following sequence.

First, identify critical services and software assets. Classify them based on internet exposure, data sensitivity, and potential business impact.

Second, secure repository and CI/CD accounts, permissions, and secrets. If the development pipeline is compromised, many other security controls can be bypassed.

Third, automate basic checks for newly introduced code. Integrate SAST, SCA, secret scanning, and infrastructure-as-code scanning into pull requests.

Fourth, apply security requirements and threat modeling to high-risk capabilities. Begin with authentication, authorization, payment processing, personal data handling, and file-processing features.

Fifth, manage the provenance of build artifacts and software components. Connect SBOM generation, artifact signing, approved repositories, and build history.

Sixth, establish vulnerability response and root cause analysis processes. Do not stop at fixing individual findings. Improve code rules, test cases, reusable components, and development templates.

Finally, introduce measurable security indicators and gradually expand the scope of SSDF adoption.

## Conclusion

NIST SP 800-218 SSDF is not a framework for adding one more security scan to the development pipeline.

Its central idea is that software security should be managed as a property of the entire development system rather than as the output of a vulnerability scanner.

From a technical practitioner's perspective, implementing SSDF means making the following changes:

* Define security requirements before implementation.
* Review threats and trust boundaries during design.
* Protect repositories and CI/CD environments, not just source code.
* Track the provenance of external packages and build artifacts.
* Integrate multiple types of security testing into the development pipeline.
* Manage build gates and exceptions based on risk.
* Feed operational vulnerability findings back into development standards and automated rules.

During the initial adoption phase, organizations should not attempt to implement every practice perfectly. A more effective approach is to map the current development process to SSDF, identify the most significant security gaps, and address those gaps in order of risk.

The ultimate goal of secure software development is not to produce a scan report with zero findings. It is to reduce the likelihood that vulnerabilities enter the software, quickly determine the impact when new issues are discovered, and build a development system that prevents the same failures from recurring.


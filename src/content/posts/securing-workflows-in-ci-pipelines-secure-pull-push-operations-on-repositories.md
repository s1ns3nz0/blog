---
title: Securing Workflows in CI Pipelines - Secure Pull-Push Operations on Repositories
description: Deep dive into secure Pull-Push Operations on Repositories referring to NIST SP 800-204D
pubDatetime: 2026-07-25T23:58:20+09:00
tags:
  - NIST SP 800-204D
  - CI/CD
  - CI/CD Security
  - GitHub Action
  - Supply Chain Security
  - Pull-Push
featured: true
---
We covered how to secure the build process through the CI pipeline in the previous post. Push and pull operations can be performed by many developers, including external engineers. We'll now cover how to secure these operations.

## Table of contents

## Two Forms of Checks: Two Forms of Checks
- The type of authentication required for developers authorized to perform the PULL-PUSH operations. The request made by the developer must be consistent with their role. Developers with "merge approval" permissions cannot approve their own merges
	* Summary
	| Requirement                                                      | GitHub Implementation                                      |
	| ---------------------------------------------------------------- | ---------------------------------------------------------- |
	| Authenticate developers performing pull/push operations          | Enterprise SSO + MFA                                       |
	| Ensure a unique identity for each user                           | Individual GitHub or Enterprise Managed User account       |
	| Verify push identity                                             | Require signed commits                                     |
	| Grant pull access                                                | Repository `Read` permission or higher                     |
	| Grant push access                                                | Repository `Write` permission or higher                    |
	| Ensure requests are consistent with the developer’s role         | IdP group → GitHub Team → GitHub Actions role-policy check |
	| Require approval for changes to specific paths                   | `CODEOWNERS`                                               |
	| Prevent direct pushes to `main`                                  | Require pull requests through a ruleset                    |
	| Prevent authors from approving their own pull requests           | GitHub’s built-in pull request review behavior             |
	| Prevent the most recent pusher from providing the final approval | Require approval of the most recent reviewable push        |
	| Invalidate approvals after new commits are pushed                | Dismiss stale pull request approvals                       |
	| Prevent administrative bypass                                    | Minimize and tightly control the ruleset bypass list       |
	* These details were already touched in the 'Secure Build' article
	* Integrate 'Github Teams' with [Repository roles](https://docs.github.com/en/organizations/managing-user-access-to-your-organizations-repositories/managing-repository-roles/repository-roles-for-an-organization?utm_source=chatgpt.com)
	* However, Using repository roles only can't meet the direcory based control requirements so that combine protected branch ruleset, CODEOWNERS, required status check and so on.
	* [Managing repository settings](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/managing-repository-settings)
	* [Available rules for rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets?utm_source=chatgpt.com)
- The integrity of the code in the repository can be trusted such that it can be used for further updates.
	+ Only commits reachable from an approved protected branch or protected release tag shall be treated as trusted source baselines
		* Trusted: refs/heads/main, refs/heads/release/*, other protected branches
		* Untrusted: feature branch, fork branch, random user's tag, unverified workflow artifact
		* Apply branch rulesets to `main` or `release/*` - [About protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches?utm_source=chatgpt.com)
			+ Require a pull request before merging
			+ Require 2 approvals
			+ Require review from Code Owners
			+ Dismiss stale approvals
			+ Require approval of the most recent reviewable push
			+ Require status checks
			+ Require signed commits
			+ Require linear history
			+ Block force pushes
			+ Block deletions
			+ Restrict bypass permissions

## REQUIREMENTS
### PULL-PUSH_REQ-1
#### THe project maintainer should run automated checks on all artifacts covered in the change being pushed, such as unit tests, linters, integrity tests, security checks, and more
- [Managing and standardizing pull requests](https://docs.github.com/en/pull-requests/reference/managing-and-standardizing-pull-requests?utm_source=chatgpt.com)
- Sequence: Pull request or Push -> Identify modified files -> Run applicable tests(Unit/Lint/Integrity/Security/Build) -> Security Gate -> Ruleset Required Check -> Merge
- Role of the Project Maintainer
	+ Maintainer-approved CI workflow
		* Runs automatically for every pull request or push
		* Cannot be bypassed through the repository ruleset
		* Prevents merging when any required check fails
	+ Responsibile for
		* Define which checks are required for each type of artifact
		* Reviewing and approving validation workflow and policies
		* Configuring required status checks
		* Approving exceptions and managing their expiration
		* Reviewing failed validation results
		* Maintaining the versions and policies of validation tools
### PULL-PUSH_REQ-2
#### CI pipelines should only be run using tools when confidence is established in the trustworthiness of the source-code origin of those tools
- Tools such as actions, reusable workflows, compilers, scanners, and package managers within the CI pipeline should be used only after their origins have been reviewed and approved.
- [Disabling or limiting GitHub Actions for your organization](https://docs.github.com/en/organizations/managing-organization-settings/disabling-or-limiting-github-actions-for-your-organization?utm_source=chatgpt.com)
- [Using pre-written building blocks in your workflow](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/find-and-customize-actions#using-release-management-for-your-custom-actions)
- [Reuse workflows](https://docs.github.com/en/actions/how-tos/reuse-automations/reuse-workflows#calling-a-reusable-workflow)
- [Using third-party actions](https://docs.github.com/en/actions/reference/security/secure-use?utm_source=chatgpt.com#using-third-party-actions)
- What to review for external Actions?
	+ Repository Origin: Official or approved repository?
	+ Owner Identity: Identify organization and maintainer?
	+ Commit Origin: Chosen SHA stick to original repository?
	+ Source Review: Properly handle secrets, filesystem, network?
	+ Dependencies: Internal dependency pinned or locked?
 	+ Permissions: Required GITHUB_TOKEN and secret permissions are least privilege?
	+ Maintenance: Proper maintenance and security updates?
	+ License: allowed license in your organziation?
- Use OPA/Confest to the allowed Action
- Binary tools should be reviewed with their origins and digest, Best practice is to include allowed tools in digest-pinned builder image
	* Pinned Binary Example
	```YAML
	TOOL_VERSION="1.8.4"
	TOOL_SHA256="0123456789abcdef..."

	curl \
	  --fail \
	  --location \
	  --proto '=https' \
	  --tlsv1.2 \
	  "https://approved.example.com/tool/${TOOL_VERSION}/tool-linux-amd64" \
	  --output tool

	echo "${TOOL_SHA256}  tool" | sha256sum --check -
	install -m 0755 tool /usr/local/bin/tool
	```
	* Digest-pinned builder image(Dockerization)
	```YAML
	container:
	  image: ghcr.io/company/approved-go-builder@sha256:<DIGEST>
	```
- [Use dependabot to make an update PR for Action SHA](https://docs.github.com/en/code-security/how-tos/secure-your-supply-chain/secure-your-dependencies/auto-update-actions)
- Give least permissions to workflow
- Monitor runtime actions thgrough runtime security solutions(StepSecurity, Bullfrog)

### PULL-PUSH_REQ-3
#### The repository or source-code management system should either run CI workflows in sandboxed environments without access to the network, any privileged access, or the ability to read secrets or have built-in protection that incorporate a delay in CI workflow runs until they are approved by a maintainer with write access. This built-in protection should go into effect when an outside contributor submits a pull request to a public repository. The setting for this protection should be at the strictest level, such as "Require approval for all outside collaborators"
- The pull request is created by a user that requires approvals based on the selected policy.
- The pull request event is triggered by a user that requires approvals based on the selected policy
- Maintainer approval reuqired settings
	+ [Repository > Settings > Actions > General > Approval for running fork pull request worfklows from contributors](https://docs.github.com/en/organizations/managing-organization-settings/disabling-or-limiting-github-actions-for-your-organization?utm_source=chatgpt.com)
- Use `pull_request` for Workflow
```YAML
on:
  pull_requests:
```
- Prohibit using `pull_request_target`
	+ `pull_request_target`: Runs workflow when activity on a pull request in the workflow's repository occurs
	+ This event runs in the context of the default branch of the base repository, rather than in the context of the merge commit
- Declare least privilege in the workflow, if more permissions are needed, seperate the workflow from external PR validation
	+ Declare explicit permissions
- Not using `self-hosted runner` is recommended to external contributor PR
	+ When you need it, isolate VM runners, re-confirm not providing secrets, granting root permissions, ensuring to destroy runners
- Using Github Workflow execution protections
	+ Github actions organization provides users `actor` and `event` based execution protection ([Workflow execution protections](https://docs.github.com/en/organizations/managing-organization-settings/actions-policies/workflow-execution-protections?utm_source=chatgpt.com)
	+ `pull_request_target`: deny, `workflow_dispatch`: maintainer, `external actor`: allow only specific low-risk workflow

### PULL-PUSH_REQ-4
#### If there are no built-in protections available in the source-code management system, then external security tools with the following features are ruquired
- Functionality to evaluate and enhance the security posture of the SCM systems with or without a policy(e.g., Open Policy Agent(OPA) to access the security settings of the SCM account the generate a status report with actionable recommendations.
- Functionality to enhance the security of the source-code management system by detecting and remediating misconfigurations, security vulnerabilities, and compliance issues.
- An example of such a tool is the popular open-source tool [OpenSSF scorecard](https://github.com/ossf/scorecard?utm_source=chatgpt.com)
- [GitHub provides REST APIs for creating, modifying, and searching rulesets and code security configurations, enabling users to have an external policy engine assess them](https://docs.github.com/en/rest/repos/rules?utm_source=chatgpt.com&apiVersion=2026-03-10)
- Recommendation
	+ OpenSSF Scorecard: Assess SCM security posture in broad scope
	+ OPA: Assess essential checks and minimal score for organization
	+ Github Ruleset: Deny unallowed merge
	+ Issue/PR Automation: Create improvement task
	+ Periodical reassessment: Detect configuration drift and score changes

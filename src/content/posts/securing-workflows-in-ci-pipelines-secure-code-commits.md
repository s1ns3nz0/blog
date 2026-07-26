---
title: Securing Workflows in CI Pipelines - Secure Code Commits
description: Appropriate forms of testing should be performed before code commits
pubDatetime: 2026-07-26T10:04:28+09:00
tags:
  - NIST SP 800-204D
  - CI/CD
  - CI/CD Security
  - GitHub Action
  - Supply Chain Security
  - Code Commits
featured: true
---

Considering DevSecOps principles such as Shift Left, code commits should be properly reviewed and tested

## Table of contents

## Overview
- SAST and DAST tools (covering all languages used in development) should be run in CI/CD pipelines with code coverage reports being provided to developers and security personnel. 
- If open-source modules and libraries are used, dependencies must be enumerated,understood, and evaluated for policy (potentially using appropriate SCA tools). 
- The security conditions that they should meet for their inclusion must also be tested. 
- Dependency file detectors should detect all dependencies, including transitive dependencies with preferably no limit to the depth of nested or transitive dependencies that are to be analyzed

### COMMIT-REQ-1
#### Activate Secret Scanning and Push Protection
- Organization -> Settings -> Advanced Security/Code Security -> Configurations -> Secret Scanning: Enabled -> Push Protection: Enabled
- [About secret scanning alerts](https://docs.github.com/en/code-security/concepts/secret-security/about-alerts?utm_source=chatgpt.com)
- [Leverage Custom Pattern](https://chatgpt.com/c/6a61977a-ee78-83ee-9fd7-0de4f7741ffc)
#### Bypass Must be reviewed
- [Delegated bypass for push protection](https://docs.github.com/en/code-security/concepts/secret-security/delegated-bypass?utm_source=chatgpt.com)
- [Enabling delegated bypass for push protection](https://docs.github.com/en/code-security/how-tos/secure-your-secrets/manage-bypass-requests/enable-delegated-bypass?utm_source=chatgpt.com)
- Grant exemptions to select actors, skipping push protection entirely for all of their commits
- Exemptions should be granted to trusted automation like migration bots or service accounts that need to push frequent commits with minimal friction
#### Monitor and Alert Security Dashboard
- When  push protection is bypassed or secrets are pushed into repositories, Users can monitor these at the below features
	+ Repository -> Security and quality -> Security Scanning
	+ Organization -> Security and quality -> security Overview -> Secret Scanning
- Create an alert in the `Security and quality` tab of the repository, organization, and enterprise, resulting that sends an email alert to personal account, organization, and enterprise owners, security managers, and respository administrators who are watching the repository, with a link to the secret and the reason it was allowed

#### Remediation Process
- Revoke and rotate credentials 
	+ PAT, API key, Cloud Credentials, SSH Key, Certificate Private Key, Database Password
- Additional scanning could be conducted in CI stages

### COMMIT-REQ-2
- Push protection features should be enabled for all repositories assigned to an administrator. Such protection should include the verification of developer identity/authorization, the enforcement of developer signing of code commits, and file name verification
- [Configuring GitHub Secret Protection](https://docs.github.com/en/code-security/how-tos/secure-at-scale/configure-organization-security/configure-specific-tools/protect-your-secrets?utm_source=chatgpt.com)
	+ Github organization security configuration allows secret scanning and push protection to be enabled across many repositories
- Push protection can scan for secrets, SSO and Github accounts are responsible for authentication
	+ Individual identities, SSO and MFA should be incorporated, shared accounts, PAT, SSH private key, and build-user account are not applicable
- Whether push access is available to developers is managed by repository roles.
- [Enforce code commit sign by using branch rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets?utm_source=chatgpt.com#require-signed-commits)
- [File name rule](https://docs.github.com/en/organizations/managing-organization-settings/creating-rulesets-for-repositories-in-your-organization?utm_source=chatgpt.com#using-fnmatch-syntax) should be applied for preventing shell code injection, path traversal, and so on
	* Considering using OPA to enforce file name management

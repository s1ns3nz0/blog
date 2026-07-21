---
title: Threat Modeling - STRIDE
description: Conducting STRIDE threat modeling in detail
pubDatetime: 2026-07-17T11:00:00+09:00
tags:
  - threat-modeling
  - STRIDE
featured: true
---

When I first applied the STRIDE threat modeling methodology to my application, I got confused about how to handle specific technological frameworks and assets, such as EC2, apache, nodejs, and so on. Many posts and examples demonstrate threat modeling using only a conceptual description of the application, just drawing a DFD with generic elements like Process and Data Store, rather than addressing specific technical architecture

When you know your services will run on AWS, How can you incorporate AWS specific threat modeling into the early stage of SDLC instead of just demonstrating generic norms?

## Table of contents

## References
- [paranav1hivarekar's gitub and blog posts](https://github.com/pranav1hivarekar/threat-modeling): api, web-app examples
- [DRATA - Using the STRIDE Threat Model: Tutorial&Best Practices](https://drata.com/learn/risk/stride-threat-model): Tutorial and Best Practices 
- [Descryption Digest - Threate Modeling Guide](https://www.decryptiondigest.com/blog/threat-modeling-guide): Introduce each threat modeling methodology
- [Vlad Spades - Threat Modeling an Application Moodle Using STRIDE](https://cyberspades.medium.com/threat-modeling-an-application-moodle-using-stride-6758d9fe4951): Appling STRIDE to specific application example


## STRIDE per Element
Touch all identified elements in the DFD and factor in STRIDE for each component independently. Before you directly analyze each element, draw the table below, which indicates which threats can be applied to an element based on its type.
|      |  S  |  T  |  R  |  I  |  D  |  E  |
|------|-----|-----|-----|-----|-----|-----|
|User  |  O  |     |  O  |     |     |     |
|Process| O  |  O  |  O  |  O  |  O  |  O  |
|Data Store|   |O  |  O  |  O  |  O  |     |
|Data Flow|  |  O  |     |  O  |  O  |     |
- [Threat Model - API Using API Gateway](https://github.com/pranav1hivarekar/threat-modeling/blob/main/api-threat-model.md): Good example of conducting STRIDE per Element

## STRIDE per Interaction
Visith all arrows indicating information stream. check all six STRIDE categories on each communication.
- [Threat Model - Web Application](https://github.com/pranav1hivarekar/threat-modeling/blob/main/web-app-threat-model.md): Good example of conducting STRIDE per Interaction

## Interesting Points
Each methodology captures the same attack methods from different perspective. For example, with SQL Injection, STRIDE-per-Element focuses on the Tampering of the Database itself, concluding that the Database is vulnerable to Tampering.
The mitgation for this attack would be encryption or access control. On the other hand, STRIDE-per-Interaction analyzes the flow of data between elements, concluding that the data in transit needs to be validated. In this case, the mitigation for this attack would be to use a prepared statement

In conclusion, these are complementary, When you have enough time to leverage both methodologies, integrate them to build a more comprehensive understanding of target application's security posture.

## Attack Tree
An Attack Tree is a diagram that describes an attacker's possible attack behaviors. It shows which paths exist to achieve the goal at each stage. You don't need to draw an Attack Tree for every threat. Complicated goals are a good candidate for drawing one, and critical threats are another appropriate case to consider.
```
GOAL: Compromise Admin Account
│
├─ (OR) Phish for credentials
│         └─ (AND) Send phishing email
│                 + Victim clicks the link
│                 + Victim enters credentials on fake page
│
├─ (OR) Brute-force the password
│         └─ (AND) No rate limiting on login endpoint
│                 + Weak password policy in place
│
├─ (OR) Hijack an active session
│         └─ (AND) Stored XSS vulnerability exists on the site
│                 + Session cookie missing HttpOnly flag
│
└─ (OR) Bribe or social-engineer an insider
          └─ (AND) Identify an employee with admin access
                  + Offer payment or leverage / pressure
```
- [Vlad Spades - Threat Modeling an Application 'Moodle' Using STRIDE](https://cyberspades.medium.com/threat-modeling-an-application-moodle-using-stride-6758d9fe4951): A good example of attack tree

## Calculate Priority
As you can see in the post above, it is highly recommended to calculate a risk score using DREAD, or severity using a CVSS calculator. The purpose of this stage is to prioritize which threats to mitigate and to communicate that prioritization to stakeholders such as developers.
- [CVSS Calculator](https://www.first.org/cvss/calculator/3.0)

These days, DREAD is highly controversial since it is too subjective to use - its results depend heavily on the person conducting the threat modeling. It's no longer used at Microsoft, even though Microsoft itself developed this method.

## Conclusion
I believe a threat modeling process should follow this sequence: STRIDE, Attack Tree, and Prioritization. Another point-I used to confuse calculating the risk score with risk assessment. Risk assessment is a broader concept for the entire organization, considering business impact, whereas the risk calculation at the last stage of threat modeling is meant to communicate identified threats to stakeholders early in the SDLC, in order to mitigate risk.

I believe that if you can successfully intergrate a risk assessment step into your CI process, conducting risk assessment directly after threat modeling would be a good option for DevSecOps, since threat modeling reulsts flow into risk assessment as input.

## Additional Resources
- [AWS Labs - Threat Composers](https://github.com/awslabs/threat-composer): Study STRIDE with AWS
- [STRIDE GPT](https://github.com/mrwadams/stride-gpt): Automate STRIDE with your AI

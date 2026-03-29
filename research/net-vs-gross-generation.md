# Net vs Gross Generation for Solar Credits

## Scope

This document analyzes whether the current system tokenizes gross generation or net surplus, how `kwh_self_consumed` is handled, whether null values are accepted, and whether the current implementation can enable double counting.

The goal of this research is documentation only. No code changes are included here.

## Executive Summary

The current implementation does not enforce net surplus tokenization.

- The legacy mint flow mints from `kwh_generated` or `kwh_injected`, not from `kwh_generated - kwh_self_consumed`.
- The system accepts and stores `kwh_self_consumed`, but does not use it when minting.
- If `kwh_self_consumed` is missing, the system accepts the reading and proceeds without rejection.
- The certificate flow is manual and not derived from readings, which creates a second path where gross energy can be certified without any automated netting or provenance checks.

Conclusion: double counting is currently possible in both design and implementation terms, especially if self-consumed energy is also treated as certificate-eligible generation.

## Research Questions

### 1. Does the current mint flow use gross generation or net surplus?

It uses gross generation.

#### Legacy reading mint flow

`POST /api/mint` supports a legacy branch where a token mint is created from a `reading_id`.

In that flow, the minted amount is:

```ts
const kwhAmount = reading.kwh_generated ?? reading.kwh_injected
```

There is no subtraction involving `kwh_self_consumed`.

Relevant code:

- `apps/web/app/api/mint/route.ts`
- Legacy branch: `reading_id`
- Mint basis: `reading.kwh_generated ?? reading.kwh_injected`

Implication:

- If a reading contains both generated energy and self-consumed energy, the self-consumed portion is still included in the minted amount.

#### Certificate mint flow

The newer certificate path also does not enforce netting.

`POST /api/certificates` creates a pending certificate with a manually provided `total_kwh`.
Later, `POST /api/mint` mints exactly `cert.total_kwh`.

There is no derivation from readings and no validation against `kwh_self_consumed`.

Implication:

- The certificate path is even riskier from a market-integrity standpoint because the amount is manually entered and not tied to verified surplus readings.

### 2. Is `kwh_self_consumed` being populated, and by whom?

Yes, the field can be populated through backend-supported reading ingestion flows.

#### Manual reading API

`POST /api/readings` accepts:

- `kwh_generated`
- `kwh_injected`
- `kwh_self_consumed`
- `kwh_consumed`

The route normalizes:

```ts
const kwhGen = kwh_generated ?? kwh_injected
const kwhSelf = kwh_self_consumed ?? kwh_consumed
```

and stores:

```ts
kwh_generated: kwhGen,
kwh_injected: kwhGen,
kwh_self_consumed: kwhSelf ?? null,
```

This means:

- a cooperative member or admin using the authenticated API can submit `kwh_self_consumed`
- a legacy alias also exists through `kwh_consumed`

#### Bulk meter ingestion API

`POST /api/meters/readings` accepts batch readings containing:

- `kwh_generated`
- optional `kwh_self_consumed`

and stores:

```ts
kwh_generated: r.kwh_generated,
kwh_self_consumed: r.kwh_self_consumed ?? null,
```

This means:

- meter-based ingestion can populate `kwh_self_consumed`

#### UI reality

The standard submit-reading modal currently exposes:

- meter
- `kwh_generated`
- date
- power

It does not expose `kwh_self_consumed`.

So the field exists in the data model and APIs, but is not part of the main visible manual UI flow today.

### 3. What happens if `kwh_self_consumed` is null?

The system accepts null and does not reject the reading.

Current behavior:

- Validation schema makes `kwh_self_consumed` optional
- Reading creation stores `null` when it is absent
- Minting does not branch on `kwh_self_consumed`
- No default of `0` is explicitly written during persistence
- Operationally, the field is ignored downstream in mint logic

Practical effect:

- When `kwh_self_consumed` is null, the system behaves as if the field is unavailable and still allows gross generation to move through the workflow.

This is important because the absence of a value does not block certification or mint eligibility.

### 4. How does the certificate flow relate to readings?

It is not linked to readings in a way that would prevent over-certification or double counting.

Current design observations:

- `Certificate` contains period fields and `total_kwh`
- `Reading` contains generation and self-consumption data
- there is no direct relation showing which readings back a certificate
- there is no allocation table, provenance mapping, or exclusion rule preventing the same energy from being represented twice

As a result:

- the system cannot prove that a certificate total was derived from net export
- the system cannot prove that a given reading has not already been represented elsewhere
- the system cannot automatically prevent a cooperative admin from entering gross totals manually

## Implementation Evidence

### Reading validation and persistence

Files reviewed:

- `apps/web/lib/validation/schemas.ts`
- `apps/web/app/api/readings/route.ts`
- `apps/web/app/api/meters/readings/route.ts`

Findings:

- `kwh_self_consumed` is optional in both single and batch reading schemas
- `kwh_consumed` is also accepted as a legacy alias in the single-reading path
- readings are stored even when self-consumption is absent

### Mint behavior

File reviewed:

- `apps/web/app/api/mint/route.ts`

Findings:

- legacy mint by `reading_id` mints from gross generation
- certificate mint by `certificate_id` mints from manually entered `total_kwh`
- neither branch checks or computes net surplus

### Certificate creation

Files reviewed:

- `apps/web/app/api/certificates/route.ts`
- `apps/web/components/modals/create-certificate-modal.tsx`
- `apps/web/lib/types/database.ts`

Findings:

- certificate totals are user-provided
- no reading-derived calculation is enforced
- no data model linkage exists between certificates and source readings

### Test coverage

Files reviewed:

- `apps/web/__tests__/api/readings.test.ts`
- `apps/web/__tests__/api/meters-readings.test.ts`
- `apps/web/__tests__/api/mint.test.ts`

Findings:

- current tests cover basic creation and mint behavior
- there is no coverage for:
  - `kwh_self_consumed > 0`
  - `kwh_self_consumed = null`
  - netting enforcement
  - certificate derivation from readings

## Market Research: How RECs Handle Netting and Double Counting

Traditional REC markets are built around exclusive ownership of environmental attributes. The same environmental benefit cannot be validly claimed by multiple parties.

### Key principles from official guidance

According to the U.S. EPA:

- RECs represent the legal property rights to the renewable attributes of electricity generation.
- The REC owner has the exclusive right to make renewable use claims.
- Double counting occurs when two parties claim the same environmental benefit from the same generation.
- If RECs are sold, the generator or host can no longer claim that same renewable use benefit unless they acquire and retire replacement RECs.

Relevant official sources:

- EPA, "Double Counting"
  - https://www.epa.gov/green-power-markets/double-counting
- EPA, "Renewable Energy Certificate Monetization"
  - https://www.epa.gov/greenpower/renewable-energy-certificate-monetization
- EPA, "Self-Supply"
  - https://www.epa.gov/green-power-markets/self-supply

### Interpretation for this project

The business risk can be summarized as follows:

- if a prosumer self-consumes solar generation
- and the same gross generation is also converted into sellable certificates
- then the system may represent the same environmental value twice

That interpretation is consistent with REC market integrity principles.

In practical terms, if certificate eligibility is intended to reflect transferable renewable attributes, then the implementation should define a single claimable quantity and enforce it consistently. Under the assumptions of this research, that quantity should be net surplus after self-consumption.

## Risk Assessment

Risk level: High

Reasons:

- current mint logic ignores self-consumption
- current certificate creation is manual and detached from readings
- missing self-consumption does not block issuance
- there is no provenance model tying certificate totals to eligible source energy
- there is no test coverage for the critical business rule

This creates both product risk and credibility risk. Even in testnet or pilot conditions, the current design can produce certificates that cannot be defended as non-duplicative.

## Direct Answers

### Does the current mint flow use gross generation or net surplus?

Answer:

- The legacy mint flow uses `kwh_generated` or `kwh_injected`
- It does not use `kwh_generated - kwh_self_consumed`

### Is `kwh_self_consumed` being populated, and by whom?

Answer:

- It can be populated through the authenticated manual reading API
- It can also be populated through bulk meter ingestion
- The default submit-reading modal does not currently expose it in the UI

### What happens if `kwh_self_consumed` is null?

Answer:

- The system accepts null
- It does not reject the reading
- It does not explicitly normalize the missing value to `0`
- It effectively ignores the field downstream during minting

### How do REC markets handle netting and double counting?

Answer:

- REC markets rely on exclusive environmental attribute ownership
- Double claims are invalid
- The same renewable benefit cannot be claimed by both a generator/host and a REC buyer
- For this project's stated business rule, certifying gross generation while self-consumed energy is also retained as a benefit is not market-safe

### Is a follow-up implementation issue needed?

Answer:

- Yes, a follow-up implementation issue is needed

## Recommendation

A follow-up implementation issue should be opened to move this from research into enforcement.

Recommended implementation direction:

1. Define a single eligibility rule for certificate-backed energy.
   - Proposed rule: `eligible_kwh = max(kwh_generated - kwh_self_consumed, 0)`
2. Decide whether missing `kwh_self_consumed` should:
   - block certificate eligibility, or
   - be allowed only for explicitly grid-export meters with trusted semantics
3. Remove or constrain manual certificate totals unless they are derived from verified readings.
4. Add provenance between certificates and their source readings.
5. Add tests for:
   - populated self-consumption
   - null self-consumption
   - zero self-consumption
   - self-consumption greater than generation
   - certificate period over-allocation

## Final Conclusion

The current implementation does not prevent double counting.

`kwh_self_consumed` exists in the schema and can be stored, but it is not used to determine mintable or certifiable energy. The legacy mint path uses gross generation, and the certificate path allows manual totals without reading-level provenance or netting enforcement.

Because of that, the system currently permits scenarios where energy that was self-consumed can also be represented in minted tokens or certificates. Based on the REC market principles reviewed in this research, that is not a defensible design for transferable renewable claims.

Follow-up action is required.

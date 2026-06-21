# Audit Component Assets Design

## Goal

Make audit rounds and audit scanning handle component assets consistently when an asset is installed inside or under another asset.

The field workflow should let auditors work from the parent asset naturally, while the system still records audit state per asset. Component master data follows the parent only when the workflow explicitly represents the installed parent package moving or being confirmed together.

## Decision

Use a parent-led component audit model:

1. When an audit round includes a parent asset, include its currently installed component assets in the round automatically.
2. Keep each component asset as its own `audit_item` so reporting, findings, and audit history remain asset-level.
3. On the scan page, show installed components under the selected parent asset with per-component status.
4. Allow component assets to be marked by direct QR scan or by explicit "confirmed with parent" action when the component cannot be scanned.
5. If a parent workflow applies master-data changes to location, branch, department, or custodian, update installed component assets with the same supported values in the same transaction. Audit scan can sync only fields the audit workflow actually updates; branch is not an audit-scan actual field in the current schema.

This keeps field work fast without silently marking child assets as found or silently changing their master data.

## Current Behavior

- `AssetComponent` already models parent and component relationships.
- Asset detail already shows parent/component relationships and component history.
- `POST /api/audit-rounds` creates `audit_items` from `getAuditRoundCandidateAssets(input)` and does not expand the candidate set with installed components.
- `POST /api/audit-rounds/preview` uses the same flat candidate list and samples it directly.
- `selectAuditSample()` samples individual asset ids, not parent-component groups.
- `POST /api/audit-rounds/{id}/scan-lookup` resolves a scanned asset and reports whether it is in the round or out of scope, but does not return parent/component context.
- `AuditScanForm` receives flat `AuditScanItem` rows with expected location, custodian, department, condition, ownership type, and photo checklist. It has no parent/component fields today.
- `POST /api/audit-rounds/{id}/scan` updates the scanned asset's audit item. Immediate `applyCorrections` currently applies only `wrong_location` and `wrong_custodian` to the master asset.
- `POST /api/audit-findings/{id}/review` can apply approved `wrong_location`, `wrong_custodian`, `wrong_department`, and `wrong_condition` findings to the master asset.
- Asset register edits, transfers, checkout/checkin, bulk move/update, and audit corrections currently update only the target asset; they do not cascade through installed components.
- Asset component install/remove APIs already write movement records for both the parent asset and the component asset.

## Non-Negotiables

- Do not mark component assets as found automatically just because the parent was scanned.
- Do not update removed component links. Only `AssetComponent` records with `status = installed` and `removedAt = null` are in scope.
- Do not create duplicate `audit_items` when a component already matches the audit scope filter directly.
- Keep component audit state queryable per asset.
- Create movement and audit history for component master-data updates, not only for the parent.
- Preserve existing review controls for findings that should not be corrected immediately.
- Do not invent an audit branch-correction flow in this phase; audit items snapshot `expectedBranchId`, but the current scan payload has no `actualBranchId`.

## Round Creation Behavior

When creating or previewing a round:

- Resolve the normal candidate assets from the existing audit scope filters.
- Build parent-component selection groups from those candidates before sampling:
  - A parent candidate group contains the parent asset plus active installed components.
  - A direct component candidate that appears through the normal filter can also appear as its own candidate group.
- Apply `sampleRate` to the groups, not to the flattened component-expanded asset list.
- After group sampling, flatten selected groups into audit item assets and deduplicate by `assetId`.
- Snapshot expected values from each audit item asset's own master record:
  - `expectedCompanyId`
  - `expectedBranchId`
  - `expectedDepartmentId`
  - `expectedLocationId`
  - `expectedCustodianId`
  - `expectedConditionId`

If a component is pulled into the round only because its parent is in scope, the audit item should still behave as a normal audit item. The relationship context is a UI and workflow aid, not a replacement for the component's own audit state.

Sampling policy:

- If the sampled group is a parent group, include all installed components in that group.
- If a component enters the candidate set directly through filters, it may be selected independently even when its parent is not selected.
- If the same component is selected both directly and through its parent group, create only one audit item.

Preview response policy:

- Keep `matchedAssets` as the original filter match count so existing candidate metrics stay familiar.
- Keep `sampledAssets` as the final deduplicated audit item count after group sampling and component expansion.
- Add `componentItems` for the count of audit items added because they are installed under selected parent assets.
- Add enough preview labels to explain when component expansion adds assets outside the visible filter.

## Scan Page Behavior

When an auditor selects or scans a parent asset:

- Mark only the parent asset through the normal save action.
- Show a compact "Installed components" panel with counts such as `0/3 checked`.
- Each component row should show asset tag, name, role or slot, and current audit status.
- Each component row should expose actions:
  - Scan component QR.
  - Confirm with parent.
  - Mark component missing.

When a component is confirmed with parent:

- Update the component's own `audit_item`.
- Set the component audit item's `auditResult` to `confirmed_with_parent` so reports can separate direct QR scans from parent confirmations while the existing `scanSource` continues to describe the input method.
- Store scan history for the component asset with a raw payload that includes the parent asset id, parent asset tag, and confirmation reason or evidence references.
- Require evidence or remark when the component is not directly scannable and the confirmation changes location, department, custodian, or condition from the expected snapshot.

When a component QR is scanned directly:

- Update the component's own audit item through the normal scan path.
- If the component is installed under a parent, show a banner such as "This asset is a component of {parent asset tag}".
- Keep the direct scan result distinct from parent confirmation in scan history.

When a component is marked missing:

- Create or update the existing `not_found` finding for that component's audit item.
- Do not remove the `AssetComponent` relationship during audit scan. Relationship changes remain an asset management action after review.

## Master Data Sync Policy

Installed component assets should follow the parent asset when the business action represents moving or confirming the physical parent package.

Apply component master-data sync for:

- Asset register update of a parent asset when `branchId`, `currentLocationId`, `departmentId`, or `custodianId` changes.
- Asset transfer of a parent asset when `currentLocationId`, `departmentId`, or `custodianId` changes.
- Asset checkout/checkin of a parent asset when `currentLocationId`, `departmentId`, or `custodianId` changes.
- Bulk move/update when a selected parent asset changes `currentLocationId` or `custodianId`.
- Audit scan immediate correction only for the fields currently supported by scan correction: `currentLocationId` and `custodianId`.
- Audit finding approval for approved field findings: `currentLocationId`, `departmentId`, and `custodianId`.

Fields that may sync:

- `branchId`
- `currentLocationId`
- `departmentId`
- `custodianId`

Fields that should not sync automatically:

- `conditionId`
- `statusId`
- `ownershipType`
- purchase, warranty, accounting, license, and disposal fields

Audit-specific sync rules:

- `conditionId` remains a per-asset physical observation and should not sync from parent to component automatically.
- `branchId` is not updated by audit scan or audit finding review in the current code and should not be added to audit sync in this phase.
- Parent audit scan correction should sync only installed components that are directly scanned or confirmed with the parent in the same round.
- Parent audit finding approval should sync installed components only when the component has an audit item in the same round and has been directly scanned or confirmed with the parent.

Skip component sync when:

- The component link is removed or not installed.
- The component asset is inactive.
- The component is checked out independently or otherwise blocked by existing lifecycle policy.
- The implementation cannot create a movement/audit trail for the component update.

Every component sync must create an `AssetMovement` for the component with:

- `movementType`: a parent-derived value such as `parent_transfer_sync`, `parent_register_update_sync`, `parent_checkout_sync`, `parent_checkin_sync`, `parent_bulk_update_sync`, or `parent_audit_confirmation_sync`.
- `fromValue`: the component's previous field snapshot.
- `toValue`: the parent-derived field snapshot.
- `referenceType`: the triggering workflow, such as `transfer`, `asset`, `checkout`, `checkin`, `bulk_update`, `bulk_move`, or `audit_finding`.
- `referenceId`: the parent workflow record or finding id.
- `performedBy`: the user who triggered the parent workflow.

## API Behavior

Round creation and preview:

- Add a helper that builds parent-component audit candidate groups before sampling and flattens selected groups into deduplicated audit item assets.
- Keep the helper isolated from HTTP handling so it can be tested without route mocking.
- Use the helper from both `POST /api/audit-rounds/preview` and `POST /api/audit-rounds` so preview counts match created items.
- Return `matchedAssets` as the original filter match count, `sampledAssets` or `generatedItems` as the final deduplicated audit item count, and `componentItems` as the component-expansion count.

Scan lookup:

- Return installed components for a parent asset when the scanned asset has child components.
- Return installed-in-parent context when the scanned asset is a component.
- Include current audit item status for related component assets in the current round.
- Keep the existing in-round/out-of-scope/unknown semantics unchanged.

Scan save:

- Keep the existing direct scan behavior for the selected asset.
- Extend `auditScanSchema` with optional `confirmedWithParentAssetId` and `componentConfirmationReason` fields for parent confirmation.
- When `confirmedWithParentAssetId` is present, require that the scanned `assetId` is actively installed under that parent asset.
- In the confirmation branch, update the component's own audit item, set `auditResult = "confirmed_with_parent"`, increment `scanCount`, and write `AuditScanHistory` with parent context in `rawPayload`.
- Apply parent-derived master-data sync only after an explicit correction, finding approval, transfer, register update, checkout/checkin, bulk operation, or component confirmation action.

Parent update and operation routes:

- Add a shared helper for component sync so asset register update, transfer, checkout/checkin, bulk move/update, audit scan correction, and audit finding review do not duplicate relationship traversal and movement logging.
- After the parent update succeeds inside its transaction, update installed component assets in the same database transaction.
- Create component movement records in the same transaction.
- Log the parent action normally and include component sync counts in the audit payload or system log payload.

## UI Behavior

Round creation:

- After candidate preview, show that installed components will be included automatically.
- If component expansion adds assets outside the visible filter, explain that they are included because they are installed under in-scope assets.
- If installed components have branch, location, department, or custodian values that differ from the parent before round creation, show a warning and allow the user to proceed. Do not add a "sync before round" action in this phase; normal parent update and transfer workflows own master-data sync.

Audit scan:

- Place the component panel below the selected asset's system data and above the save actions.
- Keep mobile actions compact: direct QR scan remains the primary path; confirm-with-parent and mark-missing are row actions.
- Use status labels that field users can distinguish quickly:
  - `ยังไม่ตรวจ`
  - `สแกนพบ`
  - `ยืนยันกับทรัพย์สินหลัก`
  - `ไม่พบ`
  - `ข้อมูลไม่ตรง`

Asset register update and operations:

- Show a short notice when the selected asset has installed components: "Installed components will be updated with this parent asset."
- For bulk operations, include installed component counts in the confirmation or result summary when selected parent assets have components.
- If sync skips any component because of lifecycle policy, show a warning after save with the skipped count and let the movement/audit records explain the details.

## Error Handling

- If component expansion finds a component asset that is inactive before round creation, skip it.
- If a component was removed after the round was created, keep the audit item but show the relationship as stale or previously installed.
- If a component confirmation is attempted for an asset that is no longer installed under the parent, reject the confirmation and ask the auditor to rescan or refresh.
- If component master-data sync partially fails, roll back the parent action because the parent and installed component records should remain consistent.
- If a closed audit round receives a component confirmation, reuse the existing closed-round rejection behavior.

## Testing

Add regression coverage for:

- Audit candidate grouping includes installed components for selected parent assets.
- Candidate grouping deduplicates components already in direct scope.
- Sampling keeps selected parent assets together with installed components.
- Preview and create routes use the same grouping helper and return consistent `componentItems` counts.
- Round creation snapshots expected values from the component asset record.
- Scan lookup returns child component context for a parent asset.
- Scan lookup returns installed-in-parent context for a component asset.
- Confirm-with-parent updates the component audit item, not only the parent audit item.
- Confirm-with-parent writes component scan history with parent context.
- Parent register update, transfer, checkout/checkin, bulk move/update, audit scan correction, and audit finding approval sync only supported fields to installed components.
- Audit sync does not add branch correction and does not sync condition from parent to component.
- Component sync skips removed links and writes component movement records for changed components.
- Existing direct scan and out-of-scope scan tests continue to pass.

## Documentation Updates

After implementation, update:

- `DEVELOPER_HANDOFF.md`
- `docs/03_DATABASE.md`
- `docs/06_WORKFLOWS.md`
- `docs/07_UAT_CHECKLIST.md`
- `docs/11_FEATURE_LIST.md`
- `docs/99_CHANGELOG.md`

## Scope Boundary

This design does not add a new relationship model or replace `AssetComponent`. It extends audit round creation, audit scanning, and parent asset update workflows so installed components are included, visible, auditable, and kept in sync with the parent when the workflow explicitly confirms the parent package. It does not add audit branch correction, automatic component condition sync, or automatic component status sync in this phase.

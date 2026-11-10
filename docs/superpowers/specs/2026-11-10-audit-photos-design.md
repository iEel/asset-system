# รูปกับการตรวจนับ (audit photos: register photo on the scan page, photos grouped by round)

**Inputs:**
- Wiki open question 67 (user, 2026-10-31): photos taken while scanning are stored as the asset's photos with no
  round, so nobody can see which round a photo came from.
- **Brainstorm 2026-11-10** in chat (no mockup).
- Calls marked **(my call)** are mine. The user has not seen them yet.

**User decisions 2026-11-10:**
- **Files tab:** the asset detail page's files tab groups the photos by audit round ("ได้ก็ดี"). How (option ข): one list, a round chip on each tile, filter chips by round (§4).
- **Scan page:** shows the asset's photo while counting. Today it shows only the asset tag, so the counter cannot see
  what the machine to check looks like.
- **Which photo, in this order** (user: "ลำดับนี้ได้"):
  1. the asset's own newest photo;
  2. otherwise the model's photo (รูปประจำรุ่น), with a small label saying so;
  3. otherwise the empty frame "ยังไม่มีรูป".
- **History:** the history tab already lists each round the asset was scanned in (round, time, who, result). The user
  asked about it, and a "ดูรูป" link from that row to the round's photos was offered and accepted together with this
  design ("ได้ เขียนเอกสารออกแบบเลย").

**Production facts (read-only count, 2026-11-10):**

| Fact | Count |
|---|---|
| Active assets | 1,781 |
| Active assets with a photo of their own | 456 (26%) |
| Active assets with their own photo or a model photo | 1,634 (92%) |
| Models with a photo | 229 of 281 |
| Asset photos | 496 |
| Asset photos uploaded within 30 minutes after a scan of that asset | 482 |
| Of those, photos matching scans in more than one round | 0 |
| Rounds | AUD-2026-0001 and AUD-2026-0002 cancelled; AUD-2026-0003 open, 832 assets scanned |

## 1. Goals, non-goals, anti-goals

**Goals:**
- The counter sees what the machine looks like before confirming it, on the phone and on the desktop.
- Anyone reading an asset sees which photos came from which round, and when.
- The round page's "มี" (photo attached) opens the photos it counts.

**Non-goals:**
- No new photo types, no change to the photo checklist, and no change to how photos are taken.
- No change to which photo the overview card or the pickers show.
- No offline image cache. Offline, the frame shows its placeholder.
- No database migration and no writes to Production data.

**Anti-goals (a failure even if it works):**
- **A model photo passed off as the machine's own.** A model photo is always labelled.
- **Counts that disagree with lists.** The round page's "มี" count, its dialog, and the files tab's chip for that
  round all use one rule (§2).
- **A slower scan page on the phone.** Lists load only small thumbnails, lazily.
- **A lost existing feature.** This applies to the files tab's uploads, deletes, checklist hints, primary chip and
  evidence groups, and to the round page's photo column and evidence line (memory: keep existing features).

## 2. Which round a photo belongs to (one rule, used everywhere)

A photo is an active `attachments` row with module `asset` and an image type that the thumbnail route accepts
(`isThumbnailable`).

- **New photos:**
  - The scan page's upload sends the audit item id it was taken for.
  - The server checks that the item belongs to that asset and to a round that is not cancelled. It then records the
    link: it appends the attachment id to `audit_items.photoEvidence`, stored as a JSON array of ids.
  - **(my call)** The column holds at most 12 ids (500 characters). Photos past that are left out of the column and
    fall back to the time rule below.
  - **Out-of-scope finds** upload their photos before the scan, as `evidenceAttachmentIds`, and the item does not
    exist yet. **(my call)** When the scan route creates the item, it writes those ids into the new item's
    `photoEvidence`, so these photos belong to the round as well.
  - Writing the link bumps the item's `updatedAt`, so the `scan-status` poll returns the row with its new photo.
- **Every photo without a link (older photos, the overflow, a refused link):**
  - **(my call)** The time rule covers all of them, with no cutoff date.
  - A photo belongs to round R if it was uploaded at or after a scan of the same asset in R, and less than 30
    minutes after that scan (`audit_scan_history`).
  - If more than one round matches, the latest scan wins. Production has no such photo today.
- **Cancelled rounds:** **(my call)** they count like any other round in both rules. The photos really were taken
  then, and the history tab lists those rounds too. Their group header says the round was cancelled. On Production
  this touches 6 assets (AUD-2026-0001 and -0002).
  - The new link is still refused for an item of a cancelled round, because no scan can happen in one.
- **Every other photo** belongs to no round.
- **One implementation:** the rule is one pure function plus one loader, shared by the files tab, the round page and
  the history row. No caller computes it its own way.
- **The round page today:** it counts any `asset` photo uploaded since the round's start date (`audit-round-page-data.ts`
  around L170-236). That changes to this rule. **(my call)** Its "มี" count can therefore drop slightly for photos
  added from the detail page during the round. The rule is stricter but matches what the user asked for.

## 3. Scan page: the asset's photo

**Which photo:** the order from the user decisions (own newest → model → empty).

- **Own photo:** the newest active asset image, whatever its label.
- **Model photo:** the newest active `asset_model` image of the asset's model.
- **Do not reuse the order of `chooseAssetPhotoPreview`** (`asset-photo-preview.ts`), which puts the model first for
  the pickers. That order stays as it is for the pickers. The scan page needs the asset-first order, which the detail
  overview already uses (`assets/[id]/page.tsx` around L455).

**Where it shows:**
- **Check form** (`AuditScanCheckForm`, both target kinds): a card-size photo at the top, beside or above the tag,
  name and serial. On the phone it is at the top of the sheet; on the desktop at the top of the side panel.
- **Out-of-scope lookup card:** the same card-size photo.
- **Room list rows** (`AuditScanRoomList`) **and search result rows** (`AuditScanSearchResults`): a small square
  thumbnail (the thumbnail route's 96 px size) at the row's start, `loading="lazy"`.
- **Candidates list** (several matches): **(my call)** no photo. These rows carry no asset data today, and the person
  picks one, which then shows the check form with its photo.
- **The model label:** a small "รูปประจำรุ่น" chip on the photo.
  - On the 96 px thumbnails a label does not fit, so **(my call)** the row gets the chip as text in its meta line,
    not on the image.
- **No photo:** the existing empty frame ("ยังไม่มีรูป", as on the handover picker, group 3 spec §19.5).
  - On list rows the empty frame is a neutral square, so the rows stay aligned.

**Data:**
- `AuditScanItemRow` and the lookup's asset gain one field, for example
  `photo: { attachmentId: string; fromModel: boolean } | null`.
- The field is filled by the loaders that already feed the page: `loadAuditScanRows`, the `scan-status` poll, and the
  `scan-lookup` route. Each fills it in one batched read per call, not one query per row.
- **After a photo is taken in this round:** the row shows it from the next poll, because the newest own photo wins.

**Permissions:**
- The scan page needs `audit:edit`. The thumbnail route needs `asset:view` for asset photos, and `brand:view` or
  `asset:view` for model photos.
- **(my call)** The loaders send a photo only when the viewer may load that thumbnail. Otherwise the field is `null`
  and no frame is drawn, so a 403 never shows as a broken image.
- The thumbnail route's permissions do not change.

## 4. Files tab: one photo list, filtered by round (user: option ข, 2026-11-10)

The user chose one photo list filtered by round. Two other options were turned down:
- two separate parts: most Production photos come from scans, so "รูปถ่าย" would be empty on nearly every asset;
- showing scan photos twice.

- **"รูปถ่าย" stays one list of every photo,** exactly as today (`getAssetFilesTabData`, `groupAssetFiles`,
  `asset-attachments.tsx`).
  - It keeps the primary chip, the checklist order, the "show all" fold, uploads, deletes and the missing-checklist
    hints.
  - All of these are still computed on every photo, as now.
- **Round chip on the tile:** a photo that belongs to a round (§2) gets a small chip with the round number on its
  tile, for example "AUD-2026-0003". It shows beside the primary chip when both apply.
- **Filter chips above the tiles,** shown only when at least one photo belongs to a round:
  - The chips are "ทั้งหมด n" (selected by default), then one chip per round with its count (the latest round
    first), then "ไม่ได้มาจากการตรวจนับ n" when such photos exist.
  - They use the app's shared filter chips. Each count equals the tiles that chip shows.
  - The selection lives in the URL, for example `?photoRound=AUD-2026-0003` on the files tab, so links land on it.
    An unknown value falls back to "ทั้งหมด".
- **With a round chip selected,** one line above the tiles gives that round's facts, the same facts as the history row:
  - the round number: a link to the round with `audit:view`, plain text without it;
  - the scan date;
  - the result in words;
  - the person who scanned.
  - A cancelled round adds "ยกเลิกแล้ว".
- **While filtered:** the "show all" fold applies to the filtered tiles. The missing-checklist hints and the upload
  control stay as they are, because they are about the asset, not the round.
- **Existing evidence groups** (`buildAssetEvidenceGroups`, finding files by AUD- number) stay where they are and
  unchanged. Finding evidence is a different kind of file from a scan photo.

## 5. Round page: "มี" opens the photos

- **In the photo column:** "มี" (`photoAttached`) becomes a button, on the desktop table and on the phone card. It
  opens a dialog with that item's photos for this round, under the rule in §2.
  - The dialog shows card-size tiles. Clicking a tile opens the original, the same preview as the files tab.
  - The dialog has a link to the asset's files tab with that round's chip selected.
- **"ไม่มี"** stays text.
- **The evidence line** ("มีรูป x จาก y ที่ตรวจแล้ว") uses the same rule, so its number equals the count of "มี".
- **Loading:** **(my call)** the dialog loads its photos when opened. The page itself loads no more images than today.

## 6. History: "ดูรูป"

- An audit row in the history tab (the `asset.history.auditScan` events) gets a "ดูรูป" link when that round has
  photos for the asset under §2.
  - The link goes to the files tab with that round's chip selected.
  - Rows without photos show no link.
- The audit item id or round id must reach the row, through a new field, not by parsing the event id.
  `buildAssetHistoryRows` keeps its access rule: without `audit:view` the round link is dropped, but "ดูรูป" stays,
  because it needs only `asset:view`.

## 7. Constraints

- **Code:** Next.js 16 (read `node_modules/next/dist/docs/` before writing code), next-intl Thai first, Prisma 7 on
  SQL Server.
- **Messages:** new words go through `node scripts/messages-edit.mjs` and follow `docs/19_THAI_GLOSSARY.md`.
  - Expected new words: "รูปประจำรุ่น", "ดูรูป", "ไม่ได้มาจากการตรวจนับ", "ยกเลิกแล้ว" and the dialog title.
- **Design:** the main system's components (navy shell, `AssetPhotoFrame`, the thumbnail route, phone cards,
  light/dark).
- **Database:** no migration. The only new writes are on the dev DB during tests, and the `photoEvidence` link that
  the app itself writes on upload.
- **E2E:** on the dev DB with run-marked data only, following the suite's rules. Photos are uploaded through the API,
  as the existing scan specs do.

## 8. Left to the builder

- Plan split. My guess is two plans:
  1. the rule, the loaders and the scan page;
  2. the files tab, the round dialog and history.
- Exact layout and sizes within the shared components. The look step checks them at 1440 light/dark, 1024 and 390
  light/dark.
- The 30-minute window is fixed. It is a constant in one place, not a setting.

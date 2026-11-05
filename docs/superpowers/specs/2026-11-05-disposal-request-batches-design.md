# ชุดคำขอตัดจำหน่าย: ฟอร์ม หน้าชุด และรายการชุด (DP-Batch-New, DP-Batch, DP-Batches)

Date: 2026-11-05 · Status: draft for the user's approval · Leftover of page group 6 (plan 4 ruling P4-R4 kept these pages as they were, under the ชุดคำขอ ▾ menu).

Canvas: https://claude.ai/artifact/3zDYLaUELU1ra6MeE9dB5p (boards DP-Batch-New, DP-Batch, DP-Batches). Assumptions: `.impeccable/critique/2026-10-20-canvas-assumptions.md` (## ฟอร์มและรายการที่เหลือ). Group 6 spec: `docs/superpowers/specs/2026-11-04-page-group-6-disposal-approvals-design.md` (rules this spec keeps: §9 request rules, §11 rounds).

## 1. Why

IT staff send several machines for disposal at once (a lot of old monitors, a department's computers). Their real routine (user, 2026-11-05):

1. check that each machine's asset tag and its Serial match;
2. photograph the whole lot together, and each machine on its own;
3. send the disposal request.

They photograph first and send later at a computer.

Today's batch form takes only shared files for the whole batch. It has no place for each machine's own photo. So the approvals page and the accounting Excel of a round (group 6 §11.5) show the same lot photo for every machine of a batch. Accounting cannot tell the machines apart, and the approver never sees each machine.

**User decisions at the builder check (2026-11-05):**
- **A machine's own photo is optional.** The lot photo is enough, as today; when a machine has its own photo, it is shown first.
- **No Serial check step.** The asset data already comes from this system, so the form does not ask the user to confirm the Serial; the Serial is shown in the row only to read.

**Success:** a batch of up to 100 machines is sent with one lot photo and, where the user took one, each machine's own photo. The approver and the accounting Excel show a machine's own photo when it has one, else the lot photo. The batch page shows how far the batch has got, through approval and rounds.

## 2. Goals, non-goals, anti-goals

**Goals**
- The batch form (DP-Batch-New) with an optional per-machine photo, the required lot photo, and the Serial shown per row.
- The batch page (DP-Batch): progress through the stages and rounds, the lot photo, each machine with its own photo, and a way to start a round from the batch's approved machines.
- The batch list (DP-Batches): a readable name per batch and its progress.

**Non-goals**
- No change to approval (the approvals page, group 6 plan 2), rounds (plan 4) or the single request form (plan 3).
- No import from Excel: the team now works in the system (user, 2026-11-05).
- No QR or camera scan to pick machines: labels are not printed yet; machines are found by typing.
- No price at request time (group 6 decision).

**Anti-goals (a failure even if it works)**
- Losing a machine's photo silently: a photo the user attached that failed to upload must be named, with a way to add it again.
- Making the per-machine photo a chore: adding one is a click on the row, not a separate page.

## 3. Constraints

- Thai first; words per `docs/19_THAI_GLOSSARY.md`; messages edited only through `node scripts/messages-edit.mjs` with dotted keys. Keep the group 6 words: ชุดคำขอ, รอบตัดจำหน่าย, บันทึกตัดจำหน่าย (no "จริง"), the method ตัดจำหน่าย.
- A batch holds 2–100 machines (today's limit, `src/lib/disposal-batch.ts`); unchanged.
- Each machine still becomes its own disposal request (DP-…) in one transaction, as today (`POST /api/disposal-batches`); each request is approved and recorded on its own.
- Photo rules from group 6 plan 1/3: JPG, PNG or WEBP count as a photo; HEIC is refused at once; a **lost** (สูญหาย) request needs one file of any kind instead of a photo.
- Permissions as today: the form needs `disposal:create`; the pages need `disposal:view`; starting a round needs `disposal:edit`.
- No migration is expected (see §8). Dev DB only for E2E.

## 4. The form `/disposal/batch/new` (DP-Batch-New)

On `OperationFormFrame`, like the single request form (plan 3) and the round form (plan 4): breadcrumbs, numbered sections, a summary panel, a sticky footer.

**Section 1 · เลือกทรัพย์สิน**
- A search box: type an asset tag, a Serial or a name; matches come from the existing server search. Choosing one adds it to the table. A machine that cannot be requested shows why, with the same readiness reasons as the single form ("ไม่มีงานค้าง: …" and its blockers) and is not added.
- The table of machines in the batch, one row each:
  - name, asset tag and the register's Serial (read only; "–" when the register has none);
  - the machine's **optional photo slot** "รูปของเครื่องนี้ (ไม่บังคับ)" (thumbnails, add more, remove), with the same accept list and HEIC refusal as the single form;
  - remove the machine from the batch.
- A count line: "{n} เครื่อง · มีรูปของเครื่อง {b} · ที่เหลือใช้รูปรวม".

**Section 2 · รูปรวมของชุด**: the lot photo slot, **required**: at least one photo (a lost batch: one file of any kind, such as a police report; a lost batch's rows have no photo slot *(my call)*).

**Section 3 · ประเภทและข้อมูลคำขอ**: the method (five cards, no default, "เปลี่ยนได้ตอนบันทึกรอบตัดจำหน่าย"), the reason ("อย่างน้อย 12 ตัวอักษร" with a live count), the requester preset to the signed-in user's employee (changeable), the advisory approver. No price fields.

**Summary panel "หลังส่งคำขอ"**: what happens to the machines (asset status → รอตัดจำหน่าย, each request → รอพิจารณา, who approves), like the single form.

**Send rules** (errors under their fields, the V-track way): at least 2 machines; the lot photo (a lost batch: a file of any kind); method; reason. A machine's own photo is never required. The footer button "ส่งคำขอ {n} เครื่อง". The old review step (batchReview) may stay as the confirm before the send *(builder's call: keep it only if the summary panel does not already make it redundant)*.

**After send:** the batch and its requests are created as today; then each machine's files go to its own request (`/api/disposal-requests/{id}/attachments`, the create result maps `assetId` → request id) and the lot files to the batch (`/api/disposal-batches/{id}/attachments`). Then the batch page opens. Uploads that fail do not undo the batch; the batch page names them (§5).

**Phone:** the form is for the computer *(my call: many rows and photos to attach; the team sends from a computer)*. On the phone the page says "สร้างชุดคำขอได้บนคอมพิวเตอร์" with a link to the single request form.

## 5. The batch page `/disposal/batches/[id]` (DP-Batch)

- **Header:** the batch number; a name built from its machines, the same rule as a round's title ("Monitor LG 22MK430H และอีก 4 เครื่อง"); method, requester, request date.
- **Progress:** a bar "ตัดจำหน่ายแล้ว {x}/{y}" and the counts by stage: รอพิจารณา · อนุมัติแล้ว รอตัดจำหน่าย · ตัดจำหน่ายแล้ว · ไม่อนุมัติ (the queue's stage words).
- **The lot photo** in a side panel (the shared gallery `disposal-photo-gallery.tsx`), with the batch's other files.
- **The machines table:** the machine's own first photo as a thumbnail; name, asset tag, Serial; the request number (link to the request); the stage badge; for a recorded machine, its round "DPR-… · {date}" as a link to the round page.
- **A row without its own photo** shows the muted "ใช้รูปรวม" and a link "แนบรูป" to that request's files *(my call: reuse the request page's attachments rather than a second uploader)*.
- **A photo the user attached that failed to upload** is named right after the send (a notice listing the machines, with their "แนบรูป" links) *(my call: nothing is stored about it; once the notice is gone the row reads "ใช้รูปรวม" like any other)*.
- **"สร้างรอบตัดจำหน่ายจากชุดนี้ ({n} เครื่อง)"** for `disposal:edit` when some machines are approved and not yet in a round: it selects those that can join a round (the round service's tick blocks) and opens `/disposal/rounds/new` with them (the plan 4 selection hand-over) *(my call)*. Machines that cannot join are counted with the reason.
- **Phone:** readable; the table becomes cards; no round button ("สร้างรอบตัดจำหน่ายได้บนคอมพิวเตอร์").

## 6. The batch list `/disposal/batches` (DP-Batches)

- Newest first; search (batch number, name, tag, requester); 25/50/100 per page.
- Each row: batch number; the name (§5 rule) with "{y} เครื่อง"; method; requester; request date; progress "ตัดจำหน่ายแล้ว {x}/{y}" with a small bar; open.
- A strip on top: requests in all batches by stage, with "{n} คำขอจาก {m} ชุด" *(builder's call whether it earns its place)*.
- Stays in the queue's ชุดคำขอ ▾ menu; the queue keeps its batch-number link per row.

## 7. What others see

- **The approvals page** (plan 2) and the request page (plan 3) already list a request's own photos before its batch's (`listDisposalPhotos`): the approver sees the machine's own photo when it has one, else the lot photo. No change; the E2E must show both.
- **The accounting Excel** of a round uses each request's first showable photo, own photos first, else the lot photo. No change; the E2E must show both.
- **The evidence rules stay as today:** the lot photo counts as evidence for every machine of the batch (approval, the round, the last-file guard).

## 8. Data

- No new table or column is expected: per-machine photos are ordinary request attachments; the lot photo stays a batch attachment.
- The batch name is computed when shown, like a round's title; nothing is stored.

## 9. What is left to the builder

- Component split, the search control (reuse the single form's asset search), how photo slots are laid out in a row at 1024.
- Whether the batchReview confirm stays (§4), whether the list's strip earns its place (§6).
- How many uploads run at once after the send (the round report uses a pool of 4).

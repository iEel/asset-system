# AMS redesign mockups — direction contract

Product: enterprise asset management for Thai corporate operations (Thai is the primary UI language). Mode: Operate. Read PRODUCT.md in D:\Antigravity\asset-system for users and anti-references (no consumer/playful styling, no marketing hero, no decorative gradients, no glass, no heavy motion).

Owner's complaint: the current UI "doesn't look beautiful, doesn't feel premium, isn't inviting". The 2026-10-08 critique found: stock Tailwind palette with no identity; color spent as decoration (pastel tiles, rainbow KPI icons, tones that disagree between pages); flat hierarchy with box-in-box panels and the primary object buried; components re-implemented per page; untuned Thai typography and numbers.

## The world (owner decisions — pinned)

- Identity from the app icon: navy #083161 (sidebar, brand), cobalt primary #1A5FB4 for actions, teal #18A0A8 as a small accent (focus ring, active nav icon, the "พร้อมใช้งาน" state). The icon itself is the logo.
- Type: IBM Plex Sans + IBM Plex Sans Thai for UI; IBM Plex Mono only for asset tags, document numbers and codes (class `tag`).
- Signature: ledger precision. Tabular, right-aligned money and counts; Buddhist-era dates dd/mm/2569; one quiet surface level; color only marks state that needs attention.
- Dashboard serves both operators and executives: one compact KPI strip (4–5 numbers) + one "needs action" list + calm trend/status visuals. It must not duplicate the work center: link to it.

## Hard rules

- Use ONLY the classes in base.css and the icon sprite ids in icons.html (`<svg class="i"><use href="#i-..."/></svg>`; nav icons use `<svg><use .../></svg>`). Small screen-local styles are allowed only in a `<style>` inside your section, scoped under your section id, and only for layout that base.css lacks (e.g. a chart). No new colors: use the CSS custom properties.
- Copy the app shell markup from screens/register.html exactly (brand, nav groups, topbar); move `aria-current="page"` to your screen's nav item. Keep `__ICON__` as the brand image src (it is replaced at assembly).
- Panels: white surface, 1px border, radius 12, NO shadow. Never nest a bordered box inside a panel: use `.rows` dividers, `dl.kv`, or plain spacing. No pastel tile grids. No colored icon per metric. Tint (soft background) only a thing that needs action now, and only with a state tone.
- Stat numbers use `.t-metric` inside `.stats` / `.stat` (one panel with divided cells). Never larger than the page title's visual priority intent: the page title (`.t-page`, 24px) leads; metrics are 28px but quiet (no color).
- Status always as `.badge` with a tone class: b-ready (พร้อมใช้งาน), b-ok (ใช้งานอยู่, ผ่าน, ตรง), b-neutral (ถูกยืม, neutral info), b-warn (รอซ่อม, อยู่ระหว่างซ่อม, รอพิจารณา, ไม่ตรง), b-bad (only truly blocking/critical states).
- Trend deltas: `.delta.good` / `.delta.bad` / `.delta.flat` decided by meaning, not sign (more repairs or more findings = bad; more assets registered = neutral/flat).
- Thai copy uses the glossary: ที่ตั้ง (not พื้นที่/ตำแหน่ง), รายการไม่ตรง (not Finding), พิจารณา (not Review), ยืมใช้ชั่วคราว/ถูกยืม, ผู้ถือครอง, รหัสทรัพย์สิน, ขอบเขต/นอกขอบเขต, ตรวจนับ. No English UI words where Thai exists (keep Serial, License, QR, Excel, PDF, PM).
- No eyebrow/kicker labels above headings. No emoji. No lorem ipsum. People's names are fictional and short (e.g. "สุภาวดี ร.", "ธนกร ศ.", "วิภาวรรณ ก.", "ณัฐพล ส.", "อรอุมา จ."). Never use real employee names.
- Accessible markup: real `<button>`, `<a href>`, `<table>` with `<th scope>`, labels for inputs, `aria-label` on icon-only buttons. Text contrast >= 4.5:1 (the tokens already satisfy this; do not put --ink-3 text on tinted backgrounds).
- Every `<section>` you write: `<section class="mk-screen" id="s-...">` with a `<header>` holding `<h2>` (screen name) and a `<ul>` of 2–4 short Thai bullets: what changed from today and which critique issue it fixes. Then the `.app` frame (or `.phones` for mobile).
- Desktop frames are designed for 1440px wide; they must still reflow without horizontal page scroll down to ~400px (base.css handles the shell; tables scroll inside `.table-wrap`).

## Real data to use (dev database, 08/10/2569)

Register status counts: ทั้งหมด 1,751 · พร้อมใช้งาน 127 · ใช้งานอยู่ 1,380 · ถูกยืม 2 · รอซ่อม 7 · อยู่ระหว่างซ่อม 3.
Needs action now: รายการไม่ตรงรอพิจารณา 3 · ยังซ่อมไม่เสร็จ 1 (MT-20261007-0005 · SNI-EQU-19-0271 Monitor DELL LCD 18.5 E1916H · ส่งซ่อม 07/10/2569) · งานรออนุมัติ 0 · ตัดจำหน่ายรออนุมัติ 0 · อนุมัติแล้วรอดำเนินการ 0 · PM ถึงกำหนดใน 7 วัน 0 · แผนแก้ไขค้าง 0 · ทรัพย์สินที่ยังไม่ตรวจในรอบที่เปิด 1,538.
Out-of-scope (cross-owner) assets: ทั้งหมด 909 · ผู้ถือครองต่างบริษัท 231 · ผู้ถือครองต่างสาขา 319 · ที่ตั้งต่างสาขา 728. Examples: GRL-COM-06-0001 Notebook DELL Pro 14 Essential PV14255 (สำนักงานใหญ่ สาทุประดิษฐ์) ผู้ถือครองต่างบริษัท; GRL-COM-15-0001 Monitor LENOVO E1922S WLED 18.5 ที่ตั้งต่างสาขา; GRL-COM-15-0008 Desktop Computer Lenovo ThinkCentre Edge 72 ที่ตั้งต่างสาขา.
Trends this month vs last: ทรัพย์สินเพิ่มใหม่ 0 (เดือนก่อน 3) · ใบซ่อมเปิดใหม่ 5 (2) · รายการไม่ตรงใหม่ 7 (0) · คำขอตัดจำหน่ายใหม่ 0 (0). When last month is 0 show "ใหม่" or the absolute change, never "+100%".
Recent activity (08/10/2569): 00:13 อัปโหลดรูป GRL-EQU-20-0012 VoIP Grandstream GXP1760W · 00:13 ตรวจนับ AUD-2026-0003 · GRL-EQU-20-0012 · 23:43 (07/10) ตรวจนับ GRL-EQU-20-0010 · 23:31 ตรวจนับ GRL-EQU-20-0004 · 23:29 ตรวจนับ GRL-COM-22-0011. Actor: ผู้ดูแลระบบ.
Open audit round (document codes keep their Gregorian year, as the system generates them; dates on screen are Buddhist-era): AUD-2026-0003 "ตรวจนับแผนกบัญชี ไตรมาส 4/2569" (fictional name; dates 07/10/2569–31/10/2569; created by วิภาวรรณ ก.). 45 รายการ: ตรวจแล้ว 12 · รอตรวจ 33 · ความคืบหน้า 27%. ผลตรวจ: พบตรง 10 · ที่ตั้งไม่ตรง 2 · ผู้ถือครองไม่ตรง 1 · สภาพไม่ตรง 2 · นอกขอบเขต 1 · รอพิจารณา 3 · ไม่พบ 0. หลักฐานรูป: มีรูป 3 · ยังไม่มีรูป 42. ก่อนปิดรอบ: รายการรอตรวจ 33 (ยังไม่ผ่าน) · รายการไม่ตรงรอพิจารณา 3 (ยังไม่ผ่าน) · แผนแก้ไขค้าง 0 (ผ่าน) · ผู้ปิดรอบต้องไม่ใช่ผู้สร้างรอบ (ผ่าน).
Round items (tags/names are real; holders fictional): SNI-EQU-21-0055 Notebook DELL Latitude 3410 · ที่ตั้งในระบบ SNI ชั้น 4 · รอตรวจ; SNI-EQU-26-0022 Desktop Computer DELL Pro Micro QCM1255 · GRL ชั้น 4 · รอตรวจ; GRL-COM-19-0023 Monitor DELL LCD 18.5 E1916H · PT ชั้น 2 · รอตรวจ; SNI-EQU-21-0306 Printer Epson LQ-590II · DC ชั้น 1 · รอตรวจ; GRL-COM-26-0017 Monitor Dell Pro 22 E2225HM FHD · ACC ชั้น 4 · รอตรวจ; GRL-EQU-20-0012 VoIP Grandstream GXP1760W · สภาพไม่ตรง · รอพิจารณา; GRL-COM-24-0003 Network Equipment Cisco Meraki MX95 · ที่ตั้งไม่ตรง · รอพิจารณา; GRL-COM-18-0087 Desktop Computer DELL Optiplex 3050 · ตรง.
Asset detail example: GRL-COM-24-0003 Network Equipment Cisco Meraki MX95 · ใช้งานอยู่ · สภาพดี · ที่ตั้ง IT ชั้น 1 (GRL) · ผู้ถือครอง สุภาวดี ร. แผนกไอที · หมวดหมู่ อุปกรณ์เครือข่าย · มูลค่า 64,900.00 บาท · วันที่ซื้อ 12/03/2567 · ประกันถึง 12/03/2570 · ผู้ขาย บริษัท เน็ตเวิร์ค โซลูชั่น จำกัด (fictional) · Serial Q2XX-8H4K-29WN (fictional) · ตรวจนับล่าสุด AUD-2026-0003 ที่ตั้งไม่ตรง รอพิจารณา · ประวัติ: 12/03/2567 ลงทะเบียน · 15/03/2567 ส่งมอบให้ สุภาวดี ร. · 02/09/2568 ซ่อม (เปลี่ยนพาวเวอร์ซัพพลาย) ซ่อมเสร็จ · 07/10/2569 ตรวจนับ พบที่ห้องเซิร์ฟเวอร์ PT (ที่ตั้งไม่ตรง).
Users/roles in the topbar: ผู้ดูแลระบบ.

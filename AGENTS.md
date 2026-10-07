<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## ชั้น Knowledge Wiki

Wiki ความรู้เชิงธุรกิจอยู่นอก repo ที่ `D:\Obsidian\Eltross\AssetSystem` (ต้องขอสิทธิ์เข้าถึงโฟลเดอร์ก่อนอ่าน)

- เริ่มที่ `AssetSystem/ams-status.md` → `AssetSystem/ams-open-questions.md` → `AssetSystem/ams-index.md`
- อ่าน `AssetSystem/_schema/ams-wiki-schema.md` ก่อนแก้ไฟล์ใด ๆ ในนั้น
- **LLM เขียน คนอ่าน** ทุกหน้าเนื้อหาต้องมี frontmatter `status` / `verified` / `confidence` / `sources`
- `sources` ต้องเป็น path จริงในโปรเจกต์เท่านั้น · `confidence: unverified` = สรุปจากเอกสาร ยังไม่ทวนกับโค้ด
- **wiki ไม่ใช่แหล่งความจริงของ API และ schema** — ยึดโค้ดกับ `docs/` ของ repo
- หน้าใหม่ต้องมีชื่อใน `ams-index.md` เสมอ · ทุกครั้งที่แก้ให้เพิ่มบรรทัดใน `AssetSystem/ams-log.md` · รัน `node tools/wiki-lint.mjs AssetSystem --repo D:/Antigravity/asset-system --prefix ams-` (ที่ `D:\Obsidian\Eltross`) ก่อนถือว่าเสร็จ
- ชื่อไฟล์ห้ามชนกับหน้าอื่นทั้ง vault — ชนให้เติม `ams-` นำหน้า

## ข้อมูลกลาง (Shared)

ข้อมูลกลางอยู่ที่ `D:\Obsidian\Eltross\Shared` — อ่าน `Shared.md` ก่อนแตะระบบบริษัท · ถ้าขัดกับไฟล์นี้ ให้ยึดไฟล์นี้

โปรเจกต์นี้ใช้:

- **AD / LDAP v1.0** — อ่าน `D:\Obsidian\Eltross\Shared\systems\ad-ldap\ad-ldap.md` ก่อนแก้โค้ด login
  LDAP ฝั่ง server เท่านั้น · ห้าม NEXT_PUBLIC_* · key ผู้ใช้ = objectGUID · กลุ่มเข้าระบบ APP-<PROJECT>-USERS
  ข้อยกเว้นของโปรเจกต์นี้ (มีก่อน Shared): ค่า LDAP รวม bind password เก็บในตาราง `system_settings` แก้ผ่าน Admin > Settings ไม่ได้ copy ไป `.env.local` · ยังจับคู่บัญชีด้วย username / email / employeeID ไม่ใช่ objectGUID และยังไม่ใช้กลุ่ม `APP-*-USERS` (ค้างใน `AssetSystem/ams-open-questions.md`)
- **SQL Server connection** — `D:\Obsidian\Eltross\Shared\conventions\sqlserver-connection\sqlserver-connection.md`
  ข้อยกเว้น: ใช้ตัวแปร `DB_SERVER` / `DB_INSTANCE` / `DB_USER` / `DB_PASSWORD` / `DATABASE_URL` เดิมใน `.env` · DB Production ชื่อ `asset_management` · เครื่องพัฒนาใช้ `asset_management_dev` กับ login `asset_dev` (ห้ามใส่ `sa` หรือ DB Production ใน `.env` ของเครื่องพัฒนา)

- ค่าลับอยู่ใน `.env` (ถูก git ignore) เท่านั้น · ห้าม commit · ลงทะเบียนชื่อตัวแปร (ไม่จดค่า) ใน `Shared/shared-adoption.md`
- **ระบบบริษัท (HR, SMF, AD, เครื่อง HIP) อ่านอย่างเดียว** — คำสั่งที่ไม่ใช่ `SELECT` ห้ามรันจนกว่าผู้ใช้อนุมัติต่อครั้ง พร้อมแสดง SQL เต็ม
- เซิร์ฟเวอร์ SQL ของ Production ใช้ร่วมกับระบบอื่นของบริษัท — คำสั่งที่เขียนลง `asset_management` ต้องได้รับอนุมัติต่อครั้งพร้อมแสดง SQL เต็ม

import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const seed = readFileSync("prisma/seed.ts", "utf8")
const sql = readFileSync("prisma/manual-migrations/2026-10-08-thai-status-wording.sql", "utf8")

test("seeded status names and descriptions follow the glossary", () => {
  assert.match(seed, /name: "Checked Out", nameTh: "ถูกยืม", description: "ถูกยืมใช้ชั่วคราวและมีรายการยืมที่ยังเปิดอยู่"/)
  assert.match(seed, /name: "Ready", nameTh: "พร้อมใช้งาน", description: "พร้อมสำหรับส่งมอบ ยืมใช้ หรือเริ่มขั้นตอนอื่น"/)
  assert.match(seed, /name: "In Use", nameTh: "ใช้งานอยู่", description: "ทรัพย์สินระยะยาวที่มีผู้ถือครองและกำลังใช้งาน"/)
  assert.match(seed, /name: "Under Inspection", nameTh: "อยู่ระหว่างตรวจสอบ", description: "กำลังตรวจสอบที่ตั้ง ผู้ถือครอง สภาพ หรือข้อมูล ก่อนสรุปขั้นตอนงานถัดไป"/)
  assert.doesNotMatch(seed, /ถูกเบิก|เบิกใช้|ผู้ครอบครอง/)
})

test("the data fix only replaces the old default wording, by English name", () => {
  assert.match(sql, /UPDATE \[dbo\]\.\[asset_statuses\]/)
  assert.match(sql, /WHERE \[name\] = N'Checked Out' AND \[nameTh\] = N'ถูกเบิก'/)
  assert.match(sql, /WHERE \[name\] = N'Ready' AND \[description\] = N'พร้อมสำหรับมอบหมาย เบิกใช้ หรือเริ่มกระบวนการอื่น'/)
  assert.match(sql, /WHERE \[name\] = N'In Use' AND \[description\] = N'ทรัพย์สินระยะยาวที่มีผู้ครอบครองและกำลังใช้งาน'/)
  assert.match(sql, /WHERE \[name\] = N'Under Inspection' AND \[description\] = N'กำลังตรวจสอบตำแหน่ง ผู้ถือครอง สภาพ หรือข้อมูล ก่อนสรุปขั้นตอนงานถัดไป'/)
  assert.doesNotMatch(sql, /ALTER TABLE|DROP|DELETE/i)
})

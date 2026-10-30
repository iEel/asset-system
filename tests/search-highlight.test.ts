import assert from "node:assert/strict"
import test from "node:test"

import { splitSearchHighlightWords, type SearchHighlightPart } from "../src/lib/search-highlight.ts"

const view = (parts: SearchHighlightPart[]) => parts.map((part) => (part.marked ? `[${part.text}]` : part.text)).join("")

test("each word is marked wherever it shows, case-insensitive; overlapping or touching words make one mark (spec §11)", () => {
  assert.deepEqual(splitSearchHighlightWords("โน้ตบุ๊ก Dell Latitude 5440", ["dell", "5440"]), [
    { text: "โน้ตบุ๊ก ", marked: false }, { text: "Dell", marked: true }, { text: " Latitude ", marked: false }, { text: "5440", marked: true },
  ])
  assert.equal(view(splitSearchHighlightWords("EMP-0412 - สมชาย ใจดี", ["สมชาย", "ใจดี"])), "EMP-0412 - [สมชาย] [ใจดี]")
  assert.equal(view(splitSearchHighlightWords("IT-2 ห้อง IT ชั้น 2", ["it"])), "[IT]-2 ห้อง [IT] ชั้น 2")
  assert.equal(view(splitSearchHighlightWords("SNI-EQU-26-0001", ["equ", "qu-2"])), "SNI-[EQU-2]6-0001")
  assert.equal(view(splitSearchHighlightWords("SNI-EQU-26-0001", ["sni", "-equ"])), "[SNI-EQU]-26-0001")
})

test("nothing to mark: one plain part; an empty value has no parts", () => {
  for (const words of [["zz"], [], ["  "]]) assert.deepEqual(splitSearchHighlightWords("Printer", words), [{ text: "Printer", marked: false }])
  assert.deepEqual(splitSearchHighlightWords("", ["a"]), [])
})

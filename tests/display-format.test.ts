import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { formatCount, formatMoney, isBlankValue } from "../src/lib/display-format.ts"

const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const NBSP = " "

test("formatCount groups thousands the same way on every machine", () => {
  assert.equal(formatCount(1751), "1,751")
  assert.equal(formatCount(1234567), "1,234,567")
  assert.equal(formatCount(0), "0")
  assert.equal(formatCount(-42), "-42")
  assert.equal(formatCount(-0), "0", "negative zero prints as 0")
  assert.equal(formatCount(1751), new Intl.NumberFormat("en-US").format(1751), "th-TH digits and grouping match en-US")
})

test("formatMoney always shows two decimals and puts the unit after a no-break space", () => {
  assert.equal(formatMoney(64900), "64,900.00")
  assert.equal(formatMoney(-1500.5), "-1,500.50")
  assert.equal(formatMoney(0), "0.00")
  assert.equal(formatMoney(-0.001), "0.00", "an amount that rounds to zero never prints -0.00")
  assert.equal(formatMoney(64900, { unit: "บาท" }), `64,900.00${NBSP}บาท`)
  assert.equal(formatMoney(12.3, { unit: "THB" }), `12.30${NBSP}THB`)
  assert.equal(formatMoney(5, { unit: "" }), "5.00")
})

test("missing numbers come back as null so the caller can show Nil", () => {
  assert.equal(formatCount(null), null)
  assert.equal(formatCount(undefined), null)
  assert.equal(formatMoney(undefined), null)
  assert.equal(formatMoney(null, { unit: "บาท" }), null)
})

test("isBlankValue treats only null, undefined and blank strings as empty", () => {
  for (const value of [null, undefined, "", "  ", "\t\n"]) {
    assert.equal(isBlankValue(value), true, `${JSON.stringify(value)} is blank`)
  }
  for (const value of [0, false, "0", "-", "GRL-COM-24-0003", [], {}]) {
    assert.equal(isBlankValue(value), false, `${JSON.stringify(value)} is a value`)
  }
})

test("display-format is import-free TypeScript with two fixed th-TH formatters", () => {
  const source = read("src/lib/display-format.ts")
  assert.doesNotMatch(source, /^import /m, "tests import this file directly")
  assert.equal(source.match(/new Intl\.NumberFormat\("th-TH"/g)?.length, 2)
  assert.doesNotMatch(source, /toLocaleString\(/)
  assert.doesNotMatch(source, /style: "currency"|฿/)
})

test("Nil hides the dash from screen readers and says a word instead", () => {
  const source = read("src/components/ui/nil.tsx")
  assert.doesNotMatch(source, /"use client"/)
  assert.match(source, /const t = useTranslations\("common"\)/)
  assert.match(source, /<span data-slot="nil" className=\{cn\("text-faint-foreground", className\)\}>/)
  assert.match(source, /<span aria-hidden="true">—<\/span>/)
  assert.match(source, /<span className="sr-only">\{label \?\? t\("noValue"\)\}<\/span>/)
  assert.match(source, /import \{ isBlankValue \} from "@\/lib\/display-format"/)
  assert.match(source, /return isBlankValue\(value\) \? <Nil label=\{label\} \/> : value/)
})

import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import { formatLocationType, getLocationTypeLabelKey, locationTypes } from "../src/lib/location-types.ts"

// Functional fix batch Task 10 (critique 2026-10-20 E2, ruling 12): location types are stored in English and read in
// the person's language on the form, the list, its filter and the global search. Unknown stored values show as stored.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const th = JSON.parse(readFileSync("messages/th.json", "utf8")).location as Record<string, unknown>
const en = JSON.parse(readFileSync("messages/en.json", "utf8")).location as Record<string, unknown>

const labels: Record<string, [string, string]> = {
  Site: ["สถานที่", "Site"],
  Building: ["อาคาร", "Building"],
  Floor: ["ชั้น", "Floor"],
  Room: ["ห้อง", "Room"],
  Area: ["บริเวณ", "Area"],
  Zone: ["โซน", "Zone"],
  Rack: ["แร็ก", "Rack"],
  Desk: ["โต๊ะทำงาน", "Desk"],
  Storage: ["คลังจัดเก็บ", "Storage"],
  Vehicle: ["ยานพาหนะ", "Vehicle"],
  "User-held": ["อยู่กับผู้ถือครอง", "Held by custodian"],
  Offsite: ["นอกสถานที่", "Off-site"],
}

test("every location type maps to a location label in th and en", () => {
  assert.deepEqual([...locationTypes], ["Site", "Building", "Floor", "Room", "Area", "Zone", "Rack", "Desk", "Storage", "Vehicle", "User-held", "Offsite"])
  for (const type of locationTypes) {
    const key = getLocationTypeLabelKey(type)
    assert.equal(key, `type_${type}`)
    assert.equal(th[key!], labels[type][0], `th location.${key}`)
    assert.equal(en[key!], labels[type][1], `en location.${key}`)
  }
})

test("unknown, empty or inherited values have no key, and format shows them as stored", () => {
  assert.equal(getLocationTypeLabelKey("room"), null)
  assert.equal(getLocationTypeLabelKey(null), null)
  assert.equal(getLocationTypeLabelKey(undefined), null)
  assert.equal(getLocationTypeLabelKey(""), null)
  assert.equal(getLocationTypeLabelKey("toString"), null)
  const t = (key: string) => `[${key}]`
  assert.equal(formatLocationType("Legacy", t), "Legacy")
  assert.equal(formatLocationType("Room", t), "[type_Room]")
  // A plain module: the validation schema re-exports the list, and node tests load it.
  assert.doesNotMatch(read("src/lib/location-types.ts"), /^import /m)
  assert.match(read("src/lib/validations/location.ts"), /from "@\/lib\/location-types"/)
})

test("the location form, the list, its filter and the global search read the type label", () => {
  const form = read("src/components/master-data/location-form.tsx")
  const page = read("src/app/[locale]/(dashboard)/master-data/locations/page.tsx")
  const search = read("src/app/api/search/route.ts")
  assert.doesNotMatch(form, />\s*\{type\}\s*</, "the form's options show the raw value")
  assert.doesNotMatch(page, /label: type \}/, "the filter shows the raw value")
  assert.doesNotMatch(page, /\{location\.locationType\}/, "the column shows the raw value")
  assert.doesNotMatch(search, /badge: \{ label: location\.locationType,/, "the search badge shows the raw value")
  for (const [name, source] of [["form", form], ["page", page], ["search", search]] as const) {
    assert.match(source, /formatLocationType\(/, `${name}: no formatLocationType`)
  }
  // The integration API is a data contract and keeps the stored value.
  assert.doesNotMatch(read("src/lib/integration-reference.ts"), /formatLocationType/)
})

// User decision 2026-10-21 Y3: a type's label (the person's language, any case, any part of it) finds its locations.
test("matchLocationTypesByLabel finds the types whose label contains the query", async () => {
  const { matchLocationTypesByLabel, getLocationTypeLabels } = await import("../src/lib/location-types.ts")
  const thLabels = getLocationTypeLabels((key) => String(th[key]))
  const enLabels = getLocationTypeLabels((key) => String(en[key]))
  assert.equal(thLabels.Room, "ห้อง"); assert.equal(enLabels["User-held"], "Held by custodian")
  assert.deepEqual(matchLocationTypesByLabel("ห้อง", thLabels), ["Room"])
  assert.deepEqual(matchLocationTypesByLabel("ชั้น", thLabels), ["Floor"])
  assert.deepEqual(matchLocationTypesByLabel("room", enLabels), ["Room"])
  assert.deepEqual(matchLocationTypesByLabel(" CUSTODIAN ", enLabels), ["User-held"])
  assert.deepEqual(matchLocationTypesByLabel("สถานที่", thLabels), ["Site", "Offsite"])
  assert.deepEqual(matchLocationTypesByLabel("", thLabels), [])
  assert.deepEqual(matchLocationTypesByLabel("   ", thLabels), [])
  assert.deepEqual(matchLocationTypesByLabel("ไม่มีประเภทนี้", thLabels), [])
})

test("the locations list and the global search pass the person's type labels to the search", () => {
  const page = read("src/app/[locale]/(dashboard)/master-data/locations/page.tsx")
  assert.match(page, /buildLocationWhere\(listState, matchLocationTypesByLabel\(listState\.search, getLocationTypeLabels\(t\)\)\)/)
  const search = read("src/app/api/search/route.ts")
  assert.match(search, /const matchingTypes = matchLocationTypesByLabel\(query, getLocationTypeLabels\(t\)\)/)
  assert.match(search, /\.\.\.\(matchingTypes\.length > 0 \? \[\{ locationType: \{ in: matchingTypes \} \}\] : \[\]\),/)
})

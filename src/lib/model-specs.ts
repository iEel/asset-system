export type ModelSpecItem = {
  id: string
  label: string
  value: string
}

export type StructuredModelSpecs = {
  version: 1
  items: ModelSpecItem[]
  notes: string
}

const structuredSpecsVersion = 1

const knownSpecLabels = [
  "Processor",
  "CPU",
  "Memory",
  "RAM",
  "Memory Slots",
  "Max Memory",
  "Storage",
  "Storage Slot",
  "Display",
  "Graphics",
  "OS",
  "Warranty",
  "Ports",
  "Network",
  "Battery",
  "Weight",
]

export const notebookSpecPreset = [
  "Processor",
  "Memory",
  "Storage",
  "Display",
  "Graphics",
  "OS",
  "Warranty",
  "Ports",
]

export const computerSpecPreset = [
  "Processor",
  "Memory",
  "Storage",
  "Graphics",
  "OS",
  "Warranty",
]

export const defaultSpecPreset = [
  "Model",
  "Size",
  "Material",
  "Color",
  "Warranty",
]

export function parseModelSpecs(value: string | null | undefined): StructuredModelSpecs {
  const raw = value?.trim()
  if (!raw) return emptyStructuredSpecs()

  try {
    const parsed = JSON.parse(raw) as Partial<StructuredModelSpecs>
    if (parsed.version === structuredSpecsVersion && Array.isArray(parsed.items)) {
      return {
        version: structuredSpecsVersion,
        items: parsed.items
          .map((item) => ({
            id: item.id || createSpecId(),
            label: String(item.label ?? "").trim(),
            value: String(item.value ?? "").trim(),
          }))
          .filter((item) => item.label || item.value),
        notes: typeof parsed.notes === "string" ? parsed.notes : "",
      }
    }
  } catch {
    // Fall through to legacy plain-text parsing.
  }

  const parsedLegacy = parseLegacySpecs(raw)
  return parsedLegacy.items.length > 0 ? parsedLegacy : { ...emptyStructuredSpecs(), notes: raw }
}

export function serializeModelSpecs(specs: StructuredModelSpecs) {
  const normalized = {
    version: structuredSpecsVersion,
    items: specs.items
      .map((item) => ({
        id: item.id || createSpecId(),
        label: item.label.trim(),
        value: item.value.trim(),
      }))
      .filter((item) => item.label || item.value),
    notes: specs.notes.trim(),
  } satisfies StructuredModelSpecs

  if (normalized.items.length === 0 && !normalized.notes) return null
  return JSON.stringify(normalized)
}

export function createSpecId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function emptyStructuredSpecs(): StructuredModelSpecs {
  return { version: structuredSpecsVersion, items: [], notes: "" }
}

export function summarizeModelSpecs(value: string | null | undefined, maxItems = 3) {
  const specs = parseModelSpecs(value)
  const itemSummary = specs.items
    .slice(0, maxItems)
    .map((item) => `${item.label}: ${item.value}`)
    .join(" · ")
  if (itemSummary) return itemSummary
  return specs.notes || null
}

export function chooseSpecPreset(category?: { code?: string | null; name?: string | null }) {
  const text = `${category?.code ?? ""} ${category?.name ?? ""}`.toLowerCase()
  if (text.includes("notebook") || text.includes("laptop") || text.includes("คอมพิวเตอร์พกพา")) {
    return notebookSpecPreset
  }
  if (text.includes("computer") || text.includes("desktop") || text.includes("คอมพิวเตอร์")) {
    return computerSpecPreset
  }
  return defaultSpecPreset
}

function parseLegacySpecs(raw: string): StructuredModelSpecs {
  const labelPattern = knownSpecLabels
    .map((label) => label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .sort((a, b) => b.length - a.length)
    .join("|")
  const matches = Array.from(raw.matchAll(new RegExp(`\\b(${labelPattern})\\s*:`, "gi")))
  if (matches.length === 0) {
    return { ...emptyStructuredSpecs(), notes: raw }
  }

  const items = matches.map((match, index) => {
    const start = (match.index ?? 0) + match[0].length
    const end = index + 1 < matches.length ? matches[index + 1].index ?? raw.length : raw.length
    return {
      id: createSpecId(),
      label: normalizeSpecLabel(match[1]),
      value: raw.slice(start, end).trim().replace(/\s+/g, " "),
    }
  }).filter((item) => item.value)

  return { version: structuredSpecsVersion, items, notes: "" }
}

function normalizeSpecLabel(label: string) {
  const lower = label.toLowerCase()
  return knownSpecLabels.find((known) => known.toLowerCase() === lower) ?? label
}

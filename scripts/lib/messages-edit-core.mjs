// Pure helpers behind scripts/messages-edit.mjs (imported by tests).

export function applyMessageChanges(messages, changes, locale) {
  const next = structuredClone(messages)
  for (const [path, value] of Object.entries(changes.set?.[locale] ?? {})) setPath(next, path, value)
  for (const path of changes.delete ?? []) deletePath(next, path)
  return next
}

export function serializeMessages(messages, eol) {
  return `${JSON.stringify(messages, null, 2)}\n`.replace(/\n/g, eol)
}

function setPath(target, path, value) {
  const parts = path.split(".")
  let node = target
  for (const part of parts.slice(0, -1)) {
    if (typeof node[part] !== "object" || node[part] === null) node[part] = {}
    node = node[part]
  }
  node[parts.at(-1)] = value
}

function deletePath(target, path) {
  const parts = path.split(".")
  const trail = []
  let node = target
  for (const part of parts.slice(0, -1)) {
    if (typeof node?.[part] !== "object" || node[part] === null) throw new Error(`No such key: ${path}`)
    trail.push([node, part])
    node = node[part]
  }
  const leaf = parts.at(-1)
  if (!node || !(leaf in node)) throw new Error(`No such key: ${path}`)
  delete node[leaf]
  for (let index = trail.length - 1; index >= 0; index -= 1) {
    const [parent, key] = trail[index]
    if (Object.keys(parent[key]).length > 0) break
    delete parent[key]
  }
}

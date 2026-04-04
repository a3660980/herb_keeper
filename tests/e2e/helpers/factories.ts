export function createUniqueSuffix() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
}

export function createUniquePhone() {
  const digits = Date.now().toString().slice(-8)

  return `09${digits}`
}
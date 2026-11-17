const SIGNED_URL = /[?&](?:sig|signature)=/i

export function containsSignedUrl(value: string): boolean {
  return SIGNED_URL.test(value)
}

export function sanitizeValue(value: unknown): unknown {
  if (typeof value === 'string') {
    return containsSignedUrl(value) ? undefined : value
  }
  if (typeof value === 'number' || typeof value === 'boolean' || value === null) return value
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item)).filter((item) => item !== undefined)
  }
  if (typeof value === 'object' && value) {
    const record = value as Record<string, unknown>
    const output: Record<string, unknown> = {}
    for (const [key, item] of Object.entries(record)) {
      if (key === 'video' && item && typeof item === 'object') {
        const video = item as Record<string, unknown>
        output.video = {
          id: video.id ?? null,
          status: video.status ?? null,
          width: video.width ?? null,
          height: video.height ?? null,
        }
        continue
      }
      if (key === 'photo' && item && typeof item === 'object') {
        const photo = item as Record<string, unknown>
        output.photo = typeof photo.key === 'string' ? { key: photo.key } : {}
        continue
      }
      if (key === 'avatar' || key === 'feature_image_attributes' || key === 'background_image_attributes') {
        continue
      }
      const next = sanitizeValue(item)
      if (next !== undefined) output[key] = next
    }
    return output
  }
  return undefined
}

export function assertNoSignedUrls(value: unknown): void {
  const serialized = JSON.stringify(value)
  if (serialized && containsSignedUrl(serialized)) {
    throw new Error('sanitized payload still contains a signed URL')
  }
}

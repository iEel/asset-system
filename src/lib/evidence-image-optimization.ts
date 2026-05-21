const MB = 1024 * 1024

export const EVIDENCE_IMAGE_OPTIMIZATION_POLICY = {
  maxUploadBytes: 10 * MB,
  optimizeAboveBytes: 3 * MB,
  targetLongEdgePx: 2560,
  minReadableLongEdgePx: 1800,
  jpegQuality: 0.9,
  outputMimeType: "image/jpeg",
  outputExtension: "jpg",
} as const

const optimizableImageTypes = new Set(["image/jpeg", "image/png", "image/webp"])

type EvidenceFileLike = {
  name?: string
  type: string
  size: number
}

type EvidenceImageDimensions = {
  width: number
  height: number
}

type EvidenceImageOptimizationPlan =
  | {
      action: "skip_non_image" | "keep_original" | "keep_original_format"
      reason: string
      jpegQuality: number
      minReadableLongEdgePx: number
      targetLongEdgePx: null
    }
  | {
      action: "optimize"
      reason: string
      jpegQuality: number
      minReadableLongEdgePx: number
      targetLongEdgePx: number
    }

export function getEvidenceImageOptimizationPlan(
  file: EvidenceFileLike,
  dimensions?: EvidenceImageDimensions,
  policy = EVIDENCE_IMAGE_OPTIMIZATION_POLICY,
): EvidenceImageOptimizationPlan {
  if (!file.type.startsWith("image/")) {
    return buildKeepPlan("skip_non_image", "Only image files are optimized.", policy)
  }

  if (!optimizableImageTypes.has(file.type)) {
    return buildKeepPlan("keep_original_format", "This image format is preserved to avoid browser conversion loss.", policy)
  }

  if (file.size <= policy.optimizeAboveBytes) {
    return buildKeepPlan("keep_original", "Small images are already upload-friendly.", policy)
  }

  return {
    action: "optimize",
    reason: "Large evidence image can be compressed with a readable long-edge guard.",
    jpegQuality: policy.jpegQuality,
    minReadableLongEdgePx: policy.minReadableLongEdgePx,
    targetLongEdgePx: dimensions ? getReadableTargetLongEdge(dimensions, policy) : policy.targetLongEdgePx,
  }
}

export function buildOptimizedEvidenceImageName(fileName: string, policy = EVIDENCE_IMAGE_OPTIMIZATION_POLICY) {
  const trimmed = fileName.trim()
  if (!trimmed) return `evidence.${policy.outputExtension}`
  return trimmed.replace(/\.[^.]+$/, "") + `.${policy.outputExtension}`
}

export async function optimizeEvidenceImageFile(
  file: File,
  policy = EVIDENCE_IMAGE_OPTIMIZATION_POLICY,
): Promise<{ file: File; plan: EvidenceImageOptimizationPlan; originalSize: number; optimizedSize: number | null }> {
  const initialPlan = getEvidenceImageOptimizationPlan(file, undefined, policy)
  if (initialPlan.action !== "optimize") {
    return { file, plan: initialPlan, originalSize: file.size, optimizedSize: null }
  }

  if (typeof document === "undefined" || typeof createImageBitmap !== "function") {
    return { file, plan: buildKeepPlan("keep_original", "Browser image optimization is not available.", policy), originalSize: file.size, optimizedSize: null }
  }

  try {
    const bitmap = await createImageBitmap(file)
    const dimensions = { width: bitmap.width, height: bitmap.height }
    const plan = getEvidenceImageOptimizationPlan(file, dimensions, policy)
    if (plan.action !== "optimize") {
      bitmap.close()
      return { file, plan, originalSize: file.size, optimizedSize: null }
    }

    const originalLongEdge = Math.max(dimensions.width, dimensions.height)
    const scale = originalLongEdge > 0 ? plan.targetLongEdgePx / originalLongEdge : 1
    const width = Math.max(1, Math.round(dimensions.width * scale))
    const height = Math.max(1, Math.round(dimensions.height * scale))
    const canvas = document.createElement("canvas")
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext("2d", { alpha: false })
    if (!context) {
      bitmap.close()
      return { file, plan: buildKeepPlan("keep_original", "Canvas rendering is not available.", policy), originalSize: file.size, optimizedSize: null }
    }

    context.drawImage(bitmap, 0, 0, width, height)
    bitmap.close()

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, policy.outputMimeType, policy.jpegQuality))
    if (!blob || blob.size >= file.size) {
      return { file, plan: buildKeepPlan("keep_original", "Optimized image was not smaller than the original.", policy), originalSize: file.size, optimizedSize: blob?.size ?? null }
    }

    return {
      file: new File([blob], buildOptimizedEvidenceImageName(file.name, policy), { type: policy.outputMimeType, lastModified: file.lastModified }),
      plan,
      originalSize: file.size,
      optimizedSize: blob.size,
    }
  } catch {
    return { file, plan: buildKeepPlan("keep_original", "Image optimization failed safely; the original file is preserved.", policy), originalSize: file.size, optimizedSize: null }
  }
}

function getReadableTargetLongEdge(dimensions: EvidenceImageDimensions, policy: typeof EVIDENCE_IMAGE_OPTIMIZATION_POLICY) {
  const originalLongEdge = Math.max(dimensions.width, dimensions.height)
  if (originalLongEdge <= 0) return policy.targetLongEdgePx
  if (originalLongEdge < policy.minReadableLongEdgePx) return originalLongEdge
  return Math.max(Math.min(originalLongEdge, policy.targetLongEdgePx), policy.minReadableLongEdgePx)
}

function buildKeepPlan(
  action: "skip_non_image" | "keep_original" | "keep_original_format",
  reason: string,
  policy: typeof EVIDENCE_IMAGE_OPTIMIZATION_POLICY,
): EvidenceImageOptimizationPlan {
  return {
    action,
    reason,
    jpegQuality: policy.jpegQuality,
    minReadableLongEdgePx: policy.minReadableLongEdgePx,
    targetLongEdgePx: null,
  }
}

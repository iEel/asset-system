import { readFile } from "fs/promises"
import sharp from "sharp"
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth } from "@/lib/auth-utils"
import { errorResponse } from "@/lib/api-response"
import { assertSafeUploadPath } from "@/lib/uploads"
import { assertCanViewAttachment } from "@/lib/attachment-access"
import {
  attachmentThumbnailSize,
  buildThumbnailETag,
  isThumbnailable,
  matchesIfNoneMatch,
  thumbnailCacheHeaders,
  thumbnailNotModifiedHeaders,
} from "@/lib/attachment-thumbnail"

export const runtime = "nodejs"

type ThumbnailRouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, context: ThumbnailRouteContext) {
  try {
    const user = await requireAuth()
    const { id } = await context.params
    const attachment = await prisma.attachment.findFirst({
      where: { id, isActive: true },
      select: { id: true, module: true, assetId: true, referenceId: true, filePath: true, fileType: true },
    })

    if (!attachment) {
      return NextResponse.json({ error: "Attachment not found" }, { status: 404 })
    }
    await assertCanViewAttachment(user, attachment)

    if (!isThumbnailable(attachment.fileType)) {
      return NextResponse.json({ error: "Attachment is not an image" }, { status: 415 })
    }

    const etag = buildThumbnailETag(attachment.id)
    if (matchesIfNoneMatch(request.headers.get("if-none-match"), etag)) {
      return new NextResponse(null, { status: 304, headers: thumbnailNotModifiedHeaders(etag) })
    }

    let file: Buffer
    try {
      file = await readFile(assertSafeUploadPath(attachment.filePath))
    } catch (error) {
      if (isMissingFileError(error)) {
        return NextResponse.json({ error: "Attachment file not found" }, { status: 404 })
      }
      throw error
    }

    let thumbnail: Buffer
    try {
      thumbnail = await sharp(file)
        .rotate()
        .resize(attachmentThumbnailSize, attachmentThumbnailSize, { fit: "inside", withoutEnlargement: true })
        .webp({ quality: 75 })
        .toBuffer()
    } catch {
      return NextResponse.json({ error: "Image could not be processed" }, { status: 422 })
    }

    return new NextResponse(new Uint8Array(thumbnail), {
      headers: { ...thumbnailCacheHeaders(etag), "Content-Length": String(thumbnail.length) },
    })
  } catch (error) {
    return errorResponse(error)
  }
}

function isMissingFileError(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT"
}

import { existsSync } from "node:fs"
import { posix, win32 } from "node:path"

export const pdfThaiFontFamily = "AssetPdfThai"

type PdfFontSource =
  | "env"
  | "bundled-noto-sans-thai"
  | "bundled-sarabun"
  | "ubuntu-noto-sans-thai"
  | "ubuntu-noto-sans-thai-ui"
  | "ubuntu-thai-tlwg-garuda"
  | "windows-tahoma"
  | "fallback-helvetica"

type PdfFontCandidate = {
  source: PdfFontSource
  regularPath: string
  boldPath?: string
}

export type PdfFontResolution = {
  family: string
  source: PdfFontSource
  regularPath: string | null
  boldPath: string | null
  shouldRegister: boolean
}

type ResolvePdfFontOptions = {
  cwd?: string
  env?: Record<string, string | undefined>
  exists?: (path: string) => boolean
}

export function resolvePdfFont(options: ResolvePdfFontOptions = {}): PdfFontResolution {
  const cwd = options.cwd ?? process.cwd()
  const env = options.env ?? process.env
  const fileExists = options.exists ?? existsSync

  for (const candidate of buildFontCandidates(cwd, env)) {
    if (!fileExists(candidate.regularPath)) continue

    const boldPath = candidate.boldPath && fileExists(candidate.boldPath) ? candidate.boldPath : candidate.regularPath

    return {
      family: pdfThaiFontFamily,
      source: candidate.source,
      regularPath: candidate.regularPath,
      boldPath,
      shouldRegister: true,
    }
  }

  return {
    family: "Helvetica",
    source: "fallback-helvetica",
    regularPath: null,
    boldPath: null,
    shouldRegister: false,
  }
}

function buildFontCandidates(cwd: string, env: Record<string, string | undefined>): PdfFontCandidate[] {
  const candidates: PdfFontCandidate[] = []

  const envRegular = env.PDF_THAI_FONT_REGULAR?.trim()
  if (envRegular) {
    candidates.push({
      source: "env",
      regularPath: envRegular,
      boldPath: env.PDF_THAI_FONT_BOLD?.trim() || undefined,
    })
  }

  candidates.push(
    {
      source: "bundled-noto-sans-thai",
      regularPath: joinProjectPath(cwd, "public", "fonts", "NotoSansThai-Regular.ttf"),
      boldPath: joinProjectPath(cwd, "public", "fonts", "NotoSansThai-Bold.ttf"),
    },
    {
      source: "bundled-sarabun",
      regularPath: joinProjectPath(cwd, "public", "fonts", "Sarabun-Regular.ttf"),
      boldPath: joinProjectPath(cwd, "public", "fonts", "Sarabun-Bold.ttf"),
    },
    {
      source: "ubuntu-noto-sans-thai",
      regularPath: "/usr/share/fonts/truetype/noto/NotoSansThai-Regular.ttf",
      boldPath: "/usr/share/fonts/truetype/noto/NotoSansThai-Bold.ttf",
    },
    {
      source: "ubuntu-noto-sans-thai-ui",
      regularPath: "/usr/share/fonts/truetype/noto/NotoSansThaiUI-Regular.ttf",
      boldPath: "/usr/share/fonts/truetype/noto/NotoSansThaiUI-Bold.ttf",
    },
    {
      source: "ubuntu-thai-tlwg-garuda",
      regularPath: "/usr/share/fonts/truetype/tlwg/Garuda.ttf",
      boldPath: "/usr/share/fonts/truetype/tlwg/Garuda-Bold.ttf",
    },
  )

  const windowsRoot = env.SystemRoot || env.WINDIR
  if (windowsRoot) {
    candidates.push({
      source: "windows-tahoma",
      regularPath: win32.join(windowsRoot, "Fonts", "tahoma.ttf"),
      boldPath: win32.join(windowsRoot, "Fonts", "tahomabd.ttf"),
    })
  }

  return candidates
}

function joinProjectPath(cwd: string, ...segments: string[]) {
  return isWindowsPath(cwd) ? win32.join(cwd, ...segments) : posix.join(cwd, ...segments)
}

function isWindowsPath(path: string) {
  return /^[A-Za-z]:[\\/]/.test(path) || path.includes("\\")
}

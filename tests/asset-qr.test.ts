import assert from "node:assert/strict"
import test from "node:test"

import {
  buildAssetQrPath,
  buildAssetQrRedirectUrl,
  buildAssetQrValue,
  extractAssetLookupCandidatesFromScanValue,
  isLikelyLocalAssetQrValue,
  normalizePublicQrBaseUrl,
} from "../src/lib/asset-qr.ts"

test("builds public QR URLs through the stable resolver path", () => {
  assert.equal(buildAssetQrPath("asset 123"), "/q/a/asset%20123")
  assert.equal(
    buildAssetQrValue({
      assetId: "41552d77-e2e7-45d2-8594-0fa3e7dea45f",
      publicBaseUrl: "https://asset.company.com/",
      fallbackBaseUrl: "http://old-server:3000",
    }),
    "https://asset.company.com/q/a/41552d77-e2e7-45d2-8594-0fa3e7dea45f"
  )
})

test("falls back safely when public QR base URL is not configured", () => {
  assert.equal(normalizePublicQrBaseUrl("https://asset.company.com/"), "https://asset.company.com")
  assert.equal(normalizePublicQrBaseUrl("ftp://asset.company.com"), "")
  assert.equal(
    buildAssetQrValue({
      assetId: "asset-1",
      publicBaseUrl: "",
      fallbackBaseUrl: "http://localhost:3000/",
    }),
    "http://localhost:3000/q/a/asset-1"
  )
})

test("detects QR values that should not be printed for production labels", () => {
  assert.equal(isLikelyLocalAssetQrValue("http://localhost:3000/q/a/asset-1"), true)
  assert.equal(isLikelyLocalAssetQrValue("http://127.0.0.1:3000/q/a/asset-1"), true)
  assert.equal(isLikelyLocalAssetQrValue("http://192.168.1.10/q/a/asset-1"), true)
  assert.equal(isLikelyLocalAssetQrValue("/q/a/asset-1"), true)
  assert.equal(isLikelyLocalAssetQrValue("https://asset.soniclogistic.org/q/a/asset-1"), false)
})

test("builds QR resolver redirects from public or forwarded origins instead of localhost", () => {
  assert.equal(
    buildAssetQrRedirectUrl({
      targetPath: "/th/assets/asset-1",
      publicBaseUrl: "https://asset.soniclogistic.org",
      requestUrl: "http://localhost:3000/q/a/asset-1",
      forwardedHost: "asset.internal.local",
      forwardedProto: "https",
      host: "localhost:3000",
      fallbackBaseUrl: "http://localhost:3000",
    }),
    "https://asset.soniclogistic.org/th/assets/asset-1"
  )

  assert.equal(
    buildAssetQrRedirectUrl({
      targetPath: "/th/assets/asset-1",
      requestUrl: "http://localhost:3000/q/a/asset-1",
      forwardedHost: "asset.soniclogistic.org",
      forwardedProto: "https",
      host: "localhost:3000",
      fallbackBaseUrl: "http://localhost:3000",
    }),
    "https://asset.soniclogistic.org/th/assets/asset-1"
  )
})

test("extracts audit scan lookup candidates from new resolver and legacy asset URLs", () => {
  assert.deepEqual(
    extractAssetLookupCandidatesFromScanValue("https://asset.company.com/q/a/ASSET-001?utm=label"),
    ["https://asset.company.com/q/a/asset-001?utm=label", "asset-001"]
  )
  assert.deepEqual(
    extractAssetLookupCandidatesFromScanValue("http://old-server/th/assets/41552D77#qr"),
    ["http://old-server/th/assets/41552d77#qr", "41552d77"]
  )
  assert.deepEqual(
    extractAssetLookupCandidatesFromScanValue("/q/a/Sonic-COM-05-0001"),
    ["/q/a/sonic-com-05-0001", "sonic-com-05-0001"]
  )
})

import assert from "node:assert/strict"
import test from "node:test"

import {
  environmentCameraId,
  getFallbackCameraAfterEnvironmentFailure,
  resolvePreferredCameraSelection,
} from "../src/lib/camera-selection.ts"

test("prefers an explicitly selected camera device", () => {
  const selection = resolvePreferredCameraSelection(
    [
      { id: "front", label: "FaceTime HD Camera" },
      { id: "back", label: "Back Camera" },
    ],
    "front"
  )

  assert.equal(selection.selectedCameraId, "front")
  assert.equal(selection.cameraConfig, "front")
  assert.equal(selection.usesEnvironmentConstraint, false)
})

test("prefers a labelled rear camera when no explicit camera is selected", () => {
  const selection = resolvePreferredCameraSelection([
    { id: "front", label: "Front Camera" },
    { id: "rear", label: "Rear Camera" },
  ])

  assert.equal(selection.selectedCameraId, "rear")
  assert.equal(selection.cameraConfig, "rear")
})

test("uses environment facing mode when mobile camera labels are blank", () => {
  const selection = resolvePreferredCameraSelection([
    { id: "camera-1", label: "" },
    { id: "camera-2", label: "" },
  ])

  assert.equal(selection.selectedCameraId, environmentCameraId)
  assert.deepEqual(selection.cameraConfig, { facingMode: { exact: "environment" } })
  assert.equal(selection.usesEnvironmentConstraint, true)
})

test("falls back to the first real camera if environment facing mode cannot start", () => {
  const cameras = [
    { id: "camera-1", label: "" },
    { id: "camera-2", label: "" },
  ]
  const selection = resolvePreferredCameraSelection(cameras)

  assert.deepEqual(getFallbackCameraAfterEnvironmentFailure(selection, cameras), cameras[0])
})

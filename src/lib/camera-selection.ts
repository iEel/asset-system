export const environmentCameraId = "__environment_camera__"

export type WebCameraDevice = {
  id: string
  label: string
}

export type PreferredCameraSelection = {
  selectedCameraId: string
  cameraConfig: string | MediaTrackConstraints
  usesEnvironmentConstraint: boolean
}

const rearCameraLabelPattern = /back|rear|environment|หลัง/i

export function resolvePreferredCameraSelection(
  cameras: WebCameraDevice[],
  requestedCameraId?: string | null
): PreferredCameraSelection {
  const requested = requestedCameraId?.trim() ?? ""

  if (requested === environmentCameraId) {
    return buildEnvironmentSelection()
  }

  const requestedCamera = cameras.find((camera) => camera.id === requested)
  if (requestedCamera) {
    return buildDeviceSelection(requestedCamera.id)
  }

  const rearCamera = cameras.find((camera) => rearCameraLabelPattern.test(camera.label))
  if (rearCamera) {
    return buildDeviceSelection(rearCamera.id)
  }

  if (cameras.length > 1) {
    return buildEnvironmentSelection()
  }

  return buildDeviceSelection(cameras[0]?.id ?? environmentCameraId)
}

export function getFallbackCameraAfterEnvironmentFailure(
  selection: PreferredCameraSelection,
  cameras: WebCameraDevice[]
) {
  return selection.usesEnvironmentConstraint ? cameras[0] ?? null : null
}

function buildEnvironmentSelection(): PreferredCameraSelection {
  return {
    selectedCameraId: environmentCameraId,
    cameraConfig: { facingMode: { exact: "environment" } },
    usesEnvironmentConstraint: true,
  }
}

function buildDeviceSelection(cameraId: string): PreferredCameraSelection {
  return {
    selectedCameraId: cameraId,
    cameraConfig: cameraId,
    usesEnvironmentConstraint: false,
  }
}

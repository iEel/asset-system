import assert from "node:assert/strict"
import test from "node:test"

import {
  buildNotificationWebhookPayload,
  resolveNotificationDeliveryConfig,
} from "../src/lib/notification-delivery.ts"

test("builds a generic webhook payload for digest delivery", () => {
  const payload = buildNotificationWebhookPayload({
    title: "Daily follow-up digest",
    message: "- Warranty: 2",
    type: "warning",
    module: "notification_digest",
    referenceId: "notification-digest:2026-05-20",
    user: {
      id: "user-1",
      displayName: "Admin",
      email: "admin@example.com",
    },
  })

  assert.deepEqual(payload, {
    title: "Daily follow-up digest",
    message: "- Warranty: 2",
    type: "warning",
    module: "notification_digest",
    referenceId: "notification-digest:2026-05-20",
    recipient: {
      id: "user-1",
      name: "Admin",
      email: "admin@example.com",
    },
  })
})

test("enables webhook delivery only when a valid URL is configured", () => {
  assert.deepEqual(resolveNotificationDeliveryConfig({ NOTIFICATION_DIGEST_WEBHOOK_URL: "" }), {
    enabled: false,
    webhookUrl: null,
  })
  assert.deepEqual(resolveNotificationDeliveryConfig({ NOTIFICATION_DIGEST_WEBHOOK_URL: "https://hooks.example.com/digest" }), {
    enabled: true,
    webhookUrl: "https://hooks.example.com/digest",
  })
})

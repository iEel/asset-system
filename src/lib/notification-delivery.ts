export type NotificationWebhookPayload = {
  title: string
  message: string
  type: string
  module: string | null
  referenceId: string | null
  recipient: {
    id: string
    name: string
    email: string | null
  }
}

export type NotificationDeliveryConfig = {
  enabled: boolean
  webhookUrl: string | null
}

export type NotificationWebhookInput = {
  title: string
  message: string
  type: string
  module?: string | null
  referenceId?: string | null
  user: {
    id: string
    displayName: string
    email: string | null
  }
}

export function buildNotificationWebhookPayload(input: NotificationWebhookInput): NotificationWebhookPayload {
  return {
    title: input.title,
    message: input.message,
    type: input.type,
    module: input.module ?? null,
    referenceId: input.referenceId ?? null,
    recipient: {
      id: input.user.id,
      name: input.user.displayName,
      email: input.user.email,
    },
  }
}

export function resolveNotificationDeliveryConfig(env: Record<string, string | undefined> = process.env): NotificationDeliveryConfig {
  const webhookUrl = env.NOTIFICATION_DIGEST_WEBHOOK_URL?.trim() ?? ""
  if (!webhookUrl) {
    return { enabled: false, webhookUrl: null }
  }

  try {
    const url = new URL(webhookUrl)
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return { enabled: false, webhookUrl: null }
    }
  } catch {
    return { enabled: false, webhookUrl: null }
  }

  return { enabled: true, webhookUrl }
}

export async function deliverNotificationWebhook({
  webhookUrl,
  payload,
  fetcher = fetch,
}: {
  webhookUrl: string
  payload: NotificationWebhookPayload
  fetcher?: typeof fetch
}) {
  const response = await fetcher(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  if (!response.ok) {
    throw new Error(`Notification webhook failed with HTTP ${response.status}`)
  }
}

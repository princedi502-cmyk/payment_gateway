export interface OneSignalPushPayload {
  externalUserId: string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
}

export interface OneSignalServiceOptions {
  appId?: string;
  restApiKey?: string;
}

export class OneSignalService {
  private readonly appId: string;
  private readonly restApiKey: string;
  private readonly baseUrl = "https://onesignal.com/api/v1/notifications";

  constructor(options: OneSignalServiceOptions = {}) {
    const resolvedAppId = options.appId || process.env.ONESIGNAL_APP_ID;
    const resolvedRestApiKey = options.restApiKey || process.env.ONESIGNAL_REST_API_KEY;

    if (!resolvedAppId) {
      throw new Error("ONESIGNAL_APP_ID is not configured");
    }
    if (!resolvedRestApiKey) {
      throw new Error("ONESIGNAL_REST_API_KEY is not configured");
    }

    this.appId = resolvedAppId;
    this.restApiKey = resolvedRestApiKey;
  }

  async sendPushToExternalId({
    externalUserId,
    title,
    message,
    data,
  }: OneSignalPushPayload): Promise<{ success: boolean; id?: string; errors?: string[] }> {
    const body = {
      app_id: this.appId,
      target_type: 4,
      include_external_user_ids: [externalUserId],
      headings: { en: title },
      contents: { en: message },
      data,
    };

    const response = await fetch(this.baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${this.restApiKey}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      const text = await response.text();
      return { success: false, errors: [`HTTP ${response.status}: ${text}`] };
    }

    const payload = (await response.json()) as {
      id?: string;
      errors?: string[];
      external_user_ids?: string[];
    };

    if (payload.errors && payload.errors.length > 0) {
      return { success: false, errors: payload.errors };
    }

    const result: { success: boolean; id?: string } = { success: true };
    if (payload.id) {
      result.id = payload.id;
    }
    return result;
  }
}

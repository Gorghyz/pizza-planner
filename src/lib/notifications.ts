type NotificationPriority = "1" | "2" | "3" | "4" | "5" | "min" | "low" | "default" | "high" | "urgent";

type PublishNotificationInput = {
  title: string;
  message: string;
  clickPath?: string;
  priority?: NotificationPriority;
  tags?: string;
};

type NotifyOrderCreatedInput = {
  orderId: number;
  totalPizzas: number;
  totalPriceCents: number;
  promisedTime: string;
};

type NotifyCustomerRequestCreatedInput = {
  requestId: number;
  totalPizzas: number;
  totalPriceCents: number;
  selectedSlot: string;
};

function isEnabled(): boolean {
  const rawValue =
    process.env.NOTIFICATIONS_ENABLED ??
    process.env.NTFY_NOTIFICATIONS_ENABLED ??
    "";

  return ["1", "true", "yes", "on"].includes(rawValue.trim().toLowerCase());
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function trimSlashes(value: string): string {
  return value.replace(/^\/+|\/+$/g, "");
}

function formatEuros(priceCents: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(priceCents / 100);
}

function buildClickUrl(path?: string): string | undefined {
  if (!path) {
    return undefined;
  }

  const baseUrl =
    process.env.NTFY_CLICK_BASE_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    "https://atabletonton.fr";

  try {
    return new URL(path, baseUrl).toString();
  } catch {
    return undefined;
  }
}

async function publishNotification(input: PublishNotificationInput): Promise<void> {
  if (!isEnabled()) {
    return;
  }

  const topic = process.env.NTFY_TOPIC?.trim();

  if (!topic) {
    console.warn("[notifications] NTFY_TOPIC absent : notification ignorée.");
    return;
  }

  const serverUrl = trimTrailingSlash(
    process.env.NTFY_SERVER_URL?.trim() || "https://ntfy.sh",
  );

  const url = `${serverUrl}/${trimSlashes(topic)}`;
  const clickUrl = buildClickUrl(input.clickPath);
  const accessToken = process.env.NTFY_ACCESS_TOKEN?.trim();

  const headers: Record<string, string> = {
    "Content-Type": "text/plain; charset=utf-8",
    Title: input.title,
    Priority: input.priority ?? "high",
    Tags: input.tags ?? "pizza,bell",
  };

  if (clickUrl) {
    headers.Click = clickUrl;
  }

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const controller = new AbortController();
  const timeout = windowlessSetTimeout(() => controller.abort(), 4000);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: input.message,
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      console.warn(
        `[notifications] ntfy a répondu ${response.status} ${response.statusText}`,
        errorText,
      );
    }
  } catch (error) {
    console.warn("[notifications] impossible d'envoyer la notification ntfy", error);
  } finally {
    clearTimeout(timeout);
  }
}

function windowlessSetTimeout(callback: () => void, delayMs: number): NodeJS.Timeout {
  return setTimeout(callback, delayMs);
}

export async function notifyOrderCreated(
  input: NotifyOrderCreatedInput,
): Promise<void> {
  const lines = [
    `Commande #${input.orderId}`,
    `${input.totalPizzas} pizza(s)`,
    `Total : ${formatEuros(input.totalPriceCents)}`,
    `Créneau : ${input.promisedTime}`,
  ];

  await publishNotification({
    title: "Nouvelle commande",
    message: lines.join("\n"),
    clickPath: "/business/cuisine",
    priority: "high",
    tags: "pizza,bell",
  });
}

export async function notifyCustomerRequestCreated(
  input: NotifyCustomerRequestCreatedInput,
): Promise<void> {
  const lines = [
    `Demande internet #${input.requestId}`,
    `${input.totalPizzas} pizza(s)`,
    `Total : ${formatEuros(input.totalPriceCents)}`,
    `Créneau demandé : ${input.selectedSlot}`,
    "À confirmer dans les demandes.",
  ];

  await publishNotification({
    title: "Nouvelle demande internet",
    message: lines.join("\n"),
    clickPath: "/business/demandes",
    priority: "high",
    tags: "pizza,bell",
  });
}
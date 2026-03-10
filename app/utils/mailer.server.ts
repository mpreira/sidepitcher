const DEFAULT_ADMIN_NOTIFICATION_EMAIL = "mlpreira@gmail.com";

interface NewAccountNotificationInput {
  accountName: string;
  accountEmail: string;
}

function sanitizeEnvSecret(value: string | undefined): string {
  if (!value) {
    return "";
  }

  const trimmed = value.trim();
  // Render/UI copy-paste can accidentally include wrapping quotes.
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }

  return trimmed;
}

export async function sendNewAccountNotificationEmail(
  input: NewAccountNotificationInput
): Promise<void> {
  const apiKey = sanitizeEnvSecret(process.env.RESEND_API_KEY);
  const from = process.env.RESEND_FROM_EMAIL ?? "SidePitcher <onboarding@resend.dev>";
  const adminNotificationEmail =
    process.env.ADMIN_NOTIFICATION_EMAIL?.trim() || DEFAULT_ADMIN_NOTIFICATION_EMAIL;

  if (!apiKey) {
    console.warn("[mailer] RESEND_API_KEY missing: skipping account notification email", {
      to: adminNotificationEmail,
      from,
      accountEmail: input.accountEmail,
    });
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [adminNotificationEmail],
      subject: "Nouveau compte SidePitcher",
      text: `Un nouveau compte a été créé.\n\nNom: ${input.accountName}\nEmail: ${input.accountEmail}`,
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    const keyFingerprint = apiKey.length >= 8 ? `${apiKey.slice(0, 4)}...${apiKey.slice(-4)}` : "too-short";
    throw new Error(
      `Unable to send account notification email (status ${response.status}, key ${keyFingerprint}): ${details}`
    );
  }

  console.info("[mailer] account notification email sent", {
    to: adminNotificationEmail,
    from,
    accountEmail: input.accountEmail,
  });
}

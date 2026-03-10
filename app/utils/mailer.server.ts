const ADMIN_NOTIFICATION_EMAIL = "mlpreira@gmail.com";

interface NewAccountNotificationInput {
  accountName: string;
  accountEmail: string;
}

export async function sendNewAccountNotificationEmail(
  input: NewAccountNotificationInput
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL ?? "SidePitcher <onboarding@resend.dev>";

  if (!apiKey) {
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
      to: [ADMIN_NOTIFICATION_EMAIL],
      subject: "Nouveau compte SidePitcher",
      text: `Un nouveau compte a été créé.\n\nNom: ${input.accountName}\nEmail: ${input.accountEmail}`,
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Unable to send account notification email: ${details}`);
  }
}

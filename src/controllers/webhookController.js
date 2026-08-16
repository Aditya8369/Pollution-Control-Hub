import crypto from 'crypto';

export const registerWebhook = async (req, res) => {
  const { url, event_type } = req.body;

  if (!url || !event_type) {
    return res.status(400).json({ error: "URL and event_type are required." });
  }

  // Generate a unique signing secret for this specific webhook
  const secret = crypto.randomBytes(32).toString('hex');

  const newWebhook = {
    url,
    event_type,
    secret,
    is_active: true,
    created_at: new Date()
  };

  try {
    // TODO: Save `newWebhook` to your database here
    // await db.webhooks.insert(newWebhook);

    return res.status(201).json({
      message: "Webhook registered successfully",
      data: {
        url: newWebhook.url,
        event_type: newWebhook.event_type,
        secret: newWebhook.secret // Return secret ONCE so the client can save it to verify signatures
      }
    });
  } catch (error) {
    console.error("Failed to register webhook:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

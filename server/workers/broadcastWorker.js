const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * @module broadcastWorker
 * @description Background job queue worker that handles rate-limited, asynchronous dispatch of SMS and email alerts via third-party gateways.
 */

const RATE_LIMIT_SMS = 10; // Max SMS per second
const RATE_LIMIT_EMAIL = 20; // Max emails per second

/**
 * Mock function to simulate sending an SMS via a third-party gateway (e.g., Twilio).
 * @param {string} phone 
 * @param {string} message 
 * @returns {Promise<{success: boolean, error?: string}>}
 */
const sendSMS = async (phone, message) => {
    // Simulate network latency and occasional failures
    await new Promise(resolve => setTimeout(resolve, Math.random() * 200 + 50));
    if (Math.random() < 0.05) { // 5% failure rate
        return { success: false, error: 'Gateway timeout' };
    }
    return { success: true };
};

/**
 * Mock function to simulate sending an Email via a third-party gateway (e.g., SendGrid).
 * @param {string} email 
 * @param {string} subject 
 * @param {string} body 
 * @returns {Promise<{success: boolean, error?: string}>}
 */
const sendEmail = async (email, subject, body) => {
    await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 20));
    if (Math.random() < 0.02) { // 2% failure rate
        return { success: false, error: 'Invalid email address' };
    }
    return { success: true };
};

/**
 * Processes a single delivery log entry.
 * @param {Object} log - The delivery log record.
 * @param {Object} campaign - The campaign details.
 */
const processDelivery = async (log, campaign) => {
    let result;

    if (log.channel === 'SMS') {
        // In a real app, fetch user phone from profile
        result = await sendSMS('+1234567890', campaign.message);
    } else if (log.channel === 'EMAIL') {
        result = await sendEmail(log.userId, campaign.title, campaign.message);
    } else {
        result = { success: true }; // Push notifications handled client-side
    }

    await prisma.deliveryLog.update({
        where: { id: log.id },
        data: {
            status: result.success ? 'DELIVERED' : 'FAILED',
            attemptCount: log.attemptCount + 1,
            lastAttemptAt: new Date(),
            errorMessage: result.error || null,
        },
    });

    // Retry logic: if failed and attempts < 3, reset status to PENDING for next cycle
    if (!result.success && log.attemptCount < 3) {
        await prisma.deliveryLog.update({
            where: { id: log.id },
            data: { status: 'PENDING' },
        });
    }
};

/**
 * Main worker loop to process pending broadcasts.
 */
const processBroadcastQueue = async () => {
    try {
        const pendingLogs = await prisma.deliveryLog.findMany({
            where: { status: 'PENDING' },
            take: 50, // Process in batches
            include: { campaign: true },
        });

        if (pendingLogs.length === 0) return;

        console.log(`📤 Processing ${pendingLogs.length} pending broadcast deliveries...`);

        // Group by channel for rate limiting
        const smsLogs = pendingLogs.filter(l => l.channel === 'SMS');
        const emailLogs = pendingLogs.filter(l => l.channel === 'EMAIL');

        // Process SMS with rate limiting
        for (let i = 0; i < smsLogs.length; i++) {
            await processDelivery(smsLogs[i], smsLogs[i].campaign);
            if ((i + 1) % RATE_LIMIT_SMS === 0) {
                await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
            }
        }

        // Process Emails with rate limiting
        for (let i = 0; i < emailLogs.length; i++) {
            await processDelivery(emailLogs[i], emailLogs[i].campaign);
            if ((i + 1) % RATE_LIMIT_EMAIL === 0) {
                await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
            }
        }

        // Check if campaign is fully completed
        const campaignIds = [...new Set(pendingLogs.map(l => l.campaignId))];
        for (const campaignId of campaignIds) {
            const remaining = await prisma.deliveryLog.count({
                where: { campaignId, status: { in: ['PENDING', 'SENDING'] } },
            });

            if (remaining === 0) {
                await prisma.broadcastCampaign.update({
                    where: { id: campaignId },
                    data: { status: 'COMPLETED' },
                });
            }
        }

        console.log('✅ Broadcast queue processing cycle completed.');
    } catch (error) {
        console.error('❌ Error in broadcast worker:', error);
    }
};

// Run every 10 seconds
setInterval(processBroadcastQueue, 10000);

module.exports = { processBroadcastQueue };

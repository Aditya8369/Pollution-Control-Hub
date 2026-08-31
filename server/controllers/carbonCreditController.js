const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const prisma = new PrismaClient();

/**
 * @controller CarbonCreditController
 * @description Backend logic for validating transactions, updating credit balances, and appending immutable ledger entries.
 */

/**
 * Generates a SHA-256 hash for a given block to mimic blockchain immutability.
 * @param {Object} block - The block data to hash.
 * @returns {string} The hexadecimal hash.
 */
const generateBlockHash = (block) => {
    const blockString = `${block.blockIndex}${block.timestamp}${JSON.stringify(block.transactions)}${block.previousHash}${block.nonce}`;
    return crypto.createHash('sha256').update(blockString).digest('hex');
};

/**
 * GET /api/carbon-credits/ledger
 * Retrieves the user's wallet balance and the global transaction ledger.
 */
const getLedger = async (req, res) => {
    try {
        const userId = req.user?.id || 'mock_user_1';

        const wallet = await prisma.carbonCreditWallet.upsert({
            where: { userId },
            update: {},
            create: { userId, balance: 100 }, // Initial mock balance
        });

        const transactions = await prisma.creditTransaction.findMany({
            where: {
                OR: [{ senderId: userId }, { receiverId: userId }],
            },
            orderBy: { timestamp: 'desc' },
            take: 20,
        });

        const blocks = await prisma.ledgerBlock.findMany({
            orderBy: { blockIndex: 'desc' },
            take: 10,
        });

        res.status(200).json({
            wallet,
            transactions,
            recentBlocks: blocks,
        });
    } catch (error) {
        console.error('Error fetching ledger:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

/**
 * POST /api/carbon-credits/trade
 * Validates and executes a carbon credit transfer.
 */
const postTrade = async (req, res) => {
    const { receiverEmail, amount, notes } = req.body;
    const senderId = req.user?.id || 'mock_user_1';

    if (!receiverEmail || !amount || amount <= 0) {
        return res.status(400).json({ message: 'Invalid trade parameters.' });
    }

    try {
        // In a real app, resolve receiverEmail to a userId
        const receiverId = `user_${receiverEmail.split('@')[0]}`;

        // 1. Validate sender balance and prevent double-spending via transaction
        const wallet = await prisma.carbonCreditWallet.findUnique({ where: { userId: senderId } });
        if (!wallet || wallet.balance < amount) {
            return res.status(400).json({ message: 'Insufficient carbon credit balance.' });
        }

        // 2. Execute transfers and append to ledger atomically
        const result = await prisma.$transaction(async (tx) => {
            // Deduct from sender
            await tx.carbonCreditWallet.update({
                where: { userId: senderId },
                data: { balance: { decrement: amount } },
            });

            // Add to receiver
            await tx.carbonCreditWallet.upsert({
                where: { userId: receiverId },
                update: { balance: { increment: amount } },
                create: { userId: receiverId, balance: amount },
            });

            // Record transaction
            const transaction = await tx.creditTransaction.create({
                data: {
                    senderId,
                    receiverId,
                    amount,
                    notes,
                    timestamp: new Date(),
                },
            });

            // Append to immutable ledger block
            const lastBlock = await tx.ledgerBlock.findFirst({ orderBy: { blockIndex: 'desc' } });
            const newBlockIndex = lastBlock ? lastBlock.blockIndex + 1 : 1;
            const previousHash = lastBlock ? lastBlock.currentHash : '0'.repeat(64);

            const newBlockData = {
                blockIndex: newBlockIndex,
                timestamp: new Date(),
                transactions: [transaction],
                previousHash,
                nonce: Math.floor(Math.random() * 100000),
            };

            const currentHash = generateBlockHash(newBlockData);

            await tx.ledgerBlock.create({
                data: {
                    ...newBlockData,
                    currentHash,
                    transactions: newBlockData.transactions, // JSONB
                },
            });

            return transaction;
        });

        res.status(201).json({ message: 'Trade executed successfully', transaction: result });
    } catch (error) {
        console.error('Error executing trade:', error);
        res.status(500).json({ message: 'Trade execution failed due to server error.' });
    }
};

/**
 * GET /api/carbon-credits/verify
 * Verifies the integrity of the blockchain ledger.
 */
const verifyIntegrity = async (req, res) => {
    try {
        const blocks = await prisma.ledgerBlock.findMany({ orderBy: { blockIndex: 'asc' } });
        let isValid = true;

        for (let i = 1; i < blocks.length; i++) {
            const currentBlock = blocks[i];
            const previousBlock = blocks[i - 1];

            // Check hash linkage
            if (currentBlock.previousHash !== previousBlock.currentHash) {
                isValid = false;
                break;
            }

            // Check internal hash integrity
            const recalculatedHash = generateBlockHash({
                blockIndex: currentBlock.blockIndex,
                timestamp: currentBlock.timestamp,
                transactions: currentBlock.transactions,
                previousHash: currentBlock.previousHash,
                nonce: currentBlock.nonce,
            });

            if (currentBlock.currentHash !== recalculatedHash) {
                isValid = false;
                break;
            }
        }

        res.status(200).json({ isValid });
    } catch (error) {
        console.error('Error verifying ledger:', error);
        res.status(500).json({ message: 'Verification failed.' });
    }
};

module.exports = { getLedger, postTrade, verifyIntegrity };

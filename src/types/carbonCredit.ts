/**
 * @fileoverview Type definitions for the Blockchain-Based Carbon Credit Ledger
 */

export interface CreditAsset {
    id: string;
    ownerId: string;
    balance: number;
    updatedAt: string;
}

export interface TransactionPayload {
    senderId: string;
    receiverId: string;
    amount: number;
    timestamp: string;
}

export interface LedgerBlock {
    blockIndex: number;
    timestamp: string;
    transactions: TransactionPayload[];
    previousHash: string;
    currentHash: string;
    nonce: number;
}

export interface TradeOrder {
    receiverEmail: string;
    amount: number;
    notes?: string;
}

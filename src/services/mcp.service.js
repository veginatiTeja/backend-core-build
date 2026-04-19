const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const z = require('zod');
const walletService = require('./wallet.service'); // Import your wallet service
const server = new McpServer({
    name: 'wallet-cloud',
    description: 'A wallet cloud service',
    version: '1.0.0'
});
const logger = require('../config/logger');
logger.info("MCP Server initialized and tools registered");


//Register your tools here
server.tool("get_wallet_balance", "Get the balance of a wallet", {
    userId: z.string().describe("The ID of the user whose wallet balance to retrieve")
}, async ({ userId }) => {
    const walletBalance = await walletService.getWalletByUserId(userId) // Implement this function to retrieve the wallet balance
    if (!walletBalance) {
        return { content: [{ type: 'text', text: `Wallet not found for the user ${userId} ID.` }] };
    }

    return { content: [{ type: 'text', text: `Wallet ID: ${walletBalance.id}, Balance: ${walletBalance.balance}` }] };

});


server.tool("deposit_to_wallet", "Deposit an amount to the wallet", {
    userId: z.string().describe("The ID of the user whose wallet to deposit to"),
    amount: z.number().describe("The amount to deposit")
}, async ({ userId, amount }) => {
    try {
        const result = await walletService.depositMoney(userId, amount);
        return {
            content: [{
                type: 'text',
                text: `Deposit successful! New balance: ${result.balance}`
            }]
        };
    } catch (error) {
        return {
            content: [{
                type: 'text',
                text: `Deposit failed: ${error.message}`
            }]
        };
    }
});

server.tool("transfer_between_wallets", "Transfer an amount from one wallet to another", {
    senderId: z.string().describe("The ID of the user whose wallet to transfer from"),
    receiverId: z.string().describe("The ID of the user whose wallet to transfer to"),
    amount: z.number().describe("The amount to transfer"),
    idempotentKey: z.string().describe("Unique key to prevent duplicate transfers - use format: transfer-senderid-receiverid-timestamp")
}, async ({ senderId, receiverId, amount, idempotentKey }) => {
    try {
        const result = await walletService.transferMoney(senderId, receiverId, amount, idempotentKey);
        return {
            content: [{
                type: 'text',
                text: `Transfer successful! New balance - From User: ${result.fromBalance}, To User: ${result.toBalance}`
            }]
        };
    } catch (error) {
        return {
            content: [{
                type: 'text',
                text: `Transfer failed: ${error.message}`
            }]
        };
    }
});

server.tool("withdraw_from_wallet", "Request a withdrawal from a user's wallet - creates a pending withdrawal", {
    userId: z.string().describe("The ID of the user whose wallet to withdraw from"),
    amount: z.number().describe("The amount to withdraw"),
    idempotentKey: z.string().describe("Unique key to prevent duplicate withdrawals - use format: withdraw-userid-timestamp")
}, async ({ userId, amount, idempotentKey }) => {
    try {
        const result = await walletService.withDrawMoney(userId, amount, idempotentKey);
        return {
            content: [{
                type: 'text',
                text: `${result.message}. Transaction ID: ${result.transactionId}, Status: ${result.status}, New balance: ${result.newBalance}`
            }]
        };
    } catch (error) {
        return {
            content: [{
                type: 'text',
                text: `Withdrawal failed: ${error.message}`
            }]
        };
    }
});

server.tool("process_pending_withdrawal", "Process a pending withdrawal - this would be called by an admin or a background worker to complete the withdrawal after manual review", {
    transactionId: z.string().describe("The ID of the withdrawal transaction to process"),
    approve: z.boolean().describe("Whether to approve or reject the withdrawal")
}, async ({ transactionId, approve }) => {
    try {
        const result = await walletService.processWithdrawal(transactionId, approve);
        return {
            content: [{
                type: 'text',
                text: `${result.message}. Transaction ID: ${result.transactionId}, Action: ${approve ? 'Approved' : 'Rejected & Refunded'}`
            }]
        };
    } catch (error) {
        return {
            content: [{
                type: 'text',
                text: `Failed to process pending withdrawal: ${error.message}`
            }]
        };
    }
});


server.tool("get_transactions", "Get transaction history for a user's wallet with pagination", {
    userId: z.string().describe("The ID of the user whose transaction history to retrieve"),
    limit: z.number().describe("The maximum number of transactions to retrieve").default(10)
}, async ({ userId, limit }) => {
    try {
        const { transactions, nextCursor } = await walletService.getTransactions(userId, null, limit);
        logger.info(`Retrieved ${transactions.length} transactions for user ${userId}`);

        if (transactions.length === 0) {
            return {
                content: [{
                    type: 'text',
                    text: `No transactions found for user ${userId}.`
                }]
            };
        };

        const txList = transactions.map(tx => `ID: ${tx.id} | Type: ${tx.type} | Amount: ${tx.amount} | Status: ${tx.status} | Timestamp: ${tx.created_at}`).join("\n");

        return {
            content: [{
                type: 'text',
                text: `Transaction for user ${userId}: \n${txList}`
            }]
        };

    } catch (error) {
        return {
            content: [{
                type: 'text',
                text: `Failed to retrieve transaction history: ${error.message}`
            }]
        };
    }
});

module.exports = server;
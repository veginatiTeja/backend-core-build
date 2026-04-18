const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const z = require('zod');
const walletService = require('./wallet.service'); // Import your wallet service
const server = new McpServer({
    name: 'wallet-cloud',
    description: 'A wallet cloud service',
    version: '1.0.0'
});


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




module.exports = server;
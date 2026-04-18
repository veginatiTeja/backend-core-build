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

})


module.exports = server;
const { SSEServerTransport } = require('@modelcontextprotocol/sdk/server/sse.js');
const mcpServer = require('../services/mcp.service'); // Import your MCP server instance

const transports = {};

const sseHandler = async (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("Access-Control-Allow-Origin", "*");

    const transport = new SSEServerTransport("/mcp/messages", res);
    transports[transport.sessionId] = transport;
    await mcpServer.connect(transport);
};

const messagesHandler = async (req, res) => {
    const sessionId = req.query.sessionId;
    const transport = transports[sessionId];

    if(transport) {
        await transport.handlePostMessage(req, res);
    }
    else {
        res.status(404).json({ error: "No session found" });
    }
};

module.exports = {
    sseHandler,
    messagesHandler
};
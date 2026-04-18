const express = require('express');
const router = express.Router();
const { sseHandler, messagesHandler } = require('../controllers/mcp.controller');

router.get('/sse', sseHandler);
router.post('/messages', messagesHandler);

module.exports = router;    
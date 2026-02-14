const express = require('express');
const router = express.Router();
const { getDiscordStatus } = require('../services/discord-bot.cjs');

router.get('/', (req, res) => res.json(getDiscordStatus()));
router.get('/status', (req, res) => res.json(getDiscordStatus()));

module.exports = router;

/**
 * Discord Bot - runs when NeuraPlay server starts
 * Set DISCORD_BOT_TOKEN and DISCORD_APPLICATION_ID in .env or development.env
 */

const DISCORD_API = 'https://discord.com/api/v10';
const WebSocket = require('ws');

const COMMANDS = {
  ping: {
    description: 'Check bot latency',
    run: () => '🏓 Pong!',
  },
  hello: {
    description: 'Say hello',
    run: () => '👋 Hello!',
  },
  echo: {
    description: 'Echo back a message',
    options: [{ name: 'message', type: 3, description: 'Message to echo', required: true }],
    run: (opts) => `You said: ${(opts?.find(o => o.name === 'message')?.value ?? '') || 'nothing'}`,
  },
};

let discordWs = null;
let heartbeatInterval = null;
let connected = false;

async function registerCommands(token, appId) {
  const headers = {
    Authorization: `Bot ${token}`,
    'Content-Type': 'application/json',
  };
  const commands = Object.entries(COMMANDS).map(([name, def]) => ({
    name,
    description: def.description,
    ...(def.options && { options: def.options }),
  }));
  const res = await fetch(`${DISCORD_API}/applications/${appId}/commands`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(commands),
  });
  if (!res.ok) throw new Error(`Register failed: ${await res.text()}`);
}

async function handleInteraction(botToken, interaction) {
  const { id, token, type, data } = interaction;
  if (type !== 2) return;
  const cmd = data?.name;
  const handler = COMMANDS[cmd];
  const opts = data?.options ?? [];
  const content = handler ? handler.run(opts) : 'Unknown command';
  await fetch(`${DISCORD_API}/interactions/${id}/${token}/callback`, {
    method: 'POST',
    headers: {
      Authorization: `Bot ${botToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ type: 4, data: { content } }),
  });
}

function startDiscordBot() {
  const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
  const APP_ID = process.env.DISCORD_APPLICATION_ID;

  if (!BOT_TOKEN || !APP_ID) {
    return false;
  }

  (async () => {
    try {
      await registerCommands(BOT_TOKEN, APP_ID);
      console.log('✅ Discord slash commands registered');

      const gwRes = await fetch(`${DISCORD_API}/gateway/bot`, {
        headers: { Authorization: `Bot ${BOT_TOKEN}` },
      });
      const gw = await gwRes.json();
      const wsUrl = `${gw.url}?v=10&encoding=json`;

      discordWs = new WebSocket(wsUrl);
      let seq = null;

      discordWs.on('open', () => {
        connected = true;
        console.log('✅ Discord bot connected');
      });

      discordWs.on('message', (data) => {
        const msg = JSON.parse(data.toString());
        seq = msg.s;

        switch (msg.op) {
          case 10:
            heartbeatInterval = setInterval(() => {
              if (discordWs?.readyState === 1) {
                discordWs.send(JSON.stringify({ op: 1, d: seq }));
              }
            }, msg.d.heartbeat_interval);
            discordWs.send(JSON.stringify({
              op: 2,
              d: {
                token: BOT_TOKEN,
                intents: 513,
                properties: { os: 'linux', browser: 'neuraplay', device: 'neuraplay' },
              },
            }));
            break;
          case 0:
            if (msg.t === 'INTERACTION_CREATE') {
              handleInteraction(BOT_TOKEN, msg.d);
            }
            break;
        }
      });

      discordWs.on('close', () => {
        connected = false;
        if (heartbeatInterval) clearInterval(heartbeatInterval);
        discordWs = null;
        console.log('🔌 Discord bot disconnected');
      });

      discordWs.on('error', (err) => {
        console.error('❌ Discord bot error:', err.message);
      });
    } catch (e) {
      console.error('❌ Discord bot failed to start:', e.message);
    }
  })();

  return true;
}

function getDiscordStatus() {
  return {
    enabled: !!(process.env.DISCORD_BOT_TOKEN && process.env.DISCORD_APPLICATION_ID),
    connected,
  };
}

module.exports = {
  startDiscordBot,
  getDiscordStatus,
};

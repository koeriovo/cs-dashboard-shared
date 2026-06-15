const { WebClient } = require('@slack/web-api');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    if (!process.env.SLACK_TOKEN) {
          return res.status(503).json({ error: 'SLACK_TOKEN not configured', message: 'Slack integration is pending setup.' });
    }

    const slack = new WebClient(process.env.SLACK_TOKEN);
    const { action, channel_id, message_ts, limit } = req.body || {};

    try {
          if (action === 'read_thread') {
                  const r = await slack.conversations.replies({
                            channel: channel_id,
                            ts: message_ts,
                            limit: limit || 50,
                  });
                  const messages = (r.messages || []).map(m => ({ ts: m.ts, text: m.text, user: m.user }));
                  res.json(messages);
          } else {
                  const r = await slack.conversations.history({
                            channel: channel_id,
                            limit: limit || 25,
                  });
                  const messages = (r.messages || []).map(m => ({ ts: m.ts, text: m.text, user: m.user }));
                  res.json(messages);
          }
    } catch (err) {
          res.status(500).json({ error: err.message });
    }
};

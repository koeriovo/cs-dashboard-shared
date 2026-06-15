const Anthropic = require('@anthropic-ai/sdk');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    if (!process.env.ANTHROPIC_API_KEY) {
          return res.json({ result: 'AI analysis is not available (API key not configured).' });
    }

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const { prompt, data } = req.body || {};
    if (!prompt) return res.status(400).json({ error: 'prompt is required' });

    try {
          const message = await client.messages.create({
                  model: 'claude-haiku-4-5-20251001',
                  max_tokens: 1024,
                  messages: [{
                            role: 'user',
                            content: `${prompt}\n\n${JSON.stringify(data)}`,
                  }],
          });
          res.json({ result: message.content[0].text });
    } catch (e) {
          console.error('[ai]', e.message);
          res.status(500).json({ error: e.message });
    }
};

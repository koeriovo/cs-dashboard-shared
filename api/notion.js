const { Client } = require('@notionhq/client');

const notion = new Client({ auth: process.env.NOTION_TOKEN });

function extractDbId(viewUrl) {
    if (!viewUrl) return null;
    const m = viewUrl.match(/\/([0-9a-f]{32})\?/i) || viewUrl.match(/\/([0-9a-f]{32})$/i);
    return m ? m[1] : null;
}

function toUuid(hex) {
    if (!hex || hex.includes('-')) return hex;
    return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}

function transformPage(page) {
    const pid = page.id.replace(/-/g, '');
    const result = {
          url: `https://app.notion.com/p/${pid}`,
          作成日時: page.created_time,
          最終更新日時: page.last_edited_time,
    };
    for (const [key, prop] of Object.entries(page.properties || {})) {
          if (!prop) continue;
          switch (prop.type) {
            case 'title': result[key] = prop.title.map(t => t.plain_text).join(''); break;
            case 'rich_text': result[key] = prop.rich_text.map(t => t.plain_text).join(''); break;
            case 'select': result[key] = prop.select?.name || ''; break;
            case 'status': result[key] = prop.status?.name || ''; break;
            case 'multi_select': result[key] = JSON.stringify(prop.multi_select.map(s => s.name)); break;
            case 'date':
                      if (prop.date) {
                                  result[`date:${key}:start`] = prop.date.start || '';
                                  result[`date:${key}:is_datetime`] = (prop.date.start || '').includes('T') ? 1 : 0;
                      } else { result[`date:${key}:start`] = ''; result[`date:${key}:is_datetime`] = 0; }
                      break;
            case 'people': result[key] = JSON.stringify(prop.people.map(p => `user://${p.id}`)); break;
            case 'relation': result[key] = JSON.stringify(prop.relation.map(r => `https://app.notion.com/p/${r.id.replace(/-/g,'')}`)); break;
            case 'checkbox': result[key] = prop.checkbox ? '__YES__' : '__NO__'; break;
            case 'number': result[key] = prop.number !== null && prop.number !== undefined ? String(prop.number) : ''; break;
            case 'url': result[key] = prop.url || ''; break;
            case 'email': result[key] = prop.email || ''; break;
            case 'created_time': result[key] = prop.created_time || ''; break;
            case 'last_edited_time': result[key] = prop.last_edited_time || ''; break;
            default: result[key] = '<omitted />';
          }
    }
    return result;
}

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { view_url, start_cursor, page_size } = req.body || {};
    const hexId = extractDbId(view_url);
    if (!hexId) return res.status(400).json({ error: 'Invalid view_url: ' + view_url });

    try {
          const response = await notion.databases.query({
                  database_id: toUuid(hexId),
                  start_cursor: start_cursor || undefined,
                  page_size: Math.min(page_size || 100, 100),
          });
          res.json({
                  results: response.results.map(transformPage),
                  has_more: response.has_more,
                  next_cursor: response.next_cursor,
          });
    } catch (e) {
          console.error('[notion]', e.message);
          res.status(500).json({ error: e.message });
    }
};

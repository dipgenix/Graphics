const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT) || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml'
};

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

function json(res, statusCode, payload) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

function serveStaticFile(reqPath, res) {
  const safePath = reqPath === '/' ? '/index.html' : reqPath;
  const fullPath = path.normalize(path.join(PUBLIC_DIR, safePath));

  if (!fullPath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(fullPath, (err, file) => {
    if (err) {
      fs.readFile(path.join(PUBLIC_DIR, 'index.html'), (fallbackErr, indexFile) => {
        if (fallbackErr) {
          res.writeHead(404);
          res.end('Not found');
          return;
        }

        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(indexFile);
      });
      return;
    }

    const ext = path.extname(fullPath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(file);
  });
}

function buildFallbackResponse({ goal, audience, product, channel, tone, extraContext }) {
  const headline = `Campaign concept for ${product}: ${goal} via ${channel}`;
  const summary = `Target ${audience} with a ${tone.toLowerCase()} voice and focus on measurable value outcomes.`;

  return {
    model: 'local-fallback-strategy-engine',
    content: [
      `### ${headline}`,
      summary,
      '',
      '#### Core message pillars',
      `1. **Pain-to-solution framing**: connect ${audience} pain points to clear outcomes Purifiora can deliver.`,
      `2. **Proof and trust**: include customer wins, product differentiators, and a short CTA for ${channel}.`,
      `3. **Action urgency**: position a time-bound offer tied to ${goal.toLowerCase()} KPIs.`,
      '',
      '#### Suggested outbound sequence',
      `- **Touch 1**: Personalized opener referencing ${audience} challenges and one compelling stat.`,
      '- **Touch 2**: Mini case study + objection handling + social proof snippet.',
      '- **Touch 3**: Demo/consultation CTA with a low-friction scheduling link.',
      '',
      '#### One campaign brief',
      `- **Primary KPI**: ${goal}`,
      `- **Channel**: ${channel}`,
      `- **Tone**: ${tone}`,
      '- **Offer angle**: “Accelerate results with Purifiora in under 30 days.”',
      '',
      '#### Sales email draft',
      `Subject: A practical way to improve ${goal.toLowerCase()} for ${audience}`,
      '',
      `Hi [First Name],\n\nI noticed teams in ${audience} are often balancing growth goals with constrained bandwidth. Purifiora helps simplify execution so teams can drive stronger ${goal.toLowerCase()} without adding complexity.\n\nWould you be open to a 15-minute walkthrough to see if this aligns with your priorities?\n\nBest,\n[Your Name]`,
      '',
      extraContext ? `**Context used:** ${extraContext}` : '**Context used:** none provided.'
    ].join('\n')
  };
}

async function getAiResponse(payload) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return buildFallbackResponse(payload);
  }

  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      temperature: 0.7,
      messages: [
        {
          role: 'system',
          content:
            'You are Purifiora Sales & Marketing Assistant. Provide actionable campaign strategy with message pillars, campaign brief, outbound sequence, and one sample email or ad in markdown.'
        },
        {
          role: 'user',
          content: [
            `Goal: ${payload.goal}`,
            `Audience: ${payload.audience}`,
            `Product/Service: ${payload.product}`,
            `Primary Channel: ${payload.channel}`,
            `Tone: ${payload.tone}`,
            `Additional Context: ${payload.extraContext || 'None'}`
          ].join('\n')
        }
      ]
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`AI API error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content?.trim();

  if (!content) {
    throw new Error('AI API returned an empty response.');
  }

  return {
    model: data.model || process.env.OPENAI_MODEL || 'unknown',
    content
  };
}

function collectRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';

    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        reject(new Error('Request body too large'));
        req.destroy();
      }
    });

    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === 'POST' && parsedUrl.pathname === '/api/assist') {
    try {
      const rawBody = await collectRequestBody(req);
      const payload = rawBody ? JSON.parse(rawBody) : {};
      const { goal = '', audience = '', product = '', channel = '', tone = 'Professional', extraContext = '' } = payload;

      if (!goal || !audience || !product || !channel) {
        return json(res, 400, {
          error: 'Please provide goal, audience, product, and channel.'
        });
      }

      const result = await getAiResponse({ goal, audience, product, channel, tone, extraContext });
      return json(res, 200, { success: true, ...result });
    } catch (error) {
      return json(res, 500, {
        error: 'Unable to generate assistant output right now.',
        details: error.message
      });
    }
  }

  if (req.method === 'GET') {
    serveStaticFile(parsedUrl.pathname, res);
    return;
  }

  res.writeHead(405);
  res.end('Method not allowed');
});

server.listen(PORT, () => {
  console.log(`Purifiora assistant running on http://localhost:${PORT}`);
});

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3000;
const OLLAMA_URL = 'http://localhost:11434';
const MODEL = 'qwen3:8b';

// Middleware
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'ngrok-skip-browser-warning']
}));
app.use(express.json({ limit: '1mb' }));

// ========== Queue System (Max 1 concurrent) ==========
let isProcessing = false;

// ========== Streaming Chat Endpoint ==========
app.post('/api/chat', async (req, res) => {
    // Check if busy
    if (isProcessing) {
        return res.status(409).json({
            busy: true,
            message: '🤖 StudyBot is currently helping another user. Please wait a moment...'
        });
    }

    const { messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: 'Invalid request: messages array required' });
    }

    // Lock the queue
    isProcessing = true;
    const startTime = Date.now();
    console.log(`[${new Date().toLocaleTimeString()}] ⚡ Processing request (streaming)...`);

    // Set headers for streaming (SSE-like plain text stream)
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx/ngrok buffering

    try {
        const ollamaResponse = await fetch(`${OLLAMA_URL}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: MODEL,
                messages: messages,
                stream: true,
                options: {
                    temperature: 0.85,
                    num_predict: 8642,
                    num_ctx: 16384
                }
            })
        });

        if (!ollamaResponse.ok) {
            const errText = await ollamaResponse.text();
            res.status(500).end(`[ERROR] Ollama error ${ollamaResponse.status}: ${errText}`);
            return;
        }

        // Pipe Ollama's stream → extract content → send to client
        const reader = ollamaResponse.body.getReader();
        const decoder = new TextDecoder();
        let totalChars = 0;
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) {
                // Process any remaining data in the buffer
                if (buffer.trim()) {
                    await processLine(buffer.trim());
                }
                break;
            }

            buffer += decoder.decode(value, { stream: true });

            // Ollama sends one JSON object per line
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // Keep incomplete line in buffer

            for (const line of lines) {
                await processLine(line);
            }
        }

        async function processLine(line) {
            if (!line.trim()) return;
            try {
                const chunk = JSON.parse(line);
                const content = chunk.message?.content || '';
                if (content) {
                    res.write(content);
                    totalChars += content.length;
                    // Optional: console.log(`[Chunk] ${content}`); 
                }

                if (chunk.done) {
                    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
                    console.log(`[${new Date().toLocaleTimeString()}] ✅ Done. ${totalChars} chars in ${elapsed}s`);
                }
            } catch (e) {
                console.error('Failed to parse chunk:', line);
            }
        }

        res.end();

    } catch (error) {
        console.error('❌ Ollama error:', error.message);

        // Check if Ollama is not running
        if (error.cause?.code === 'ECONNREFUSED') {
            if (!res.headersSent) {
                res.status(503).json({
                    error: 'Ollama is not running. Please start it with: ollama serve'
                });
            } else {
                res.end('\n[ERROR] Ollama disconnected.');
            }
        } else {
            if (!res.headersSent) {
                res.status(500).json({ error: error.message });
            } else {
                res.end(`\n[ERROR] ${error.message}`);
            }
        }
    } finally {
        // Unlock the queue
        isProcessing = false;
    }
});

// ========== Health Check ==========
app.get('/api/health', async (req, res) => {
    try {
        const ollamaCheck = await fetch(`${OLLAMA_URL}/api/tags`);
        const data = await ollamaCheck.json();
        const models = data.models?.map(m => m.name) || [];

        res.json({
            server: 'ok',
            ollama: 'connected',
            models: models,
            busy: isProcessing
        });
    } catch {
        res.json({
            server: 'ok',
            ollama: 'disconnected',
            busy: isProcessing
        });
    }
});

// ========== Start ==========
const server = app.listen(PORT, () => {
    console.log('');
    console.log('========================================');
    console.log('  🚀 StudyPlanner AI Server (Streaming)');
    console.log(`  http://localhost:${PORT}`);
    console.log(`  Model: ${MODEL}`);
    console.log(`  Ollama: ${OLLAMA_URL}`);
    console.log('  Mode: Streaming (real-time)');
    console.log('  Context: 16K tokens');
    console.log('  Max predict: 8642 tokens');
    console.log('  Timeout: 10 minutes');
    console.log('========================================');
    console.log('');
    console.log('Make sure Ollama is running: ollama serve');
    console.log('Waiting for requests...');
    console.log('');
});

// Increase timeout to 10 minutes (600,000 ms)
server.timeout = 600000;

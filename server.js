const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3000;
const OLLAMA_URL = 'http://localhost:11434';
const MODEL = 'qwen3:8b';

// Middleware
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// ========== Queue System (Max 1 concurrent) ==========
let isProcessing = false;

// ========== Chat Endpoint ==========
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
    console.log(`[${new Date().toLocaleTimeString()}] Processing request...`);

    try {
        const ollamaResponse = await fetch(`${OLLAMA_URL}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: MODEL,
                messages: messages,
                stream: false,
                options: {
                    temperature: 0.7,
                    num_predict: 1024
                }
            })
        });

        if (!ollamaResponse.ok) {
            const errText = await ollamaResponse.text();
            throw new Error(`Ollama error ${ollamaResponse.status}: ${errText}`);
        }

        const data = await ollamaResponse.json();

        console.log(`[${new Date().toLocaleTimeString()}] Done. Response length: ${data.message?.content?.length || 0} chars`);

        res.json({
            content: data.message?.content || '',
            model: data.model,
            total_duration: data.total_duration
        });

    } catch (error) {
        console.error('Ollama error:', error.message);

        // Check if Ollama is not running
        if (error.cause?.code === 'ECONNREFUSED') {
            res.status(503).json({
                error: 'Ollama is not running. Please start it with: ollama serve'
            });
        } else {
            res.status(500).json({ error: error.message });
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
app.listen(PORT, () => {
    console.log('');
    console.log('========================================');
    console.log('  StudyPlanner AI Server');
    console.log(`  http://localhost:${PORT}`);
    console.log(`  Model: ${MODEL}`);
    console.log(`  Ollama: ${OLLAMA_URL}`);
    console.log('  Max concurrent: 1');
    console.log('========================================');
    console.log('');
    console.log('Make sure Ollama is running: ollama serve');
    console.log('Waiting for requests...');
    console.log('');
});

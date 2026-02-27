import fs from 'fs';
import path from 'path';
import util from 'util';
import { createRequire } from 'module';
import { GoogleGenerativeAI } from '@google/generative-ai';

const require = createRequire(import.meta.url);
require('dotenv').config();

const MODEL_CANDIDATES = ['gemini-2.5-flash'];

async function listAvailableModels(genAI, apiKey) {
    try {
        if (typeof genAI.listModels === 'function') {
            const response = await genAI.listModels();
            const models = response?.models || response || [];
            const names = Array.isArray(models)
                ? models.map((m) => m.name || m.displayName || JSON.stringify(m)).filter(Boolean)
                : [];
            return names;
        }
        throw new Error('listModels() not available on this SDK instance');
    } catch {
        const urls = [
            `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`,
            `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
        ];

        for (const url of urls) {
            try {
                const res = await fetch(url);
                if (!res.ok) continue;
                const data = await res.json();
                const models = Array.isArray(data?.models) ? data.models : [];
                const names = models.map((m) => m.name).filter(Boolean);
                if (names.length) return names;
            } catch {}
        }

        return [];
    }
}

async function analyzeWithModel({ modelName, imageBase64, mimeType, genAI }) {
    const model = genAI.getGenerativeModel({ model: modelName });
    const prompt = "Identify 3 gaming products in this image and return a JSON array with 'name' and 'estimatedPrice'.";
    const result = await model.generateContent([
        { text: prompt },
        {
            inlineData: {
                mimeType,
                data: imageBase64,
            },
        },
    ]);
    return { modelName, result };
}

async function run() {
    try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error('Missing GEMINI_API_KEY');
        }

        const uploadsDir = path.join(process.cwd(), 'uploads');
        const files = fs.readdirSync(uploadsDir);
        const imageFile = files.find((file) => /\.(jpg|jpeg|png)$/i.test(file));

        if (!imageFile) {
            throw new Error('No .jpg, .jpeg, or .png file found in uploads directory');
        }

        console.log(`Using file: ${imageFile}`);

        const imagePath = path.join(uploadsDir, imageFile);
        const imageBuffer = fs.readFileSync(imagePath);
        const imageBase64 = imageBuffer.toString('base64');
        const mimeType = imageFile.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';

        const genAI = new GoogleGenerativeAI(apiKey);

        let lastError = null;

        for (const modelName of MODEL_CANDIDATES) {
            try {
                console.log(`Trying model: ${modelName}`);
                const { result } = await analyzeWithModel({ modelName, imageBase64, mimeType, genAI });
                console.log(`Success with model: ${modelName}`);
                console.log(util.inspect(result, { depth: null, colors: false }));
                console.log(result.response.text());
                return;
            } catch (err) {
                lastError = err;
                console.error(`Model failed: ${modelName}`);
                console.error('Status:', err?.status || err?.response?.status || 'unknown');
                console.error('Message:', err?.message || String(err));
            }
        }

        const availableModels = await listAvailableModels(genAI, apiKey);
        if (availableModels.length) {
            console.error('Available models:');
            for (const name of availableModels) {
                console.error(name);
            }
        } else {
            console.error('Available models: <none returned>');
        }

        throw lastError || new Error('All model attempts failed');
    } catch (error) {
        console.error('Gemini test failed');
        console.error('Status:', error?.status || error?.response?.status || 'unknown');
        console.error('Message:', error?.message || String(error));
        if (error?.stack) {
            console.error(error.stack);
        }
        process.exit(1);
    }
}

run();

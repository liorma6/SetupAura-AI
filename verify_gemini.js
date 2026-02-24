import dotenv from 'dotenv';
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

const API_KEY = process.env.GEMINI_API_KEY;

console.log("--- DIAGNOSTIC START ---");
console.log(`API Key Present: ${!!API_KEY}`);

async function runDiagnostics() {
    // 1. Direct REST API Check (List Models)
    console.log("\n1. Testing Direct REST API (v1beta)...");
    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;
        const res = await fetch(url);
        const data = await res.json();

        if (data.models) {
            console.log("   SUCCESS: Retrieved model list via REST.");
            const models = data.models.map(m => m.name).filter(n => n.includes('gemini'));
            console.log("   Available Gemini Models:");
            models.forEach(m => console.log(`   - ${m}`));
        } else {
            console.error("   FAILED: API returned no models.", data);
        }
    } catch (e) {
        console.error("   FAILED: Network error.", e.message);
    }

    // 2. SDK Check (Standard)
    console.log("\n2. Testing SDK (Standard Init)...");
    try {
        const genAI = new GoogleGenerativeAI(API_KEY);
        // Try getting a model - this doesn't make a network call yet usually
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        console.log("   SDK Initialized.");
    } catch (e) {
        console.error("   SDK Init Failed:", e.message);
    }

    console.log("\n--- DIAGNOSTIC END ---");
}

runDiagnostics();

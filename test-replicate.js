import Replicate from 'replicate';
import dotenv from 'dotenv';
dotenv.config();

const testReplicate = async () => {
    console.log("Testing Replicate Connection...");

    if (!process.env.REPLICATE_API_TOKEN) {
        console.error("❌ Error: REPLICATE_API_TOKEN is missing from .env");
        return;
    }

    console.log("✅ Token found (length: " + process.env.REPLICATE_API_TOKEN.length + ")");

    const replicate = new Replicate({
        auth: process.env.REPLICATE_API_TOKEN,
    });

    try {
        console.log("Sending simple test request (stability-ai/sdxl)...");
        const output = await replicate.run(
            "stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b",
            {
                input: {
                    prompt: "A futuristic chrome sphere floating in space, 8k resolution",
                }
            }
        );
        console.log("✅ Success! Output:", output);
    } catch (error) {
        console.error("❌ Replicate API Error:", error);
    }
};

testReplicate();


// This file simulates the DeepSeek API for lyrics and text generation.
import * as env from './env';

const API_BASE_URL = 'https://api.deepseek.com/v1';

async function postJson(endpoint: string, body: any) {
    const url = `${API_BASE_URL}${endpoint}`;
    const apiKey = env.DEEPSEEK_API_KEY || (process.env.DEEPSEEK_API_KEY as string | undefined);
    if (!apiKey) throw new Error('DeepSeek API key is not configured. Set DEEPSEEK_API_KEY in `services/env.ts` or environment.');

    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
    });

    if (!res.ok) {
        const text = await res.text();
        const msg = `DeepSeek API error ${res.status}: ${text}`;
        throw new Error(msg);
    }

    return res.json();
}

function extractTextFromResponse(data: any): string | null {
    // Try a few common shapes used by text-generation APIs
    if (!data) return null;
    if (typeof data === 'string') return data;
    if (Array.isArray(data)) {
        // e.g., data = [{ text: '...' }]
        for (const item of data) {
            const t = extractTextFromResponse(item);
            if (t) return t;
        }
    }
    if (typeof data.output === 'string') return data.output;
    if (Array.isArray(data.output) && data.output[0]) {
        if (typeof data.output[0].content === 'string') return data.output[0].content;
        if (typeof data.output[0].text === 'string') return data.output[0].text;
    }
    if (Array.isArray(data.choices) && data.choices[0]) {
        if (typeof data.choices[0].text === 'string') return data.choices[0].text;
        if (typeof data.choices[0].message === 'string') return data.choices[0].message;
        if (data.choices[0].message && typeof data.choices[0].message.content === 'string') return data.choices[0].message.content;
    }
    if (typeof data.result === 'string') return data.result;
    if (typeof data.text === 'string') return data.text;
    if (typeof data.output_text === 'string') return data.output_text;
    if (data.data && typeof data.data.text === 'string') return data.data.text;

    return null;
}

/**
 * Generate lyrics from a prompt using the DeepSeek API.
 * Replaces the previous mock implementation with a real HTTP call.
 */
export const generateLyrics = async (prompt: string): Promise<string> => {
    console.log(`[DeepSeek API] Request to generate lyrics for prompt: "${prompt}"`);
    try {
        const payload = {
            messages: [
                {
                    role: 'system',
                    content: 'You are a creative assistant that specializes in writing song lyrics tailored for the cameroon audience.'
                },
                {
                    role: 'user',
                    content: prompt,
                },
            ],
            model: 'deepseek-chat',
            max_tokens: 800,
            temperature: 0.8,
        };

        const data = await postJson('/chat/completions', payload);
        const text = extractTextFromResponse(data);
        if (!text) throw new Error('DeepSeek returned an unexpected response shape.');
        return text.trim();
    } catch (err) {
        console.error('generateLyrics error:', err);
        throw err;
    }
};

/**
 * Generate a short song description from a prompt using the DeepSeek API.
 */
export const generateDescription = async (prompt: string): Promise<string> => {
    console.log(`[DeepSeek API] Request to generate description for prompt: "${prompt}"`);
    try {
        const payload = {
            messages: [
                {
                    role: 'system',
                    content: 'You are a creative assistant that specializes in writing concise and compelling song descriptions.'
                },
                {
                    role: 'user',
                    content: prompt,
                },
            ],
            model: 'deepseek-chat',
            max_tokens: 120,
            temperature: 0.7,
        };

        const data = await postJson('/chat/completions', payload);
        const text = extractTextFromResponse(data);
        if (!text) throw new Error('DeepSeek returned an unexpected response shape.');
        return text.trim();
    } catch (err) {
        console.error('generateDescription error:', err);
        throw err;
    }
};

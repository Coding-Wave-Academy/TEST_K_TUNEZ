import * as env from './env';

const API_BASE_URL = 'https://api.kie.ai/api/v1';

async function postJson(endpoint: string, body: any) {
    const url = `${API_BASE_URL}${endpoint}`;
    const apiKey = env.KIE_AI_API_KEY;

    if (!apiKey) {
        throw new Error('Kie AI API key is not configured. Set KIE_AI_API_KEY in `services/env.ts` or environment.');
    }

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
        const msg = `Kie AI API error ${res.status}: ${text}`;
        throw new Error(msg);
    }

    return res.json();
}

function extractAudioUrlFromResponse(data: any): string | null {
    console.log('[Kie API] Raw response data (for URL extraction):', JSON.stringify(data, null, 2));

    if (!data) {
        console.log('[Kie API Extractor] No data object provided.');
        return null;
    }

    // The quickstart shows a nested shape: data.response.sunoData[...].audioUrl
    const responseData = data.data || data;
    console.log('[Kie API Extractor] Using responseData:', JSON.stringify(responseData, null, 2));


    // Try callback-style keys
    if (responseData?.data && Array.isArray(responseData.data) && responseData.data[0]) {
        console.log('[Kie API Extractor] Checking callback-style `data.data` array...');
        const first = responseData.data[0];
        if (typeof first.audio_url === 'string') return first.audio_url;
        if (typeof first.audioUrl === 'string') return first.audioUrl;
        if (typeof first.stream_audio_url === 'string') return first.stream_audio_url;
    }

    // Try quickstart polling shape: response.sunoData
    const resp = responseData.response || responseData;
    console.log('[Kie API Extractor] Checking polling-style `response.sunoData` in object:', JSON.stringify(resp, null, 2));
    if (resp?.sunoData && Array.isArray(resp.sunoData) && resp.sunoData[0]) {
        console.log('[Kie API Extractor] Found `sunoData` array, checking first element...');
        const first = resp.sunoData[0];
        if (typeof first.audioUrl === 'string') return first.audioUrl;
        if (typeof first.audio_url === 'string') return first.audio_url;
        if (typeof first.streamAudioUrl === 'string') return first.streamAudioUrl;
    }

    // Fallback: top-level keys
    console.log('[Kie API Extractor] Checking for top-level URL keys...');
    if (typeof responseData.audio_url === 'string') return responseData.audio_url;
    if (typeof responseData.audioUrl === 'string') return responseData.audioUrl;
    if (typeof responseData.url === 'string') return responseData.url;

    console.log('[Kie API Extractor] No audio URL found after all checks.');
    return null;
}

function extractTaskIdFromResponse(data: any): string | null {
    if (data && data.data && typeof data.data.taskId === 'string') {
        return data.data.taskId;
    }
    return null;
}

async function getJson(endpoint: string) {
    const url = `${API_BASE_URL}${endpoint}`;
    const apiKey = env.KIE_AI_API_KEY;
    if (!apiKey) throw new Error('Kie AI API key is not configured.');

    const res = await fetch(url, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
        },
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Kie AI API error ${res.status}: ${text}`);
    }

    return res.json();
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function pollForResult(taskId: string): Promise<string> {
    const MAX_POLLS = 120; // Poll for up to 20 minutes (120 * 10s)
    const POLL_INTERVAL = 10000; // 10 seconds for a more responsive demo feel
    let successWithoutUrlCount = 0;
    const MAX_SUCCESS_WITHOUT_URL = 3; // Allow 3 checks after success status

    for (let i = 0; i < MAX_POLLS; i++) {
        // For the first few polls, check more frequently
        const interval = i < 10 ? 5000 : POLL_INTERVAL;
        await sleep(interval);
        console.log(`[Kie API] Polling for result (attempt ${i + 1}/${MAX_POLLS})...`);

        try {
            // Use documented endpoint for task info
            const resultData = await getJson(`/generate/record-info?taskId=${encodeURIComponent(taskId)}`);
            console.log('[Kie API] Raw polling response:', resultData);

            const status = resultData?.data?.status || resultData?.data?.taskStatus || null;

            if (status === 'SUCCESS' || status === 'FIRST_SUCCESS') {
                const audioUrl = extractAudioUrlFromResponse(resultData);
                if (audioUrl) return audioUrl;

                successWithoutUrlCount++;
                console.warn(`[Kie API] Task is SUCCESS but no audio URL yet. Check ${successWithoutUrlCount}/${MAX_SUCCESS_WITHOUT_URL}.`);
                if (successWithoutUrlCount >= MAX_SUCCESS_WITHOUT_URL) {
                    throw new Error('Task completed but no audio URL was found after several checks.');
                }
                continue; // Continue polling for a few more times
            }

            if (status === 'TEXT_SUCCESS') {
                // Intermediate state: text/lyrics generation finished, audio not ready yet
                console.log('[Kie API] Text generation complete; waiting for audio to be generated.');
                successWithoutUrlCount = 0; // Reset counter
                continue;
            }

            if (status === 'CREATE_TASK_FAILED' || status === 'GENERATE_AUDIO_FAILED' || status === 'CALLBACK_EXCEPTION' || status === 'SENSITIVE_WORD_ERROR') {
                const errMsg = resultData?.data?.errorMessage || resultData?.msg || 'Generation failed';
                throw new Error(errMsg);
            }
            
            successWithoutUrlCount = 0; // Reset counter on other statuses like PENDING
        } catch (err) {
            console.error('[Kie API] Error during polling:', err);
            // If we threw the error ourselves, re-throw to stop.
            if (err.message.includes('Task completed but no audio URL')) {
                throw err;
            }
            // Otherwise, continue polling; only surface timeout after all retries
        }
    }

    throw new Error('Music generation timed out after several attempts.');
}

interface GenerateMusicParams {
    prompt: string;
    durationInSeconds?: number;
}

export const generateMusic = async ({ prompt, durationInSeconds = 180 }: GenerateMusicParams): Promise<string> => {
    console.log(`[Kie API] Request to generate music for prompt: "${prompt}"`);
    try {
        const payload = {
            prompt,
            duration_seconds: Math.min(durationInSeconds, 240),
            model: 'V5',
            callBackUrl: 'https://example.com/kie-callback',
            customMode: false,
            instrumental: true,
        };

        const initialData = await postJson('/generate', payload);
        const taskId = extractTaskIdFromResponse(initialData);

        if (!taskId) {
            console.error('[Kie API] Could not get taskId from initial response:', initialData);
            throw new Error('Kie API did not return a taskId.');
        }

        console.log(`[Kie API] Generation task started with taskId: ${taskId}`);

        const audioUrl = await pollForResult(taskId);
        
        console.log(`[Kie API] Generation complete. Audio URL: ${audioUrl}`);
        return audioUrl;
    } catch (err) {
        console.error('generateMusic error:', err);
        throw err;
    }
};

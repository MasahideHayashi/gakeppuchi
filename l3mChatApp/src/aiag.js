import fetch from 'node-fetch'

// Example function to interact with Ollama's local API
async function runOllama(prompt = 'What is your name?'){
    if (!prompt || typeof prompt !== 'string') {
        prompt = 'What is your name?'
    }

    const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: 'llama3',
            prompt: prompt,
            stream: false
        })
    });

    if (!response.ok) {
        const errText = await response.text().catch(() => '');
        process.stderr.write(`Request failed: ${response.status} ${response.statusText}\n${errText}\n`);
        return "error";
    }
    console.log('Response received from Ollama API.');
    const contentType = (response.headers.get('content-type') || '').toLowerCase();

    // If JSON response
    if (contentType.includes('application/json')) {
        const text = await response.text();
        try {
            const data = JSON.parse(text);
            if (data && typeof data === 'object' && data.response) {
                process.stdout.write(data.response + '\n');
            } else {
                process.stdout.write(JSON.stringify(data) + '\n');
            }
        } catch {
            process.stdout.write(text);
        }
        return text;
    }

    // If streaming or plain text, pipe chunks to stdout
    if (response.body && typeof response.body[Symbol.asyncIterator] === 'function') {
        let res = "";
        for await (const chunk of response.body) {
            const line = chunk.toString().trim();
            if(!line) continue;
            const jchunk = JSON.parse(line);
            res += jchunk.response;
            // const s = chunk.toString();
            // process.stdout.write(s+"yaho");
        }
        // Ensure newline at end
        process.stdout.write(res + '\n');
        return res;
    }

    // Fallback: read full text
    const fallbackText = await response.text();
    process.stdout.write(fallbackText + '\n');
    return fallbackText;
}

export default runOllama;
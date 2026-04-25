class GeminiClient {
  constructor(apiKey) {
    this.apiKey  = apiKey;
    this.history = [];
    this.model   = 'gemini-2.5-flash';
  }

  get isFirstMessage() {
    return this.history.length === 0;
  }

  async send(userText, screenshotDataUrl) {
    const userParts = [];
    if (userText)          userParts.push({ text: userText });
    if (screenshotDataUrl) userParts.push({ inlineData: { mimeType: 'image/png', data: screenshotDataUrl.split(',')[1] } });
    if (!userParts.length) userParts.push({ text: '(screenshot shared)' });

    const contents = [...this.history, { role: 'user', parts: userParts }];
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: 'You are a concise assistant embedded in a screen overlay. The user may share screenshots for context. Keep responses brief and clear.' }],
        },
        contents,
        generationConfig: { maxOutputTokens: 1024 },
      }),
    });

    if (!resp.ok) throw new Error(`Gemini ${resp.status}: ${await resp.text()}`);

    const data = await resp.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '(no response)';

    // Save text-only history to avoid token bloat from repeated images
    const histParts = [];
    if (userText)          histParts.push({ text: userText });
    if (screenshotDataUrl) histParts.push({ text: '[screenshot]' });

    this.history.push({ role: 'user',  parts: histParts.length ? histParts : [{ text: '(screenshot)' }] });
    this.history.push({ role: 'model', parts: [{ text }] });

    return text;
  }
}

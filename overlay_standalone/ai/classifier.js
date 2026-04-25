class PerceptualHashGate {
  constructor({ size = 16, threshold = 13 } = {}) {
    this.size = size;
    this.threshold = threshold;
    this.lastHash = null;
    this.canvas = document.createElement('canvas');
    this.canvas.width = size;
    this.canvas.height = size;
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
  }

  async hasSignificantChange(dataUrl) {
    const hash = await this.hash(dataUrl);

    if (!this.lastHash) {
      this.lastHash = hash;
      return { changed: true, diff: this.threshold };
    }

    const diff = this.hammingDistance(hash, this.lastHash);
    if (diff > this.threshold) {
      this.lastHash = hash;
      return { changed: true, diff };
    }

    return { changed: false, diff };
  }

  hash(dataUrl) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.ctx.drawImage(img, 0, 0, this.size, this.size);
        const pixels = this.ctx.getImageData(0, 0, this.size, this.size).data;
        const values = [];
        let total = 0;

        for (let i = 0; i < pixels.length; i += 4) {
          const gray = pixels[i] * 0.299 + pixels[i + 1] * 0.587 + pixels[i + 2] * 0.114;
          values.push(gray);
          total += gray;
        }

        const average = total / values.length;
        resolve(values.map((value) => value >= average ? 1 : 0));
      };
      img.onerror = reject;
      img.src = dataUrl;
    });
  }

  hammingDistance(a, b) {
    let diff = 0;
    for (let i = 0; i < a.length; i += 1) {
      if (a[i] !== b[i]) diff += 1;
    }
    return diff;
  }
}

class FocusSmoother {
  constructor({ windowMs = 5 * 60_000, minSamples = 3, productiveThreshold = 0.7 } = {}) {
    this.windowMs = windowMs;
    this.minSamples = minSamples;
    this.productiveThreshold = productiveThreshold;
    this.samples = [];
  }

  add(label, at = Date.now()) {
    const productive = label === 'deep_work' || label === 'admin' || label === 'productive';
    this.samples.push({ at, value: productive ? 1 : 0, label });
    this.prune(at);
    return this.state(at);
  }

  reset() {
    this.samples = [];
  }

  state(now = Date.now()) {
    this.prune(now);

    if (this.samples.length < this.minSamples) {
      return {
        ready: false,
        label: 'productive',
        productiveRatio: 1,
        sampleCount: this.samples.length,
      };
    }

    const sum = this.samples.reduce((total, sample) => total + sample.value, 0);
    const productiveRatio = sum / this.samples.length;
    return {
      ready: true,
      label: productiveRatio >= this.productiveThreshold ? 'productive' : 'distracted',
      productiveRatio,
      sampleCount: this.samples.length,
    };
  }

  prune(now) {
    const cutoff = now - this.windowMs;
    this.samples = this.samples.filter((sample) => sample.at >= cutoff);
  }
}

class ScreenClassifier {
  constructor({ endpoint, model } = {}) {
    this.endpoint = endpoint || 'http://127.0.0.1:11434/api/chat';
    this.model = model || 'moondream';
  }

  async classify(thumbnailDataUrl) {
    if (window.electronAPI?.classifyScreen) {
      return window.electronAPI.classifyScreen({
        imageDataUrl: thumbnailDataUrl,
        endpoint: this.endpoint,
        model: this.model,
      });
    }

    const base64 = thumbnailDataUrl.split(',')[1];
    const prompt = [
      'Classify this screen for a focus timer.',
      'Use context, not just app names.',
      'Return exactly one label:',
      'deep_work = coding, writing, design, studying, technical reading',
      'admin = calendar, email, settings, planning, short operational work',
      'distracted = entertainment, shopping, social feeds, games, memes, unrelated browsing',
    ].join('\n');

    const resp = await fetch(this.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        stream: false,
        messages: [{
          role: 'user',
          content: prompt,
          images: [base64],
        }],
      }),
    });

    if (!resp.ok) throw new Error(`Local classifier ${resp.status}`);

    const data = await resp.json();
    const text = String(data.message?.content ?? data.response ?? '').toLowerCase().trim();
    if (text.includes('distracted') || text.includes('distraction')) return 'distracted';
    if (text.includes('admin')) return 'admin';
    if (text.includes('deep')) return 'deep_work';
    if (text.includes('productive')) return 'deep_work';
    return 'distracted';
  }
}

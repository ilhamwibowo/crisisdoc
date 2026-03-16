/**
 * AudioWorklet processor for capturing PCM audio at 16kHz.
 * Converts float32 samples to int16 PCM and sends via port.
 */
class AudioCaptureProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this._buffer = [];
        this._bufferSize = 2048; // ~128ms at 16kHz
    }

    process(inputs) {
        const input = inputs[0];
        if (!input || input.length === 0) return true;

        const channel = input[0];
        for (let i = 0; i < channel.length; i++) {
            this._buffer.push(channel[i]);
        }

        if (this._buffer.length >= this._bufferSize) {
            const float32 = new Float32Array(this._buffer.splice(0, this._bufferSize));
            const pcm16 = new Int16Array(float32.length);
            for (let i = 0; i < float32.length; i++) {
                const s = Math.max(-1, Math.min(1, float32[i]));
                pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
            }
            this.port.postMessage(pcm16.buffer, [pcm16.buffer]);
        }

        return true;
    }
}

registerProcessor("audio-capture-processor", AudioCaptureProcessor);

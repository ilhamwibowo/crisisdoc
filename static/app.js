// ============================================================
// CrisisDoc — Client
// ============================================================

// ---- State ----
let ws = null;
let mediaStream = null;
let audioContext = null;
let audioWorklet = null;
let videoInterval = null;
let playbackContext = null;
let nextPlayTime = 0;
let sessionStart = null;
let timerInterval = null;
let frameCount = 0;
let reportMarkdown = "";
let sessionConfig = {};
let textSectionIndex = 0;
let narrationBlobs = []; // WAV blobs for each text section

const FRAME_INTERVAL_MS = 1000;
const AUDIO_SAMPLE_RATE = 16000;
const PLAYBACK_SAMPLE_RATE = 24000;

// ---- DOM refs ----
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

// ---- View management ----
function showView(id) {
    document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
    const target = document.getElementById(id);
    if (target) target.classList.add("active");
}

// ---- Mode tabs ----
$$(".mode-tab").forEach(tab => {
    tab.addEventListener("click", () => {
        $$(".mode-tab").forEach(t => t.classList.remove("active"));
        tab.classList.add("active");
        const mode = tab.dataset.mode;
        $("#start-form").style.display = mode === "live" ? "flex" : "none";
        $("#upload-form").style.display = mode === "upload" ? "flex" : "none";
    });
});

// ---- Upload zone ----
const uploadZone = $("#upload-zone");
const photoInput = $("#photo-input");
let uploadedFiles = [];

if (uploadZone) {
    uploadZone.addEventListener("click", () => photoInput.click());
    uploadZone.addEventListener("dragover", e => { e.preventDefault(); uploadZone.style.borderColor = "var(--accent)"; });
    uploadZone.addEventListener("dragleave", () => { uploadZone.style.borderColor = ""; });
    uploadZone.addEventListener("drop", e => {
        e.preventDefault();
        uploadZone.style.borderColor = "";
        handleFiles(e.dataTransfer.files);
    });
}

if (photoInput) {
    photoInput.addEventListener("change", () => handleFiles(photoInput.files));
}

function handleFiles(files) {
    const previews = $("#photo-previews");
    for (const file of files) {
        if (uploadedFiles.length >= 5) break;
        uploadedFiles.push(file);
        const img = document.createElement("img");
        img.src = URL.createObjectURL(file);
        previews.appendChild(img);
    }
}

// ---- Upload form submit ----
$("#upload-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    showView("generating");

    const formData = new FormData();
    formData.append("incident_type", $("#upload-type").value);
    formData.append("location", $("#upload-location").value);
    formData.append("description", $("#upload-description").value);
    uploadedFiles.forEach(f => formData.append("photos", f));

    sessionConfig = {
        incident_type: $("#upload-type").value,
        location: $("#upload-location").value,
    };

    try {
        const resp = await fetch("/api/upload-report", { method: "POST", body: formData });
        const data = await resp.json();

        if (data.error) {
            alert("Error: " + data.error);
            showView("landing");
            return;
        }

        advanceGenSteps();
        showView("report");
        for (const part of data.parts) {
            if (part.type === "text") appendReport(part.content, "text");
            else if (part.type === "image") appendReport(part.content, "image");
        }
        // Attach narration if present
        if (data.narration) {
            data.narration.forEach((b64, i) => {
                if (b64) attachNarration(i, b64);
            });
        }
        // Attach video if present
        if (data.video) {
            appendReportVideo(data.video);
        }
        finalizeReport();
    } catch (err) {
        alert("Report generation failed: " + err.message);
        showView("landing");
    }
});

// ============================================================
// LIVE SESSION
// ============================================================

$("#start-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    await startLiveSession();
});

async function startLiveSession() {
    sessionConfig = {
        incident_type: $("#incident-type").value,
        location: $("#location").value,
    };

    try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
            audio: { sampleRate: AUDIO_SAMPLE_RATE, channelCount: 1, echoCancellation: true, noiseSuppression: true },
        });

        $("#camera-feed").srcObject = mediaStream;
        showView("live");
        startTimer();
        setAIStatus("connecting", "Connecting to Gemini...");

        const proto = location.protocol === "https:" ? "wss:" : "ws:";
        ws = new WebSocket(`${proto}//${location.host}/ws/live`);

        ws.onopen = () => {
            ws.send(JSON.stringify({
                type: "config",
                incident_type: sessionConfig.incident_type,
                location: sessionConfig.location,
            }));
            startStreaming();
            setAIStatus("listening", "Listening & watching...");
            updateTranscriptMeta("Connected");
        };

        ws.onmessage = handleServerMessage;
        ws.onerror = () => {
            appendTranscript("Connection error. Please retry.", "system");
            setAIStatus("error", "Disconnected");
        };
        ws.onclose = () => {};

    } catch (err) {
        alert("Camera/microphone access is required.\n\n" + err.message);
    }
}

// ---- Timer ----
function startTimer() {
    sessionStart = Date.now();
    frameCount = 0;
    timerInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - sessionStart) / 1000);
        const m = String(Math.floor(elapsed / 60)).padStart(2, "0");
        const s = String(elapsed % 60).padStart(2, "0");
        $("#live-timer").textContent = `${m}:${s}`;
    }, 1000);
}

function stopTimer() {
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
}

function getSessionDuration() {
    if (!sessionStart) return "0s";
    const elapsed = Math.floor((Date.now() - sessionStart) / 1000);
    const m = Math.floor(elapsed / 60);
    const s = elapsed % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

// ---- AI Status ----
function setAIStatus(state, text) {
    const el = $("#ai-status");
    el.className = "ai-status " + state;
    $("#ai-status-text").textContent = text;
}

function updateTranscriptMeta(text) {
    $("#transcript-meta").textContent = text;
}

// ---- Streaming ----
async function startStreaming() {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const video = $("#camera-feed");

    videoInterval = setInterval(() => {
        if (!ws || ws.readyState !== WebSocket.OPEN) return;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        if (canvas.width === 0) return;
        ctx.drawImage(video, 0, 0);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
        const b64 = dataUrl.split(",")[1];
        ws.send(JSON.stringify({ type: "video", data: b64 }));
        frameCount++;
        $("#live-frames").textContent = `${frameCount} frames`;
    }, FRAME_INTERVAL_MS);

    try {
        audioContext = new AudioContext({ sampleRate: AUDIO_SAMPLE_RATE });
        await audioContext.audioWorklet.addModule("/static/audio-processor.js");
        const source = audioContext.createMediaStreamSource(mediaStream);
        audioWorklet = new AudioWorkletNode(audioContext, "audio-capture-processor");
        audioWorklet.port.onmessage = (e) => {
            if (!ws || ws.readyState !== WebSocket.OPEN) return;
            const b64 = arrayBufferToBase64(e.data);
            ws.send(JSON.stringify({ type: "audio", data: b64 }));
        };
        source.connect(audioWorklet);
    } catch (err) {
        console.warn("Audio capture failed:", err);
        appendTranscript("Audio capture unavailable — using video only.", "system");
    }

    playbackContext = new AudioContext({ sampleRate: PLAYBACK_SAMPLE_RATE });
    nextPlayTime = 0;
}

// ---- Server messages ----
function handleServerMessage(event) {
    const msg = JSON.parse(event.data);

    switch (msg.type) {
        case "text":
            appendTranscript(msg.data, "ai");
            setAIStatus("speaking", "Responding...");
            break;

        case "audio":
            playAudio(msg.data);
            setAIStatus("speaking", "Speaking...");
            break;

        case "turn_complete":
            setAIStatus("listening", "Listening & watching...");
            break;

        case "status":
            showView("generating");
            $("#gen-status").textContent = msg.data;
            advanceGenSteps();
            break;

        case "report_text":
            showView("report");
            appendReport(msg.data, "text");
            break;

        case "report_image":
            showView("report");
            appendReport(msg.data, "image");
            break;

        case "report_audio":
            attachNarration(msg.section, msg.data);
            break;

        case "report_video":
            appendReportVideo(msg.data);
            break;

        case "report_done":
            showView("report");
            finalizeReport();
            break;

        case "error":
            appendTranscript("Error: " + msg.data, "system");
            setAIStatus("error", "Error");
            break;
    }
}

// ---- Transcript ----
function appendTranscript(text, role) {
    // Remove welcome message
    const welcome = $(".transcript-welcome");
    if (welcome) welcome.remove();

    const div = document.createElement("div");
    div.className = `transcript-msg ${role}`;
    div.textContent = text;
    const el = $("#transcript");
    el.appendChild(div);
    el.scrollTop = el.scrollHeight;
}

// ---- Text input ----
$("#send-text-btn").addEventListener("click", sendTextMessage);
$("#text-input").addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendTextMessage();
    }
});

function sendTextMessage() {
    const input = $("#text-input");
    const text = input.value.trim();
    if (!text || !ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ type: "text", data: text }));
    appendTranscript(text, "user");
    input.value = "";
}

// ---- Audio playback ----
function playAudio(b64Data) {
    if (!playbackContext) return;
    try {
        const arrayBuf = base64ToArrayBuffer(b64Data);
        const int16 = new Int16Array(arrayBuf);
        const float32 = new Float32Array(int16.length);
        for (let i = 0; i < int16.length; i++) float32[i] = int16[i] / 32768;

        const buffer = playbackContext.createBuffer(1, float32.length, PLAYBACK_SAMPLE_RATE);
        buffer.getChannelData(0).set(float32);
        const source = playbackContext.createBufferSource();
        source.buffer = buffer;
        source.connect(playbackContext.destination);

        const now = playbackContext.currentTime;
        const start = Math.max(now + 0.05, nextPlayTime);
        source.start(start);
        nextPlayTime = start + buffer.duration;
    } catch (err) {
        console.warn("Audio playback error:", err);
    }
}

// ---- Controls ----
let micMuted = false;
let camOff = false;

$("#mic-toggle").addEventListener("click", () => {
    micMuted = !micMuted;
    mediaStream?.getAudioTracks().forEach(t => t.enabled = !micMuted);
    $("#mic-toggle span").textContent = micMuted ? "Unmute" : "Mute";
    $("#mic-toggle").classList.toggle("active", micMuted);
});

$("#cam-toggle").addEventListener("click", () => {
    camOff = !camOff;
    mediaStream?.getVideoTracks().forEach(t => t.enabled = !camOff);
    $("#cam-toggle span").textContent = camOff ? "Cam On" : "Cam Off";
    $("#cam-toggle").classList.toggle("active", camOff);
});

$("#capture-btn").addEventListener("click", () => {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    const canvas = document.createElement("canvas");
    const video = $("#camera-feed");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);
    const b64 = canvas.toDataURL("image/jpeg", 0.9).split(",")[1];
    ws.send(JSON.stringify({ type: "video", data: b64 }));
    frameCount++;
    $("#live-frames").textContent = `${frameCount} frames`;

    // Flash effect
    const btn = $("#capture-btn");
    btn.style.background = "rgba(255,255,255,0.4)";
    setTimeout(() => btn.style.background = "", 150);
    appendTranscript("Key frame captured", "system");
});

$("#end-btn").addEventListener("click", endSession);

function endSession() {
    stopTimer();
    if (videoInterval) { clearInterval(videoInterval); videoInterval = null; }
    if (audioWorklet) { audioWorklet.disconnect(); audioWorklet = null; }
    if (audioContext) { audioContext.close().catch(() => {}); audioContext = null; }
    if (mediaStream) { mediaStream.getTracks().forEach(t => t.stop()); mediaStream = null; }
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "end" }));
    }
    showView("generating");
}

// ============================================================
// REPORT
// ============================================================

let genStepIndex = 0;

function advanceGenSteps() {
    const steps = $$(".gen-step");
    if (genStepIndex > 0 && genStepIndex <= steps.length) {
        steps[genStepIndex - 1].classList.remove("active");
        steps[genStepIndex - 1].classList.add("done");
    }
    if (genStepIndex < steps.length) {
        steps[genStepIndex].classList.add("active");
    }
    genStepIndex++;
}

function appendReport(data, type) {
    const container = $("#report-content");

    if (type === "text") {
        reportMarkdown += data + "\n\n";
        const div = document.createElement("div");
        div.className = "report-section";
        div.dataset.sectionIndex = textSectionIndex;
        div.innerHTML = `
            <div class="section-audio-bar" id="audio-bar-${textSectionIndex}"></div>
            <div class="report-text">${renderMarkdown(data)}</div>
        `;
        container.appendChild(div);
        textSectionIndex++;
    } else if (type === "image") {
        const img = document.createElement("img");
        img.src = "data:image/png;base64," + data;
        img.className = "report-image";
        img.alt = "Generated diagram";
        img.addEventListener("click", () => openLightbox(img.src));
        container.appendChild(img);
    }

    container.scrollTop = container.scrollHeight;
}

function finalizeReport() {
    // Enable actions
    $("#download-btn").disabled = false;
    $("#new-btn").disabled = false;

    // Set meta
    const rid = "CD-" + Math.random().toString(36).slice(2, 8).toUpperCase();
    $("#report-id").textContent = rid;
    $("#meta-type").textContent = sessionConfig.incident_type || "";
    $("#meta-location").textContent = sessionConfig.location || "";
    $("#meta-duration").textContent = getSessionDuration();
    $("#meta-frames").textContent = `${frameCount} frames`;
    $("#report-meta-bar").style.display = "flex";

    // Try to detect severity from report text
    const sev = detectSeverity(reportMarkdown);
    const badge = $("#severity-badge");
    badge.textContent = sev;
    badge.className = "meta-badge severity-" + sev.toLowerCase();
}

function detectSeverity(text) {
    const lower = text.toLowerCase();
    if (lower.includes("critical")) return "Critical";
    if (lower.includes("high")) return "High";
    if (lower.includes("medium") || lower.includes("moderate")) return "Medium";
    if (lower.includes("low") || lower.includes("minor")) return "Low";
    return "Medium";
}

// ---- Markdown renderer ----
function renderMarkdown(text) {
    let html = text
        .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
        // Headers
        .replace(/^#### (.+)$/gm, "<h4>$1</h4>")
        .replace(/^### (.+)$/gm, "<h3>$1</h3>")
        .replace(/^## (.+)$/gm, "<h2>$1</h2>")
        .replace(/^# (.+)$/gm, "<h1>$1</h1>")
        // Bold/italic
        .replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>")
        .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
        .replace(/\*(.+?)\*/g, "<em>$1</em>")
        // Code
        .replace(/`([^`]+)`/g, "<code>$1</code>")
        // Numbered lists
        .replace(/^\d+\.\s+(.+)$/gm, "<li>$1</li>")
        // Bullet lists
        .replace(/^[-*]\s+(.+)$/gm, "<li>$1</li>")
        // Horizontal rule
        .replace(/^---+$/gm, "<hr>")
        // Line breaks
        .replace(/\n\n/g, "</p><p>")
        .replace(/\n/g, "<br>");

    // Wrap in paragraph
    html = "<p>" + html + "</p>";

    // Clean up empty paragraphs
    html = html.replace(/<p>\s*<\/p>/g, "");
    // Wrap consecutive <li> in <ul>
    html = html.replace(/(<li>[\s\S]*?<\/li>)/g, (match) => {
        if (!match.startsWith("<ul>")) return "<ul>" + match + "</ul>";
        return match;
    });
    // Fix nested ul
    html = html.replace(/<\/ul>\s*<ul>/g, "");

    return html;
}

// ---- Video reconstruction ----
function appendReportVideo(b64Data) {
    const container = $("#report-content");
    const section = document.createElement("div");
    section.className = "report-video-section";
    section.innerHTML = `
        <div class="video-label">
            <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polygon points="4,2 14,8 4,14"/></svg>
            AI-Generated Incident Reconstruction
        </div>
        <video controls autoplay muted loop class="report-video">
            <source src="data:video/mp4;base64,${b64Data}" type="video/mp4">
        </video>
    `;
    // Insert after first image or at position 2
    const firstImage = container.querySelector('.report-image');
    if (firstImage) {
        firstImage.after(section);
    } else {
        container.appendChild(section);
    }
}

// ---- Narration ----
function pcmToWavBlob(pcmData) {
    const int16 = new Int16Array(pcmData);
    const wavHeader = new ArrayBuffer(44);
    const view = new DataView(wavHeader);
    const sampleRate = 24000;
    const numChannels = 1;
    const bitsPerSample = 16;
    const byteRate = sampleRate * numChannels * bitsPerSample / 8;
    const blockAlign = numChannels * bitsPerSample / 8;
    const dataSize = int16.length * 2;

    // RIFF header
    view.setUint32(0, 0x52494646, false); // "RIFF"
    view.setUint32(4, 36 + dataSize, true);
    view.setUint32(8, 0x57415645, false); // "WAVE"
    // fmt chunk
    view.setUint32(12, 0x666d7420, false); // "fmt "
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);
    // data chunk
    view.setUint32(36, 0x64617461, false); // "data"
    view.setUint32(40, dataSize, true);

    return new Blob([wavHeader, int16.buffer], { type: "audio/wav" });
}

function attachNarration(sectionIndex, b64Data) {
    const pcm = base64ToArrayBuffer(b64Data);
    const blob = pcmToWavBlob(pcm);
    const url = URL.createObjectURL(blob);

    // Store for Play All
    while (narrationBlobs.length <= sectionIndex) narrationBlobs.push(null);
    narrationBlobs[sectionIndex] = url;

    const bar = $(`#audio-bar-${sectionIndex}`);
    if (bar) {
        bar.innerHTML = `
            <button class="narrate-btn" onclick="playSection(${sectionIndex})" title="Listen to narration">
                <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polygon points="3,2 12,7 3,12"/></svg>
                Listen
            </button>
            <audio id="audio-${sectionIndex}" src="${url}" preload="auto"></audio>
        `;
    }

    // Show play all button
    const playAllBtn = $("#play-all-btn");
    if (playAllBtn) playAllBtn.style.display = "inline-flex";
}

function playSection(index) {
    // Stop any playing audio
    document.querySelectorAll("audio").forEach(a => { a.pause(); a.currentTime = 0; });
    const audio = $(`#audio-${index}`);
    if (audio) audio.play();
}

let playAllIndex = 0;
function playAll() {
    playAllIndex = 0;
    playNextSection();
}

function playNextSection() {
    if (playAllIndex >= narrationBlobs.length) return;
    // Skip null entries
    while (playAllIndex < narrationBlobs.length && !narrationBlobs[playAllIndex]) playAllIndex++;
    if (playAllIndex >= narrationBlobs.length) return;

    const audio = $(`#audio-${playAllIndex}`);
    if (audio) {
        // Scroll section into view
        const section = $(`.report-section[data-section-index="${playAllIndex}"]`);
        if (section) section.scrollIntoView({ behavior: "smooth", block: "center" });

        audio.play();
        audio.onended = () => {
            playAllIndex++;
            playNextSection();
        };
    }
}

// ---- Report actions ----
$("#download-btn").addEventListener("click", () => {
    const blob = new Blob([reportMarkdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `incident_report_${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
});

$("#copy-btn").addEventListener("click", () => {
    navigator.clipboard.writeText(reportMarkdown).then(() => {
        const btn = $("#copy-btn");
        btn.textContent = "Copied!";
        setTimeout(() => { btn.innerHTML = '<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="10" height="12" rx="1"/><path d="M8 2h6a2 2 0 0 1 2 2v8"/></svg> Copy'; }, 1500);
    });
});

$("#print-btn").addEventListener("click", () => window.print());

$("#new-btn").addEventListener("click", resetApp);

function resetApp() {
    $("#report-content").innerHTML = "";
    reportMarkdown = "";
    frameCount = 0;
    genStepIndex = 0;
    sessionConfig = {};
    textSectionIndex = 0;
    narrationBlobs.forEach(url => { if (url) URL.revokeObjectURL(url); });
    narrationBlobs = [];
    uploadedFiles = [];
    if ($("#photo-previews")) $("#photo-previews").innerHTML = "";
    $("#transcript").innerHTML = '<div class="transcript-welcome"><p>CrisisDoc AI will analyze your video feed and audio in real-time.</p><p>Point your camera at the scene and describe what happened.</p></div>';
    $$(".gen-step").forEach(s => { s.classList.remove("active", "done"); });
    $(".gen-step").classList.add("active");
    $("#download-btn").disabled = true;
    $("#new-btn").disabled = true;
    $("#report-meta-bar").style.display = "none";
    showView("landing");
}

// ---- Lightbox ----
function openLightbox(src) {
    $("#lightbox-img").src = src;
    $("#lightbox").classList.add("open");
}

function closeLightbox() {
    $("#lightbox").classList.remove("open");
}

document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeLightbox();
});

// ---- Util ----
function arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
}

function base64ToArrayBuffer(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes.buffer;
}

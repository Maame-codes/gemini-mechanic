// --- 1. Element Selectors (Removed Popup Elements) ---
const video = document.getElementById("webcam");
const canvas = document.getElementById("photoCanvas");
const captureBtn = document.getElementById("capture-btn");
const flipBtn = document.getElementById("flip-btn");
const chatArea = document.getElementById("chat-area");
const userInput = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");
const micBtn = document.getElementById("mic-btn");

let currentFacingMode = "environment";
let isListening = false;

// --- 2. Clean Webcam Initialization ---
async function startWebcam(facingMode) {
  try {
    if (video.srcObject) {
      video.srcObject.getTracks().forEach((track) => track.stop());
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: facingMode },
    });

    video.srcObject = stream;
  } catch (err) {
    console.warn("Camera access denied or unavailable.");
    addMessage(
      "ai",
      "⚠️ Vision Offline: Camera access is required for diagnostics.",
    );
  }
}

// Initial Start
startWebcam(currentFacingMode);

flipBtn.addEventListener("click", () => {
  currentFacingMode =
    currentFacingMode === "environment" ? "user" : "environment";
  startWebcam(currentFacingMode);
});

// --- 3. UI Helpers & Typing Indicator (Avatar-Free) ---
function toggleTyping(show) {
  if (show) {
    const dotsHtml = `
      <div class="chat-msg" id="typing-dots">
        <div class="chat-content">
          <div class="chat-name">Gemini Mechanic</div>
          <div class="chat-bubble">
            <div class="typing-indicator">
              <div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>
            </div>
          </div>
        </div>
      </div>`;
    chatArea.insertAdjacentHTML("beforeend", dotsHtml);
  } else {
    const dots = document.getElementById("typing-dots");
    if (dots) dots.remove();
  }
  chatArea.scrollTop = chatArea.scrollHeight;
}

function addMessage(role, text) {
  const isAi = role === "ai";
  const formattedText = text.replace(/\n/g, "<br>");

  const msgHtml = `
    <div class="chat-msg ${isAi ? "" : "user"}">
      <div class="chat-content">
        <div class="chat-name">${isAi ? "Gemini Mechanic" : "You"}</div>
        <div class="chat-bubble">${formattedText}</div>
      </div>
    </div>`;

  chatArea.insertAdjacentHTML("beforeend", msgHtml);
  chatArea.scrollTop = chatArea.scrollHeight;
}

// --- 4. Core AI Analysis (Camera to Chat) ---
async function startDiagnosis() {
  if (!video.srcObject) {
    addMessage("ai", "I can't see anything yet! Please allow camera access.");
    return;
  }

  // Use typing indicator as feedback instead of a popup
  toggleTyping(true);

  const context = canvas.getContext("2d");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  context.drawImage(video, 0, 0);
  const imageB64 = canvas.toDataURL("image/jpeg");

  try {
    const response = await fetch("/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image_b64: imageB64 }),
    });
    const data = await response.json();

    toggleTyping(false);
    const result = data.analysis || data.error;

    // Diagnostic results now appear directly in the chat
    addMessage("ai", result);
  } catch (error) {
    toggleTyping(false);
    addMessage("ai", "⚠️ Connection error. Please check your cloud logs.");
  }
}

// --- 5. Manual Chat Logic ---
async function handleManualChat() {
  const text = userInput.value.trim();
  if (!text) return;

  addMessage("user", text);
  userInput.value = "";

  toggleTyping(true);

  try {
    const response = await fetch("/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text }),
    });

    const data = await response.json();
    toggleTyping(false);
    addMessage("ai", data.reply);
  } catch (error) {
    toggleTyping(false);
    addMessage("ai", "⚠️ Connection error. Is the server running?");
  }
}

// --- 6. Microphone / Voice-to-Text (Real-Time) ---
const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;

if (SpeechRecognition) {
  const recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = "en-US";

  micBtn.addEventListener("click", () => {
    if (isListening) {
      recognition.stop();
    } else {
      try {
        recognition.start();
      } catch (e) {
        console.error(e);
      }
    }
  });

  recognition.onstart = () => {
    isListening = true;
    micBtn.classList.add("listening");
    userInput.placeholder = "Listening...";
  };

  recognition.onresult = (event) => {
    let interimTranscript = "";
    for (let i = event.resultIndex; i < event.results.length; ++i) {
      if (event.results[i].isFinal) {
        userInput.value = event.results[i][0].transcript;
        handleManualChat();
      } else {
        interimTranscript += event.results[i][0].transcript;
        userInput.value = interimTranscript;
      }
    }
  };

  recognition.onerror = () => {
    isListening = false;
    micBtn.classList.remove("listening");
  };

  recognition.onend = () => {
    isListening = false;
    micBtn.classList.remove("listening");
    userInput.placeholder = "Ask Gemini Mechanic...";
  };
} else {
  micBtn.style.display = "none";
}

// --- 7. General Event Listeners ---
captureBtn.addEventListener("click", startDiagnosis);
sendBtn.addEventListener("click", handleManualChat);

userInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    handleManualChat();
  }
});

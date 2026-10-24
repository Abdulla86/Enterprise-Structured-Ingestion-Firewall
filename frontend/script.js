const API_URL = "http://127.0.0.1:8000/api/analyze";
const HEALTH_URL = "http://127.0.0.1:8000/health";

const chatForm = document.getElementById("chat-form");
const messageInput = document.getElementById("message-input");
const sendButton = document.getElementById("send-button");
const chatMessages = document.getElementById("chat-messages");
const chatTitle = document.getElementById("chat-title");
const welcome = document.getElementById("welcome");
const errorMessage = document.getElementById("error-message");
const backendStatus = document.getElementById("backend-status");

let isLoading = false;
let hasMessages = false;

function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[character]);
}

function renderMarkdown(markdown) {
    if (typeof marked === "undefined" ||
        typeof DOMPurify === "undefined") {
        return `<pre>${escapeHTML(markdown)}</pre>`;
    }

    const html = marked.parse(markdown);
    return DOMPurify.sanitize(html);
}

function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function addUserMessage(message) {
    welcome.hidden = true;

    const element = document.createElement("div");
    element.className = "message user-message";
    element.textContent = message;

    chatMessages.appendChild(element);
    scrollToBottom();
}

function addLoadingMessage() {
    const element = document.createElement("div");
    element.className = "message loading";
    element.id = "loading-message";
    element.textContent = "AI is thinking...";

    chatMessages.appendChild(element);
    scrollToBottom();

    return element;
}

function addAssistantMessage(markdown, intentData) {
    const wrapper = document.createElement("div");
    wrapper.className = "message assistant-message";

    const label = document.createElement("div");
    label.className = "assistant-label";
    label.textContent = "✦ AI Assistant";

    const content = document.createElement("div");
    content.className = "assistant-content";
    content.innerHTML = renderMarkdown(markdown);

    wrapper.append(label, content);

    if (intentData) {
        const details = document.createElement("details");
        details.className = "intent-details";

        const summary = document.createElement("summary");
        summary.textContent = "Detected Intent (Week 1)";

        const pre = document.createElement("pre");
        pre.textContent = JSON.stringify(intentData, null, 2);

        details.append(summary, pre);
        wrapper.appendChild(details);
    }

    chatMessages.appendChild(wrapper);
    scrollToBottom();
}

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.hidden = false;
}

async function sendMessage(message) {
    if (isLoading || !message.trim()) return;

    isLoading = true;
    sendButton.disabled = true;
    errorMessage.hidden = true;

    addUserMessage(message);

    if (!hasMessages) {
        chatTitle.textContent =
            message.length > 32
                ? `${message.slice(0, 32)}...`
                : message;

        hasMessages = true;
    }

    const loadingElement = addLoadingMessage();

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ message })
        });

        const data = await response.json();

        if (!response.ok) {
            const detail = typeof data.detail === "string"
                ? data.detail
                : "The backend could not process your request.";

            throw new Error(detail);
        }

        if (!data.response_markdown) {
            throw new Error(
                "The API response is missing response_markdown. " +
                "Check your Week 2 backend."
            );
        }

        addAssistantMessage(data.response_markdown, {
            intent: data.intent,
            risk_profile: data.risk_profile,
            priority: data.priority,
            requires_action: data.requires_action,
            summary: data.summary
        });

    } catch (error) {
        showError(
            `${error.message} Check that FastAPI is running on port 8000.`
        );
    } finally {
        loadingElement.remove();
        isLoading = false;
        sendButton.disabled = false;
        messageInput.focus();
    }
}

chatForm.addEventListener("submit", event => {
    event.preventDefault();

    const message = messageInput.value.trim();

    if (!message || isLoading) return;

    messageInput.value = "";
    sendMessage(message);
});

document.querySelectorAll(".suggestion").forEach(button => {
    button.addEventListener("click", () => {
        sendMessage(button.textContent.trim());
    });
});

document.getElementById("new-chat").addEventListener("click", () => {
    chatMessages.replaceChildren();
    chatMessages.appendChild(welcome);

    welcome.hidden = false;
    chatTitle.textContent = "New Chat";
    hasMessages = false;
    errorMessage.hidden = true;
    messageInput.value = "";
});

async function checkBackend() {
    try {
        const response = await fetch(HEALTH_URL);

        if (!response.ok) {
            throw new Error("Backend unavailable");
        }

        backendStatus.textContent = "Backend Connected";
    } catch {
        backendStatus.textContent = "Backend Disconnected";
    }
}

checkBackend();
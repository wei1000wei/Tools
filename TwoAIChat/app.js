const config = {
    apiUrl: localStorage.getItem('apiUrl') || 'https://api.laozhang.ai/v1/chat/completions',
    apiKey: localStorage.getItem('apiKey') || '',
    model: localStorage.getItem('model') || 'gemini-3.1-pro-preview',
    maxTokens: parseInt(localStorage.getItem('maxTokens')) || 4096
};

let messages = [];
let isLoading = false;
let isRunning = false;
let isPaused = false;
let topic = '';
let intervalId = null;
let speed = 5000;
let currentSpeaker = 'A';

const chatContainer = document.getElementById('chatContainer');
const settingsBtn = document.getElementById('settingsBtn');
const settingsPanel = document.getElementById('settingsPanel');
const closeSettings = document.getElementById('closeSettings');
const saveSettings = document.getElementById('saveSettings');
const themeToggle = document.getElementById('themeToggle');
const toast = document.getElementById('toast');

const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const stopBtn = document.getElementById('stopBtn');
const stepBtn = document.getElementById('stepBtn');
const topicInputContainer = document.getElementById('topicInputContainer');
const topicInput = document.getElementById('topicInput');
const topicConfirmBtn = document.getElementById('topicConfirmBtn');
const speedControl = document.getElementById('speedControl');
const speedSlider = document.getElementById('speedSlider');
const speedValue = document.getElementById('speedValue');

const apiUrlInput = document.getElementById('apiUrl');
const apiKeyInput = document.getElementById('apiKey');
const modelNameInput = document.getElementById('modelName');
const maxTokensInput = document.getElementById('maxTokens');

function init() {
    loadTheme();
    setupEventListeners();
}

function loadTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
}

function setupEventListeners() {
    startBtn.addEventListener('click', showTopicInput);
    pauseBtn.addEventListener('click', togglePause);
    stopBtn.addEventListener('click', stopDialogue);
    stepBtn.addEventListener('click', singleStep);
    topicConfirmBtn.addEventListener('click', startDialogue);
    topicInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') startDialogue();
    });
    speedSlider.addEventListener('input', updateSpeed);
    
    settingsBtn.addEventListener('click', openSettings);
    closeSettings.addEventListener('click', closeSettingsPanel);
    saveSettings.addEventListener('click', saveConfig);
    themeToggle.addEventListener('click', toggleTheme);
    document.getElementById('clearBtn').addEventListener('click', clearChat);
    
    document.addEventListener('click', (e) => {
        if (settingsPanel.classList.contains('open') && !settingsPanel.contains(e.target) && !settingsBtn.contains(e.target)) {
            closeSettingsPanel();
        }
    });
}

function showTopicInput() {
    topicInputContainer.style.display = 'flex';
    topicInput.focus();
    speedControl.style.display = 'flex';
    speed = (11 - speedSlider.value) * 1000;
    speedValue.textContent = (speed / 1000) + 's';
}

function updateSpeed() {
    speed = (11 - speedSlider.value) * 1000;
    speedValue.textContent = (speed / 1000) + 's';
    if (isRunning && !isPaused) {
        clearInterval(intervalId);
        intervalId = setInterval(autoStep, speed);
    }
}

function startDialogue() {
    topic = topicInput.value.trim();
    if (!topic) {
        showToast('请输入对话主题', 'warning');
        return;
    }
    
    topicInputContainer.style.display = 'none';
    messages = [];
    currentSpeaker = 'A';
    
    chatContainer.innerHTML = '';
    addSystemMessage(`主题: ${topic}`);
    
    updateButtonStates(true);
    isRunning = true;
    isPaused = false;
    
    const systemPromptA = `你是AI-A，请根据以下主题与AI-B进行对话。对话主题: ${topic}`;
    const systemPromptB = `你是AI-B，请根据以下主题与AI-A进行对话。对话主题: ${topic}`;
    
    messages = [
        { role: 'system', content: systemPromptA, speaker: 'A' },
        { role: 'system', content: systemPromptB, speaker: 'B' }
    ];
    
    callAPI(currentSpeaker);
}

function updateButtonStates(running) {
    startBtn.disabled = running;
    pauseBtn.disabled = !running;
    stopBtn.disabled = !running;
    stepBtn.disabled = !running || isPaused;
    
    if (running && !isPaused) {
        pauseBtn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="6" y="4" width="4" height="16"/>
                <rect x="14" y="4" width="4" height="16"/>
            </svg>
            <span>暂停</span>
        `;
    } else if (running && isPaused) {
        pauseBtn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
            <span>继续</span>
        `;
    }
}

function togglePause() {
    isPaused = !isPaused;
    updateButtonStates(true);
    
    if (!isPaused) {
        intervalId = setInterval(autoStep, speed);
    } else {
        clearInterval(intervalId);
    }
}

function stopDialogue() {
    clearInterval(intervalId);
    isRunning = false;
    isPaused = false;
    updateButtonStates(false);
    showToast('对话已结束', 'success');
}

function autoStep() {
    if (!isRunning || isPaused) return;
    singleStep();
}

function singleStep() {
    if (isLoading) return;
    
    currentSpeaker = currentSpeaker === 'A' ? 'B' : 'A';
    callAPI(currentSpeaker);
}

function addSystemMessage(content) {
    const div = document.createElement('div');
    div.className = 'system-message';
    div.textContent = content;
    chatContainer.appendChild(div);
    scrollToBottom();
}

function addAIMessage(speaker, content) {
    const welcome = chatContainer.querySelector('.welcome');
    if (welcome) welcome.remove();
    
    const div = document.createElement('div');
    div.className = `message assistant speaker-${speaker.toLowerCase()}`;
    
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = speaker;
    avatar.style.backgroundColor = speaker === 'A' ? '#4CAF50' : '#2196F3';
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    
    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';
    bubble.innerHTML = renderContent(content);
    
    const time = document.createElement('div');
    time.className = 'message-time';
    time.textContent = new Date().toLocaleTimeString();
    
    contentDiv.appendChild(bubble);
    contentDiv.appendChild(time);
    div.appendChild(avatar);
    div.appendChild(contentDiv);
    chatContainer.appendChild(div);
    
    scrollToBottom();
}

function renderContent(text) {
    let processed = text;
    processed = processed.replace(/\$\$([\s\S]*?)\$\$/g, (match, formula) => {
        try {
            return katex.renderToString(formula.trim(), { displayMode: true });
        } catch (e) {
            return match;
        }
    });
    processed = processed.replace(/\$([^\$\n]+?)\$/g, (match, formula) => {
        try {
            return katex.renderToString(formula.trim(), { displayMode: false });
        } catch (e) {
            return match;
        }
    });
    
    marked.setOptions({
        highlight: function(code, lang) {
            if (lang && hljs.getLanguage(lang)) {
                return hljs.highlight(code, { language: lang }).value;
            }
            return hljs.highlightAuto(code).value;
        },
        breaks: true
    });
    
    processed = marked.parse(processed);
    
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = processed;
    
    const preBlocks = tempDiv.querySelectorAll('pre');
    preBlocks.forEach((pre) => {
        const code = pre.querySelector('code');
        if (!code) return;
        
        const codeText = code.textContent;
        const classMatch = code.className.match(/language-(\w+)/);
        const lang = classMatch ? classMatch[1] : 'code';
        
        const wrapper = document.createElement('div');
        wrapper.className = 'code-wrapper';
        
        const header = document.createElement('div');
        header.className = 'code-header';
        
        const langLabel = document.createElement('span');
        langLabel.className = 'code-lang';
        langLabel.textContent = lang;
        
        const actions = document.createElement('div');
        actions.className = 'code-actions';
        
        const copyBtn = document.createElement('button');
        copyBtn.className = 'code-btn';
        copyBtn.title = '复制';
        copyBtn.type = 'button';
        copyBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
        copyBtn.addEventListener('click', function() {
            navigator.clipboard.writeText(codeText).then(() => {
                showToast('已复制', 'success');
            });
        });
        actions.appendChild(copyBtn);
        
        header.appendChild(langLabel);
        header.appendChild(actions);
        
        const codeContent = document.createElement('pre');
        codeContent.className = 'code-content';
        
        const codeElement = document.createElement('code');
        codeElement.className = code.className;
        codeElement.innerHTML = code.innerHTML;
        codeContent.appendChild(codeElement);
        
        wrapper.appendChild(header);
        wrapper.appendChild(codeContent);
        
        pre.parentNode.replaceChild(wrapper, pre);
    });
    
    return tempDiv.innerHTML;
}

function showLoading(speaker) {
    const welcome = chatContainer.querySelector('.welcome');
    if (welcome) welcome.remove();
    
    const div = document.createElement('div');
    div.className = `message assistant speaker-${speaker.toLowerCase()}`;
    div.id = 'loadingMessage';
    
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = speaker;
    avatar.style.backgroundColor = speaker === 'A' ? '#4CAF50' : '#2196F3';
    
    const content = document.createElement('div');
    content.className = 'message-content';
    
    const loading = document.createElement('div');
    loading.className = 'loading';
    loading.innerHTML = `
        <div class="loading-dots">
            <span></span>
            <span></span>
            <span></span>
        </div>
        <span>AI-${speaker} 思考中...</span>
    `;
    
    content.appendChild(loading);
    div.appendChild(avatar);
    div.appendChild(content);
    chatContainer.appendChild(div);
    scrollToBottom();
}

function hideLoading() {
    const loading = document.getElementById('loadingMessage');
    if (loading) loading.remove();
}

async function callAPI(speaker) {
    if (isLoading) return;
    isLoading = true;
    showLoading(speaker);
    
    const conversationHistory = messages.filter(m => m.role !== 'system').map(m => ({
        role: m.role,
        content: m.content
    }));
    
    const systemMsg = messages.find(m => m.speaker === speaker && m.role === 'system');
    const allMessages = [
        { role: 'system', content: systemMsg.content }
    ];
    
    for (const msg of conversationHistory) {
        const prevSpeaker = messages.find(m => m.content === msg.content && m.role !== 'system')?.speaker;
        allMessages.push({
            role: msg.role,
            content: `[AI-${prevSpeaker}说]: ${msg.content}\n\n请根据以上对话继续回复，对话主题: ${topic}`
        });
    }
    
    try {
        const response = await fetch(config.apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.apiKey}`
            },
            body: JSON.stringify({
                model: config.model,
                messages: allMessages,
                max_tokens: config.maxTokens
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            handleAPIError(response.status, errorData);
            return;
        }
        
        const data = await response.json();
        hideLoading();
        
        const choice = data.choices && data.choices[0];
        if (choice && choice.message) {
            const content = choice.message.content || '';
            messages.push({ role: 'assistant', content: content, speaker: speaker });
            addAIMessage(speaker, content);
        }
        
    } catch (error) {
        hideLoading();
        console.error('API Error:', error);
        showToast('网络错误，请检查网络连接', 'error');
    } finally {
        isLoading = false;
        
        if (isRunning && !isPaused) {
            clearInterval(intervalId);
            intervalId = setInterval(autoStep, speed);
        }
    }
}

function handleAPIError(status, errorData) {
    hideLoading();
    
    const errorMsg = errorData.error?.message || '';
    
    if (status === 401 || status === 403 || errorMsg.includes('API key') || errorMsg.includes('Unauthorized')) {
        showToast('API Key 无效或已过期', 'error');
    } else if (status === 429 || errorMsg.includes('rate limit') || errorMsg.includes('quota')) {
        showToast('请求过于频繁或余额不足，请稍后再试', 'warning');
    } else if (status === 402 || errorMsg.includes('insufficient') || errorMsg.includes('balance')) {
        showToast('余额不足，请充值后继续使用', 'warning');
    } else if (errorMsg.includes('model')) {
        showToast('模型不可用，请检查模型名称', 'error');
    } else {
        showToast(`请求失败: ${errorMsg || status}`, 'error');
    }
    
    stopDialogue();
}

function openSettings() {
    apiUrlInput.value = config.apiUrl;
    apiKeyInput.value = config.apiKey;
    modelNameInput.value = config.model;
    maxTokensInput.value = config.maxTokens;
    settingsPanel.classList.add('open');
}

function closeSettingsPanel() {
    settingsPanel.classList.remove('open');
}

function saveConfig() {
    config.apiUrl = apiUrlInput.value.trim();
    config.apiKey = apiKeyInput.value.trim();
    config.model = modelNameInput.value.trim();
    config.maxTokens = parseInt(maxTokensInput.value) || 4096;
    
    localStorage.setItem('apiUrl', config.apiUrl);
    localStorage.setItem('apiKey', config.apiKey);
    localStorage.setItem('model', config.model);
    localStorage.setItem('maxTokens', config.maxTokens);
    
    showToast('设置已保存', 'success');
    closeSettingsPanel();
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
}

function showToast(message, type = 'info') {
    toast.textContent = message;
    toast.className = 'toast show ' + type;
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

function clearChat() {
    messages = [];
    chatContainer.innerHTML = `
        <div class="welcome">
            <svg class="welcome-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
            </svg>
            <h2>AI 对话</h2>
            <p>开始一场 AI 之间的对话吧</p>
        </div>
    `;
    showToast('对话已清空', 'success');
}

function scrollToBottom() {
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

document.addEventListener('DOMContentLoaded', init);

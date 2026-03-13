const config = {
    apiUrl: localStorage.getItem('apiUrl') || 'https://api.laozhang.ai/v1/chat/completions',
    apiKey: localStorage.getItem('apiKey') || '',
    model: localStorage.getItem('model') || 'gemini-3.1-pro-preview',
    maxTokens: parseInt(localStorage.getItem('maxTokens')) || 4096
};

let messages = [];
let isLoading = false;

const chatContainer = document.getElementById('chatContainer');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const clearBtn = document.getElementById('clearBtn');
const settingsBtn = document.getElementById('settingsBtn');
const settingsPanel = document.getElementById('settingsPanel');
const closeSettings = document.getElementById('closeSettings');
const saveSettings = document.getElementById('saveSettings');
const themeToggle = document.getElementById('themeToggle');
const toast = document.getElementById('toast');

const apiUrlInput = document.getElementById('apiUrl');
const apiKeyInput = document.getElementById('apiKey');
const modelNameInput = document.getElementById('modelName');
const maxTokensInput = document.getElementById('maxTokens');

function init() {
    loadTheme();
    loadMessages();
    setupEventListeners();
    autoResizeTextarea();
}

function loadTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
}

function loadMessages() {
    const saved = localStorage.getItem('chatMessages');
    if (saved) {
        messages = JSON.parse(saved);
        messages.forEach(msg => renderMessage(msg, false));
        scrollToBottom();
    }
}

function saveMessages() {
    localStorage.setItem('chatMessages', JSON.stringify(messages));
}

function setupEventListeners() {
    sendBtn.addEventListener('click', sendMessage);
    userInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    userInput.addEventListener('input', autoResizeTextarea);
    clearBtn.addEventListener('click', clearChat);
    settingsBtn.addEventListener('click', openSettings);
    closeSettings.addEventListener('click', closeSettingsPanel);
    saveSettings.addEventListener('click', saveConfig);
    themeToggle.addEventListener('click', toggleTheme);
    document.addEventListener('click', (e) => {
        if (settingsPanel.classList.contains('open') && !settingsPanel.contains(e.target) && !settingsBtn.contains(e.target)) {
            closeSettingsPanel();
        }
    });
}

function autoResizeTextarea() {
    userInput.style.height = 'auto';
    userInput.style.height = Math.min(userInput.scrollHeight, 150) + 'px';
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
            <h2>欢迎使用 AI Chat</h2>
            <p>开始一段新的对话吧</p>
        </div>
    `;
    localStorage.removeItem('chatMessages');
    showToast('对话已清空', 'success');
}

function sendMessage() {
    const content = userInput.value.trim();
    if (!content || isLoading) return;
    
    const userMessage = {
        role: 'user',
        content: content,
        time: new Date().toLocaleTimeString()
    };
    
    messages.push(userMessage);
    renderMessage(userMessage);
    saveMessages();
    
    userInput.value = '';
    autoResizeTextarea();
    scrollToBottom();
    
    callAPI();
}

function renderMessage(msg, scroll = true) {
    const welcome = chatContainer.querySelector('.welcome');
    if (welcome) welcome.remove();
    
    const div = document.createElement('div');
    div.className = `message ${msg.role}`;
    
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = msg.role === 'user' ? 'U' : 'AI';
    
    const content = document.createElement('div');
    content.className = 'message-content';
    
    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';
    
    if (msg.role === 'user') {
        bubble.textContent = msg.content;
    } else {
        bubble.innerHTML = renderContent(msg.content);
        if (msg.thinking) {
            const thinkingSection = createThinkingSection(msg.thinking);
            content.appendChild(bubble);
            content.appendChild(thinkingSection);
            div.appendChild(avatar);
            div.appendChild(content);
            chatContainer.appendChild(div);
            if (scroll) scrollToBottom();
            return;
        }
    }
    
    const time = document.createElement('div');
    time.className = 'message-time';
    time.textContent = msg.time || new Date().toLocaleTimeString();
    
    content.appendChild(bubble);
    content.appendChild(time);
    div.appendChild(avatar);
    div.appendChild(content);
    chatContainer.appendChild(div);
    
    if (scroll) scrollToBottom();
}

function createThinkingSection(thinking) {
    const section = document.createElement('div');
    section.className = 'thinking-section';
    
    const header = document.createElement('div');
    header.className = 'thinking-header';
    header.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="9 18 15 12 9 6"/>
        </svg>
        <span>思考过程</span>
    `;
    
    const content = document.createElement('div');
    content.className = 'thinking-content';
    
    const text = document.createElement('div');
    text.className = 'thinking-text';
    text.textContent = thinking;
    
    content.appendChild(text);
    section.appendChild(header);
    section.appendChild(content);
    
    header.addEventListener('click', () => {
        header.classList.toggle('expanded');
        content.classList.toggle('expanded');
    });
    
    return section;
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
        const highlightedCode = code.innerHTML;
        
        const wrapper = document.createElement('div');
        wrapper.className = 'code-wrapper';
        
        const header = document.createElement('div');
        header.className = 'code-header';
        
        const langLabel = document.createElement('span');
        langLabel.className = 'code-lang';
        langLabel.textContent = lang;
        
        const actions = document.createElement('div');
        actions.className = 'code-actions';
        
        if (lang === 'html' || lang === 'htm') {
            const previewBtn = document.createElement('button');
            previewBtn.className = 'code-btn';
            previewBtn.title = '预览';
            previewBtn.type = 'button';
            previewBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
            previewBtn.addEventListener('click', function() {
                previewCode(codeText, lang);
            });
            actions.appendChild(previewBtn);
        }
        
        const copyBtn = document.createElement('button');
        copyBtn.className = 'code-btn';
        copyBtn.title = '复制';
        copyBtn.type = 'button';
        copyBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
        copyBtn.addEventListener('click', function() {
            copyCode(codeText, copyBtn);
        });
        actions.appendChild(copyBtn);
        
        const downloadBtn = document.createElement('button');
        downloadBtn.className = 'code-btn';
        downloadBtn.title = '下载';
        downloadBtn.type = 'button';
        downloadBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>';
        downloadBtn.addEventListener('click', function() {
            downloadCode(codeText, lang);
        });
        actions.appendChild(downloadBtn);
        
        header.appendChild(langLabel);
        header.appendChild(actions);
        
        const codeContent = document.createElement('pre');
        codeContent.className = 'code-content';
        
        const codeElement = document.createElement('code');
        codeElement.className = code.className;
        codeElement.innerHTML = highlightedCode;
        codeContent.appendChild(codeElement);
        
        wrapper.appendChild(header);
        wrapper.appendChild(codeContent);
        
        pre.parentNode.replaceChild(wrapper, pre);
    });
    
    return tempDiv.innerHTML;
}

function copyCode(code, btn) {
    navigator.clipboard.writeText(code).then(() => {
        const originalHTML = btn.innerHTML;
        btn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"/>
            </svg>
        `;
        btn.classList.add('copied');
        
        setTimeout(() => {
            btn.innerHTML = originalHTML;
            btn.classList.remove('copied');
        }, 2000);
    }).catch(() => {
        showToast('复制失败', 'error');
    });
}

function downloadCode(code, lang) {
    const extMap = {
        'html': 'html',
        'htm': 'html',
        'css': 'css',
        'javascript': 'js',
        'js': 'js',
        'typescript': 'ts',
        'ts': 'ts',
        'python': 'py',
        'py': 'py',
        'java': 'java',
        'c': 'c',
        'cpp': 'cpp',
        'c++': 'cpp',
        'csharp': 'cs',
        'cs': 'cs',
        'php': 'php',
        'ruby': 'rb',
        'go': 'go',
        'rust': 'rs',
        'sql': 'sql',
        'json': 'json',
        'xml': 'xml',
        'yaml': 'yaml',
        'yml': 'yml',
        'markdown': 'md',
        'md': 'md',
        'shell': 'sh',
        'bash': 'sh',
        'sh': 'sh',
        'powershell': 'ps1',
        'vue': 'vue',
        'react': 'jsx',
        'jsx': 'jsx',
        'tsx': 'tsx',
        'scss': 'scss',
        'sass': 'sass',
        'less': 'less'
    };
    
    const ext = extMap[lang.toLowerCase()] || 'txt';
    const filename = `code_${Date.now()}.${ext}`;
    
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast('代码已下载', 'success');
}

function previewCode(code, lang) {
    if (lang !== 'html' && lang !== 'htm') return;
    
    const previewWindow = window.open('', '_blank', 'width=800,height=600');
    if (previewWindow) {
        previewWindow.document.write(code);
        previewWindow.document.close();
    }
}

function showLoading() {
    const welcome = chatContainer.querySelector('.welcome');
    if (welcome) welcome.remove();
    
    const div = document.createElement('div');
    div.className = 'message assistant';
    div.id = 'loadingMessage';
    
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = 'AI';
    
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
        <span>AI 思考中...</span>
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

async function callAPI() {
    if (isLoading) return;
    isLoading = true;
    sendBtn.disabled = true;
    showLoading();
    
    try {
        const response = await fetch(config.apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.apiKey}`
            },
            body: JSON.stringify({
                model: config.model,
                messages: messages.map(m => ({
                    role: m.role,
                    content: m.content
                })),
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
            const assistantMessage = {
                role: 'assistant',
                content: choice.message.content || '',
                thinking: choice.message.reasoning_content || null,
                time: new Date().toLocaleTimeString()
            };
            
            messages.push(assistantMessage);
            renderMessage(assistantMessage);
            saveMessages();
        }
        
    } catch (error) {
        hideLoading();
        console.error('API Error:', error);
        showToast('网络错误，请检查网络连接', 'error');
    } finally {
        isLoading = false;
        sendBtn.disabled = false;
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
}

function scrollToBottom() {
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

document.addEventListener('DOMContentLoaded', init);

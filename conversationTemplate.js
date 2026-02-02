export function getConversationHTML(convoId, items, basicInfo, agentId) {
    let html = `
<!DOCTYPE html>
<html>
<head>
    <title>Conversation ${convoId}</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; background-color: #f5f5f5; }
        .container { background-color: white; border-radius: 8px; padding: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        h1 { color: #333; margin-bottom: 30px; }
        .basic-info { background-color: #fff3e0; border-left: 4px solid #ff9800; padding: 12px; margin-bottom: 20px; border-radius: 4px; font-size: 0.95em; color: #e65100; }
        .message { margin-bottom: 20px; padding: 15px; border-radius: 8px; }
        .question { background-color: #e3f2fd; border-left: 4px solid #2196F3; }
        .answer { background-color: #f3e5f5; border-left: 4px solid #9c27b0; }
        .question-label { font-weight: bold; color: #1976D2; margin-bottom: 8px; }
        .answer-label { font-weight: bold; color: #7b1fa2; margin-bottom: 8px; }
        .text { color: #333; line-height: 1.6; }
        .timestamp { font-size: 0.85em; color: #999; margin-top: 8px; }
        .back-link { margin-top: 20px; }
        a { color: #2196F3; text-decoration: none; }
        a:hover { text-decoration: underline; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Conversation #${convoId}</h1>
        <div class="basic-info"><strong>Agent Info:</strong> ${basicInfo || 'N/A'}</div>
        <form method="post" action="/submit" style="margin-bottom:20px;">
            <input type="hidden" name="convoId" value="${convoId}" />
            <input type="hidden" name="agentId" value="${agentId}" />
            <textarea name="inputText" rows="3" style="width:100%; padding:8px; margin-bottom:8px;" placeholder="Type your question here..."></textarea>
            <div style="text-align:right;"><button type="submit" style="padding:8px 16px;">Send</button></div>
        </form>
`;
    
    items.forEach(item => {
        const timestamp = new Date(item.timestamp).toLocaleString();
        if (item.type === 'question') {
            html += `
        <div class="message question">
            <div class="question-label">❓ Question</div>
            <div class="text">${escapeHtml(item.text)}</div>
            <div class="timestamp">${timestamp}</div>
        </div>
`;
        } else {
            html += `
        <div class="message answer">
            <div class="answer-label">💬 Answer</div>
            <div class="text">${escapeHtml(item.text)}</div>
            <div class="timestamp">${timestamp}</div>
        </div>
`;
        }
    });

    html += `
        <div class="back-link">
            <a href="/">← Back to Home</a>
        </div>
    </div>
</body>
</html>
`;
    
    return html;
}

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

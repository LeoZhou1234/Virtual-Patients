// Ollama agent - queries local Ollama model running on localhost:11434

export async function agent(prompt, pool, convoId) {
    const ollamaUrl = 'http://localhost:11434/api/generate';
    const model = 'llama3.2:3b'; // Change this to your Ollama model
    const supplementalInfo = 'You will be asked questions about your symptoms and other information. The history of the conversation will be given to you in JSON following this text. After the JSON will be the final question, unanswered, that you must respond to based on the context of the conversation.';
    const basicInfo = await getBasicInfo(pool, await getAgentId(pool, convoId));
    const initialInfo = basicInfo + supplementalInfo;

    // If pool and convoId are provided, fetch conversation JSON and prepend it.
    let convoJson = null;
    if (pool && convoId) {
        try {
            convoJson = await getConversationJSON(pool, convoId);
        } catch (err) {
            console.warn('Could not fetch conversation JSON, proceeding without it', err);
            convoJson = null;
        }
    }

    // Build final prompt: initialInfo + conversation JSON (if present) + latest question
    let finalPrompt = initialInfo + '\n\n';
    if (convoJson) {
        finalPrompt += JSON.stringify(convoJson, null, 2) + '\n\n';
    }
    finalPrompt += 'Final question: ' + prompt;
    console.log(finalPrompt);

    try {
        const response = await fetch(ollamaUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: model,
                prompt: finalPrompt,
                stream: false, // Set to false for complete response before returning
            }),
        });

        if (!response.ok) {
            throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const answer = data.response;

        console.log('Ollama response:', answer);
        return answer;
    } catch (err) {
        console.error('Ollama agent error', err);
        throw err;
    }
}

async function getAgentId(pool, convoId) {
    const query = 'SELECT agent_id FROM conversations WHERE id = $1';
    let result;
    try {
        result = await pool.query(query, [convoId]);
    } catch (err) {
        console.error('getAgentId error', err);
        throw err;
    }
    console.log(result.rows[0].agent_id);
    return result.rows[0].agent_id;
}

// helper: get basic_info
export async function getBasicInfo(pool, agentId) {
    const query = 'SELECT basic_info FROM agents WHERE id = $1';
    let result;
    try {
        result = await pool.query(query, [agentId]);
    } catch (err) {
        console.error('getBasicInfo error', err);
        throw err;
    }
    console.log(result.rows[0].basic_info);
    return result.rows[0].basic_info;
}

// Helper: fetch conversation Q/A from the database and return JSON sorted by timestamp
export async function getConversationJSON(pool, convoId) {
    if (!pool) throw new Error('pool is required');
    if (!convoId) throw new Error('convoId is required');

    try {
        const questionsQuery = `SELECT id, text, asked_at FROM questions WHERE conversation_id = $1 ORDER BY asked_at ASC`;
        const questionsResult = await pool.query(questionsQuery, [convoId]);

        const answersQuery = `SELECT id, text, answered_at FROM answers WHERE conversation_id = $1 ORDER BY answered_at ASC`;
        const answersResult = await pool.query(answersQuery, [convoId]);

        const items = [];
        questionsResult.rows.forEach(q => items.push({ type: 'question', id: q.id, text: q.text, timestamp: q.asked_at }));
        answersResult.rows.forEach(a => items.push({ type: 'answer', id: a.id, text: a.text, timestamp: a.answered_at }));
        items.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        return { conversation_id: convoId, items };
    } catch (err) {
        console.error('getConversationJSON error', err);
        throw err;
    }
}

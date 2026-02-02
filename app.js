
import express from 'express';
import { setupUser, setupAgent, setupConvo } from './setup.js';
import { agent, getBasicInfo } from './ollamaAgent.js';
import { getConversationHTML } from './conversationTemplate.js';
import { setupAdmin, createAdmin, getAllAdmins, getAdminById } from './adminManager.js';
import { Pool } from 'pg';

const app = express()
const port = 3000


// Hardcoded Postgres configuration - updatSe these values to match your Postgres server.
// Assumptions: local Postgres on port 5432, database name 'mydb', user 'postgres', password 'password'.
// Change as needed.
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'AI Project Database',
    password: 'password',
    port: 5432,
    // If your DB requires SSL (e.g. hosted providers), set ssl: { rejectUnauthorized: false }
});

let userId = await setupUser(pool);
let agentId = await setupAgent(pool);
let convoId = await setupConvo(pool, 999999999999);
let adminId = await setupAdmin(pool);
console.log('userId:', userId, 'agentId:', agentId, 'convoId:', convoId, 'adminId:', adminId);
// warm up agent with context (optional)

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.get('/', async (req, res) => {
    try {
        // Fetch all agents with their basic_info
        const agentsQuery = 'SELECT id, basic_info FROM agents ORDER BY id ASC';
        const agentsResult = await pool.query(agentsQuery);
        const agents = agentsResult.rows;
        
        // Generate HTML with agent radio buttons
        let html = `
<!DOCTYPE html>
<html>
    <head>
        <title>test app</title>
        <style>
            body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
            .container { background-color: #f9f9f9; padding: 20px; border-radius: 8px; }
            .form-group { margin-bottom: 15px; }
            label { display: block; margin-bottom: 5px; font-weight: bold; }
            textarea { width: 100%; padding: 8px; box-sizing: border-box; border: 1px solid #ddd; border-radius: 4px; font-family: Arial, sans-serif; }
            button { padding: 10px 20px; background-color: #2196F3; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 1em; }
            button:hover { background-color: #1976D2; }
            .agent-option { margin-bottom: 12px; padding: 10px; background-color: white; border: 1px solid #ddd; border-radius: 4px; }
            .agent-option input[type="radio"] { margin-right: 10px; }
            .agent-id { font-weight: bold; color: #1976D2; }
            .agent-info { color: #666; font-size: 0.9em; margin-left: 25px; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>Start Conversation</h1>
            <p><a href="/create-agent" style="display:inline-block;margin:10px 0;padding:8px 12px;background:#4CAF50;color:#fff;border-radius:4px;text-decoration:none;">Create/Edit Agents</a></p>
            <form action="/submit" method="post">
                <div class="form-group">
                    <label>Select Agent:</label>
                    ${agents.map((agent, index) => `
                    <div class="agent-option">
                        <input type="radio" id="agent${agent.id}" name="agentId" value="${agent.id}" ${index === 0 ? 'checked' : ''} required>
                        <label for="agent${agent.id}" style="display: inline; font-weight: normal; margin: 0;">
                            <span class="agent-id">Agent #${agent.id}</span>
                        </label>
                        <div class="agent-info">${agent.basic_info || 'No description available'}</div>
                    </div>
                    `).join('')}
                </div>
                <div class="form-group">
                    <label for="inputText">Your Question:</label>
                    <textarea id="inputText" name="inputText" rows="4" required placeholder="Type your question here..."></textarea>
                </div>
                <button type="submit">Send</button>
            </form>
        </div>
    </body>
</html>
        `;
        res.send(html);
    } catch (err) {
        console.error('Home page error', err);
        res.status(500).send('Error loading home page: ' + err.message);
    }
})

app.get('/admin', (req, res) => {
    res.sendFile('C:\\Users\\Lenovo\\myBackend\\admin.html');
})

// Page to create a new agent (asks for a basic info string)
app.get('/create-agent', async (req, res) => {
    try {
        const agentsResult = await pool.query('SELECT id, basic_info FROM agents ORDER BY id ASC');
        const agents = agentsResult.rows || [];

        function escapeHtml(str) {
            if (!str) return '';
            return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        }

        const html = `
<!DOCTYPE html>
<html>
    <head>
        <title>Create Agent</title>
        <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
            .container { background-color: #f9f9f9; padding: 20px; border-radius: 8px; }
            .form-group { margin-bottom: 15px; }
            label { display: block; margin-bottom: 5px; font-weight: bold; }
            textarea { width: 100%; padding: 8px; box-sizing: border-box; border: 1px solid #ddd; border-radius: 4px; font-family: Arial, sans-serif; }
            button { padding: 8px 12px; background-color: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.95em; }
            button:hover { background-color: #388E3C; }
            a.back { display:inline-block; margin-top:10px; color:#1976D2; text-decoration:none; }
            .agent-row { background: white; border: 1px solid #e0e0e0; padding: 12px; margin-bottom: 10px; border-radius: 6px; }
            .agent-meta { display:flex; gap:10px; align-items:center; }
            .agent-info { color:#666; margin-top:6px; white-space:pre-wrap; }
            .edit-form { margin-top:10px; }
            .edit-form textarea { min-height:60px; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>Create Agent</h1>

            <form action="/agents" method="post">
                <div class="form-group">
                    <label for="basicInfo">Basic Info (short description)</label>
                    <textarea id="basicInfo" name="basic_info" rows="4" required placeholder="Enter basic info about this agent..."></textarea>
                </div>
                <button type="submit">Create Agent</button>
            </form>

            <h2 style="margin-top:24px;">Existing Agents</h2>
            <div id="agentsList">
                ${agents.map(agent => `
                    <div class="agent-row" id="agent-${agent.id}">
                        <div class="agent-meta">
                            <div><strong>Agent #${agent.id}</strong></div>
                            <div style="flex:1;" class="agent-info">${escapeHtml(agent.basic_info) || '<em>No description available</em>'}</div>
                            <div>
                                <button type="button" onclick="editClick(${agent.id})">Edit</button>
                            </div>
                        </div>
                        <form id="edit-${agent.id}" class="edit-form" action="/agents/${agent.id}" method="post" style="display:none;">
                            <div class="form-group">
                                <label for="basicInfo-${agent.id}">Basic Info</label>
                                <textarea id="basicInfo-${agent.id}" name="basic_info" rows="3" required>${escapeHtml(agent.basic_info)}</textarea>
                            </div>
                            <button type="submit">Save</button>
                            <button type="button" onclick="closeEdit(${agent.id}); return false;">Cancel</button>
                        </form>
                    </div>
                `).join('')}
            </div>

            <a class="back" href="/">← Back to Home</a>
        </div>

        <script>
            async function editClick(id) {
                try {
                    const res = await fetch('/api/agents/' + id + '/conversations');
                    if (!res.ok) throw new Error('Network response not ok: ' + res.status);
                    const data = await res.json();
                    const convs = data.conversation_ids || [];
                    if (convs.length > 0) {
                        const msg = 'Agent #' + id + ' is used in ' + convs.length + ' conversation(s): ' + convs.join(', ') + '. Editing will affect these conversations. Continue?';
                        if (!confirm(msg)) return;
                    }
                    const el = document.getElementById('edit-' + id);
                    if (!el) return;
                    el.style.display = el.style.display === 'none' ? 'block' : 'none';
                } catch (err) {
                    alert('Error checking conversations: ' + (err && err.message));
                    console.error(err);
                }
            }

            function closeEdit(id) {
                const el = document.getElementById('edit-' + id);
                if (el) el.style.display = 'none';
            }
        </script>
    </body>
</html>
        `;

        res.send(html);
    } catch (err) {
        console.error('Error rendering create-agent page', err);
        return res.status(500).send('Error loading create-agent page: ' + (err && err.message));
    }
});

// API to create agent and insert basic_info into agents table. If column missing, attempt to add it.
app.post('/agents', async (req, res) => {
    const { basic_info } = req.body;
    if (!basic_info) return res.status(400).send('Missing basic_info in request body');

    try {
        const insertQuery = 'INSERT INTO agents (basic_info) VALUES ($1) RETURNING id';
        const result = await pool.query(insertQuery, [basic_info]);
        console.log('Created agent id', result.rows[0].id);
        return res.redirect('/');
    } catch (err) {
        // If the column doesn't exist, add it and retry once
        if (err && (err.code === '42703' || /column .*basic_info.*does not exist/i.test(err.message))) {
            try {
                console.log('basic_info column missing, attempting to add it');
                await pool.query('ALTER TABLE agents ADD COLUMN basic_info TEXT');
                const retry = await pool.query('INSERT INTO agents (basic_info) VALUES ($1) RETURNING id', [basic_info]);
                console.log('Created agent id after alter', retry.rows[0].id);
                return res.redirect('/');
            } catch (err2) {
                console.error('Error adding basic_info column or inserting agent', err2);
                return res.status(500).send('DB error: ' + err2.message);
            }
        }
        console.error('Create agent DB error', err);
        return res.status(500).send('DB error: ' + err.message);
    }
});

// Update existing agent's basic_info
app.post('/agents/:id', async (req, res) => {
    const id = req.params.id;
    const { basic_info } = req.body;
    if (typeof basic_info === 'undefined') return res.status(400).send('Missing basic_info in request body');
    try {
        const updateQuery = 'UPDATE agents SET basic_info = $1 WHERE id = $2';
        await pool.query(updateQuery, [basic_info, id]);
        return res.redirect('/create-agent');
    } catch (err) {
        console.error('Update agent DB error', err);
        return res.status(500).send('DB error: ' + err.message);
    }
});

app.post('/submit', async (req, res) => {
    const recievedData = req.body;
    console.log('Received POST /submit body:', recievedData);
    // We expect the payload to contain the value for column1 in `inputText`.
    const value = recievedData && recievedData.inputText;
    const postedConvoId = recievedData && recievedData.convoId;
    const postedAgentId = recievedData && recievedData.agentId;
    if (typeof value === 'undefined') {
        return res.status(400).send('Missing inputText in request body');
    }

    // Determine which agent to use (posted agentId wins)
    const targetAgentId = postedAgentId ? (isNaN(Number(postedAgentId)) ? postedAgentId : Number(postedAgentId)) : agentId;
    let targetConvoId = postedConvoId || null;

    try {
        // If no conversation id provided, create a new conversation tied to the selected agent
        if (!targetConvoId) {
            const insertConvoQuery = 'INSERT INTO conversations (user_id, agent_id) VALUES ($1, $2) RETURNING id';
            const insertRes = await pool.query(insertConvoQuery, [userId, targetAgentId]);
            targetConvoId = insertRes.rows[0].id;
        }

        let question = recievedData.inputText;
        await storeQuestion(question, targetConvoId, targetAgentId);
        let answer = await agent(question, pool, targetConvoId);
        await storeAnswer(answer, targetConvoId, targetAgentId);
        return res.redirect(`/conversation/${targetConvoId}?agentId=${targetAgentId}`);
    } catch (err) {
        console.error('DB insert error', err);
        return res.status(500).send('DB insert error: ' + err.message);
    }
})

app.get('/conversation/:id', async (req, res) => {
    const convoId = req.params.id;
    const queryAgentId = req.query.agentId;
    // use query agentId when provided, otherwise fall back to global agentId
    const targetAgentId = queryAgentId || agentId;
    if (!convoId) {
        return res.status(400).send('Missing conversation id parameter');
    }
    try {
        // Fetch all questions for this conversation sorted by timestamp
        const questionsQuery = `SELECT id, text, asked_at FROM questions WHERE conversation_id = $1 ORDER BY asked_at ASC`;
        const questionsResult = await pool.query(questionsQuery, [convoId]);
        
        // Fetch all answers for this conversation sorted by timestamp
        const answersQuery = `SELECT id, text, answered_at FROM answers WHERE conversation_id = $1 ORDER BY answered_at ASC`;
        const answersResult = await pool.query(answersQuery, [convoId]);
        
        // Fetch agent's basicInfo
        const basicInfo = await getBasicInfo(pool, targetAgentId);
        
        // Combine and sort by timestamp
        const items = [];
        questionsResult.rows.forEach(q => {
            items.push({ type: 'question', id: q.id, text: q.text, timestamp: q.asked_at });
        });
        answersResult.rows.forEach(a => {
            items.push({ type: 'answer', id: a.id, text: a.text, timestamp: a.answered_at });
        });
        items.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        
        // Generate HTML from template
        const html = getConversationHTML(convoId, items, basicInfo, targetAgentId);
        return res.send(html);
    } catch (err) {
        console.error('Conversation fetch error', err);
        return res.status(500).send('Conversation fetch error: ' + err.message);
    }
})

app.get('/conversation/:id/json', async (req, res) => {
    const convoId = req.params.id;
    if (!convoId) {
        return res.status(400).json({ error: 'Missing conversation id parameter' });
    }
    try {
        const questionsQuery = `SELECT id, text, asked_at FROM questions WHERE conversation_id = $1 ORDER BY asked_at ASC`;
        const questionsResult = await pool.query(questionsQuery, [convoId]);

        const answersQuery = `SELECT id, text, answered_at FROM answers WHERE conversation_id = $1 ORDER BY answered_at ASC`;
        const answersResult = await pool.query(answersQuery, [convoId]);

        const items = [];
        questionsResult.rows.forEach(q => items.push({ type: 'question', id: q.id, text: q.text, timestamp: q.asked_at }));
        answersResult.rows.forEach(a => items.push({ type: 'answer', id: a.id, text: a.text, timestamp: a.answered_at }));
        items.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        return res.json({ conversation_id: convoId, items });
    } catch (err) {
        console.error('Conversation JSON fetch error', err);
        return res.status(500).json({ error: err.message });
    }
})

// Admin management routes

app.get('/api/admin-info', async (req, res) => {
    try {
        const admin = await getAdminById(pool, adminId);
        if (!admin) {
            return res.status(404).json({ error: 'Admin not found' });
        }
        return res.json({ admin });
    } catch (err) {
        console.error('Get admin info error', err);
        return res.status(500).json({ error: err.message });
    }
})

app.get('/api/users', async (req, res) => {
    try {
        const query = `SELECT id, created_at FROM users ORDER BY created_at DESC`;
        const result = await pool.query(query);
        return res.json({ users: result.rows || [] });
    } catch (err) {
        console.error('Get users error', err);
        return res.status(500).json({ error: err.message });
    }
})

// Return all conversation IDs (JSON) that use a given agent
app.get('/api/agents/:agentId/conversations', async (req, res) => {
    const agentId = req.params.agentId;
    if (!agentId || isNaN(Number(agentId))) {
        return res.status(400).json({ error: 'Missing or invalid agentId parameter' });
    }

    try {
        const query = `SELECT id FROM conversations WHERE agent_id = $1 ORDER BY id ASC`;
        const result = await pool.query(query, [Number(agentId)]);
        const conversationIds = (result.rows || []).map(r => r.id);
        return res.json({ conversation_ids: conversationIds });
    } catch (err) {
        console.error('Get agent conversations error', err);
        return res.status(500).json({ error: err.message });
    }
});

app.get('/api/users/:userId/conversations', async (req, res) => {
    const userId = req.params.userId;
    
    if (!userId) {
        return res.status(400).json({ error: 'Missing userId parameter' });
    }

    try {
        const query = `
            SELECT c.id, s.score 
            FROM conversations c
            LEFT JOIN scores s ON c.id = s.conversation_id
            WHERE c.user_id = $1 
            ORDER BY c.id DESC
        `;
        const result = await pool.query(query, [userId]);
        return res.json({ conversations: result.rows || [] });
    } catch (err) {
        console.error('Get user conversations error', err);
        return res.status(500).json({ error: err.message });
    }
})

app.post('/api/conversations/:conversationId/score', async (req, res) => {
    const conversationId = req.params.conversationId;
    const { score, adminId } = req.body;
    
    if (!conversationId || score === undefined || adminId === undefined) {
        return res.status(400).json({ error: 'Missing conversationId, score, or adminId' });
    }
    
    if (score < 0 || score > 10 || !Number.isInteger(score)) {
        return res.status(400).json({ error: 'Score must be an integer between 0 and 10' });
    }

    try {
        // Get the conversation to find its user_id
        const convoQuery = `SELECT user_id FROM conversations WHERE id = $1`;
        const convoResult = await pool.query(convoQuery, [conversationId]);
        
        if (!convoResult.rows || convoResult.rows.length === 0) {
            return res.status(404).json({ error: 'Conversation not found' });
        }
        
        const userId = convoResult.rows[0].user_id;
        
        // Check if score already exists
        const checkQuery = `SELECT id FROM scores WHERE conversation_id = $1`;
        const checkResult = await pool.query(checkQuery, [conversationId]);
        
        let result;
        if (checkResult.rows && checkResult.rows.length > 0) {
            // Update existing score
            const updateQuery = `
                UPDATE scores 
                SET score = $1, admin_id = $2
                WHERE conversation_id = $3
                RETURNING id, conversation_id, score, admin_id, user_id
            `;
            result = await pool.query(updateQuery, [score, adminId, conversationId]);
        } else {
            // Insert new score
            const insertQuery = `
                INSERT INTO scores (conversation_id, user_id, admin_id, score)
                VALUES ($1, $2, $3, $4)
                RETURNING id, conversation_id, user_id, admin_id, score
            `;
            result = await pool.query(insertQuery, [conversationId, userId, adminId, score]);
        }
        
        return res.json({ 
            success: true, 
            message: 'Score saved successfully',
            scoreRecord: result.rows[0]
        });
    } catch (err) {
        console.error('Save conversation score error', err);
        return res.status(500).json({ error: err.message });
    }
})

app.post('/admin', async (req, res) => {
    const { email } = req.body;
    
    if (!email) {
        return res.status(400).json({ error: 'Missing email in request body' });
    }

    try {
        const result = await createAdmin(pool, email);
        return res.json(result);
    } catch (err) {
        console.error('Create admin error', err);
        return res.status(500).json({ error: err.message });
    }
})

app.get('/admin', async (req, res) => {
    try {
        const admins = await getAllAdmins(pool);
        return res.json({ admins });
    } catch (err) {
        console.error('Get admins error', err);
        return res.status(500).json({ error: err.message });
    }
})

app.get('/admin/:id', async (req, res) => {
    const adminId = req.params.id;
    
    if (!adminId) {
        return res.status(400).json({ error: 'Missing admin id parameter' });
    }

    try {
        const admin = await getAdminById(pool, adminId);
        if (!admin) {
            return res.status(404).json({ error: 'Admin not found' });
        }
        return res.json({ admin });
    } catch (err) {
        console.error('Get admin error', err);
        return res.status(500).json({ error: err.message });
    }
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})

async function storeQuestion(question, targetConvoId, targetAgentId) {
    const convo = targetConvoId || convoId;
    const agentForInsert = targetAgentId || agentId;
    let query = `INSERT INTO questions (text, asked_at, user_id, agent_id, conversation_id) VALUES ($1, CURRENT_TIMESTAMP, $2, $3, $4) RETURNING id`;
    try {
        let result = await pool.query(query, [question, userId, agentForInsert, convo]);
        console.log('Inserted question:', result.rows[0]);
        return result.rows[0];
    }
    catch (err) {
        console.error('question DB insert error', err);
        throw err;
    }
}

async function storeAnswer(answer, targetConvoId, targetAgentId) {
    const convo = targetConvoId || convoId;
    const agentForInsert = targetAgentId || agentId;
    let query = `INSERT INTO answers (text, answered_at, user_id, agent_id, conversation_id) VALUES ($1, CURRENT_TIMESTAMP, $2, $3, $4) RETURNING id`;
    try {
        let result = await pool.query(query, [answer, userId, agentForInsert, convo]);
        console.log('Inserted answer:', result.rows[0]);
        return result.rows[0];
    }
    catch (err) {
        console.error('answer DB insert error', err);
        throw err;
    }
}
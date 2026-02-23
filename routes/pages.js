import express from 'express';
import { getBasicInfo } from '../ollamaAgent.js';
import { getConversationHTML } from '../conversationTemplate.js';

export function setupPageRoutes(app, pool, globalState) {
    // GET / - Home page
    app.get('/', async (req, res) => {
        try {
            const agentsQuery = 'SELECT id, basic_info FROM agents ORDER BY id ASC';
            const agentsResult = await pool.query(agentsQuery);
            const agents = agentsResult.rows;
            
            res.render('index', { agents });
        } catch (err) {
            console.error('Home page error', err);
            res.status(500).send('Error loading home page: ' + err.message);
        }
    });

    // GET /admin - Admin dashboard
    app.get('/admin', (req, res) => {
        console.log('attempting to render admin page'); 
        debugger;
        try {
            res.render('admin', {}, (err, html) => {
                if (err) {
                    console.error('Render error:', err);
                    res.status(500).send('Error rendering admin: ' + err.message);
                } else {
                    res.send(html);
                }
            });
        } catch (e) {
            console.error('Catch error:', e);
            res.status(500).send('Error: ' + e.message);
        }
    });

    // GET /create-agent - Create/edit agents page
    app.get('/create-agent', async (req, res) => {
        try {
            const agentsResult = await pool.query('SELECT id, basic_info FROM agents ORDER BY id ASC');
            const agents = agentsResult.rows || [];
            res.render('create-agent', { agents });
        } catch (err) {
            console.error('Error rendering create-agent page', err);
            return res.status(500).send('Error loading create-agent page: ' + (err && err.message));
        }
    });

    // GET /conversation/:id - View conversation
    app.get('/conversation/:id', async (req, res) => {
        const convoId = req.params.id;
        const queryAgentId = req.query.agentId;
        const targetAgentId = queryAgentId || globalState.agentId;
        
        if (!convoId) {
            return res.status(400).send('Missing conversation id parameter');
        }
        try {
            const questionsQuery = `SELECT id, text, asked_at FROM questions WHERE conversation_id = $1 ORDER BY asked_at ASC`;
            const questionsResult = await pool.query(questionsQuery, [convoId]);
            
            const answersQuery = `SELECT id, text, answered_at FROM answers WHERE conversation_id = $1 ORDER BY answered_at ASC`;
            const answersResult = await pool.query(answersQuery, [convoId]);
            
            const basicInfo = await getBasicInfo(pool, targetAgentId);
            
            const items = [];
            questionsResult.rows.forEach(q => {
                items.push({ type: 'question', id: q.id, text: q.text, timestamp: q.asked_at });
            });
            answersResult.rows.forEach(a => {
                items.push({ type: 'answer', id: a.id, text: a.text, timestamp: a.answered_at });
            });
            items.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
            
            const html = getConversationHTML(convoId, items, basicInfo, targetAgentId);
            return res.send(html);
        } catch (err) {
            console.error('Conversation fetch error', err);
            return res.status(500).send('Conversation fetch error: ' + err.message);
        }
    });

    // GET /conversation/:id/json - Get conversation as JSON
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
    });
}

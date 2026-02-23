import express from 'express';

export function setupFormRoutes(app, pool, globalState, agentFunction) {
    // Helper function: Store a question in the database
    async function storeQuestion(question, targetConvoId, targetAgentId) {
        const convo = targetConvoId || globalState.convoId;
        const agentForInsert = targetAgentId || globalState.agentId;
        const query = `INSERT INTO questions (text, asked_at, user_id, agent_id, conversation_id) 
                       VALUES ($1, CURRENT_TIMESTAMP, $2, $3, $4) 
                       RETURNING id`;
        try {
            const result = await pool.query(query, [question, globalState.userId, agentForInsert, convo]);
            console.log('Inserted question:', result.rows[0]);
            return result.rows[0];
        } catch (err) {
            console.error('question DB insert error', err);
            throw err;
        }
    }

    // Helper function: Store an answer in the database
    async function storeAnswer(answer, targetConvoId, targetAgentId) {
        const convo = targetConvoId || globalState.convoId;
        const agentForInsert = targetAgentId || globalState.agentId;
        const query = `INSERT INTO answers (text, answered_at, user_id, agent_id, conversation_id) 
                       VALUES ($1, CURRENT_TIMESTAMP, $2, $3, $4) 
                       RETURNING id`;
        try {
            const result = await pool.query(query, [answer, globalState.userId, agentForInsert, convo]);
            console.log('Inserted answer:', result.rows[0]);
            return result.rows[0];
        } catch (err) {
            console.error('answer DB insert error', err);
            throw err;
        }
    }

    // POST /agents - Create new agent
    app.post('/agents', async (req, res) => {
        const { basic_info } = req.body;
        if (!basic_info) return res.status(400).send('Missing basic_info in request body');

        try {
            const insertQuery = 'INSERT INTO agents (basic_info) VALUES ($1) RETURNING id';
            const result = await pool.query(insertQuery, [basic_info]);
            console.log('Created agent id', result.rows[0].id);
            return res.redirect('/');
        } catch (err) {
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

    // POST /agents/:id - Update existing agent
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

    // POST /submit - Submit question and get answer
    app.post('/submit', async (req, res) => {
        const recievedData = req.body;
        console.log('Received POST /submit body:', recievedData);
        
        const value = recievedData && recievedData.inputText;
        const postedConvoId = recievedData && recievedData.convoId;
        const postedAgentId = recievedData && recievedData.agentId;
        
        if (typeof value === 'undefined') {
            return res.status(400).send('Missing inputText in request body');
        }

        const targetAgentId = postedAgentId ? (isNaN(Number(postedAgentId)) ? postedAgentId : Number(postedAgentId)) : globalState.agentId;
        let targetConvoId = postedConvoId || null;

        try {
            if (!targetConvoId) {
                const insertConvoQuery = 'INSERT INTO conversations (user_id, agent_id) VALUES ($1, $2) RETURNING id';
                const insertRes = await pool.query(insertConvoQuery, [globalState.userId, targetAgentId]);
                targetConvoId = insertRes.rows[0].id;
            }

            let question = recievedData.inputText;
            await storeQuestion(question, targetConvoId, targetAgentId);
            let answer = await agentFunction(question, pool, targetConvoId);
            await storeAnswer(answer, targetConvoId, targetAgentId);
            return res.redirect(`/conversation/${targetConvoId}?agentId=${targetAgentId}`);
        } catch (err) {
            console.error('DB insert error', err);
            return res.status(500).send('DB insert error: ' + err.message);
        }
    });
}

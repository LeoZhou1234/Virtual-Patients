import express from 'express';

export function setupApiRoutes(app, pool) {
    // GET /api/users - Get all users
    app.get('/api/users', async (req, res) => {
        try {
            const query = `SELECT id, created_at FROM users ORDER BY created_at DESC`;
            const result = await pool.query(query);
            return res.json({ users: result.rows || [] });
        } catch (err) {
            console.error('Get users error', err);
            return res.status(500).json({ error: err.message });
        }
    });

    // GET /api/admin-info - Get current admin info
    app.get('/api/admin-info', async (req, res) => {
        try {
            const { getAdminById } = await import('../adminManager.js');
            const admin = await getAdminById(pool, req.app.locals.adminId);
            if (!admin) {
                return res.status(404).json({ error: 'Admin not found' });
            }
            return res.json({ admin });
        } catch (err) {
            console.error('Get admin info error', err);
            return res.status(500).json({ error: err.message });
        }
    });

    // GET /api/agents/:agentId/conversations - Get conversations for an agent
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

    // GET /api/users/:userId/conversations - Get conversations for a user
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
    });

    // POST /api/conversations/:conversationId/score - Save/update conversation score
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
            const convoQuery = `SELECT user_id FROM conversations WHERE id = $1`;
            const convoResult = await pool.query(convoQuery, [conversationId]);
            
            if (!convoResult.rows || convoResult.rows.length === 0) {
                return res.status(404).json({ error: 'Conversation not found' });
            }
            
            const userId = convoResult.rows[0].user_id;
            
            const checkQuery = `SELECT id FROM scores WHERE conversation_id = $1`;
            const checkResult = await pool.query(checkQuery, [conversationId]);
            
            let result;
            if (checkResult.rows && checkResult.rows.length > 0) {
                const updateQuery = `
                    UPDATE scores 
                    SET score = $1, admin_id = $2
                    WHERE conversation_id = $3
                    RETURNING id, conversation_id, score, admin_id, user_id
                `;
                result = await pool.query(updateQuery, [score, adminId, conversationId]);
            } else {
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
    });
}

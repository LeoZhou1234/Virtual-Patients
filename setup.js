export async function setupUser(pool) {
    let table = 'users';
    let column = 'id';
    try {
        let query = `SELECT ${column} FROM ${table} ORDER BY id ASC LIMIT 1`;
        let result = await pool.query(query);
        if (!result.rows || result.rows.length === 0) {
            query = `INSERT INTO ${table} (created_at) VALUES (CURRENT_TIMESTAMP) RETURNING id`;
            result = await pool.query(query);
            console.log("created user");
            return(result.rows[0].id);
        } else {
            console.log("user found");
            return(result.rows[0].id);
        }
    } catch (err) {
        console.error('user DB query error', err);
    }
}

export async function setupAgent(pool) {
    let table = 'agents';
    let column = 'id';
    let result = 'hhahaha';
    try {
        let query = `SELECT ${column} FROM ${table} ORDER BY id ASC LIMIT 1`;
        result = await pool.query(query);
        if (!result.rows || result.rows.length === 0) {
            query = `INSERT INTO ${table} (model_id) VALUES ('gemini-2.0-flash-lite') RETURNING id`;
            result = await pool.query(query);
            console.log("created agent");
            return(result.rows[0].id);
        } else {
            console.log("agent found");
            return(result.rows[0].id);
        }
    } catch (err) {
        console.error('agent DB query error', err);
    }
}

export async function getUser(pool) {
    try {
        let query = `SELECT id FROM users ORDER BY id ASC LIMIT 1`;
        let result = await pool.query(query);
        if (!result.rows || result.rows.length === 0) {
            console.log("user db empty");
        } else {
            return result.rows[0].id;
        }
    } catch (err) {
        console.error('getUser query error', err);
    }
}

export async function getAgent(pool) {
    try {
        let query = `SELECT id FROM agents ORDER BY id ASC LIMIT 1`;
        let result = await pool.query(query);
        if (!result.rows || result.rows.length === 0) {
            console.log("agent db empty");
        } else {
            return result.rows[0].id;
        }
    } catch (err) {
        console.error('getAgent query error', err);
    }
}

export async function setupConvo(pool, requestedId = null) {
    let table = 'conversations';
    let column = 'id';
    try {
        const userId = await getUser(pool);
        const agentId = await getAgent(pool);

        // If caller provided a conversation id, try to fetch it first
        if (requestedId) {
            const checkQuery = `SELECT id FROM conversations WHERE id = $1 LIMIT 1`;
            const checkRes = await pool.query(checkQuery, [requestedId]);
            if (checkRes.rows && checkRes.rows.length > 0) {
                console.log('convo found by id');
                return checkRes.rows[0].id;
            }
            // Not found: create a new conversation (auto-increment id) and return that id
            const insertQuery = `INSERT INTO conversations (user_id, agent_id) VALUES ($1, $2) RETURNING id`;
            const insertRes = await pool.query(insertQuery, [userId, agentId]);
            console.log('created new convo (requested id not found), returning new id');
            return insertRes.rows[0].id;
        }

        // No requestedId: existing behavior - return first convo or create one
        let query = `SELECT ${column} FROM conversations ORDER BY id ASC LIMIT 1`;
        let result = await pool.query(query);
        if (!result.rows || result.rows.length === 0) {
            const insertQuery = `INSERT INTO conversations (user_id, agent_id) VALUES ($1, $2) RETURNING id`;
            result = await pool.query(insertQuery, [userId, agentId]);
            console.log('created convo');
            return result.rows[0].id;
        } else {
            console.log('convo found');
            return result.rows[0].id;
        }
    } catch (err) {
        console.error('convo DB query error', err);
        throw err;
    }
}
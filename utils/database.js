/**
 * Database utility functions for storing questions and answers
 */

export function createDataAccessFunctions(pool, globalState) {
    /**
     * Store a question in the database
     * @param {string} question - The question text
     * @param {number} targetConvoId - Conversation ID (optional, uses global if not provided)
     * @param {number} targetAgentId - Agent ID (optional, uses global if not provided)
     * @returns {Promise<Object>} The inserted question record
     */
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

    /**
     * Store an answer in the database
     * @param {string} answer - The answer text
     * @param {number} targetConvoId - Conversation ID (optional, uses global if not provided)
     * @param {number} targetAgentId - Agent ID (optional, uses global if not provided)
     * @returns {Promise<Object>} The inserted answer record
     */
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

    return {
        storeQuestion,
        storeAnswer
    };
}

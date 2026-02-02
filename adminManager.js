// Admin management - handles admin creation and storage

/**
 * Sets up a default admin if one doesn't already exist
 * @param {Pool} pool - PostgreSQL pool connection
 * @param {string} defaultEmail - Default email for admin creation
 * @returns {number} - Admin id
 */
export async function setupAdmin(pool, defaultEmail = 'admin@system.local') {
    try {
        // Check if any admin exists
        const checkQuery = `SELECT id FROM admins ORDER BY id ASC LIMIT 1`;
        const checkResult = await pool.query(checkQuery);

        if (checkResult.rows && checkResult.rows.length > 0) {
            console.log('Admin found');
            return checkResult.rows[0].id;
        } else {
            // Create default admin
            const insertQuery = `
                INSERT INTO admins (email, created_at) 
                VALUES ($1, CURRENT_TIMESTAMP) 
                RETURNING id
            `;
            const insertResult = await pool.query(insertQuery, [defaultEmail]);
            console.log('Created admin');
            return insertResult.rows[0].id;
        }
    } catch (err) {
        console.error('Admin setup error', err);
        throw err;
    }
}

/**
 * Creates a new admin if one with the given email doesn't already exist
 * @param {Pool} pool - PostgreSQL pool connection
 * @param {string} email - Admin email address
 * @returns {Object} - { success: boolean, message: string, adminId?: number }
 */
export async function createAdmin(pool, email) {
    if (!pool) {
        throw new Error('pool is required');
    }
    if (!email || typeof email !== 'string') {
        throw new Error('email is required and must be a string');
    }

    try {
        // Check if admin with this email already exists
        const checkQuery = `SELECT id FROM admins WHERE email = $1`;
        const checkResult = await pool.query(checkQuery, [email]);

        if (checkResult.rows && checkResult.rows.length > 0) {
            console.log(`Admin with email ${email} already exists`);
            return {
                success: false,
                message: `Admin with email ${email} already exists`,
                adminId: checkResult.rows[0].id
            };
        }

        // Insert new admin
        const insertQuery = `
            INSERT INTO admins (email, created_at) 
            VALUES ($1, CURRENT_TIMESTAMP) 
            RETURNING id, email, created_at
        `;
        const insertResult = await pool.query(insertQuery, [email]);

        if (insertResult.rows && insertResult.rows.length > 0) {
            const newAdmin = insertResult.rows[0];
            console.log(`Admin created successfully: ${newAdmin.email} (id: ${newAdmin.id})`);
            return {
                success: true,
                message: `Admin created successfully`,
                adminId: newAdmin.id,
                admin: newAdmin
            };
        }
    } catch (err) {
        console.error('Admin creation error', err);
        throw err;
    }
}

/**
 * Retrieves all admins from the database
 * @param {Pool} pool - PostgreSQL pool connection
 * @returns {Array} - Array of admin objects
 */
export async function getAllAdmins(pool) {
    if (!pool) {
        throw new Error('pool is required');
    }

    try {
        const query = `SELECT id, email, created_at FROM admins ORDER BY created_at DESC`;
        const result = await pool.query(query);
        return result.rows || [];
    } catch (err) {
        console.error('Get admins error', err);
        throw err;
    }
}

/**
 * Retrieves a specific admin by id
 * @param {Pool} pool - PostgreSQL pool connection
 * @param {number} adminId - Admin id
 * @returns {Object|null} - Admin object or null if not found
 */
export async function getAdminById(pool, adminId) {
    if (!pool) {
        throw new Error('pool is required');
    }
    if (!adminId) {
        throw new Error('adminId is required');
    }

    try {
        const query = `SELECT id, email, created_at FROM admins WHERE id = $1`;
        const result = await pool.query(query, [adminId]);
        return result.rows && result.rows.length > 0 ? result.rows[0] : null;
    } catch (err) {
        console.error('Get admin by id error', err);
        throw err;
    }
}

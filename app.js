import express from 'express';
import { setupUser, setupAgent, setupConvo } from './setup.js';
import { agent, getBasicInfo } from './ollamaAgent.js';
import { setupAdmin } from './adminManager.js';
import { Pool } from 'pg';
import { setupPageRoutes } from './routes/pages.js';
import { setupFormRoutes } from './routes/forms.js';
import { setupApiRoutes } from './routes/api.js';
import { setupAdminRoutes } from './routes/admin.js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express()
const port = 3000

// Configure EJS as template engine
app.set('view engine', 'ejs');
app.set('views', `${__dirname}/views`);


// Hardcoded Postgres configuration - update these values to match your Postgres server.
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

// Global state for passing to routers
const globalState = { userId, agentId, convoId, adminId };

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Register routes
console.log('Registering page routes...');
setupPageRoutes(app, pool, globalState);
console.log('Page routes registered');

console.log('Registering form routes...');
setupFormRoutes(app, pool, globalState, agent);
console.log('Form routes registered');

console.log('Registering API routes...');
setupApiRoutes(app, pool);
console.log('API routes registered');

console.log('Registering admin routes...');
setupAdminRoutes(app, pool);
console.log('Admin routes registered');

// Store adminId for API access
app.locals.adminId = adminId;

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
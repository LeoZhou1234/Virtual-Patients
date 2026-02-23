import express from 'express';
import { createAdmin, getAllAdmins, getAdminById } from '../adminManager.js';

export function setupAdminRoutes(app, pool) {
    // POST /admin-api - Create new admin
    app.post('/admin-api', async (req, res) => {
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
    });

    // GET /admin-api - List all admins
    app.get('/admin-api', async (req, res) => {
        console.log('API HIT: GET /admin');
        debugger
        try {
            const admins = await getAllAdmins(pool);
            return res.json({ admins });
        } catch (err) {
            console.error('Get admins error', err);
            return res.status(500).json({ error: err.message });
        }
    });

    // GET /admin-api/:id - Get admin by ID
    app.get('/admin-api/:id', async (req, res) => {
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
    });
}

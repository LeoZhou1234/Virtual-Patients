import request from 'supertest';
import express from 'express';
import { setupPageRoutes } from '../routes/pages.js';
import { jest, describe, test, beforeEach, afterEach, expect } from '@jest/globals';

describe('Admin Route Tests', () => {
  let app;
  let consoleLogSpy;
  const mockPool = {
    query: jest.fn()
  };

  beforeEach(() => {
    app = express();
    app.set('view engine', 'ejs');
    app.set('views', `${process.cwd()}/views`);
    
    jest.clearAllMocks();
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  test('GET /admin should return 200 status', async () => {
    setupPageRoutes(app, mockPool, {});
    
    const res = await request(app).get('/admin');
    expect(res.status).toBe(200);
  });

  test('GET /admin should render admin page with HTML content', async () => {
    setupPageRoutes(app, mockPool, {});
    
    const res = await request(app).get('/admin');
    expect(res.text).toContain('Admin Dashboard');
  });

  test('GET /admin should contain script tags', async () => {
    setupPageRoutes(app, mockPool, {});
    
    const res = await request(app).get('/admin');
    expect(res.text).toContain('<script>');
  });
});

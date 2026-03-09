import request from 'supertest';
import express from 'express';
import { setupPageRoutes } from '../routes/pages.js';
import { jest, describe, test, beforeEach, afterEach, expect } from '@jest/globals';

describe('Page Routes Tests', () => {
  let app;
  let mockPool;
  const globalState = { agentId: 42 };
  let consoleErrorSpy;
  let consoleLogSpy;

  beforeEach(() => {
    app = express();
    app.set('view engine', 'ejs');
    app.set('views', `${process.cwd()}/views`);
    mockPool = {
      query: jest.fn()
    };
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    consoleLogSpy.mockRestore();
  });

  test('GET / should render the home page with agents', async () => {
    mockPool.query.mockResolvedValueOnce({
      rows: [
        { id: 1, basic_info: 'Agent one' },
        { id: 2, basic_info: 'Agent two' }
      ]
    });

    setupPageRoutes(app, mockPool, globalState);

    const res = await request(app).get('/');

    expect(res.status).toBe(200);
    expect(mockPool.query).toHaveBeenCalledWith(
      'SELECT id, basic_info FROM agents ORDER BY id ASC'
    );
    expect(res.text).toContain('Start Conversation');
    expect(res.text).toContain('Agent #1');
    expect(res.text).toContain('Agent one');
  });

  test('GET / should return 500 when the agents query fails', async () => {
    mockPool.query.mockRejectedValueOnce(new Error('db down'));

    setupPageRoutes(app, mockPool, globalState);

    const res = await request(app).get('/');

    expect(res.status).toBe(500);
    expect(consoleErrorSpy).toHaveBeenCalledWith('Home page error', expect.any(Error));
    expect(res.text).toContain('Error loading home page: db down');
  });

  test('GET /admin should render the admin dashboard', async () => {
    setupPageRoutes(app, mockPool, globalState);

    const res = await request(app).get('/admin');

    expect(res.status).toBe(200);
    expect(res.text).toContain('Admin Dashboard');
    expect(res.text).toContain('<script');
  });

  test('GET /create-agent should render the agent management page', async () => {
    mockPool.query.mockResolvedValueOnce({
      rows: [{ id: 7, basic_info: 'Test agent' }]
    });

    setupPageRoutes(app, mockPool, globalState);

    const res = await request(app).get('/create-agent');

    expect(res.status).toBe(200);
    expect(mockPool.query).toHaveBeenCalledWith(
      'SELECT id, basic_info FROM agents ORDER BY id ASC'
    );
    expect(res.text).toContain('Create Agent');
    expect(res.text).toContain('Agent #7');
    expect(res.text).toContain('Test agent');
  });

  test('GET /create-agent should return 500 when loading agents fails', async () => {
    mockPool.query.mockRejectedValueOnce(new Error('create-agent failed'));

    setupPageRoutes(app, mockPool, globalState);

    const res = await request(app).get('/create-agent');

    expect(res.status).toBe(500);
    expect(consoleErrorSpy).toHaveBeenCalledWith('Error rendering create-agent page', expect.any(Error));
    expect(res.text).toContain('Error loading create-agent page: create-agent failed');
  });

  test('GET /conversation/:id should render merged conversation HTML in timestamp order', async () => {
    mockPool.query
      .mockResolvedValueOnce({
        rows: [
          { id: 11, text: 'Second question', asked_at: '2024-01-01T00:02:00.000Z' }
        ]
      })
      .mockResolvedValueOnce({
        rows: [
          { id: 12, text: 'First answer', answered_at: '2024-01-01T00:01:00.000Z' }
        ]
      })
      .mockResolvedValueOnce({
        rows: [{ basic_info: 'Queried agent info' }]
      });

    setupPageRoutes(app, mockPool, globalState);

    const res = await request(app).get('/conversation/123?agentId=99');

    expect(res.status).toBe(200);
    expect(mockPool.query).toHaveBeenNthCalledWith(
      1,
      'SELECT id, text, asked_at FROM questions WHERE conversation_id = $1 ORDER BY asked_at ASC',
      ['123']
    );
    expect(mockPool.query).toHaveBeenNthCalledWith(
      2,
      'SELECT id, text, answered_at FROM answers WHERE conversation_id = $1 ORDER BY answered_at ASC',
      ['123']
    );
    expect(mockPool.query).toHaveBeenNthCalledWith(
      3,
      'SELECT basic_info FROM agents WHERE id = $1',
      ['99']
    );
    expect(res.text).toContain('Conversation #123');
    expect(res.text).toContain('Queried agent info');
    expect(res.text.indexOf('First answer')).toBeLessThan(res.text.indexOf('Second question'));
  });

  test('GET /conversation/:id should fall back to globalState.agentId when no query param is provided', async () => {
    mockPool.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [{ basic_info: 'Default agent info' }]
      });

    setupPageRoutes(app, mockPool, globalState);

    const res = await request(app).get('/conversation/555');

    expect(res.status).toBe(200);
    expect(mockPool.query).toHaveBeenNthCalledWith(
      3,
      'SELECT basic_info FROM agents WHERE id = $1',
      [42]
    );
    expect(res.text).toContain('Default agent info');
  });

  test('GET /conversation/:id should return 500 when loading the conversation fails', async () => {
    mockPool.query.mockRejectedValueOnce(new Error('conversation failed'));

    setupPageRoutes(app, mockPool, globalState);

    const res = await request(app).get('/conversation/321');

    expect(res.status).toBe(500);
    expect(consoleErrorSpy).toHaveBeenCalledWith('Conversation fetch error', expect.any(Error));
    expect(res.text).toContain('Conversation fetch error: conversation failed');
  });

  test('GET /conversation/:id/json should return sorted JSON data', async () => {
    mockPool.query
      .mockResolvedValueOnce({
        rows: [
          { id: 5, text: 'Later question', asked_at: '2024-01-01T00:02:00.000Z' }
        ]
      })
      .mockResolvedValueOnce({
        rows: [
          { id: 6, text: 'Earlier answer', answered_at: '2024-01-01T00:01:00.000Z' }
        ]
      });

    setupPageRoutes(app, mockPool, globalState);

    const res = await request(app).get('/conversation/789/json');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      conversation_id: '789',
      items: [
        {
          type: 'answer',
          id: 6,
          text: 'Earlier answer',
          timestamp: '2024-01-01T00:01:00.000Z'
        },
        {
          type: 'question',
          id: 5,
          text: 'Later question',
          timestamp: '2024-01-01T00:02:00.000Z'
        }
      ]
    });
  });

  test('GET /conversation/:id/json should return 500 JSON when loading fails', async () => {
    mockPool.query.mockRejectedValueOnce(new Error('json failed'));

    setupPageRoutes(app, mockPool, globalState);

    const res = await request(app).get('/conversation/789/json');

    expect(res.status).toBe(500);
    expect(consoleErrorSpy).toHaveBeenCalledWith('Conversation JSON fetch error', expect.any(Error));
    expect(res.body).toEqual({ error: 'json failed' });
  });
});

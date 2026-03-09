import request from 'supertest';
import express from 'express';
import { setupPageRoutes } from '../routes/pages.js';
import { jest, describe, test, beforeEach, expect } from '@jest/globals';

describe('Page Routes Tests', () => {
  let app;
  const mockPool = {
    query: jest.fn()
  };

  beforeEach(() => {
    app = express();
    app.set('view engine', 'ejs');
    app.set('views', `${process.cwd()}/views`);
    jest.clearAllMocks();
  });

  // jest currently configured to ignore this test file, so these tests won't run until you update jest.config.js to include it.

  // Add tests for other page routes here (e.g., GET /, GET /create-agent, etc.)
});

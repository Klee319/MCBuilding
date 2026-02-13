/**
 * API E2E Tests
 *
 * End-to-end tests for the MC Structure SNS API.
 */

import { test, expect, type APIRequestContext } from '@playwright/test';

test.describe('Health Check', () => {
  test('GET /health returns ok status', async ({ request }) => {
    const response = await request.get('/health');

    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.status).toBe('ok');
    expect(body.timestamp).toBeDefined();
  });
});

test.describe('User Registration Flow', () => {
  test('POST /api/v1/users/register creates a new user', async ({ request }) => {
    const response = await request.post('/api/v1/users/register', {
      data: {
        email: `test-${Date.now()}@example.com`,
        displayName: 'Test User',
        password: 'password123',
      },
    });

    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.id).toBeDefined();
    expect(body.data.displayName).toBe('Test User');
  });

  test('POST /api/v1/users/register fails with invalid email', async ({
    request,
  }) => {
    const response = await request.post('/api/v1/users/register', {
      data: {
        email: 'invalid-email',
        displayName: 'Test User',
        password: 'password123',
      },
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  test('POST /api/v1/users/register fails with duplicate email', async ({
    request,
  }) => {
    const email = `duplicate-${Date.now()}@example.com`;

    // First registration
    await request.post('/api/v1/users/register', {
      data: {
        email,
        displayName: 'First User',
        password: 'password123',
      },
    });

    // Second registration with same email
    const response = await request.post('/api/v1/users/register', {
      data: {
        email,
        displayName: 'Second User',
        password: 'password456',
      },
    });

    expect(response.status()).toBe(409);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('CONFLICT');
  });
});

test.describe('Post Search', () => {
  test('GET /api/v1/posts returns empty list initially', async ({ request }) => {
    const response = await request.get('/api/v1/posts');

    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data).toBeInstanceOf(Array);
    expect(body.meta.page).toBe(1);
    expect(body.meta.limit).toBe(20);
  });

  test('GET /api/v1/posts supports pagination', async ({ request }) => {
    const response = await request.get('/api/v1/posts?page=2&limit=10');

    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.meta.page).toBe(2);
    expect(body.meta.limit).toBe(10);
  });
});

test.describe('Authentication Required Endpoints', () => {
  test('POST /api/v1/posts requires authentication', async ({ request }) => {
    const response = await request.post('/api/v1/posts', {
      data: {
        structureId: 'some-structure-id',
        title: 'Test Post',
        visibility: 'public',
      },
    });

    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  test('POST /api/v1/structures/upload requires authentication', async ({
    request,
  }) => {
    const response = await request.post('/api/v1/structures/upload');

    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  test('POST /api/v1/posts/:id/like requires authentication', async ({
    request,
  }) => {
    const response = await request.post('/api/v1/posts/some-id/like');

    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  test('POST /api/v1/users/:id/follow requires authentication', async ({
    request,
  }) => {
    const response = await request.post('/api/v1/users/some-id/follow');

    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  test('GET /api/v1/notifications requires authentication', async ({
    request,
  }) => {
    const response = await request.get('/api/v1/notifications');

    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('UNAUTHORIZED');
  });
});

test.describe('Post Detail', () => {
  test('GET /api/v1/posts/:id returns 404 for non-existent post', async ({
    request,
  }) => {
    const response = await request.get('/api/v1/posts/non-existent-id');

    expect(response.status()).toBe(404);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('NOT_FOUND');
  });
});

test.describe('Structure Render Data', () => {
  test('GET /api/v1/structures/:id/render-data returns 404 for non-existent', async ({
    request,
  }) => {
    const response = await request.get(
      '/api/v1/structures/non-existent-id/render-data'
    );

    expect(response.status()).toBe(404);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('NOT_FOUND');
  });
});

test.describe('CORS Headers', () => {
  test('OPTIONS request returns CORS headers', async ({ request }) => {
    const response = await request.fetch('/api/v1/posts', {
      method: 'OPTIONS',
      headers: {
        Origin: 'http://localhost:5173',
        'Access-Control-Request-Method': 'GET',
      },
    });

    // CORS preflight should return 204 or 200
    expect([200, 204]).toContain(response.status());

    const headers = response.headers();
    expect(headers['access-control-allow-origin']).toBeDefined();
  });
});

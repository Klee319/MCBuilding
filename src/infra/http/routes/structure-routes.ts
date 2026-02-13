/**
 * Structure Routes
 *
 * HTTP routes for structure-related endpoints.
 */

import { Hono } from 'hono';
import type { StructureController } from '../../../interface/controllers/structure-controller.js';
import type { HttpContext } from '../../../interface/controllers/types.js';
import {
  createAuthMiddleware,
  type AuthUser,
  type JwtService,
} from '../middleware/auth-middleware.js';

export function createStructureRoutes(
  controller: StructureController,
  jwtService: JwtService
): Hono {
  const app = new Hono();
  const authRequired = createAuthMiddleware(jwtService);

  // POST /api/v1/structures/upload - Upload structure file
  app.post('/upload', authRequired, async (c) => {
    const user = c.get('user') as AuthUser;

    // Handle multipart form data
    let formData: FormData;
    try {
      formData = await c.req.formData();
    } catch (err) {
      console.error('FormData parse error:', err);
      return c.json({
        success: false,
        error: { code: 'PARSE_ERROR', message: 'FormDataの解析に失敗しました' },
      }, 400);
    }

    const file = formData.get('file') as File | null;
    const originalEdition = formData.get('originalEdition') as string;
    const originalVersion = formData.get('originalVersion') as string;

    console.log('Upload request:', {
      hasFile: !!file,
      fileName: file?.name,
      fileSize: file?.size,
      originalEdition,
      originalVersion,
    });

    const ctx: HttpContext = {
      params: {},
      query: {},
      body: {
        originalEdition,
        originalVersion,
      },
      user: { id: user.id },
    };

    if (file) {
      const buffer = await file.arrayBuffer();
      (ctx as { file?: HttpContext['file'] }).file = {
        buffer: Buffer.from(buffer),
        originalname: file.name,
        mimetype: file.type,
        size: file.size,
      };
    }

    const response = await controller.upload(ctx);
    return c.json(response.body, response.status as 201);
  });

  // GET /api/v1/structures/:id/download - Download structure
  app.get('/:id/download', authRequired, async (c) => {
    const user = c.get('user') as AuthUser;
    const ctx: HttpContext = {
      params: { id: c.req.param('id') },
      query: c.req.query() as Record<string, string>,
      body: {},
      user: { id: user.id },
    };

    const response = await controller.download(ctx);
    return c.json(response.body, response.status as 200);
  });

  // GET /api/v1/structures/:id/render-data - Get render data
  app.get('/:id/render-data', async (c) => {
    const ctx: HttpContext = {
      params: { id: c.req.param('id') },
      query: c.req.query() as Record<string, string>,
      body: {},
    };

    const response = await controller.getRenderData(ctx);
    return c.json(response.body, response.status as 200);
  });

  return app;
}

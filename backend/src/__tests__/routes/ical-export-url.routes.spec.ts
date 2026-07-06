import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import apiRouter from '../../routes/index';
import { signAccessToken } from '../../utils/jwt.util';

const app = express();
app.use(express.json());
app.use('/api/v1', apiRouter);

const authToken = signAccessToken({ role: 'admin' });

describe('GET /api/v1/calendar-export-url', () => {
  it('sin Authorization → 401', async () => {
    const res = await request(app).get('/api/v1/calendar-export-url');
    expect(res.status).toBe(401);
  });

  it('con token de admin → 200 con la URL de /calendar.ics y el token de exportacion', async () => {
    const res = await request(app)
      .get('/api/v1/calendar-export-url')
      .set('Authorization', `Bearer ${authToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.url).toContain('/calendar.ics?token=');
    expect(res.body.data.url).toContain('test-ical-export-token-for-testing-only');
  });
});

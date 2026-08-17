const request = require('supertest');
const app = require('../src/app'); // Adjust path to your Express app instance

describe('API Compression Middleware', () => {
  it('should compress responses with Brotli when the client supports it', async () => {
    const response = await request(app)
      .get('/api/health') // Use any existing, valid GET endpoint that returns a sufficiently large payload
      .set('Accept-Encoding', 'br, gzip, deflate');

    // Verify the Content-Encoding header is Brotli
    expect(response.headers['content-encoding']).toBe('br');
  });

  it('should fallback to gzip when Brotli is not supported by the client', async () => {
    const response = await request(app)
      .get('/api/health')
      .set('Accept-Encoding', 'gzip, deflate');

    // Verify the Content-Encoding header falls back to gzip
    expect(response.headers['content-encoding']).toBe('gzip');
  });

  it('should not compress responses when the client does not support compression', async () => {
    const response = await request(app)
      .get('/api/health')
      .set('Accept-Encoding', 'identity'); // Explicitly requesting no compression

    // Verify the Content-Encoding header is absent
    expect(response.headers['content-encoding']).toBeUndefined();
  });
});

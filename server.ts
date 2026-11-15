import crypto from 'node:crypto';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import express from 'express';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

async function startServer() {
  const app = express();
  const httpServer = http.createServer(app);
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'kora-and-loom' });
  });

  // Expose ONLY non-secret Razorpay configuration status and public Key ID
  app.get('/api/payments/razorpay/status', (_req, res) => {
    const keyId = process.env.RAZORPAY_KEY_ID?.trim() || '';
    const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim() || '';
    const configured = Boolean(keyId && keySecret);
    const mode = !configured
      ? 'unconfigured'
      : keyId.startsWith('rzp_live_')
        ? 'live'
        : 'test';

    res.json({
      configured,
      keyId: configured ? keyId : null,
      mode,
    });
  });

  // Create a real Razorpay Order via Razorpay REST API (never fakes an order)
  app.post('/api/payments/razorpay/create-order', async (req, res) => {
    const keyId = process.env.RAZORPAY_KEY_ID?.trim();
    const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();

    if (!keyId || !keySecret) {
      return res.status(503).json({
        error:
          'Razorpay credentials (RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET) are not configured on the server. Add them to your environment secrets or choose Cash on Delivery.',
      });
    }

    const amountInRupees = Number(req.body?.amount);
    const receipt = typeof req.body?.receipt === 'string' ? req.body.receipt.slice(0, 40) : `kl_${Date.now()}`;

    if (!Number.isFinite(amountInRupees) || amountInRupees <= 0) {
      return res.status(400).json({ error: 'Invalid order amount.' });
    }

    const amountPaise = Math.round(amountInRupees * 100);
    const authHeader = Buffer.from(`${keyId}:${keySecret}`).toString('base64');

    try {
      const response = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          Authorization: `Basic ${authHeader}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: amountPaise,
          currency: 'INR',
          receipt,
          payment_capture: 1,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        return res.status(response.status).json({
          error: data?.error?.description || 'Failed to initialize Razorpay order.',
        });
      }

      return res.json({
        id: data.id,
        amount: data.amount,
        currency: data.currency,
        receipt: data.receipt,
      });
    } catch (err) {
      console.error('Razorpay order creation error:', err);
      return res.status(502).json({
        error: 'Unable to reach Razorpay payment gateway. Please verify network connectivity and credentials.',
      });
    }
  });

  // Cryptographically verify Razorpay payment signature using server-side secret
  app.post('/api/payments/razorpay/verify', (req, res) => {
    const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
    if (!keySecret) {
      return res.status(503).json({
        verified: false,
        error: 'Razorpay secret is not configured on the server.',
      });
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {};
    if (
      typeof razorpay_order_id !== 'string' ||
      typeof razorpay_payment_id !== 'string' ||
      typeof razorpay_signature !== 'string'
    ) {
      return res.status(400).json({
        verified: false,
        error: 'Missing payment verification parameters.',
      });
    }

    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    const sigBuffer = Buffer.from(razorpay_signature, 'utf8');
    const expBuffer = Buffer.from(expectedSignature, 'utf8');
    const isValid =
      sigBuffer.length === expBuffer.length &&
      crypto.timingSafeEqual(sigBuffer, expBuffer);

    if (!isValid) {
      return res.status(400).json({
        verified: false,
        error: 'Payment signature verification failed.',
      });
    }

    return res.json({ verified: true });
  });

  if (!IS_PRODUCTION) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === 'true' ? false : { server: httpServer },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Kora & Loom server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

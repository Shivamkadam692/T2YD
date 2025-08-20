const express = require('express');
const router = express.Router();
const { requireLogin, requireRole } = require('../middleware/auth');
const Request = require('../models/Request');
const Payment = require('../models/Payment');

const stripeSecret = process.env.STRIPE_SECRET_KEY || '';
let stripe = null;
if (stripeSecret) {
  stripe = require('stripe')(stripeSecret);
}

function assertStripe(res) {
  if (!stripe) {
    res.status(500).send('Stripe not configured. Set STRIPE_SECRET_KEY.');
    return false;
  }
  return true;
}

// Create advance payment when transporter marks loaded (shipper pays)
router.post('/create-advance/:requestId', requireLogin, requireRole('shipper'), async (req, res) => {
  try {
    if (!assertStripe(res)) return;
    const request = await Request.findById(req.params.requestId).populate('shipper transporter');
    if (!request) return res.status(404).render('error', { message: 'Request not found' });
    if (request.shipper._id.toString() !== req.session.userId) return res.status(403).render('error', { message: 'Unauthorized' });
    if (!request.loadedAt) return res.status(400).render('error', { message: 'Advance is available after goods are loaded' });

    // Example: 30% advance of agreed price (in INR)
    const total = Number(request.price || 0);
    const advanceAmount = Math.round(total * 0.3 * 100); // to paise

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'inr',
          product_data: { name: `Advance for delivery ${request.delivery}` },
          unit_amount: advanceAmount,
        },
        quantity: 1,
      }],
      success_url: `${req.protocol}://${req.get('host')}/payments/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.protocol}://${req.get('host')}/payments/cancel`,
      metadata: { requestId: request._id.toString(), type: 'advance' }
    });

    const payment = await Payment.create({
      request: request._id,
      shipper: request.shipper._id,
      transporter: request.transporter._id,
      amount: Math.round(advanceAmount / 100),
      type: 'advance',
      status: 'created',
      stripeSessionId: session.id
    });

    res.redirect(session.url);
  } catch (e) {
    res.status(500).render('error', { message: 'Error creating advance payment' });
  }
});

// Create balance payment when transporter marks delivered (shipper pays)
router.post('/create-balance/:requestId', requireLogin, requireRole('shipper'), async (req, res) => {
  try {
    if (!assertStripe(res)) return;
    const request = await Request.findById(req.params.requestId).populate('shipper transporter');
    if (!request) return res.status(404).render('error', { message: 'Request not found' });
    if (request.shipper._id.toString() !== req.session.userId) return res.status(403).render('error', { message: 'Unauthorized' });
    if (request.status !== 'completed') return res.status(400).render('error', { message: 'Balance is available after delivery is completed' });

    const total = Number(request.price || 0);
    const advanceAmount = Math.round(total * 0.3 * 100);
    const balanceAmount = Math.max(0, Math.round(total * 100) - advanceAmount);

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'inr',
          product_data: { name: `Balance for delivery ${request.delivery}` },
          unit_amount: balanceAmount,
        },
        quantity: 1,
      }],
      success_url: `${req.protocol}://${req.get('host')}/payments/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.protocol}://${req.get('host')}/payments/cancel`,
      metadata: { requestId: request._id.toString(), type: 'balance' }
    });

    await Payment.create({
      request: request._id,
      shipper: request.shipper._id,
      transporter: request.transporter._id,
      amount: Math.round(balanceAmount / 100),
      type: 'balance',
      status: 'created',
      stripeSessionId: session.id
    });

    res.redirect(session.url);
  } catch (e) {
    res.status(500).render('error', { message: 'Error creating balance payment' });
  }
});

// Success/cancel handlers
router.get('/success', async (req, res) => {
  try {
    if (!assertStripe(res)) return;
    const sessionId = req.query.session_id;
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const type = session.metadata?.type;
    const requestId = session.metadata?.requestId;

    const updated = await Payment.findOneAndUpdate({ stripeSessionId: sessionId }, { status: 'paid', stripePaymentIntentId: session.payment_intent }, { new: true });
    
    // Optionally reflect payment state on request (e.g., flags)
    if (type === 'advance' || type === 'balance') {
      const request = await Request.findById(requestId).populate('shipper transporter delivery');
      if (request) {
        const NotificationService = require('../services/notificationService');
        const amountPaid = Number(updated?.amount || 0);
        await NotificationService.notifyPaymentReceived(request, amountPaid);
        if (type === 'advance') {
          await Request.findByIdAndUpdate(requestId, { advancePaidAt: new Date() });
        } else if (type === 'balance') {
          await Request.findByIdAndUpdate(requestId, { balancePaidAt: new Date() });
        }
      }
    }

    res.send('Payment successful. You may close this window and return to the app.');
  } catch (e) {
    res.status(500).send('Payment processed but confirmation failed.');
  }
});

router.get('/cancel', (req, res) => {
  res.send('Payment cancelled.');
});

// List payments for a request (shipper or transporter associated with it)
router.get('/request/:requestId', requireLogin, async (req, res) => {
  try {
    const request = await Request.findById(req.params.requestId).populate('shipper transporter delivery');
    if (!request) return res.status(404).render('error', { message: 'Request not found' });
    const userId = req.session.userId?.toString();
    if (request.shipper._id.toString() !== userId && request.transporter._id.toString() !== userId) {
      return res.status(403).render('error', { message: 'Unauthorized' });
    }
    const payments = await Payment.find({ request: request._id }).sort({ createdAt: -1 });
    res.render('payments', { request, payments });
  } catch (e) {
    res.status(500).render('error', { message: 'Error loading payments' });
  }
});

// Receipt page for a single payment
router.get('/receipt/:paymentId', requireLogin, async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.paymentId).populate({ path: 'request', populate: ['shipper', 'transporter', 'delivery'] });
    if (!payment) return res.status(404).render('error', { message: 'Payment not found' });
    const userId = req.session.userId?.toString();
    if (payment.request.shipper._id.toString() !== userId && payment.request.transporter._id.toString() !== userId) {
      return res.status(403).render('error', { message: 'Unauthorized' });
    }
    res.render('receipt', { payment });
  } catch (e) {
    res.status(500).render('error', { message: 'Error loading receipt' });
  }
});

// ===== DEMO PAYMENT ROUTES (FOR TESTING ONLY) =====

// Create demo advance payment (no Stripe required)
router.post('/demo/advance/:requestId', requireLogin, requireRole('shipper'), async (req, res) => {
  try {
    const request = await Request.findById(req.params.requestId).populate('shipper transporter delivery');
    if (!request) return res.status(404).render('error', { message: 'Request not found' });
    if (request.shipper._id.toString() !== req.session.userId) return res.status(403).render('error', { message: 'Unauthorized' });

    // Calculate 30% advance
    const total = Number(request.price || 5000); // Default demo amount
    const advanceAmount = Math.round(total * 0.3);

    const payment = await Payment.create({
      request: request._id,
      shipper: request.shipper._id,
      transporter: request.transporter._id,
      amount: advanceAmount,
      type: 'advance',
      status: 'paid', // Mark as paid immediately for demo
      stripeSessionId: `demo_advance_${Date.now()}`,
      stripePaymentIntentId: `demo_pi_${Date.now()}`
    });

    // Update request to show advance paid
    await Request.findByIdAndUpdate(request._id, { advancePaidAt: new Date() });

    // Create notification for transporter
    const NotificationService = require('../services/notificationService');
    await NotificationService.notifyPaymentReceived(request, advanceAmount);

    res.redirect(`/payments/request/${request._id}?demo=true`);
  } catch (e) {
    console.error('Demo advance payment error:', e);
    res.status(500).render('error', { message: 'Error creating demo advance payment' });
  }
});

// Create demo balance payment (no Stripe required)
router.post('/demo/balance/:requestId', requireLogin, requireRole('shipper'), async (req, res) => {
  try {
    const request = await Request.findById(req.params.requestId).populate('shipper transporter delivery');
    if (!request) return res.status(404).render('error', { message: 'Request not found' });
    if (request.shipper._id.toString() !== req.session.userId) return res.status(403).render('error', { message: 'Unauthorized' });

    // Calculate balance (70% of total)
    const total = Number(request.price || 5000); // Default demo amount
    const advanceAmount = Math.round(total * 0.3);
    const balanceAmount = total - advanceAmount;

    const payment = await Payment.create({
      request: request._id,
      shipper: request.shipper._id,
      transporter: request.transporter._id,
      amount: balanceAmount,
      type: 'balance',
      status: 'paid', // Mark as paid immediately for demo
      stripeSessionId: `demo_balance_${Date.now()}`,
      stripePaymentIntentId: `demo_pi_${Date.now()}`
    });

    // Update request to show balance paid
    await Request.findByIdAndUpdate(request._id, { balancePaidAt: new Date() });

    // Create notification for transporter
    const NotificationService = require('../services/notificationService');
    await NotificationService.notifyPaymentReceived(request, balanceAmount);

    res.redirect(`/payments/request/${request._id}?demo=true`);
  } catch (e) {
    console.error('Demo balance payment error:', e);
    res.status(500).render('error', { message: 'Error creating demo balance payment' });
  }
});

// Create multiple demo payments for testing
router.post('/demo/create-sample/:requestId', requireLogin, requireRole('shipper'), async (req, res) => {
  try {
    const request = await Request.findById(req.params.requestId).populate('shipper transporter delivery');
    if (!request) return res.status(404).render('error', { message: 'Request not found' });
    if (request.shipper._id.toString() !== req.session.userId) return res.status(403).render('error', { message: 'Unauthorized' });

    const total = Number(request.price || 5000);
    const advanceAmount = Math.round(total * 0.3);
    const balanceAmount = total - advanceAmount;

    // Create advance payment
    const advancePayment = await Payment.create({
      request: request._id,
      shipper: request.shipper._id,
      transporter: request.transporter._id,
      amount: advanceAmount,
      type: 'advance',
      status: 'paid',
      stripeSessionId: `demo_advance_${Date.now()}`,
      stripePaymentIntentId: `demo_pi_advance_${Date.now()}`
    });

    // Create balance payment
    const balancePayment = await Payment.create({
      request: request._id,
      shipper: request.shipper._id,
      transporter: request.transporter._id,
      amount: balanceAmount,
      type: 'balance',
      status: 'paid',
      stripeSessionId: `demo_balance_${Date.now()}`,
      stripePaymentIntentId: `demo_pi_balance_${Date.now()}`
    });

    // Update request
    await Request.findByIdAndUpdate(request._id, { 
      advancePaidAt: new Date(),
      balancePaidAt: new Date()
    });

    // Create notifications
    const NotificationService = require('../services/notificationService');
    await NotificationService.notifyPaymentReceived(request, advanceAmount);
    await NotificationService.notifyPaymentReceived(request, balanceAmount);

    res.redirect(`/payments/request/${request._id}?demo=true&sample=created`);
  } catch (e) {
    console.error('Demo sample payments error:', e);
    res.status(500).render('error', { message: 'Error creating demo sample payments' });
  }
});

module.exports = router;

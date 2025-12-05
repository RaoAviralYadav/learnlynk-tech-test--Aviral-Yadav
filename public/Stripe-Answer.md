## Stripe Answer

When a user decides to pay the application fee, I would first insert a `payment_requests` row with status='pending', storing the application_id, amount, and currency. Then immediately call Stripe's Checkout Session API, passing the payment_request.id as metadata. Store the returned session_id and checkout_url in the payment_requests table and redirect the user to the checkout_url.

Set up a webhook endpoint listening for `checkout.session.completed` and `payment_intent.succeeded` events. When the webhook fires, verify the signature, extract the payment_request.id from metadata, and update the payment_requests row with status='completed', stripe_payment_intent_id, and paid_at timestamp.

In the same webhook handler transaction, update the related application's status to 'payment_received' or similar, ensuring the application table reflects the successful payment. Use Stripe's idempotency keys to prevent duplicate processing.

For failed payments, listen to `checkout.session.expired` to mark payment_requests as 'failed' and allow retry attempts. Store all webhook events in a separate stripe_events table for debugging and reconciliation purposes.
import { PortOneClient, PortOneError } from '@portone/server-sdk';

export * as Webhook from '@portone/server-sdk/webhook';
export { PortOneError };

const portone = PortOneClient({
  secret: process.env.PORTONE_API_SECRET!,
});

export default portone;

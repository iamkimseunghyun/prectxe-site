import { PortOneClient, PortOneError } from '@portone/server-sdk';
export { PortOneError };
export * as Webhook from '@portone/server-sdk/webhook';

const portone = PortOneClient({
  secret: process.env.PORTONE_API_SECRET!,
});

export default portone;

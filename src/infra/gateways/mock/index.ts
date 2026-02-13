/**
 * Mock Gateways Index
 *
 * Exports all mock gateway implementations for testing.
 */

export { MockEmailGateway, type SentEmail } from './mock-email-gateway.js';
export { MockSmsGateway, type SentSms } from './mock-sms-gateway.js';
export {
  MockNotificationGateway,
  type SentNotification,
} from './mock-notification-gateway.js';
export { MockSpamDetectorGateway } from './mock-spam-detector-gateway.js';
export { MockStructureConverterGateway } from './mock-structure-converter-gateway.js';
export { MockRendererDataGateway } from './mock-renderer-data-gateway.js';

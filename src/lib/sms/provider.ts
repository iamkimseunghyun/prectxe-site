import * as Aligo from './aligo';
import * as Solapi from './solapi';

// 전화번호 유틸 함수 re-export (호환성)
export {
  validatePhoneNumber,
  normalizePhoneNumber,
  filterValidPhoneNumbers,
} from './utils';

// SMS Provider 타입
export type SMSProvider = 'aligo' | 'solapi';

// SMS 발송 인터페이스 (공통)
export interface SendSMSParams {
  to: string | string[];
  text: string;
  from?: string;
}

export interface SendSMSResult {
  success: boolean;
  sentCount: number;
  failedCount: number;
  results: {
    to: string;
    success: boolean;
    messageId?: string;
    error?: string;
  }[];
}

/**
 * 환경변수에서 SMS Provider 가져오기
 */
export function getSMSProvider(): SMSProvider {
  const provider = process.env.SMS_PROVIDER?.toLowerCase() as SMSProvider;

  if (provider !== 'aligo' && provider !== 'solapi') {
    console.warn(
      `Invalid SMS_PROVIDER: ${provider}. Defaulting to 'aligo'. Valid options: 'aligo', 'solapi'`
    );
    return 'aligo';
  }

  return provider;
}

/**
 * 선택된 Provider를 사용하여 SMS 발송
 */
export async function sendSMS(params: SendSMSParams): Promise<SendSMSResult> {
  const provider = getSMSProvider();

  console.log(`[SMS] Using provider: ${provider}`);

  switch (provider) {
    case 'aligo':
      return Aligo.sendSMS(params);
    case 'solapi':
      return Solapi.sendSMS(params);
    default:
      throw new Error(`Unknown SMS provider: ${provider}`);
  }
}


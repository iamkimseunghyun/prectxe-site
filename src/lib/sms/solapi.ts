import { SolapiMessageService } from 'solapi';

// Solapi 클라이언트 생성
export function createSolapiClient() {
  const apiKey = process.env.SOLAPI_API_KEY;
  const apiSecret = process.env.SOLAPI_API_SECRET;

  if (!apiKey || !apiSecret) {
    throw new Error('SOLAPI_API_KEY and SOLAPI_API_SECRET must be set');
  }

  return new SolapiMessageService(apiKey, apiSecret);
}

// SMS 발송 인터페이스
export interface SendSMSParams {
  to: string | string[]; // 단일 번호 또는 번호 배열
  text: string;
  from?: string; // 발신번호 (환경변수에서 기본값 사용)
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
 * 단일 또는 다수의 수신자에게 SMS 발송
 */
export async function sendSMS(params: SendSMSParams): Promise<SendSMSResult> {
  try {
    const client = createSolapiClient();
    const from = params.from || process.env.SOLAPI_SENDER_PHONE;

    if (!from) {
      throw new Error('발신번호가 설정되지 않았습니다');
    }

    const recipients = Array.isArray(params.to) ? params.to : [params.to];
    const results: SendSMSResult['results'] = [];
    let sentCount = 0;
    let failedCount = 0;

    // 각 수신자에게 개별 발송
    for (const phone of recipients) {
      try {
        // 메시지 길이에 따라 타입 자동 결정 (SMS: 90자 이하, LMS: 2000자 이하)
        const messageType = params.text.length <= 90 ? 'SMS' : 'LMS';

        const response = await client.send({
          to: phone,
          from,
          text: params.text,
          type: messageType,
        });

        results.push({
          to: phone,
          success: true,
          messageId: response.groupInfo.groupId,
        });
        sentCount++;
      } catch (error) {
        results.push({
          to: phone,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        failedCount++;
      }
    }

    return {
      success: sentCount > 0,
      sentCount,
      failedCount,
      results,
    };
  } catch (error) {
    console.error('SMS 발송 오류:', error);
    throw error;
  }
}

/**
 * 전화번호 형식 검증 (한국 휴대폰)
 */
export function validatePhoneNumber(phone: string): boolean {
  return /^01[0-9]{8,9}$/.test(phone);
}

/**
 * 전화번호 포맷팅 (010-1234-5678 → 01012345678)
 */
export function normalizePhoneNumber(phone: string): string {
  return phone.replace(/[^0-9]/g, '');
}

/**
 * 배열에서 유효한 전화번호만 필터링
 */
export function filterValidPhoneNumbers(phones: string[]): string[] {
  return phones
    .map(normalizePhoneNumber)
    .filter(validatePhoneNumber)
    .filter((phone, index, self) => self.indexOf(phone) === index); // 중복 제거
}

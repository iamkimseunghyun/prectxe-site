// @ts-ignore - aligoapi does not have TypeScript definitions
import aligoapi from 'aligoapi';

// Aligo 인증 데이터
function getAligoAuth() {
  const apiKey = process.env.ALIGO_API_KEY;
  const userId = process.env.ALIGO_USER_ID;
  const testMode = process.env.ALIGO_TEST_MODE === 'Y';

  if (!apiKey || !userId) {
    throw new Error('ALIGO_API_KEY and ALIGO_USER_ID must be set');
  }

  const authData: Record<string, string> = {
    key: apiKey,
    user_id: userId,
  };

  // 테스트 모드 활성화 (실제 발송 안됨, IP 제한 없음)
  if (testMode) {
    authData.testmode_yn = 'Y';
    console.log('[Aligo] 테스트 모드 활성화');
  }

  return authData;
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
    const authData = getAligoAuth();
    const from = params.from || process.env.ALIGO_SENDER_PHONE;

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
        // Aligo API 요청 데이터 구성 (Express req 객체 형식)
        const requestData = {
          body: {
            sender: from,
            receiver: phone,
            msg: params.text,
            msg_type: params.text.length > 90 ? 'LMS' : 'SMS', // 90자 이상 LMS
          },
          headers: {
            'content-type': 'application/json',
          },
        };

        console.log(
          '[Aligo] 요청 데이터:',
          JSON.stringify(requestData, null, 2)
        );

        const response = await aligoapi.send(requestData, authData);

        console.log('[Aligo] API 응답:', JSON.stringify(response, null, 2));

        // Aligo 응답 처리
        if (response.result_code === '1') {
          console.log(`[Aligo] 발송 성공: ${phone}`);
          results.push({
            to: phone,
            success: true,
            messageId: response.msg_id,
          });
          sentCount++;
        } else {
          console.error(
            `[Aligo] 발송 실패: ${phone}, 코드: ${response.result_code}, 메시지: ${response.message}`
          );
          results.push({
            to: phone,
            success: false,
            error: response.message || 'Unknown error',
          });
          failedCount++;
        }
      } catch (error) {
        console.error(`[Aligo] 예외 발생: ${phone}`, error);
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
    console.error('Aligo SMS 발송 오류:', error);
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

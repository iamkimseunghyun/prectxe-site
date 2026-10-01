// expo-env.d.ts는 `expo start`가 만들고 gitignore돼 있어, 서버를 띄운 적 없는
// 환경의 타입 체크에서도 process.env 등 Expo 타입이 잡히게 직접 참조한다.
/// <reference types="expo/types" />

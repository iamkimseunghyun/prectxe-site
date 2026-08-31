// components/analytics/vercel-analytics.tsx
"use client";

import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

// event.url은 절대 URL이므로 pathname을 파싱해서 비교한다.
// url.includes('/admin')으로 하면 /journal/admin-interview 같은
// 슬러그까지 걸러지므로 startsWith로 정확히 매칭.
function isAdminUrl(url: string) {
  try {
    return new URL(url).pathname.startsWith("/admin");
  } catch {
    return url.startsWith("/admin");
  }
}

export function VercelAnalytics() {
  return (
    <>
      <Analytics
        beforeSend={(event) => (isAdminUrl(event.url) ? null : event)}
      />
      <SpeedInsights
        // SpeedInsights는 route(/admin/drops/[id]/orders 같은 패턴)를 제공하므로
        // URL 파싱 없이 바로 비교할 수 있다. 다만 옵셔널이라 ?. 필요.
        beforeSend={(event) =>
          event.route?.startsWith("/admin") ? null : event
        }
      />
    </>
  );
}

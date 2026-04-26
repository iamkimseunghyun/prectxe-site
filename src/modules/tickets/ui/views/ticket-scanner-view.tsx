'use client';

import { Camera, CheckCircle2, RotateCcw, X, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { extractTicketToken } from '@/lib/utils/ticket-token';
import {
  checkInTicket,
  getCheckInStats,
  undoCheckIn,
} from '@/modules/tickets/server/actions';

type ScanResult =
  | {
      kind: 'ok';
      buyerName: string;
      tierName: string;
      checkedInAt: Date;
      token: string;
    }
  | {
      kind: 'already';
      buyerName: string;
      tierName: string;
      checkedInAt: Date | null;
      token: string;
    }
  | { kind: 'error'; message: string };

const COOLDOWN_MS = 1500;

function playBeep(success: boolean) {
  if (typeof window === 'undefined') return;
  try {
    const ctx = new (
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext
    )();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = success ? 880 : 220;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.2);
  } catch {
    // 사일런트 폴백
  }
}

export function TicketScannerView({
  dropId,
  dropTitle,
}: {
  dropId: string;
  dropTitle: string;
}) {
  const [stats, setStats] = useState<{
    total: number;
    checkedIn: number;
  } | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [scanning, setScanning] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const lastTokenRef = useRef<{ token: string; at: number } | null>(null);
  const scannerRef = useRef<{
    stop: () => Promise<void>;
    clear: () => void;
  } | null>(null);
  const elementId = 'qr-scanner-region';

  const refreshStats = useCallback(async () => {
    const r = await getCheckInStats(dropId);
    if (r.success) setStats(r.data);
  }, [dropId]);

  useEffect(() => {
    refreshStats();
  }, [refreshStats]);

  const handleScan = useCallback(
    async (decodedText: string) => {
      // 동일 토큰 연속 스캔 디바운스
      const token = extractTicketToken(decodedText);
      if (!token) {
        setResult({ kind: 'error', message: '인식할 수 없는 QR입니다.' });
        playBeep(false);
        return;
      }
      const last = lastTokenRef.current;
      if (last && last.token === token && Date.now() - last.at < COOLDOWN_MS) {
        return;
      }
      lastTokenRef.current = { token, at: Date.now() };

      const r = await checkInTicket(token);
      if (!r.success) {
        setResult({ kind: 'error', message: r.error });
        playBeep(false);
        return;
      }
      if (r.alreadyCheckedIn) {
        setResult({
          kind: 'already',
          buyerName: r.data.buyerName,
          tierName: r.data.tierName,
          checkedInAt: r.data.checkedInAt,
          token,
        });
        playBeep(false);
        return;
      }
      setResult({
        kind: 'ok',
        buyerName: r.data.buyerName,
        tierName: r.data.tierName,
        checkedInAt: r.data.checkedInAt,
        token,
      });
      playBeep(true);
      refreshStats();
    },
    [refreshStats]
  );

  // html5-qrcode 동적 import (서버 빌드 회피)
  useEffect(() => {
    let cancelled = false;
    let cleanup: (() => void) | null = null;

    (async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        if (cancelled) return;

        const instance = new Html5Qrcode(elementId, { verbose: false });
        scannerRef.current = {
          stop: () => instance.stop(),
          clear: () => instance.clear(),
        };

        await instance.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 280, height: 280 },
            aspectRatio: 1.0,
          },
          (decoded) => {
            handleScan(decoded);
          },
          () => {
            // 매 프레임 미인식 → 무시
          }
        );

        if (cancelled) {
          await instance.stop();
          instance.clear();
          return;
        }

        setScanning(true);
        setErrorMsg(null);

        cleanup = () => {
          instance
            .stop()
            .then(() => instance.clear())
            .catch(() => {
              /* noop */
            });
        };
      } catch (e) {
        const msg = e instanceof Error ? e.message : '카메라를 열 수 없습니다.';
        setErrorMsg(msg);
      }
    })();

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [handleScan]);

  async function handleUndo() {
    if (!result || result.kind === 'error') return;
    const r = await undoCheckIn(result.token);
    if (r.success) {
      setResult(null);
      lastTokenRef.current = null;
      refreshStats();
    } else {
      setErrorMsg(r.error);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-black text-white">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wider text-white/40">
            Scanner
          </p>
          <p className="truncate text-sm font-semibold">{dropTitle}</p>
        </div>
        <div className="flex items-center gap-3">
          {stats && (
            <div className="text-right">
              <p className="text-xs text-white/40">입장</p>
              <p className="font-mono text-base font-semibold">
                {stats.checkedIn} / {stats.total}
              </p>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            asChild
            className="text-white/60 hover:bg-white/10 hover:text-white"
          >
            <Link href={`/admin/drops/${dropId}`}>
              <X className="h-5 w-5" />
            </Link>
          </Button>
        </div>
      </header>

      {/* Camera Region */}
      <div className="relative flex-1 overflow-hidden bg-black">
        <div
          id={elementId}
          className="absolute inset-0 [&>video]:h-full [&>video]:w-full [&>video]:object-cover"
        />
        {!scanning && !errorMsg && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white/60">
            <Camera className="h-10 w-10" />
            <p className="text-sm">카메라 시작 중...</p>
          </div>
        )}
        {errorMsg && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
            <XCircle className="h-10 w-10 text-red-400" />
            <p className="text-sm text-red-300">{errorMsg}</p>
            <p className="text-xs text-white/50">
              브라우저 카메라 권한을 확인하고 페이지를 새로고침하세요.
            </p>
          </div>
        )}

        {/* 가이드 프레임 */}
        {scanning && !result && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-72 w-72 rounded-2xl border-2 border-white/40" />
          </div>
        )}
      </div>

      {/* Result Sheet */}
      <div className="border-t border-white/10 bg-black/95 backdrop-blur">
        {result ? (
          <ResultPanel
            result={result}
            onUndo={handleUndo}
            onNext={() => setResult(null)}
          />
        ) : (
          <div className="flex items-center justify-center px-6 py-5 text-sm text-white/40">
            QR 코드를 프레임 안에 비춰주세요
          </div>
        )}
      </div>
    </div>
  );
}

function ResultPanel({
  result,
  onUndo,
  onNext,
}: {
  result: Exclude<ScanResult, null>;
  onUndo: () => void;
  onNext: () => void;
}) {
  if (result.kind === 'error') {
    return (
      <div className="flex items-center justify-between gap-4 bg-red-950/40 px-5 py-4">
        <div className="flex items-center gap-3">
          <XCircle className="h-7 w-7 shrink-0 text-red-400" />
          <div>
            <p className="text-sm font-semibold text-red-200">실패</p>
            <p className="text-xs text-red-300/80">{result.message}</p>
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={onNext}
          className="border-white/20 bg-white/5 text-white hover:bg-white/10"
        >
          다음
        </Button>
      </div>
    );
  }

  const ok = result.kind === 'ok';
  const tone = ok
    ? 'bg-emerald-950/40 text-emerald-200 border-emerald-400/30'
    : 'bg-amber-950/40 text-amber-200 border-amber-400/30';
  const Icon = ok ? CheckCircle2 : RotateCcw;

  return (
    <div
      className={`flex items-center justify-between gap-4 border-t px-5 py-4 ${tone}`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <Icon className="h-7 w-7 shrink-0" />
        <div className="min-w-0">
          <p className="truncate text-base font-bold">
            {result.buyerName} · {result.tierName}
          </p>
          <p className="text-xs opacity-80">
            {ok
              ? '입장 완료'
              : `이미 입장됨${
                  result.checkedInAt
                    ? ` · ${new Date(result.checkedInAt).toLocaleTimeString(
                        'ko-KR',
                        { hour: '2-digit', minute: '2-digit' }
                      )}`
                    : ''
                }`}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {ok && (
          <Button
            size="sm"
            variant="outline"
            onClick={onUndo}
            className="border-white/20 bg-white/5 text-white hover:bg-white/10"
          >
            취소
          </Button>
        )}
        <Button
          size="sm"
          onClick={onNext}
          className="bg-white text-black hover:bg-white/90"
        >
          다음
        </Button>
      </div>
    </div>
  );
}

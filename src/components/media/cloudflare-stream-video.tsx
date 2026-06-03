'use client';

import { useEffect, useRef, useState } from 'react';

interface CloudflareStreamVideoProps {
  /** Cloudflare Stream base URL or YouTube URL */
  videoUrl: string;
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
  controls?: boolean;
  className?: string;
  onError?: () => void;
}

/** YouTube URL에서 video ID 추출 */
function extractYouTubeId(url: string): string | null {
  const patterns = [
    /youtu\.be\/([^?/]+)/,
    /youtube\.com\/watch\?v=([^&]+)/,
    /youtube\.com\/embed\/([^?/]+)/,
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m?.[1]) return m[1];
  }
  return null;
}

/**
 * 비디오 플레이어 — Cloudflare Stream HLS + YouTube 자동 감지
 * - YouTube URL → iframe embed
 * - Cloudflare Stream → 네이티브 HLS / hls.js 폴백
 */
export function CloudflareStreamVideo({
  videoUrl,
  autoPlay = false,
  loop = false,
  muted = false,
  controls = true,
  className,
  onError,
}: CloudflareStreamVideoProps) {
  // YouTube 감지
  const ytId = extractYouTubeId(videoUrl);
  if (ytId) {
    const params = new URLSearchParams({
      autoplay: autoPlay ? '1' : '0',
      loop: loop ? '1' : '0',
      mute: muted ? '1' : '0',
      controls: controls ? '1' : '0',
      playsinline: '1',
      rel: '0',
    });
    return (
      <iframe
        src={`https://www.youtube.com/embed/${ytId}?${params}`}
        className={className}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        title="Video"
        style={{ border: 0, width: '100%', aspectRatio: '16/9' }}
      />
    );
  }

  // Cloudflare Stream HLS
  return (
    <CloudflareHlsPlayer
      videoUrl={videoUrl}
      autoPlay={autoPlay}
      loop={loop}
      muted={muted}
      controls={controls}
      className={className}
      onError={onError}
    />
  );
}

function CloudflareHlsPlayer({
  videoUrl,
  autoPlay,
  loop,
  muted,
  controls,
  className,
  onError,
}: CloudflareStreamVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);

  const hlsSrc = `${videoUrl}/manifest/video.m3u8`;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // iOS Safari / 모바일 Chrome 자동재생: muted가 DOM property로 설정돼 있어야
    // play()가 허용된다. React의 muted 속성은 property로 안정적으로 반영되지 않으므로
    // 명시적으로 세팅한다. (모바일 히어로 영상 자동재생 안 되던 원인)
    video.muted = !!muted;

    // Safari, Chrome 142+, Edge 142+ — 네이티브 HLS
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = hlsSrc;
      if (autoPlay) video.play().catch(() => {});
      return;
    }

    // Firefox 등 — hls.js 동적 import (번들에 포함되지 않음)
    let hls: any = null;
    import('hls.js').then((mod) => {
      const Hls = mod.default;
      if (!Hls.isSupported()) {
        setFailed(true);
        onError?.();
        return;
      }
      hls = new Hls();
      hls.loadSource(hlsSrc);
      hls.attachMedia(video);
      if (autoPlay) {
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          video.play().catch(() => {});
        });
      }
      hls.on(Hls.Events.ERROR, (_event: any, data: any) => {
        if (data.fatal) {
          setFailed(true);
          onError?.();
        }
      });
    });

    return () => {
      if (hls) hls.destroy();
    };
  }, [hlsSrc, autoPlay, muted, onError]);

  if (failed) return null;

  return (
    <video
      ref={videoRef}
      autoPlay={autoPlay}
      loop={loop}
      muted={muted}
      controls={controls}
      playsInline
      className={className}
    />
  );
}

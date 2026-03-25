'use client';

import { useEffect, useRef, useState } from 'react';

interface CloudflareStreamVideoProps {
  /** Cloudflare Stream base URL (e.g. https://customer-xxx.cloudflarestream.com/{uid}) */
  videoUrl: string;
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
  controls?: boolean;
  className?: string;
  onError?: () => void;
}

/**
 * Cloudflare Stream HLS 비디오 플레이어
 * - Safari, Chrome 142+, Edge 142+: 네이티브 HLS
 * - Firefox: hls.js 동적 로드 (폴백)
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
  const videoRef = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);

  const hlsSrc = `${videoUrl}/manifest/video.m3u8`;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Safari, Chrome 142+, Edge 142+ — 네이티브 HLS
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = hlsSrc;
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
  }, [hlsSrc, onError]);

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

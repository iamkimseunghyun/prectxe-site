/**
 * XHR로 파일 업로드 + 진행률 콜백.
 * Cloudflare direct-upload(image/video) 모두 동일한 multipart POST 형식.
 */
export function uploadFileWithProgress(
  url: string,
  file: File,
  onProgress: (percent: number) => void
): Promise<boolean> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) onProgress((e.loaded / e.total) * 100);
    });
    xhr.addEventListener('load', () =>
      resolve(xhr.status >= 200 && xhr.status < 300)
    );
    xhr.addEventListener('error', () => resolve(false));
    xhr.addEventListener('abort', () => resolve(false));

    const fd = new FormData();
    fd.append('file', file);
    xhr.open('POST', url);
    xhr.send(fd);
  });
}

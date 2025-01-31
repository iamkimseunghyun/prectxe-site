// Constants for file validation
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes
const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/heic',
] as const;

// Custom error types
export class FileAccessError extends Error {
  constructor() {
    super(
      '파일에 접근할 수 없습니다. 파일이 사용 가능한 상태인지 확인해주세요.'
    );
    this.name = 'FileAccessError';
  }
}

export class FileTypeError extends Error {
  constructor() {
    super(
      '지원되지 않는 이미지 형식입니다. JPG, PNG, GIF, WEBP, HEIC만 가능합니다.'
    );
    this.name = 'FileTypeError';
  }
}

export class FileSizeError extends Error {
  constructor() {
    super('파일 크기는 5MB를 초과할 수 없습니다.');
    this.name = 'FileSizeError';
  }
}

/**
 * Validates a file against size and type restrictions
 * @param file - The file to validate
 * @throws FileAccessError if the file is not accessible
 * @throws FileTypeError if the file type is not allowed
 * @throws FileSizeError if the file size exceeds the limit
 */
export const validateFile = async (file: File): Promise<void> => {
  try {
    // Check file accessibility
    await file.slice(0, 1).arrayBuffer();
  } catch (_e) {
    throw new FileAccessError();
  }

  // Validate file type
  if (
    !ALLOWED_FILE_TYPES.includes(
      file.type as (typeof ALLOWED_FILE_TYPES)[number]
    )
  ) {
    throw new FileTypeError();
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    throw new FileSizeError();
  }
};

// Usage example:
/*
try {
  await validateFile(localFile);
  // File is valid, proceed with upload
} catch (error) {
  if (error instanceof FileAccessError ||
      error instanceof FileTypeError ||
      error instanceof FileSizeError) {
    setFileError(error.message);
  } else {
    setFileError('파일 검증 중 알 수 없는 오류가 발생했습니다.');
  }
  return;
}
*/

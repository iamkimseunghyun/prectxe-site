import { ImageResponse } from 'next/og';

export const size = { width: 256, height: 256 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#000',
          position: 'relative',
          display: 'flex',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: 79,
            top: 38,
            width: 46,
            height: 180,
            background: '#fff',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: 123,
            top: 38,
            width: 54,
            height: 108,
            background: '#fff',
            borderTopRightRadius: 54,
            borderBottomRightRadius: 54,
          }}
        />
      </div>
    ),
    size,
  );
}

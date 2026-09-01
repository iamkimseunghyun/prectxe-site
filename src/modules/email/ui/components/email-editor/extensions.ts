import { Color } from '@tiptap/extension-color';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import Underline from '@tiptap/extension-underline';
import Youtube from '@tiptap/extension-youtube';
import StarterKit from '@tiptap/starter-kit';

/**
 * Tiptap extensions configured for email editing
 * Optimized for email client compatibility
 */
export const getEmailEditorExtensions = () => [
  StarterKit.configure({
    heading: {
      levels: [1, 2, 3],
    },
  }),

  // Image with email-friendly attributes
  Image.configure({
    inline: false,
    // base64 금지 — 붙여넣기 한 번에 본문이 수 MB가 되고, 그대로 DB body와
    // 발송 페이로드에 실린다. 이미지는 Cloudflare 업로드 경로를 쓴다.
    allowBase64: false,
    HTMLAttributes: {
      style:
        'max-width: 100%; height: auto; display: block; margin: 16px auto;',
    },
  }).extend({
    addAttributes() {
      return {
        ...this.parent?.(),
        width: {
          default: null,
          parseHTML: (element) => element.getAttribute('width'),
          renderHTML: (attributes) => {
            if (!attributes.width) return {};
            return { width: attributes.width };
          },
        },
        style: {
          default:
            'max-width: 100%; height: auto; display: block; margin: 16px auto;',
          parseHTML: (element) => element.getAttribute('style'),
          renderHTML: (attributes) => {
            if (!attributes.style) return {};
            return { style: attributes.style };
          },
        },
      };
    },
  }),

  // Link with target blank
  Link.configure({
    openOnClick: false,
    HTMLAttributes: {
      style: 'color: #0066cc; text-decoration: underline;',
      target: '_blank',
      rel: 'noopener noreferrer',
    },
  }),

  // YouTube with responsive wrapper
  Youtube.configure({
    inline: false,
    HTMLAttributes: {
      style: 'max-width: 600px; margin: 16px auto;',
    },
    width: 600,
    height: 338,
  }),

  TextStyle,

  Color.configure({
    types: ['textStyle'],
  }),

  TextAlign.configure({
    types: ['heading', 'paragraph'],
    alignments: ['left', 'center', 'right'],
  }),

  Underline,

  Placeholder.configure({
    placeholder: '이메일 내용을 입력하세요...',
  }),
];

/**
 * Convert Tiptap HTML to email-compatible HTML
 * - Add inline styles
 * - Remove unsupported tags
 * - Optimize for Gmail, Outlook, Apple Mail
 */
export function convertToEmailHTML(html: string): string {
  // YouTube iframe을 썸네일 + 링크로 변환 (쿼리 파라미터 제거)
  let emailHtml = html.replace(
    /<iframe[^>]+src="https:\/\/www\.youtube\.com\/embed\/([^"?]+)[^"]*"[^>]*><\/iframe>/g,
    (_match, videoId) => {
      const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
      const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
      return `
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 16px 0;">
          <tr>
            <td align="center">
              <a href="${videoUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; max-width: 600px;">
                <img src="${thumbnailUrl}" alt="YouTube Video" style="max-width: 100%; height: auto; display: block; border: none;" />
              </a>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-top: 8px;">
              <a href="${videoUrl}" target="_blank" rel="noopener noreferrer" style="color: #0066cc; text-decoration: underline; font-size: 14px;">
                YouTube에서 보기
              </a>
            </td>
          </tr>
        </table>
      `.trim();
    }
  );

  // 기본 이메일 스타일 적용.
  //
  // 예전 구현은 `/<p>/g`처럼 **속성이 없는 태그만** 매칭했다. TextAlign 확장이
  // 켜져 있어 정렬한 문단은 `<p style="text-align: center">`로 렌더되는데,
  // 그런 문단은 매칭에서 빠져 margin·line-height가 통째로 누락됐다
  // (가운데 정렬한 문단만 간격이 어긋나는 증상).
  // 이제 기존 style을 보존하면서 앞에 기본 스타일을 붙인다.
  for (const [tag, base] of Object.entries(EMAIL_TAG_STYLES)) {
    emailHtml = emailHtml.replace(
      new RegExp(`<${tag}(\\s[^>]*)?>`, 'g'),
      (_m, attrs: string | undefined) => applyBaseStyle(tag, base, attrs)
    );
  }

  return emailHtml;
}

/** 이메일 클라이언트 기본 여백이 제각각이라 태그별로 명시한다. */
const EMAIL_TAG_STYLES: Record<string, string> = {
  p: 'margin: 0 0 16px 0; line-height: 1.6;',
  h1: 'margin: 24px 0 16px 0; font-size: 28px; font-weight: 600; line-height: 1.3;',
  h2: 'margin: 20px 0 12px 0; font-size: 24px; font-weight: 600; line-height: 1.3;',
  h3: 'margin: 16px 0 12px 0; font-size: 20px; font-weight: 600; line-height: 1.3;',
  ul: 'margin: 0 0 16px 0; padding-left: 24px; line-height: 1.6;',
  ol: 'margin: 0 0 16px 0; padding-left: 24px; line-height: 1.6;',
  li: 'margin-bottom: 8px;',
};

/**
 * 여는 태그에 기본 스타일을 병합한다.
 * 이미 style이 있으면 **기본값을 앞에** 두어 작성자가 지정한 값(정렬·색상)이
 * 뒤에서 이기게 한다.
 */
function applyBaseStyle(
  tag: string,
  base: string,
  attrs: string | undefined
): string {
  if (!attrs) return `<${tag} style="${base}">`;

  const styleMatch = attrs.match(/\sstyle="([^"]*)"/);
  if (!styleMatch) return `<${tag}${attrs} style="${base}">`;

  const merged = `${base} ${styleMatch[1]}`.trim();
  return `<${tag}${attrs.replace(styleMatch[0], ` style="${merged}"`)}>`;
}

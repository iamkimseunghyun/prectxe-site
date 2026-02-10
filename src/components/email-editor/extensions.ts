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
    allowBase64: true,
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
  // YouTube iframe을 썸네일 + 링크로 변환
  let emailHtml = html.replace(
    /<iframe[^>]+src="https:\/\/www\.youtube\.com\/embed\/([^"]+)"[^>]*><\/iframe>/g,
    (match, videoId) => {
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

  // 기본 이메일 스타일 적용
  emailHtml = emailHtml
    .replace(/<p>/g, '<p style="margin: 0 0 16px 0; line-height: 1.6;">')
    .replace(
      /<h1>/g,
      '<h1 style="margin: 24px 0 16px 0; font-size: 28px; font-weight: 600; line-height: 1.3;">'
    )
    .replace(
      /<h2>/g,
      '<h2 style="margin: 20px 0 12px 0; font-size: 24px; font-weight: 600; line-height: 1.3;">'
    )
    .replace(
      /<h3>/g,
      '<h3 style="margin: 16px 0 12px 0; font-size: 20px; font-weight: 600; line-height: 1.3;">'
    )
    .replace(
      /<ul>/g,
      '<ul style="margin: 0 0 16px 0; padding-left: 24px; line-height: 1.6;">'
    )
    .replace(
      /<ol>/g,
      '<ol style="margin: 0 0 16px 0; padding-left: 24px; line-height: 1.6;">'
    )
    .replace(/<li>/g, '<li style="margin-bottom: 8px;">');

  return emailHtml;
}

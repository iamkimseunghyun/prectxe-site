import { Color } from '@tiptap/extension-color';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import Underline from '@tiptap/extension-underline';
import Youtube from '@tiptap/extension-youtube';
import StarterKit from '@tiptap/starter-kit';

export const getRichEditorExtensions = (placeholder?: string) => [
  StarterKit.configure({
    heading: {
      levels: [1, 2, 3],
    },
  }),

  Image.configure({
    inline: false,
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

  Link.configure({
    openOnClick: false,
    HTMLAttributes: {
      target: '_blank',
      rel: 'noopener noreferrer',
    },
  }),

  Youtube.configure({
    inline: false,
    width: 640,
    height: 360,
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
    placeholder: placeholder ?? '내용을 입력하세요...',
  }),
];

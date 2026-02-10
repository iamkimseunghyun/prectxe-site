'use client';

import { EditorContent, useEditor } from '@tiptap/react';
import { type ChangeEvent, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { getCloudflareImageUrl } from '@/lib/cdn/cloudflare';
import validateImageFile, { uploadImage, getImageUrl } from '@/lib/utils';
import { convertToEmailHTML, getEmailEditorExtensions } from './extensions';
import { Toolbar } from './toolbar';
import { ImageControls } from './image-controls';

interface EmailEditorProps {
  content?: string;
  onChange?: (html: string) => void;
  placeholder?: string;
}

export function EmailEditor({
  content = '',
  onChange,
  placeholder = '이메일 내용을 입력하세요...',
}: EmailEditorProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const editor = useEditor({
    extensions: getEmailEditorExtensions(),
    content,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          'prose prose-sm sm:prose max-w-none focus:outline-none min-h-[400px] px-4 py-3',
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange?.(html);
    },
  });

  const handleImageUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editor) return;

    try {
      // Validate image file
      validateImageFile(file);

      setUploading(true);

      // Get Cloudflare upload URL
      const { uploadURL, imageUrl } = await getCloudflareImageUrl();

      // Upload to Cloudflare
      const uploadSuccess = await uploadImage(file, uploadURL);

      if (!uploadSuccess) {
        throw new Error('Failed to upload image');
      }

      // Insert image into editor with proper variant
      const displayUrl = getImageUrl(imageUrl, 'public');
      editor.chain().focus().setImage({ src: displayUrl }).run();

      toast({
        title: '이미지 업로드 성공',
        description: '이미지가 이메일에 추가되었습니다.',
      });
    } catch (error) {
      console.error('Image upload failed:', error);
      toast({
        title: '이미지 업로드 실패',
        description: '이미지 업로드 중 오류가 발생했습니다. 다시 시도해주세요.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  if (!editor) {
    return null;
  }

  return (
    <div className="border rounded-lg overflow-hidden bg-background">
      <Toolbar editor={editor} onImageUpload={handleImageUpload} />
      <ImageControls editor={editor} />
      <div className="relative">
        <EditorContent editor={editor} />
        {uploading && (
          <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
            <div className="text-sm text-muted-foreground">
              이미지 업로드 중...
            </div>
          </div>
        )}
      </div>
      <Input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}

/**
 * Get email-compatible HTML from editor content
 */
export function getEmailHTML(html: string): string {
  return convertToEmailHTML(html);
}

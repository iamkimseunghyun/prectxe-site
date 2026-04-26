'use client';

import { EditorContent, useEditor } from '@tiptap/react';
import { type ChangeEvent, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { getCloudflareImageUrl } from '@/lib/cdn/cloudflare';
import { getImageUrl, uploadImage, validateImageFile } from '@/lib/utils';
import { getRichEditorExtensions } from './extensions';
import { ImageControls } from './image-controls';
import { Toolbar } from './toolbar';

interface RichEditorProps {
  content?: string;
  onChange?: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
}

export function RichEditor({
  content = '',
  onChange,
  placeholder,
  minHeight = '400px',
}: RichEditorProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const editor = useEditor({
    extensions: getRichEditorExtensions(placeholder),
    content,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: `prose prose-neutral dark:prose-invert max-w-none focus:outline-none px-4 py-3`,
        style: `min-height: ${minHeight}`,
      },
    },
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML());
    },
  });

  const handleImageUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editor) return;

    try {
      validateImageFile(file);
      setUploading(true);

      const { uploadURL, imageUrl } = await getCloudflareImageUrl();
      const uploadSuccess = await uploadImage(file, uploadURL);

      if (!uploadSuccess) {
        throw new Error('이미지 업로드에 실패했습니다.');
      }

      const displayUrl = getImageUrl(imageUrl, 'public');
      editor.chain().focus().setImage({ src: displayUrl }).run();

      toast({
        title: '이미지 업로드 성공',
        description: '이미지가 본문에 추가되었습니다.',
      });
    } catch (error) {
      console.error('Image upload failed:', error);
      toast({
        title: '이미지 업로드 실패',
        description:
          error instanceof Error
            ? error.message
            : '이미지 업로드 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
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
      <Toolbar
        editor={editor}
        onImageUpload={handleImageUpload}
        uploading={uploading}
      />
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

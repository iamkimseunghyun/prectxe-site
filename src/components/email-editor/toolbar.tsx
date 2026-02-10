'use client';

import type { Editor } from '@tiptap/react';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Heading1,
  Heading2,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Redo,
  Underline as UnderlineIcon,
  Undo,
  Youtube,
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface ToolbarProps {
  editor: Editor;
  onImageUpload: () => void;
}

export function Toolbar({ editor, onImageUpload }: ToolbarProps) {
  const [linkUrl, setLinkUrl] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [color, setColor] = useState('#000000');

  const setLink = () => {
    if (!linkUrl) {
      editor.chain().focus().unsetLink().run();
      return;
    }

    editor.chain().focus().setLink({ href: linkUrl, target: '_blank' }).run();
    setLinkUrl('');
  };

  const addYoutube = () => {
    if (youtubeUrl) {
      editor.commands.setYoutubeVideo({
        src: youtubeUrl,
        width: 600,
        height: 338,
      });
      setYoutubeUrl('');
    }
  };

  const setTextColor = (newColor: string) => {
    setColor(newColor);
    editor.chain().focus().setColor(newColor).run();
  };

  return (
    <div className="border-b bg-muted/30 p-2">
      <div className="flex flex-wrap gap-1">
        {/* Undo/Redo */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="실행 취소"
        >
          <Undo className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="다시 실행"
        >
          <Redo className="h-4 w-4" />
        </Button>

        <div className="w-px h-8 bg-border mx-1" />

        {/* Headings */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 1 }).run()
          }
          data-active={editor.isActive('heading', { level: 1 })}
          className="data-[active=true]:bg-muted"
          title="제목 1"
        >
          <Heading1 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
          data-active={editor.isActive('heading', { level: 2 })}
          className="data-[active=true]:bg-muted"
          title="제목 2"
        >
          <Heading2 className="h-4 w-4" />
        </Button>

        <div className="w-px h-8 bg-border mx-1" />

        {/* Text Formatting */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBold().run()}
          data-active={editor.isActive('bold')}
          className="data-[active=true]:bg-muted"
          title="굵게"
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          data-active={editor.isActive('italic')}
          className="data-[active=true]:bg-muted"
          title="기울임"
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          data-active={editor.isActive('underline')}
          className="data-[active=true]:bg-muted"
          title="밑줄"
        >
          <UnderlineIcon className="h-4 w-4" />
        </Button>

        {/* Text Color */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" title="텍스트 색상">
              <div
                className="h-4 w-4 rounded border"
                style={{ backgroundColor: color }}
              />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-3">
            <div className="space-y-2">
              <div className="text-sm font-medium">텍스트 색상</div>
              <div className="grid grid-cols-5 gap-2">
                {[
                  '#000000',
                  '#FF0000',
                  '#0000FF',
                  '#00AA00',
                  '#FFA500',
                  '#800080',
                  '#A52A2A',
                  '#808080',
                ].map((c) => (
                  <button
                    key={c}
                    type="button"
                    className="h-8 w-8 rounded border-2 hover:border-primary"
                    style={{ backgroundColor: c }}
                    onClick={() => setTextColor(c)}
                  />
                ))}
              </div>
              <Input
                type="color"
                value={color}
                onChange={(e) => setTextColor(e.target.value)}
              />
            </div>
          </PopoverContent>
        </Popover>

        <div className="w-px h-8 bg-border mx-1" />

        {/* Lists */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          data-active={editor.isActive('bulletList')}
          className="data-[active=true]:bg-muted"
          title="글머리 기호"
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          data-active={editor.isActive('orderedList')}
          className="data-[active=true]:bg-muted"
          title="번호 매기기"
        >
          <ListOrdered className="h-4 w-4" />
        </Button>

        <div className="w-px h-8 bg-border mx-1" />

        {/* Alignment */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          data-active={editor.isActive({ textAlign: 'left' })}
          className="data-[active=true]:bg-muted"
          title="왼쪽 정렬"
        >
          <AlignLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          data-active={editor.isActive({ textAlign: 'center' })}
          className="data-[active=true]:bg-muted"
          title="가운데 정렬"
        >
          <AlignCenter className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          data-active={editor.isActive({ textAlign: 'right' })}
          className="data-[active=true]:bg-muted"
          title="오른쪽 정렬"
        >
          <AlignRight className="h-4 w-4" />
        </Button>

        <div className="w-px h-8 bg-border mx-1" />

        {/* Link */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              data-active={editor.isActive('link')}
              className="data-[active=true]:bg-muted"
              title="링크"
            >
              <LinkIcon className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <div className="space-y-2">
              <div className="text-sm font-medium">링크 추가</div>
              <Input
                placeholder="https://example.com"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setLink();
                  }
                }}
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={setLink}>
                  추가
                </Button>
                {editor.isActive('link') && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => editor.chain().focus().unsetLink().run()}
                  >
                    제거
                  </Button>
                )}
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* YouTube */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" title="YouTube 동영상">
              <Youtube className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <div className="space-y-2">
              <div className="text-sm font-medium">YouTube 동영상 추가</div>
              <Input
                placeholder="https://www.youtube.com/watch?v=..."
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    addYoutube();
                  }
                }}
              />
              <Button size="sm" onClick={addYoutube}>
                추가
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        {/* Image Upload */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onImageUpload}
          title="이미지 업로드"
        >
          <span className="text-xs">📷</span>
        </Button>
      </div>
    </div>
  );
}

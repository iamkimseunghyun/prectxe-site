'use client';

import type { Editor } from '@tiptap/react';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Maximize2,
  Minimize2,
  Trash2,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

interface ImageControlsProps {
  editor: Editor;
}

export function ImageControls({ editor }: ImageControlsProps) {
  const [showControls, setShowControls] = useState(false);

  useEffect(() => {
    const updateControls = () => {
      setShowControls(editor.isActive('image'));
    };

    editor.on('selectionUpdate', updateControls);
    editor.on('transaction', updateControls);

    return () => {
      editor.off('selectionUpdate', updateControls);
      editor.off('transaction', updateControls);
    };
  }, [editor]);

  const setImageWidth = (width: string) => {
    editor.chain().focus().updateAttributes('image', { width }).run();
  };

  const setImageAlign = (align: 'left' | 'center' | 'right') => {
    const style =
      align === 'left'
        ? 'max-width: 100%; height: auto; display: block; margin: 16px 0 16px 0;'
        : align === 'right'
          ? 'max-width: 100%; height: auto; display: block; margin: 16px 0 16px auto;'
          : 'max-width: 100%; height: auto; display: block; margin: 16px auto;';

    editor.chain().focus().updateAttributes('image', { style }).run();
  };

  const deleteImage = () => {
    editor.chain().focus().deleteSelection().run();
  };

  if (!showControls) return null;

  return (
    <div className="border-b bg-muted/30 p-2">
      <div className="flex items-center gap-1">
        <span className="text-xs font-medium text-muted-foreground mr-2">
          이미지 제어:
        </span>

        {/* Size controls */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setImageWidth('33%')}
          title="작게 (33%)"
        >
          <Minimize2 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setImageWidth('50%')}
          title="중간 (50%)"
        >
          <span className="text-xs font-medium">50%</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setImageWidth('75%')}
          title="크게 (75%)"
        >
          <span className="text-xs font-medium">75%</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setImageWidth('100%')}
          title="전체 (100%)"
        >
          <Maximize2 className="h-4 w-4" />
        </Button>

        <div className="h-6 w-px bg-border mx-1" />

        {/* Alignment controls */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setImageAlign('left')}
          title="왼쪽 정렬"
        >
          <AlignLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setImageAlign('center')}
          title="가운데 정렬"
        >
          <AlignCenter className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setImageAlign('right')}
          title="오른쪽 정렬"
        >
          <AlignRight className="h-4 w-4" />
        </Button>

        <div className="h-6 w-px bg-border mx-1" />

        {/* Delete */}
        <Button
          variant="ghost"
          size="sm"
          onClick={deleteImage}
          title="이미지 삭제"
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

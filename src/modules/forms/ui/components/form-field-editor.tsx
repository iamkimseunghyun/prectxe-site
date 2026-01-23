'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Plus, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { FieldType, FormFieldInput } from '@/lib/schemas/form';

interface FormFieldEditorProps {
  field: FormFieldInput;
  index: number;
  onUpdate: (index: number, field: FormFieldInput) => void;
  onRemove: (index: number) => void;
}

const fieldTypeLabels: Record<FieldType, string> = {
  text: '단답형',
  textarea: '장문형',
  select: '선택형 (단일)',
  multiselect: '선택형 (다중)',
  radio: '라디오 버튼',
  checkbox: '체크박스',
  date: '날짜',
  email: '이메일',
  phone: '전화번호',
  url: 'URL',
  file: '파일 업로드',
  number: '숫자',
};

export function FormFieldEditor({
  field,
  index,
  onUpdate,
  onRemove,
}: FormFieldEditorProps) {
  const [options, setOptions] = useState(field.options?.join('\n') || '');

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.id || '' });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const hasOptions = ['select', 'multiselect', 'radio', 'checkbox'].includes(
    field.type
  );

  const updateField = (updates: Partial<FormFieldInput>) => {
    onUpdate(index, { ...field, ...updates });
  };

  const handleOptionsChange = (value: string) => {
    setOptions(value);
    updateField({
      options: value.split('\n').filter((opt) => opt.trim()),
    });
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="rounded-lg border bg-white p-4"
    >
      <div className="mb-4 flex items-start gap-2">
        <div
          {...attributes}
          {...listeners}
          className="mt-2 cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="h-5 w-5 text-neutral-400" />
        </div>
        <div className="flex-1 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor={`type-${index}`}>필드 유형</Label>
              <Select
                value={field.type}
                onValueChange={(value) =>
                  updateField({ type: value as FieldType })
                }
              >
                <SelectTrigger id={`type-${index}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(fieldTypeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor={`label-${index}`}>필드 레이블</Label>
              <Input
                id={`label-${index}`}
                value={field.label}
                onChange={(e) => updateField({ label: e.target.value })}
                placeholder="예: 이름, 이메일, 참가 동기"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor={`placeholder-${index}`}>
                플레이스홀더 (선택)
              </Label>
              <Input
                id={`placeholder-${index}`}
                value={field.placeholder || ''}
                onChange={(e) => updateField({ placeholder: e.target.value })}
                placeholder="예: 홍길동"
              />
            </div>
            <div>
              <Label htmlFor={`helpText-${index}`}>도움말 (선택)</Label>
              <Input
                id={`helpText-${index}`}
                value={field.helpText || ''}
                onChange={(e) => updateField({ helpText: e.target.value })}
                placeholder="예: 실명을 입력해주세요"
              />
            </div>
          </div>

          {hasOptions && (
            <div>
              <Label htmlFor={`options-${index}`}>
                선택지 (한 줄에 하나씩){' '}
                <span className="text-orange-500">*</span>
              </Label>
              <Textarea
                id={`options-${index}`}
                value={options}
                onChange={(e) => handleOptionsChange(e.target.value)}
                placeholder="옵션 1&#10;옵션 2&#10;옵션 3"
                rows={4}
              />
              {hasOptions && (!field.options || field.options.length === 0) && (
                <p className="mt-1 text-sm text-orange-600">
                  게시하려면 최소 1개의 선택지가 필요합니다
                </p>
              )}
            </div>
          )}

          <div className="flex items-center space-x-2">
            <Checkbox
              id={`required-${index}`}
              checked={field.required}
              onCheckedChange={(checked) =>
                updateField({ required: checked === true })
              }
            />
            <Label
              htmlFor={`required-${index}`}
              className="font-normal leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              필수 입력 항목
            </Label>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => onRemove(index)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

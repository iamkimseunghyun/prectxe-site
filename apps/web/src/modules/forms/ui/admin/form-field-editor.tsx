'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, X } from 'lucide-react';
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
  /** 이 필드에 달린 기존 응답 수. 편집 화면에서만 0보다 클 수 있다. */
  responseCount?: number;
  /** 저장돼 있던 라벨·유형. 변경 여부 판단에 쓴다. 신규 필드는 undefined. */
  original?: { label: string; type: FieldType };
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
  file: '이미지 업로드',
  number: '숫자',
};

export function FormFieldEditor({
  field,
  index,
  onUpdate,
  onRemove,
  responseCount = 0,
  original,
}: FormFieldEditorProps) {
  const [options, setOptions] = useState(field.options?.join('\n') || '');

  // 응답 표는 컬럼을 **현재** 필드 라벨로 묶는다(FormResponse에 제출 시점
  // 라벨 스냅샷이 있지만 fieldId가 살아 있으면 그쪽을 쓰지 않는다).
  // 그래서 라벨을 바꾸면 과거 응답이 새 라벨 아래로 소급 이동한다.
  // 오타 수정이면 그게 맞는 동작이고, 필드를 다른 질문으로 재활용하는
  // 경우에만 문제다 — 구분할 방법이 없으니 사실만 알리고 판단은 맡긴다.
  const changed: string[] = [];
  if (original && original.label !== field.label) changed.push('레이블');
  if (original && original.type !== field.type) changed.push('유형');
  const willReclassify = responseCount > 0 && changed.length > 0;

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
        {/* 핸들에 접근명이 없어 스크린리더에 '버튼'으로만 읽혔다.
            div에 aria-label을 달면 정적 분석이 role·tabIndex를 스프레드
            안에서 못 봐서 걸리고, 그렇다고 다시 적으면 중복 prop이 된다.
            dnd-kit이 문서에서 권하는 대로 button을 쓰면 둘 다 없이 끝난다
            (type="button"으로 폼 제출 방지, 기본 스타일은 preflight가 제거). */}
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`${field.label || `${index + 1}번째 필드`} 순서 이동`}
          className="mt-2 cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="h-5 w-5 text-neutral-400" />
        </button>
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

          {responseCount > 0 &&
            (willReclassify ? (
              <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                <p>
                  이 필드에는 기존 응답 <strong>{responseCount}건</strong>이
                  있습니다. {changed.join('·')}을(를) 바꾸면 과거 응답도 새
                  기준으로 표시됩니다.
                </p>
                <p className="mt-1">
                  오타·표현 수정이라면 그대로 두셔도 됩니다. 다른 질문으로
                  바꾸는 거라면{' '}
                  <strong>이 필드를 삭제하고 새 필드를 추가</strong>
                  하세요 — 그래야 과거 응답이 원래 질문 아래 남습니다.
                </p>
              </div>
            ) : (
              <p className="text-sm text-neutral-500">
                기존 응답 {responseCount}건이 연결돼 있습니다.
              </p>
            ))}

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
              {/* 한 줄 Input이면 줄바꿈을 입력할 수 없다. 개인정보 수집·이용
                  동의처럼 항목별로 줄을 나눠야 읽히는 안내가 실제로 있다. */}
              <Textarea
                id={`helpText-${index}`}
                value={field.helpText || ''}
                onChange={(e) => updateField({ helpText: e.target.value })}
                placeholder={
                  '예: 실명을 입력해주세요\n(줄바꿈은 그대로 표시됩니다)'
                }
                rows={2}
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
          aria-label={`${field.label || `${index + 1}번째 필드`} 삭제`}
          onClick={() => onRemove(index)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

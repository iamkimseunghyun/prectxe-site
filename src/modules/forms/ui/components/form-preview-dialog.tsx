'use client';

import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { getImageUrl } from '@/lib/utils';

interface PreviewField {
  id: string;
  type: string;
  label: string;
  placeholder: string | null;
  helpText: string | null;
  required: boolean;
  options: string[];
  order: number;
}

interface FormPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: {
    title: string;
    description: string | null;
    body: string | null;
    coverImage: string | null;
    fields: PreviewField[];
  };
}

export function FormPreviewDialog({
  open,
  onOpenChange,
  form,
}: FormPreviewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>폼 미리보기</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {form.coverImage && (
            <div className="relative h-64 w-full overflow-hidden rounded-lg">
              <Image
                src={getImageUrl(form.coverImage, 'public')}
                alt={form.title}
                fill
                className="object-cover"
              />
            </div>
          )}

          <div>
            <h2 className="mb-2 text-2xl font-bold">{form.title}</h2>
            {form.description && (
              <p className="text-neutral-600">{form.description}</p>
            )}
          </div>

          {form.body && (
            <div className="rounded-lg bg-neutral-50 p-6">
              <p className="whitespace-pre-wrap text-sm text-neutral-700">
                {form.body}
              </p>
            </div>
          )}

          <div className="space-y-4">
            {form.fields.map((field) => (
              <div key={field.id} className="space-y-2">
                <Label>
                  {field.label}
                  {field.required && (
                    <span className="ml-1 text-red-500">*</span>
                  )}
                </Label>
                {field.helpText && (
                  <p className="text-sm text-neutral-500">{field.helpText}</p>
                )}

                {field.type === 'textarea' ? (
                  <Textarea
                    placeholder={field.placeholder || ''}
                    disabled
                    className="resize-none"
                  />
                ) : field.type === 'select' ? (
                  <Select disabled>
                    <SelectTrigger>
                      <SelectValue
                        placeholder={field.placeholder || '선택하세요'}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {field.options.map((option, idx) => (
                        <SelectItem key={idx} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : field.type === 'multiselect' ? (
                  <div className="space-y-2">
                    {field.options.map((option, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input type="checkbox" disabled className="h-4 w-4" />
                        <span className="text-sm">{option}</span>
                      </div>
                    ))}
                  </div>
                ) : field.type === 'radio' ? (
                  <div className="space-y-2">
                    {field.options.map((option, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input type="radio" disabled className="h-4 w-4" />
                        <span className="text-sm">{option}</span>
                      </div>
                    ))}
                  </div>
                ) : field.type === 'checkbox' ? (
                  <div className="space-y-2">
                    {field.options.map((option, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input type="checkbox" disabled className="h-4 w-4" />
                        <span className="text-sm">{option}</span>
                      </div>
                    ))}
                  </div>
                ) : field.type === 'file' ? (
                  <Input type="file" disabled />
                ) : (
                  <Input
                    type={field.type}
                    placeholder={field.placeholder || ''}
                    disabled
                  />
                )}
              </div>
            ))}
          </div>

          {form.fields.length === 0 && (
            <p className="text-center text-sm text-neutral-400">
              아직 필드가 추가되지 않았습니다
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import type { FormFieldInput } from '@/lib/schemas/form';
import { createFormResponseSchema } from '@/lib/schemas/form';

interface FormRendererProps {
  formId: string;
  fields: FormFieldInput[];
  onSubmit: (
    formId: string,
    data: Record<string, string | string[]>
  ) => Promise<{ success: boolean; error?: string }>;
}

export function FormRenderer({ formId, fields, onSubmit }: FormRendererProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const schema = createFormResponseSchema(fields);

  // Generate default values for all fields
  const defaultValues = fields.reduce(
    (acc, field) => {
      if (field.type === 'checkbox' || field.type === 'multiselect') {
        acc[field.id!] = [];
      } else {
        acc[field.id!] = '';
      }
      return acc;
    },
    {} as Record<string, string | string[]>
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    control,
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues,
  });

  const handleFormSubmit = async (data: Record<string, string | string[]>) => {
    setIsSubmitting(true);
    try {
      const result = await onSubmit(formId, data);
      if (result.success) {
        setIsSubmitted(true);
        toast({
          title: '제출 완료',
          description: '응답이 성공적으로 제출되었습니다',
        });
      } else {
        toast({
          title: '제출 실패',
          description: result.error || '알 수 없는 오류가 발생했습니다',
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: '제출 실패',
        description: '제출 중 오류가 발생했습니다',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleValidationError = () => {
    toast({
      title: '입력 오류',
      description: '필수 항목을 모두 입력해주세요',
      variant: 'destructive',
    });
  };

  if (isSubmitted) {
    return (
      <div className="rounded-lg border bg-white p-12 text-center">
        <h2 className="mb-2 text-2xl font-semibold">제출 완료</h2>
        <p className="text-neutral-600">응답이 성공적으로 제출되었습니다</p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(handleFormSubmit, handleValidationError)}
      className="space-y-6 rounded-lg border bg-white p-6"
    >
      {fields.map((field) => {
        const error = errors[field.id!];

        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id}>
              {field.label}
              {field.required && <span className="text-red-500">*</span>}
            </Label>
            {field.helpText && (
              <p className="text-sm text-neutral-500">{field.helpText}</p>
            )}

            {/* Text Input */}
            {field.type === 'text' && (
              <Input
                id={field.id}
                {...register(field.id!)}
                placeholder={field.placeholder}
              />
            )}

            {/* Textarea */}
            {field.type === 'textarea' && (
              <Textarea
                id={field.id}
                {...register(field.id!)}
                placeholder={field.placeholder}
                rows={4}
              />
            )}

            {/* Email */}
            {field.type === 'email' && (
              <Input
                id={field.id}
                type="email"
                {...register(field.id!)}
                placeholder={field.placeholder}
              />
            )}

            {/* Phone */}
            {field.type === 'phone' && (
              <Input
                id={field.id}
                type="tel"
                {...register(field.id!)}
                placeholder={field.placeholder || '010-1234-5678'}
              />
            )}

            {/* Number */}
            {field.type === 'number' && (
              <Input
                id={field.id}
                type="number"
                {...register(field.id!)}
                placeholder={field.placeholder}
              />
            )}

            {/* Date */}
            {field.type === 'date' && (
              <Input id={field.id} type="date" {...register(field.id!)} />
            )}

            {/* Select */}
            {field.type === 'select' && (
              <Controller
                name={field.id!}
                control={control}
                render={({ field: formField }) => (
                  <Select
                    value={formField.value as string}
                    onValueChange={formField.onChange}
                  >
                    <SelectTrigger id={field.id}>
                      <SelectValue
                        placeholder={field.placeholder || '선택해주세요'}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {field.options.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            )}

            {/* Radio */}
            {field.type === 'radio' && (
              <Controller
                name={field.id!}
                control={control}
                render={({ field: formField }) => (
                  <RadioGroup
                    value={formField.value as string}
                    onValueChange={formField.onChange}
                  >
                    {field.options.map((option) => (
                      <div key={option} className="flex items-center space-x-2">
                        <RadioGroupItem
                          value={option}
                          id={`${field.id}-${option}`}
                        />
                        <Label
                          htmlFor={`${field.id}-${option}`}
                          className="font-normal"
                        >
                          {option}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                )}
              />
            )}

            {/* Checkbox / Multiselect */}
            {(field.type === 'checkbox' || field.type === 'multiselect') && (
              <div className="space-y-2">
                {field.options.map((option) => {
                  const currentValue = watch(field.id!) || [];
                  const isChecked = currentValue.includes(option);

                  return (
                    <div key={option} className="flex items-center space-x-2">
                      <Checkbox
                        id={`${field.id}-${option}`}
                        checked={isChecked}
                        onCheckedChange={(checked: boolean) => {
                          const current = (watch(field.id!) as string[]) || [];
                          const updated = checked
                            ? [...current, option]
                            : current.filter((v: string) => v !== option);
                          setValue(field.id!, updated);
                        }}
                      />
                      <Label
                        htmlFor={`${field.id}-${option}`}
                        className="font-normal"
                      >
                        {option}
                      </Label>
                    </div>
                  );
                })}
              </div>
            )}

            {error && (
              <p className="text-sm text-red-600">{error.message as string}</p>
            )}
          </div>
        );
      })}

      <div className="pt-4">
        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? '제출 중...' : '제출하기'}
        </Button>
      </div>
    </form>
  );
}

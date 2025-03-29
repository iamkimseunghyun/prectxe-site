'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';

import { Plus } from 'lucide-react';
import { createSimpleArtist } from '@/app/(page)/artists/actions';
import { toast } from '@/hooks/use-toast';
import { SimpleArtist, simpleArtistSchema } from '@/lib/schemas';

interface CreateArtistModalProps {
  onSuccess: (artist: { id: string; name: string }) => void;
  userId: string;
}

export function CreateArtistModal({
  onSuccess,
  userId,
}: CreateArtistModalProps) {
  const [open, setOpen] = useState(false);
  const form = useForm<SimpleArtist>({
    resolver: zodResolver(simpleArtistSchema),
    defaultValues: {
      name: '',
      email: '',
      mainImageUrl: '',
      city: '',
      country: '',
    },
  });

  async function onSubmit(data: SimpleArtist) {
    const result = await createSimpleArtist(data, userId);

    if (result.error) {
      toast({
        title: 'Error',
        description: result.error,
      });
      return;
    }

    if (result.data) {
      toast({
        title: 'Success',
        description: `아티스트 ${result.data.name}가 생성되었습니다.`,
      });
      onSuccess(result.data);
      setOpen(false);
      form.reset();
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="mr-2 h-4 w-4" />새 아티스트
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>새 아티스트 추가</DialogTitle>
          <DialogDescription>
            새로운 아티스트를 추가합니다. 나중에 추가 정보를 입력할 수 있습니다.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* 이름 (필수) */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>영문 이름 *</FormLabel>
                  <FormControl>
                    <Input placeholder="아티스트 영문 이름" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 이름 (필수) */}
            <FormField
              control={form.control}
              name="nameKr"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>한글 이름 *</FormLabel>
                  <FormControl>
                    <Input placeholder="아티스트 한글 이름" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 이메일 (선택) */}
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>이메일</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="artist@example.com"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 프로필 이미지 URL (선택) */}
            <FormField
              control={form.control}
              name="mainImageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>프로필 이미지 URL</FormLabel>
                  <FormControl>
                    <Input placeholder="https://..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 도시 & 국가 (선택) */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>도시</FormLabel>
                    <FormControl>
                      <Input placeholder="예: Seoul" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>국가</FormLabel>
                    <FormControl>
                      <Input placeholder="예: South Korea" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                취소
              </Button>
              <Button type="submit">추가하기</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

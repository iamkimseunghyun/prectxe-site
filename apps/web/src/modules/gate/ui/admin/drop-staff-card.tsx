'use client';

import { Loader2, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type KeyboardEvent, useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { addDropStaff, removeDropStaff } from '@/modules/gate/server/actions';

export type DropStaffMember = {
  id: string;
  email: string;
  name: string | null;
};

// 드랍 편집 폼(<form>) 안에 들어가므로 자체 <form>을 두지 않는다. 버튼은
// type="button", Enter는 직접 가로채야 바깥 드랍 폼이 제출되지 않는다.
export function DropStaffCard({
  dropId,
  staff,
}: {
  dropId: string;
  staff: DropStaffMember[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [pending, startTransition] = useTransition();

  const add = () => {
    if (!email.trim() || pending) return;
    startTransition(async () => {
      const result = await addDropStaff(dropId, {
        email,
        name: name || undefined,
      });
      if (!result.success) {
        toast({ title: result.error, variant: 'destructive' });
        return;
      }
      setEmail('');
      setName('');
      router.refresh();
    });
  };

  const remove = (member: DropStaffMember) => {
    startTransition(async () => {
      const result = await removeDropStaff(dropId, member.id);
      if (!result.success) {
        toast({ title: result.error, variant: 'destructive' });
        return;
      }
      router.refresh();
    });
  };

  const onEnter = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter' || e.nativeEvent.isComposing) return;
    e.preventDefault();
    add();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>게이트 스태프</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          여기 등록한 이메일로 게이트 앱에 로그인해 이 행사의 입장을 처리할 수
          있습니다.
        </p>

        {staff.length > 0 && (
          <ul className="space-y-1">
            {staff.map((member) => (
              <li
                key={member.id}
                className="flex items-center justify-between gap-2 text-sm"
              >
                <span className="min-w-0 truncate">
                  {member.name ? `${member.name} · ` : ''}
                  {member.email}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  onClick={() => remove(member)}
                  disabled={pending}
                  aria-label={`${member.email} 배정 해제`}
                >
                  <X className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}

        <div className="space-y-2">
          <Label htmlFor="staff-email">이메일</Label>
          <Input
            id="staff-email"
            // type="email"이면 덜 쓴 주소가 남았을 때 바깥 드랍 폼의 브라우저
            // 검증에 걸려 드랍 저장이 막힌다 — 형식 검증은 서버 액션이 한다
            type="text"
            inputMode="email"
            autoComplete="off"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={onEnter}
            placeholder="staff@example.com"
            disabled={pending}
          />
          <Label htmlFor="staff-name">이름 (선택)</Label>
          <Input
            id="staff-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={onEnter}
            disabled={pending}
          />
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={add}
            disabled={pending || !email.trim()}
          >
            {pending && (
              <Loader2 className="mr-2 h-4 w-4 motion-safe:animate-spin" />
            )}
            스태프 추가
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

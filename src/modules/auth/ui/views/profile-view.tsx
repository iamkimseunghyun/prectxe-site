'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { signOut } from '@/modules/auth/server/actions';
import { useSession } from '@/hooks/use-session';

export const ProfileView = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useSession();

  const logoutMutation = useMutation({
    mutationFn: signOut,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['session'] });
      router.push('/');
      // toast 알림 등 추가 가능
    },
    onError: (error) => {
      console.error('Logout failed:', error);
      // 에러 처리
    },
  });

  return (
    <div className="container mx-auto flex min-h-screen flex-col items-center justify-center">
      <div className="absolute right-8 top-20 flex flex-col items-center justify-center gap-3">
        <h1>{user?.username || 'User'} Profile</h1> {/* 사용자 이름 표시 */}
        {/* form 제거, button onClick 사용 */}
        <Button
          onClick={() => logoutMutation.mutate()}
          disabled={logoutMutation.isPending}
        >
          {logoutMutation.isPending ? '로그아웃 중...' : '로그아웃'}
        </Button>
      </div>
      {/* 프로필 관련 다른 내용들 */}
    </div>
  );
};

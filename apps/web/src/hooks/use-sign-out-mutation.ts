import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { signOut } from '@/modules/auth/server/actions';

export function useSignOutMutation() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { toast } = useToast();

  return useMutation({
    mutationFn: signOut,
    onSuccess: async (data) => {
      if (data?.success) {
        // 세션 쿼리 무효화 useSession 훅이 최신 상태 반영하도록
        await queryClient.invalidateQueries({ queryKey: ['session'] });
        // 필요 시 다른 관련 쿼리도 무효화
        // await queryClient.resetQueries(); // 모든 쿼리 리셋 주의해서 사용!

        router.push('/');
        toast({ title: '로그아웃 되었습니다.' });
      } else {
        console.error('Logout failed:');
        toast({
          title: '로그아웃 실패',
          description: '다시 시도해주세요.',
          variant: 'destructive',
        });
      }
    },
    onError: (error) => {
      console.error('Logout mutation error:', error);
      toast({
        title: '로그아웃 오류',
        description: '서버 통신 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    },
  });
}

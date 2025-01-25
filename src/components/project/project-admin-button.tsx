'use client';

import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { deleteProject } from '@/app/projects/actions/actions';
import { useToast } from '@/hooks/use-toast';

interface ProjectAdminButtonProps {
  projectId: string;
}
const ProjectAdminButton = ({ projectId }: ProjectAdminButtonProps) => {
  const router = useRouter();
  const { toast } = useToast();

  const handleEdit = () => {
    router.push(`/projects/${projectId}/edit`);
  };

  const handleDelete = async () => {
    try {
      await deleteProject(projectId);
      toast({
        title: '프로젝트가 삭제되었습니다.',
        description: '프로젝트 목록 페이지로 이동합니다.',
      });
      router.push('/projects');
      router.refresh();
    } catch (error) {
      console.error('Failed to delete project:', error);
      toast({
        title: '프로젝트 삭제 실패',
        description: '프로젝트 삭제 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="flex gap-2">
      <Button onClick={handleEdit} variant="outline">
        수정
      </Button>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="destructive">삭제</Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>프로젝트 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              정말로 이 프로젝트를 삭제하시겠습니까? 이 작업은 되돌릴 수
              없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>삭제</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
export default ProjectAdminButton;

'use client';

import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { deleteArtist } from '@/app/artists/actions';
import { deleteProject } from '@/app/projects/actions';
import { deleteVenue } from '@/app/venues/actions';
import { Button } from '@/components/ui/button';
import { deleteEvent } from '@/app/events/actions';
import { deleteArtwork } from '@/app/artworks/actions';

const AdminButton = ({
  id,
  entityType,
}: {
  id: string;
  entityType: 'artwork' | 'artist' | 'project' | 'venue' | 'event';
}) => {
  const router = useRouter();
  const { toast } = useToast();

  const deleteActions = {
    artwork: deleteArtwork,
    artist: deleteArtist,
    project: deleteProject,
    venue: deleteVenue,
    event: deleteEvent,
  };

  const handleEdit = () => {
    router.push(`/${entityType}s/${id}/edit`);
  };

  const handleDelete = async () => {
    try {
      const result = await deleteActions[entityType](id);

      if (result.success) {
        toast({
          title: `${entityType} 페이지가 성공적으로 삭제 되었습니다.`,
          description: `${entityType} 페이지가 삭제 되었습니다.`,
        });
        router.push('/');
        router.refresh();
      }
    } catch (error) {
      console.error(`${entityType} 페이지 삭제에 실패했습니다. : `, error);
      toast({
        title: `${entityType} 페이지 삭제 중 문제 발생`,
        description: `${entityType} 페이지를 삭제하는데 문제가 발생했습니다.`,
      });
    }
  };
  return (
    <div className="flex gap-x-2">
      <Button onClick={handleEdit} variant="outline">
        수정
      </Button>
      <Button onClick={handleDelete} variant="destructive">
        삭제
      </Button>
    </div>
  );
};

export default AdminButton;

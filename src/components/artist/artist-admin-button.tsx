'use client';

import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { deleteArtist } from '@/app/artists/actions';

const ArtistAdminButton = ({ artistId }: { artistId: string }) => {
  const router = useRouter();
  const { toast } = useToast();
  const handleEdit = () => {
    router.push(`/artists/${artistId}/edit`);
  };
  const handleDelete = async () => {
    try {
      await deleteArtist(artistId);
      toast({
        title: 'Artist deleted successfully',
        description: 'Artist deleted successfully',
      });
      router.push('/artists');
      router.refresh();
    } catch (error) {
      console.error('Failed to delete artist:', error);
      toast({
        title: 'Error while deleting artist',
        description: 'Error while deleting artist',
      });
    }
  };
  return (
    <div className="flex gap-x-2">
      <Button onClick={handleEdit}>수정</Button>
      <Button variant="destructive" onClick={handleDelete}>
        삭제
      </Button>
    </div>
  );
};

export default ArtistAdminButton;

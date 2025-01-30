'use client';

import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { deleteArtwork } from '@/app/artists/actions';

const ArtworkAdminButton = ({ artworkId }: { artworkId: string }) => {
  const router = useRouter();
  const { toast } = useToast();
  const handleEdit = () => {
    router.push(`/artworks/${artworkId}/edit`);
  };
  const handleDelete = async () => {
    try {
      await deleteArtwork(artworkId);
      toast({
        title: 'Artwork deleted successfully',
        description: 'Artwork deleted successfully',
      });
      router.push('/artworks');
      router.refresh();
    } catch (error) {
      console.error('Failed to delete artwork:', error);
      toast({
        title: 'Error while deleting artwork',
        description: 'Error while deleting artwork',
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

export default ArtworkAdminButton;

'use client';

import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { deleteVenue } from '@/app/venues/actions';
import { useToast } from '@/hooks/use-toast';

const VenueAdminButton = ({ venueId }: { venueId: string }) => {
  const router = useRouter();
  const { toast } = useToast();
  const handleEdit = () => {
    router.push(`/venues/${venueId}/edit`);
  };
  const handleDelete = async () => {
    try {
      await deleteVenue(venueId);
      toast({
        title: 'Venue deleted successfully',
        description: 'Venue deleted successfully',
      });
      router.push('/venues');
      router.refresh();
    } catch (error) {
      console.error('Failed to delete venue:', error);
      toast({
        title: 'Error while deleting venue',
        description: 'Error while deleting venue',
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

export default VenueAdminButton;

import { EventForm } from '@/components/page/event/event-form';
import { handleEventSubmit } from '@/app/events/actions';
import { FullEvent } from '@/lib/types';

interface EventFormWrapperProps {
  initialData?: FullEvent;
  venues: {
    id: string;
    name: string;
  }[];
  artists: {
    id: string;
    name: string;
  }[];
  mode: 'create' | 'edit';
}

export function EventFormWrapper({
  initialData,
  venues,
  artists,
  mode,
}: EventFormWrapperProps) {
  return (
    <EventForm
      initialData={initialData}
      venues={venues}
      artists={artists}
      onSubmit={async (data) => {
        'use server';
        return handleEventSubmit(data, mode, initialData?.id);
      }}
    />
  );
}

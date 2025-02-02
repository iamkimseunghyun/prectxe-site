import {
  type Event as PrismaEvent,
  type Venue,
  type EventTicket,
  type Artist,
  type EventOrganizer,
} from '@prisma/client';

export type FullEvent = PrismaEvent & {
  venue: Venue;
  organizers: (EventOrganizer & {
    artist: Artist;
  })[];
  tickets: EventTicket[];
};

export type ProjectCategory =
  | 'exhibition'
  | 'performance'
  | 'festival'
  | 'workshop';

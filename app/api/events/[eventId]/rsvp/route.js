import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Event from '@/models/Event';
import { getCurrentUser } from '@/lib/auth';
import { awardXP } from '@/lib/gamification';
import { validateObjectId } from '@/utils/validators';
import { sanitizeMongoInput } from '@/lib/sanitize';

// POST /api/events/[eventId]/rsvp - Toggle RSVP
export async function POST(request, { params }) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { eventId } = sanitizeMongoInput(await params);
    if (!validateObjectId(eventId)) {
      return NextResponse.json({ message: 'Invalid Event ID' }, { status: 400 });
    }

    await connectDB();

    const event = await Event.findById(eventId);
    if (!event) {
      return NextResponse.json({ message: 'Event not found' }, { status: 404 });
    }

    if (!event.isActive) {
      return NextResponse.json({ message: 'Event no longer active' }, { status: 400 });
    }

    if (new Date(event.eventDate) < new Date()) {
      return NextResponse.json({ message: 'Event has already ended' }, { status: 400 });
    }

    const alreadyRsvped = event.rsvps.some(id => id.toString() === currentUser._id.toString());

    if (alreadyRsvped) {
      // CANCEL RSVP
      const updatedEvent = await Event.findByIdAndUpdate(
        eventId,
        { $pull: { rsvps: currentUser._id } },
        { new: true }
      );
      return NextResponse.json({ 
        rsvped: false, 
        rsvpCount: updatedEvent.rsvps.length 
      });
    } else {
      // RSVP
      if (event.capacity > 0 && event.rsvps.length >= event.capacity) {
        return NextResponse.json({ message: `Event is full (capacity: ${event.capacity})` }, { status: 400 });
      }

      const updatedEvent = await Event.findByIdAndUpdate(
        eventId,
        { $push: { rsvps: currentUser._id } },
        { new: true }
      );

      // Award XP for RSVP (background)
      awardXP(currentUser._id, 'event_rsvp').catch(err => console.error('XP award error:', err));

      return NextResponse.json({ 
        rsvped: true, 
        rsvpCount: updatedEvent.rsvps.length 
      });
    }
  } catch (error) {
    console.error('RSVP toggle error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

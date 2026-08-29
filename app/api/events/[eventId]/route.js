import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Event from '@/models/Event';
import { getCurrentUser } from '@/lib/auth';
import { validateObjectId } from '@/utils/validators';
import { createNotification } from '@/lib/notifications';
import { sanitizeText, sanitizeMongoInput } from '@/lib/sanitize';

// GET /api/events/[eventId] - Get event details
export async function GET(request, { params }) {
  try {
    const { eventId } = sanitizeMongoInput(await params);
    if (!validateObjectId(eventId)) {
      return NextResponse.json({ message: 'Invalid Event ID' }, { status: 400 });
    }

    await connectDB();

    const event = await Event.findOne({ _id: eventId, isActive: true })
      .populate('organizer', 'name username avatar college')
      .lean();

    if (!event) {
      return NextResponse.json({ message: 'Event not found' }, { status: 404 });
    }

    // Include counts and status but hide full rsvps list
    const rsvpCount = event.rsvps?.length || 0;
    const isFull = event.capacity > 0 && rsvpCount >= event.capacity;
    const isPast = new Date(event.eventDate) < new Date();

    const { rsvps, ...eventData } = event;

    const response = NextResponse.json({
      ...eventData,
      rsvpCount,
      isFull,
      isPast
    });
    response.headers.set("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");
    return response;
  } catch (error) {
    console.error('Fetch event detail error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

// PATCH /api/events/[eventId] - Update event
export async function PATCH(request, { params }) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { eventId } = sanitizeMongoInput(await params);
    if (!validateObjectId(eventId)) {
      return NextResponse.json({ message: 'Invalid Event ID' }, { status: 400 });
    }

    let body;
    try {
      body = await request.json();
    } catch (e) {
      return NextResponse.json({ message: 'Invalid request body' }, { status: 400 });
    }

    await connectDB();

    const event = await Event.findById(eventId);
    if (!event) {
      return NextResponse.json({ message: 'Event not found' }, { status: 404 });
    }

    if (event.organizer.toString() !== currentUser._id.toString()) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const { title, description, location, eventDate, capacity, tags } = body;
    const updates = {};

    if (title !== undefined) {
      if (title.trim().length === 0) return NextResponse.json({ message: 'Title cannot be empty' }, { status: 400 });
      updates.title = sanitizeText(title).substring(0, 100);
    }

    if (description !== undefined) {
      updates.description = sanitizeText(description).substring(0, 1000);
    }

    if (location !== undefined) {
      if (location.trim().length === 0) return NextResponse.json({ message: 'Location cannot be empty' }, { status: 400 });
      updates.location = sanitizeText(location).substring(0, 200);
    }

    if (eventDate !== undefined) {
      const date = new Date(eventDate);
      if (isNaN(date.getTime())) return NextResponse.json({ message: 'Invalid date' }, { status: 400 });
      if (date < new Date()) return NextResponse.json({ message: 'Event date must be in the future' }, { status: 400 });
      updates.eventDate = date;
    }

    if (capacity !== undefined) {
      const newCapacity = parseInt(capacity) || 0;
      if (newCapacity < 0) return NextResponse.json({ message: 'Capacity cannot be negative' }, { status: 400 });
      if (newCapacity > 0 && newCapacity < event.rsvps.length) {
        return NextResponse.json({ message: `Cannot reduce capacity below current RSVP count (${event.rsvps.length})` }, { status: 400 });
      }
      updates.capacity = newCapacity;
    }

    if (tags !== undefined && Array.isArray(tags)) {
      updates.tags = tags
        .map(t => sanitizeString(t))
        .filter(t => t.length > 0 && t.length <= 30)
        .slice(0, 5);
    }

    const updatedEvent = await Event.findByIdAndUpdate(
      eventId,
      { $set: updates },
      { new: true }
    ).populate('organizer', 'name username avatar');

    return NextResponse.json(updatedEvent);
  } catch (error) {
    console.error('Update event error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE /api/events/[eventId] - Delete event (soft delete)
export async function DELETE(request, { params }) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { eventId } = await params;
    if (!validateObjectId(eventId)) {
      return NextResponse.json({ message: 'Invalid Event ID' }, { status: 400 });
    }

    await connectDB();

    const event = await Event.findById(eventId);
    if (!event) {
      return NextResponse.json({ message: 'Event not found' }, { status: 404 });
    }

    if (event.organizer.toString() !== currentUser._id.toString()) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    // Soft delete
    event.isActive = false;
    await event.save();

    // Send notifications to all RSVPs
    if (event.rsvps?.length > 0) {
      const notificationPromises = event.rsvps.map(recipientId => 
        createNotification({
          recipient: recipientId,
          sender: currentUser._id,
          type: 'event_cancelled',
          event: event._id
        })
      );
      await Promise.all(notificationPromises).catch(err => console.error('Failed to send event cancellation notifications:', err));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete event error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

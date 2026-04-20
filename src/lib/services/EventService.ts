import { SupabaseClient } from '@supabase/supabase-js';
import { Event, TicketType, EventStatus } from '@/types';

export class EventService {
  constructor(private supabase: SupabaseClient) {}

  async getEvents(status?: EventStatus) {
    let query = this.supabase
      .from('events')
      .select('*, category:categories(*), ticket_types(*)');
    
    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as Event[];
  }

  async getEventById(id: string) {
    const { data, error } = await this.supabase
      .from('events')
      .select('*, category:categories(*), ticket_types(*), organizer:profiles(*)')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as Event;
  }

  async createEvent(eventData: Partial<Event>, ticketTypes: Partial<TicketType>[]) {
    const { data: event, error: eventError } = await this.supabase
      .from('events')
      .insert(eventData)
      .select()
      .single();

    if (eventError) throw eventError;

    const ticketTypesWithEventId = ticketTypes.map(tt => ({
      ...tt,
      event_id: event.id
    }));

    const { error: ttError } = await this.supabase
      .from('ticket_types')
      .insert(ticketTypesWithEventId);

    if (ttError) throw ttError;

    return event as Event;
  }

  async updateEvent(id: string, eventData: Partial<Event>) {
    const { data, error } = await this.supabase
      .from('events')
      .update(eventData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Event;
  }

  async deleteEvent(id: string) {
    const { error } = await this.supabase
      .from('events')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  }
}


import type { EventItem } from '../models/event.model';

export interface EventDayGroup {
  key: string;
  date: Date;
  events: EventItem[];
}

export function groupEventsByDay(events: readonly EventItem[]): EventDayGroup[] {
  const sortedEvents = [...events].sort(
    (first, second) => new Date(first.startsAt).getTime() - new Date(second.startsAt).getTime(),
  );
  const groups = new Map<string, EventDayGroup>();

  for (const event of sortedEvents) {
    const date = new Date(event.startsAt);
    const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    const group = groups.get(key);
    if (group) {
      group.events.push(event);
    } else {
      groups.set(key, { key, date, events: [event] });
    }
  }

  return [...groups.values()];
}

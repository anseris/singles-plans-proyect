import type { EventItem } from '../../features/events/models/event.model';

export function meetingPointMapUrl(event: EventItem): string {
  const point = event.meetingPoint;
  const hasCoordinates =
    point !== undefined &&
    typeof point.latitude === 'number' &&
    typeof point.longitude === 'number';
  const namedQuery = [point?.name, point?.address, event.location].filter(Boolean).join(', ');
  const query = point?.placeId
    ? namedQuery
    : hasCoordinates
      ? `${point.latitude},${point.longitude}`
      : namedQuery;
  const url = new URL('https://www.google.com/maps/search/');
  url.searchParams.set('api', '1');
  url.searchParams.set('query', query);
  if (point?.placeId) url.searchParams.set('query_place_id', point.placeId);
  return url.toString();
}

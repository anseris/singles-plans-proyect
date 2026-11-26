import { Routes } from '@angular/router';
import { EventsList } from './features/events/pages/events-list/events-list';
import { EventDetailPage } from './features/events/pages/event-detail/event-detail';
import { EventAttendeesPage } from './features/events/pages/event-attendees/event-attendees';
import { AllEventsPage } from './features/events/pages/all-events/all-events';
import { EventCreatePage } from './features/events/pages/event-create/event-create';
import { GroupCreatePage } from './features/groups/pages/group-create/group-create';
import { GroupDetail } from './features/groups/pages/group-detail/group-detail';
import { AllGroupsPage } from './features/groups/pages/all-groups/all-groups';
import { AdminPage } from './features/admin/pages/admin-page/admin-page';
import { ResetPassword } from './features/account/pages/reset-password/reset-password';
import { OAuthCallback } from './features/account/pages/oauth-callback/oauth-callback';
import { ProfilePage } from './features/account/pages/profile/profile';
import { SettingsPage } from './features/account/pages/settings/settings';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'eventos' },
  { path: 'eventos', component: EventsList, data: { section: 'events' } },
  { path: 'viajes', component: EventsList, data: { section: 'trips' } },
  { path: 'eventos/todos', component: AllEventsPage },
  { path: 'eventos/detalles/:id/asistentes', component: EventAttendeesPage },
  { path: 'eventos/detalles/:id', component: EventDetailPage },
  { path: 'eventos/crear', component: EventCreatePage },
  { path: 'grupos/crear', component: GroupCreatePage },
  { path: 'grupos/todos', component: AllGroupsPage },
  { path: 'grupos/:id', component: GroupDetail },
  { path: 'administracion', component: AdminPage },
  { path: 'cuenta/restablecer', component: ResetPassword },
  { path: 'cuenta/oauth/callback', component: OAuthCallback },
  { path: 'cuenta/perfil', component: ProfilePage },
  { path: 'cuenta/configuracion', component: SettingsPage },
  { path: '**', redirectTo: 'eventos' },
];

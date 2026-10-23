// app/(tabs)/announcements-tab.js
// ISSY - Pestaña Anuncios de la barra: la misma pantalla de /announcements dentro de (tabs),
// para que la barra siga visible. /announcements (fuera de la barra) sigue funcionando igual.

import AnnouncementsScreen from '../announcements';

export default function AnnouncementsTab() {
  return <AnnouncementsScreen fromTab />;
}

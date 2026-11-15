// Nom affiché d'un client, partout le même : la société si elle est renseignée, sinon le nom
// du contact (avant, selon l'écran, on voyait l'un ou l'autre pour le même client).
export function clientLabel(c: { name?: string | null; company?: string | null } | null | undefined): string {
  return (c?.company || '').trim() || (c?.name || '').trim();
}

// Ligne secondaire : le nom du contact quand la société sert déjà de libellé.
export function clientSublabel(c: { name?: string | null; company?: string | null } | null | undefined): string | undefined {
  return (c?.company || '').trim() && (c?.name || '').trim() ? c!.name!.trim() : undefined;
}

/**
 * Nombre de véhicules actifs de la société (cache local de la flotte), pour répartir
 * les charges de structure entre les tournées d'une journée : un véhicule = une tournée.
 * Sans flotte connue : 1 (toute la structure sur la tournée, comportement d'avant).
 */
export function activeFleetSize(): number {
  try {
    const list = JSON.parse(localStorage.getItem('optiflow_vehicles_cache') || '[]') as { isActive?: boolean }[];
    return Math.max(1, Array.isArray(list) ? list.filter((v) => v && v.isActive !== false).length : 1);
  } catch {
    return 1;
  }
}

import type { DriverAbsence } from '@/hooks/useDriverAbsences';

/**
 * Vrai si deux périodes [aStart, aEnd] et [bStart, bEnd] se chevauchent.
 * Une borne de fin absente (null) est traitée comme "sans fin connue"
 * (absence toujours en cours, ou mission sans date de fin / à l'année).
 */
function rangesOverlap(
  aStart: string,
  aEnd: string | null,
  bStart: string,
  bEnd: string | null
): boolean {
  const aEndOk = aEnd ?? '9999-12-31';
  const bEndOk = bEnd ?? '9999-12-31';
  return aStart <= bEndOk && bStart <= aEndOk;
}

/**
 * Absences du conducteur donné qui chevauchent la période [startDate, endDate]
 * (ex. la période active d'une mission récurrente, ou l'étendue des dates
 * concrètes d'une traction déjà planifiée).
 */
export function getOverlappingAbsences(
  absences: DriverAbsence[],
  driverId: string | null | undefined,
  startDate: string,
  endDate: string | null
): DriverAbsence[] {
  if (!driverId) return [];
  return absences.filter(
    (a) => a.driver_id === driverId && rangesOverlap(a.start_date, a.end_date, startDate, endDate)
  );
}

export function formatAbsencePeriod(absence: DriverAbsence): string {
  const start = new Date(absence.start_date + 'T00:00').toLocaleDateString('fr-FR');
  if (!absence.end_date) return `depuis le ${start}`;
  const end = new Date(absence.end_date + 'T00:00').toLocaleDateString('fr-FR');
  return `du ${start} au ${end}`;
}

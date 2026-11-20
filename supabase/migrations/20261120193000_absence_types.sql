-- Fix « erreur quand je mets un conducteur en congés » : la base n'acceptait que 4 types
-- d'absence (maladie, accident_travail, conges, autre) alors que l'écran en propose 22.
alter table public.driver_absences drop constraint if exists driver_absences_absence_type_check;
alter table public.driver_absences add constraint driver_absences_absence_type_check check (absence_type = any (array['conges','conges_payes','conges_sans_solde','conge_sabbatique','conge_parental','mariage_pacs','naissance_adoption','deces_proche','formation_pro','formation_syndicale','convocation_judiciaire','retard_injustifie','greve','demenagement','rdv_medical','maladie','accident_travail','maladie_pro','conge_maternite','conge_paternite','conge_adoption','conge_enfant_malade','autre']));

-- Fonction de déclencheur (journal d'activité de l'équipe) : personne n'a à l'appeler directement.
-- Le déclencheur continue de fonctionner (aucun droit n'est vérifié quand il se déclenche).
revoke execute on function public._opti_log_activity() from public, anon, authenticated;

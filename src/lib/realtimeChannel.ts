/** Nom de canal Realtime unique par abonnement : plusieurs instances d'un hook ne doivent jamais partager un canal déjà souscrit. */
export const uniqueChannelName = (base: string) => `${base}:${Math.random().toString(36).slice(2, 10)}`;

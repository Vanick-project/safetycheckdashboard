// ─── lib/query-provider.tsx ───────────────────────────────────────────────────
// Provider TanStack Query. Wrappe l'app pour que tout composant client puisse
// utiliser useQuery / useMutation.
//
// 'use client' obligatoire : QueryClientProvider utilise du contexte React qui
// a besoin du runtime client.

'use client';

import { useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

/**
 * Construit le QueryClient dans un state lazy initializer : créé une seule
 * fois par tab (pas à chaque rerender), jamais côté serveur (sinon on
 * partagerait du state client entre requêtes).
 */
function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // 1 min : tolère les rerenders sans over-fetcher.
        // À affiner par-query si besoin (via `staleTime` sur useQuery).
        staleTime: 60 * 1000,
        // Utile pour un dashboard : refetch quand l'onglet revient au focus
        refetchOnWindowFocus: true,
        // Le client API gère déjà le refresh sur 401 → toute erreur qu'on
        // surface est réelle. On limite à 1 retry pour les erreurs réseau.
        retry: 1,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}

export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(createQueryClient);
  return (
    <QueryClientProvider client={client}>
      {children}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}
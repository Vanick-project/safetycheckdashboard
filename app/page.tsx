import { redirect } from 'next/navigation';

// La racine / redirige vers /dashboard.
// Si l'user n'est pas authentifié, AuthGuard le renverra vers /login.
export default function RootPage() {
  redirect('/dashboard');
}
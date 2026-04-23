import { Redirect, Stack } from 'expo-router';
import { useAuth } from '../../lib/auth-context';

export default function AuthLayout() {
  const { user, loading } = useAuth();

  // If already signed in, bounce to the app.
  if (!loading && user) {
    return <Redirect href="/" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}

import { Redirect, Stack } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useAuth } from '../../lib/auth-context';

export default function AuthLayout() {
  const { user, loading } = useAuth();

  // While the SecureStore restore is in flight we don't yet know whether
  // we should bounce the user to / or let them see /login. Rendering the
  // login Stack here would flash the sign-in UI to a user who actually
  // has a valid session — the (app)/_layout spinner doesn't cover this
  // case because the route IS underneath (auth), not (app). Show our own
  // spinner. Surfaced by the 2026-05-21 post-fix review.
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4630EB" />
      </View>
    );
  }

  // If already signed in, bounce to the app.
  if (user) {
    return <Redirect href="/" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
});

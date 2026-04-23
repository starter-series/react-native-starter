import { useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useAuth } from '../../lib/auth-context';

export default function LoginScreen() {
  const { signIn, error } = useAuth();
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState(null);

  const onPress = async () => {
    setLocalError(null);
    setBusy(true);
    try {
      await signIn();
    } catch (e) {
      setLocalError(e);
    } finally {
      setBusy(false);
    }
  };

  const shownError = localError ?? error;

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Welcome</Text>
        <Text style={styles.subtitle}>Sign in to continue</Text>

        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.googleButton,
            pressed && styles.googleButtonPressed,
            busy && styles.googleButtonBusy,
          ]}
          onPress={onPress}
          disabled={busy}
        >
          {busy ? (
            <ActivityIndicator color="#1f1f1f" />
          ) : (
            <Text style={styles.googleButtonText}>Continue with Google</Text>
          )}
        </Pressable>

        {shownError ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>
              {shownError.message ?? 'Sign-in failed. Tap to retry.'}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

// Platform-aware tweaks: iOS gets a slightly softer shadow + HIG-ish radius,
// Android gets Material elevation. Keep it understated.
const buttonRadius = Platform.select({ ios: 12, android: 4, default: 8 });

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
  },
  title: {
    fontSize: 34,
    fontWeight: '700',
    color: '#1f1f1f',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 32,
  },
  googleButton: {
    width: '100%',
    minHeight: 48,
    borderRadius: buttonRadius,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#dadce0',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowOffset: { width: 0, height: 1 },
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
      default: {},
    }),
  },
  googleButtonPressed: {
    backgroundColor: '#f8f9fa',
  },
  googleButtonBusy: {
    opacity: 0.7,
  },
  googleButtonText: {
    color: '#1f1f1f',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.25,
  },
  errorBox: {
    marginTop: 16,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#fdeaea',
    borderWidth: 1,
    borderColor: '#f5c2c2',
    width: '100%',
  },
  errorText: {
    color: '#a1201a',
    fontSize: 14,
  },
});

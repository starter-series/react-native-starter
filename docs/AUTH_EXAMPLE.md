# Auth Example — Expo Auth Session + SecureStore

Minimal copy-paste Google OAuth pattern. No runtime deps added to the starter — install them only if you need auth.

## 1. Install deps

```bash
npx expo install expo-auth-session expo-crypto expo-secure-store
```

`expo-crypto` is required by `expo-auth-session` for PKCE. `expo-secure-store` stores tokens in the iOS Keychain / Android Keystore.

## 2. Configure redirect URI

1. Google Cloud Console → APIs & Services → Credentials → **Create OAuth client ID** → **Web application** (Expo proxy uses a web client).
2. Add authorized redirect URI: `https://auth.expo.io/@your-expo-username/your-app-slug`.
3. Add an app scheme to `app.json` so the redirect can return to your app in standalone builds:

```json
{ "expo": { "scheme": "myapp" } }
```

## 3. LoginScreen

```tsx
// app/login.tsx (or app/(auth)/login.tsx)
import { useEffect, useState } from 'react';
import { Button, Text, View } from 'react-native';
import * as AuthSession from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'google_access_token';

export default function LoginScreen() {
  const [token, setToken] = useState<string | null>(null);
  const [request, response, promptAsync] = Google.useAuthRequest({
    // Use the Expo proxy in dev; swap for native clientIds for production builds.
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID!,
    redirectUri: AuthSession.makeRedirectUri({ useProxy: true }),
    scopes: ['openid', 'profile', 'email'],
  });

  useEffect(() => {
    SecureStore.getItemAsync(TOKEN_KEY).then((t) => t && setToken(t));
  }, []);

  useEffect(() => {
    if (response?.type === 'success' && response.authentication?.accessToken) {
      const t = response.authentication.accessToken;
      SecureStore.setItemAsync(TOKEN_KEY, t).then(() => setToken(t));
    }
  }, [response]);

  const signOut = async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    setToken(null);
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 24 }}>
      {token ? (
        <>
          <Text>Signed in.</Text>
          <Button title="Sign out" onPress={signOut} />
        </>
      ) : (
        <Button
          title="Sign in with Google"
          disabled={!request}
          onPress={() => promptAsync({ useProxy: true } as never)}
        />
      )}
    </View>
  );
}
```

Set `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` in a local `.env` file (Expo picks up `EXPO_PUBLIC_*` vars automatically). For production builds, follow the native client ID flow in the docs below.

## 4. Token storage notes

- `SecureStore` encrypts at rest on device; never use `AsyncStorage` for tokens.
- Access tokens expire — swap to `expo-auth-session`'s `refreshAsync` if you need long-lived sessions, or move refresh to your backend.
- Gate protected routes in `app/_layout.js` by reading the token on mount and redirecting to `/login` when absent.

## Docs

- [Expo Auth Session](https://docs.expo.dev/versions/latest/sdk/auth-session/)
- [Google provider guide](https://docs.expo.dev/guides/google-authentication/)
- [SecureStore](https://docs.expo.dev/versions/latest/sdk/securestore/)

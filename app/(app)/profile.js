import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import { useAuth } from '../../lib/auth-context';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();

  return (
    <View style={styles.container}>
      {user?.picture ? (
        <Image source={{ uri: user.picture }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.avatarFallback]} />
      )}
      <Text style={styles.name}>{user?.name ?? 'Signed in'}</Text>
      {user?.email ? <Text style={styles.email}>{user.email}</Text> : null}
      <Pressable style={styles.button} onPress={signOut}>
        <Text style={styles.buttonText}>Sign out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#fff',
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    marginBottom: 16,
  },
  avatarFallback: {
    backgroundColor: '#e0e0e0',
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
    color: '#222',
    marginBottom: 4,
  },
  email: {
    fontSize: 15,
    color: '#666',
    marginBottom: 32,
  },
  button: {
    backgroundColor: '#d1372b',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

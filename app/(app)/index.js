import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Link } from 'expo-router';
import { useAuth } from '../../lib/auth-context';

export default function HomeScreen() {
  const { user } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>My App</Text>
      <Text style={styles.subtitle}>
        {user?.name ? `Hi, ${user.name}` : 'Get Started'}
      </Text>
      <Text style={styles.description}>
        Edit <Text style={styles.code}>app/(app)/index.js</Text> to start building.
      </Text>
      <View style={styles.row}>
        <Link href="/about" asChild>
          <Pressable style={styles.button}>
            <Text style={styles.buttonText}>About</Text>
          </Pressable>
        </Link>
        <Link href="/profile" asChild>
          <Pressable style={[styles.button, styles.buttonSecondary]}>
            <Text style={styles.buttonText}>Profile</Text>
          </Pressable>
        </Link>
      </View>
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
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4630EB',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 20,
    color: '#666',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginBottom: 32,
  },
  code: {
    fontFamily: 'monospace',
    backgroundColor: '#f0f0f0',
    color: '#333',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    backgroundColor: '#4630EB',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonSecondary: {
    backgroundColor: '#6B5BE6',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

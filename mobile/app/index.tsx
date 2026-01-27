import { Redirect } from 'expo-router';
import { useAuth } from '../lib/auth';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

export default function Index() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#ff2d55" />
      </View>
    );
  }

  if (isAuthenticated) {
    return <Redirect href="/(tabs)/feed" />;
  }

  return <Redirect href="/(auth)/login" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

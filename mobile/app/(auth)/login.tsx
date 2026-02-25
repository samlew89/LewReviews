// ============================================================================
// LewReviews Mobile - Login Screen
// ============================================================================

import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../lib/auth';
import {
  canUseBiometricLogin,
  authenticateWithBiometric,
  getBiometricType,
  saveCredentials,
  isBiometricAvailable,
  isBiometricEnabled,
} from '../../lib/biometricAuth';

export default function LoginScreen() {
  const { signInWithEmail } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showBiometricButton, setShowBiometricButton] = useState(false);
  const [biometricType, setBiometricType] = useState<'faceid' | 'touchid' | 'none'>('none');

  useEffect(() => {
    checkBiometricAvailability();
  }, []);

  const checkBiometricAvailability = async () => {
    const canUse = await canUseBiometricLogin();
    setShowBiometricButton(canUse);
    if (canUse) {
      const type = await getBiometricType();
      setBiometricType(type);
    }
  };

  const handleBiometricLogin = async () => {
    setIsLoading(true);
    try {
      const { success, credentials } = await authenticateWithBiometric();
      if (success && credentials) {
        const { error } = await signInWithEmail(credentials.email, credentials.password);
        if (error) {
          Alert.alert('Sign In Failed', 'Saved credentials are invalid. Please sign in with your password.');
        }
      }
    } catch {
      Alert.alert('Error', 'Biometric authentication failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const promptEnableBiometric = async (userEmail: string, userPassword: string) => {
    const available = await isBiometricAvailable();
    const alreadyEnabled = await isBiometricEnabled();

    if (!available || alreadyEnabled) return;

    const type = await getBiometricType();
    const typeName = type === 'faceid' ? 'Face ID' : type === 'touchid' ? 'Touch ID' : 'biometric login';

    Alert.alert(
      `Enable ${typeName}?`,
      `Sign in faster next time using ${typeName}.`,
      [
        { text: 'Not Now', style: 'cancel' },
        {
          text: 'Enable',
          onPress: async () => {
            await saveCredentials(userEmail, userPassword);
          },
        },
      ]
    );
  };

  const handleSignIn = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await signInWithEmail(email.trim(), password);

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          Alert.alert('Sign In Failed', 'Invalid email or password. Please try again.');
        } else if (error.message.includes('network')) {
          Alert.alert('Network Error', 'Please check your internet connection and try again.');
        } else {
          Alert.alert('Sign In Failed', error.message);
        }
      } else {
        // Successful login - prompt to enable biometrics
        promptEnableBiometric(email.trim(), password);
      }
    } catch {
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const biometricIconName = biometricType === 'faceid' ? 'scan-outline' : 'finger-print-outline';

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <Text style={styles.title}>LewReviews</Text>
        <Text style={styles.subtitle}>Sign in to continue</Text>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#666"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            value={email}
            onChangeText={setEmail}
            editable={!isLoading}
          />

          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#666"
            secureTextEntry
            autoCapitalize="none"
            value={password}
            onChangeText={setPassword}
            editable={!isLoading}
            onSubmitEditing={handleSignIn}
          />

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleSignIn}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Sign In</Text>
            )}
          </TouchableOpacity>

          {showBiometricButton && (
            <TouchableOpacity
              style={[styles.biometricButton, isLoading && styles.buttonDisabled]}
              onPress={handleBiometricLogin}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              <Ionicons name={biometricIconName} size={24} color="#ff2d55" />
              <Text style={styles.biometricButtonText}>
                {biometricType === 'faceid' ? 'Sign in with Face ID' : 'Sign in with Touch ID'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <Link href="/(auth)/signup" asChild>
            <TouchableOpacity disabled={isLoading}>
              <Text style={styles.link}>Sign Up</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    marginBottom: 48,
  },
  form: {
    gap: 16,
  },
  input: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#333',
  },
  button: {
    backgroundColor: '#ff2d55',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  biometricButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderRadius: 12,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: '#ff2d55',
    gap: 8,
  },
  biometricButtonText: {
    color: '#ff2d55',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 32,
  },
  footerText: {
    color: '#888',
    fontSize: 14,
  },
  link: {
    color: '#ff2d55',
    fontSize: 14,
    fontWeight: '600',
  },
});

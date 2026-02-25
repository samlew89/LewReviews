// ============================================================================
// LewReviews Mobile - Biometric Authentication
// ============================================================================

import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

const CREDENTIALS_KEY = 'biometric_credentials';
const BIOMETRIC_ENABLED_KEY = 'biometric_enabled';

interface StoredCredentials {
  email: string;
  password: string;
}

// ============================================================================
// Check biometric availability
// ============================================================================

export async function isBiometricAvailable(): Promise<boolean> {
  const compatible = await LocalAuthentication.hasHardwareAsync();
  if (!compatible) return false;

  const enrolled = await LocalAuthentication.isEnrolledAsync();
  return enrolled;
}

export async function getBiometricType(): Promise<'faceid' | 'touchid' | 'none'> {
  const types = await LocalAuthentication.supportedAuthenticationTypesAsync();

  if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
    return 'faceid';
  }
  if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
    return 'touchid';
  }
  return 'none';
}

// ============================================================================
// Credential storage
// ============================================================================

export async function saveCredentials(email: string, password: string): Promise<void> {
  const credentials: StoredCredentials = { email, password };
  await SecureStore.setItemAsync(CREDENTIALS_KEY, JSON.stringify(credentials));
  await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, 'true');
}

export async function getStoredCredentials(): Promise<StoredCredentials | null> {
  const data = await SecureStore.getItemAsync(CREDENTIALS_KEY);
  if (!data) return null;
  return JSON.parse(data) as StoredCredentials;
}

export async function clearStoredCredentials(): Promise<void> {
  await SecureStore.deleteItemAsync(CREDENTIALS_KEY);
  await SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY);
}

export async function isBiometricEnabled(): Promise<boolean> {
  const enabled = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
  return enabled === 'true';
}

// ============================================================================
// Biometric authentication
// ============================================================================

export async function authenticateWithBiometric(): Promise<{ success: boolean; credentials?: StoredCredentials }> {
  const available = await isBiometricAvailable();
  if (!available) {
    return { success: false };
  }

  const credentials = await getStoredCredentials();
  if (!credentials) {
    return { success: false };
  }

  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Sign in to LewReviews',
    fallbackLabel: 'Use password',
    disableDeviceFallback: false,
  });

  if (result.success) {
    return { success: true, credentials };
  }

  return { success: false };
}

// ============================================================================
// Check if biometric login is ready
// ============================================================================

export async function canUseBiometricLogin(): Promise<boolean> {
  const [available, enabled, credentials] = await Promise.all([
    isBiometricAvailable(),
    isBiometricEnabled(),
    getStoredCredentials(),
  ]);

  return available && enabled && credentials !== null;
}

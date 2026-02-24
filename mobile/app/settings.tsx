// ============================================================================
// LewReviews Mobile - Settings Screen
// ============================================================================

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';

// GitHub Pages URLs (enable Pages in repo Settings → Pages → main branch /docs folder)
const PRIVACY_POLICY_URL = 'https://samlew89.github.io/LewReviews/legal/privacy';
const TERMS_OF_SERVICE_URL = 'https://samlew89.github.io/LewReviews/legal/terms';

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const handleBackPress = useCallback(() => {
    router.back();
  }, [router]);

  const handleLogout = useCallback(async () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            setIsLoggingOut(true);
            try {
              await supabase.auth.signOut();
              router.replace('/(auth)/login');
            } catch {
              Alert.alert('Error', 'Failed to log out. Please try again.');
            } finally {
              setIsLoggingOut(false);
            }
          },
        },
      ]
    );
  }, [router]);

  const handleDeleteAccount = useCallback(async () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all your videos. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            // Second confirmation for destructive action
            Alert.alert(
              'Are you absolutely sure?',
              'All your data will be permanently deleted.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Yes, Delete My Account',
                  style: 'destructive',
                  onPress: async () => {
                    setIsDeletingAccount(true);
                    try {
                      const { error } = await supabase.rpc('delete_user_account');
                      if (error) throw error;

                      await supabase.auth.signOut();
                      router.replace('/(auth)/login');
                    } catch {
                      Alert.alert(
                        'Error',
                        'Failed to delete account. Please contact support.'
                      );
                    } finally {
                      setIsDeletingAccount(false);
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  }, [router]);

  const handleOpenPrivacyPolicy = useCallback(() => {
    Linking.openURL(PRIVACY_POLICY_URL);
  }, []);

  const handleOpenTerms = useCallback(() => {
    Linking.openURL(TERMS_OF_SERVICE_URL);
  }, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Settings List */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>

        <TouchableOpacity
          style={styles.settingsRow}
          onPress={handleLogout}
          disabled={isLoggingOut}
        >
          <View style={styles.settingsRowLeft}>
            <Ionicons name="log-out-outline" size={22} color="#fff" />
            <Text style={styles.settingsRowText}>Log Out</Text>
          </View>
          {isLoggingOut ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.4)" />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.settingsRow}
          onPress={handleDeleteAccount}
          disabled={isDeletingAccount}
        >
          <View style={styles.settingsRowLeft}>
            <Ionicons name="trash-outline" size={22} color="#ff3b30" />
            <Text style={[styles.settingsRowText, styles.destructiveText]}>
              Delete Account
            </Text>
          </View>
          {isDeletingAccount ? (
            <ActivityIndicator size="small" color="#ff3b30" />
          ) : (
            <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.4)" />
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Legal</Text>

        <TouchableOpacity style={styles.settingsRow} onPress={handleOpenPrivacyPolicy}>
          <View style={styles.settingsRowLeft}>
            <Ionicons name="shield-outline" size={22} color="#fff" />
            <Text style={styles.settingsRowText}>Privacy Policy</Text>
          </View>
          <Ionicons name="open-outline" size={18} color="rgba(255,255,255,0.4)" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingsRow} onPress={handleOpenTerms}>
          <View style={styles.settingsRowLeft}>
            <Ionicons name="document-text-outline" size={22} color="#fff" />
            <Text style={styles.settingsRowText}>Terms of Service</Text>
          </View>
          <Ionicons name="open-outline" size={18} color="rgba(255,255,255,0.4)" />
        </TouchableOpacity>
      </View>

      {/* App Version */}
      <View style={styles.footer}>
        <Text style={styles.versionText}>LewReviews v1.0.0</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  headerSpacer: {
    width: 40,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  settingsRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingsRowText: {
    fontSize: 16,
    color: '#fff',
  },
  destructiveText: {
    color: '#ff3b30',
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  versionText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.3)',
  },
});

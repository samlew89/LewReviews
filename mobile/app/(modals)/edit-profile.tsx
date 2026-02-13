// ============================================================================
// LewReviews Mobile - Edit Profile Modal
// ============================================================================
// Allows users to edit their name and bio
// Avatar is changed directly from the profile page
// ============================================================================

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, getCurrentUser } from '../../lib/supabase';
import type { Profile } from '../../types';

// ============================================================================
// Constants
// ============================================================================

const NAME_MIN_LENGTH = 3;
const NAME_MAX_LENGTH = 30;
const BIO_MAX_LENGTH = 150;

// ============================================================================
// Helper Functions
// ============================================================================

const validateName = (name: string): string | null => {
  if (name.length < NAME_MIN_LENGTH) {
    return `Name must be at least ${NAME_MIN_LENGTH} characters`;
  }
  if (name.length > NAME_MAX_LENGTH) {
    return `Name must be less than ${NAME_MAX_LENGTH} characters`;
  }
  if (!/^[a-zA-Z0-9_]+$/.test(name)) {
    return 'Name can only contain letters, numbers, and underscores';
  }
  return null;
};

// ============================================================================
// Component
// ============================================================================

export default function EditProfileModal() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  // Form state
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  // Fetch current profile
  const { data: profile, isLoading: isLoadingProfile } = useQuery({
    queryKey: ['current-profile-edit'],
    queryFn: async () => {
      const user = await getCurrentUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      return data as Profile;
    },
  });

  // Initialize form with current profile data
  useEffect(() => {
    if (profile) {
      setName(profile.username || '');
      setBio(profile.bio || '');
    }
  }, [profile]);

  // Save profile mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const user = await getCurrentUser();
      if (!user) throw new Error('Not authenticated');

      // Validate name
      const nameError = validateName(name);
      if (nameError) {
        throw new Error(nameError);
      }

      // Check if name is taken (if changed)
      if (name !== profile?.username) {
        const { data: existingUser } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', name)
          .neq('id', user.id)
          .maybeSingle();

        if (existingUser) {
          throw new Error('Name is already taken');
        }
      }

      // Update profile - username and display_name are kept in sync
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          username: name.trim(),
          display_name: name.trim(),
          bio: bio.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (updateError) {
        if (updateError.code === '23505') {
          throw new Error('Name is already taken');
        }
        throw updateError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-profile-edit'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['current-user'] });
      queryClient.invalidateQueries({ queryKey: ['feed'] });

      Alert.alert('Success', 'Profile updated successfully', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    },
    onError: (error) => {
      setValidationError(error instanceof Error ? error.message : 'Failed to save profile');
    },
  });

  // Handle cancel
  const handleCancel = useCallback(() => {
    router.back();
  }, [router]);

  // Handle save
  const handleSave = useCallback(() => {
    setValidationError(null);
    saveMutation.mutate();
  }, [saveMutation]);

  // Check if form has changes
  const hasChanges = profile && (
    name !== profile.username ||
    bio !== (profile.bio || '')
  );

  if (isLoadingProfile) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={handleCancel} style={styles.headerButton}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <TouchableOpacity
          onPress={handleSave}
          style={styles.headerButton}
          disabled={saveMutation.isPending || !hasChanges}
        >
          {saveMutation.isPending ? (
            <ActivityIndicator size="small" color="#ff2d55" />
          ) : (
            <Text
              style={[
                styles.saveText,
                (!hasChanges) && styles.saveTextDisabled,
              ]}
            >
              Save
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Form Fields */}
        <View style={styles.formSection}>
          {/* Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Name</Text>
            <TextInput
              style={styles.textInput}
              value={name}
              onChangeText={(text) => {
                setName(text.toLowerCase().replace(/[^a-z0-9_]/g, ''));
                setValidationError(null);
              }}
              placeholder="your_name"
              placeholderTextColor="rgba(255, 255, 255, 0.3)"
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={NAME_MAX_LENGTH}
            />
            <Text style={styles.inputHint}>
              {name.length}/{NAME_MAX_LENGTH}
            </Text>
          </View>

          {/* Bio */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Bio</Text>
            <TextInput
              style={[styles.textInput, styles.bioInput]}
              value={bio}
              onChangeText={(text) => {
                setBio(text);
                setValidationError(null);
              }}
              placeholder="Tell us about yourself"
              placeholderTextColor="rgba(255, 255, 255, 0.3)"
              multiline
              numberOfLines={4}
              maxLength={BIO_MAX_LENGTH}
              textAlignVertical="top"
            />
            <Text style={styles.inputHint}>
              {bio.length}/{BIO_MAX_LENGTH}
            </Text>
          </View>

          {/* Validation Error */}
          {validationError && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={16} color="#ff4444" />
              <Text style={styles.errorText}>{validationError}</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}


// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
  },
  headerButton: {
    minWidth: 60,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 16,
    color: '#fff',
  },
  saveText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ff2d55',
  },
  saveTextDisabled: {
    color: 'rgba(255, 45, 85, 0.4)',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  formSection: {
    paddingHorizontal: 16,
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  bioInput: {
    height: 100,
    paddingTop: 12,
  },
  inputHint: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.4)',
    marginTop: 4,
    textAlign: 'right',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    gap: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: '#ff4444',
  },
});

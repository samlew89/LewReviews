// ============================================================================
// LewReviews Mobile - Edit Profile Modal
// ============================================================================
// Allows users to edit their username, display name, bio, and avatar
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
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { supabase, getCurrentUser } from '../../lib/supabase';
import { STORAGE_BUCKETS } from '../../constants/config';
import type { Profile } from '../../types';

// ============================================================================
// Constants
// ============================================================================

const USERNAME_MIN_LENGTH = 3;
const USERNAME_MAX_LENGTH = 30;
const DISPLAY_NAME_MAX_LENGTH = 50;
const BIO_MAX_LENGTH = 150;

// ============================================================================
// Helper Functions
// ============================================================================

const validateUsername = (username: string): string | null => {
  if (username.length < USERNAME_MIN_LENGTH) {
    return `Username must be at least ${USERNAME_MIN_LENGTH} characters`;
  }
  if (username.length > USERNAME_MAX_LENGTH) {
    return `Username must be less than ${USERNAME_MAX_LENGTH} characters`;
  }
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return 'Username can only contain letters, numbers, and underscores';
  }
  return null;
};

const generateAvatarFileName = (userId: string): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${userId}/${timestamp}_${random}.jpg`;
};

// ============================================================================
// Component
// ============================================================================

export default function EditProfileModal() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  // Form state
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [newAvatarUri, setNewAvatarUri] = useState<string | null>(null);
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
      setUsername(profile.username || '');
      setDisplayName(profile.display_name || '');
      setBio(profile.bio || '');
      setAvatarUri(profile.avatar_url);
    }
  }, [profile]);

  // Save profile mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const user = await getCurrentUser();
      if (!user) throw new Error('Not authenticated');

      // Validate username
      const usernameError = validateUsername(username);
      if (usernameError) {
        throw new Error(usernameError);
      }

      // Check if username is taken (if changed)
      if (username !== profile?.username) {
        const { data: existingUser } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', username)
          .neq('id', user.id)
          .maybeSingle();

        if (existingUser) {
          throw new Error('Username is already taken');
        }
      }

      // Upload new avatar if selected
      let newAvatarUrl = avatarUri;
      if (newAvatarUri) {
        const avatarFileName = generateAvatarFileName(user.id);

        const response = await fetch(newAvatarUri);
        const blob = await response.blob();

        const { error: uploadError } = await supabase.storage
          .from(STORAGE_BUCKETS.AVATARS)
          .upload(avatarFileName, blob, {
            contentType: 'image/jpeg',
            upsert: false,
          });

        if (uploadError) {
          throw new Error('Failed to upload avatar');
        }

        const { data: urlData } = supabase.storage
          .from(STORAGE_BUCKETS.AVATARS)
          .getPublicUrl(avatarFileName);

        newAvatarUrl = urlData.publicUrl;
      }

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          username: username.trim(),
          display_name: displayName.trim() || null,
          bio: bio.trim() || null,
          avatar_url: newAvatarUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (updateError) {
        if (updateError.code === '23505') {
          throw new Error('Username is already taken');
        }
        throw updateError;
      }

      return { username, displayName, bio, avatarUrl: newAvatarUrl };
    },
    onSuccess: () => {
      // Invalidate profile queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['current-profile-edit'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['current-user'] });

      Alert.alert('Success', 'Profile updated successfully', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    },
    onError: (error) => {
      setValidationError(error instanceof Error ? error.message : 'Failed to save profile');
    },
  });

  // Handle avatar selection
  const handleSelectAvatar = useCallback(async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Please allow access to your photo library');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setNewAvatarUri(result.assets[0].uri);
        setAvatarUri(result.assets[0].uri);
      }
    } catch {
      Alert.alert('Error', 'Failed to select image');
    }
  }, []);

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
    username !== profile.username ||
    displayName !== (profile.display_name || '') ||
    bio !== (profile.bio || '') ||
    newAvatarUri !== null
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
        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          <TouchableOpacity
            style={styles.avatarContainer}
            onPress={handleSelectAvatar}
            activeOpacity={0.8}
          >
            {avatarUri ? (
              <Image
                source={{ uri: avatarUri }}
                style={styles.avatar}
                contentFit="cover"
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={48} color="#fff" />
              </View>
            )}
            <View style={styles.avatarOverlay}>
              <Ionicons name="camera" size={20} color="#fff" />
            </View>
          </TouchableOpacity>
          <Text style={styles.changePhotoText}>Change Photo</Text>
        </View>

        {/* Form Fields */}
        <View style={styles.formSection}>
          {/* Username */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Username</Text>
            <TextInput
              style={styles.textInput}
              value={username}
              onChangeText={(text) => {
                setUsername(text.toLowerCase().replace(/[^a-z0-9_]/g, ''));
                setValidationError(null);
              }}
              placeholder="username"
              placeholderTextColor="rgba(255, 255, 255, 0.3)"
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={USERNAME_MAX_LENGTH}
            />
            <Text style={styles.inputHint}>
              {username.length}/{USERNAME_MAX_LENGTH}
            </Text>
          </View>

          {/* Display Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Display Name</Text>
            <TextInput
              style={styles.textInput}
              value={displayName}
              onChangeText={(text) => {
                setDisplayName(text);
                setValidationError(null);
              }}
              placeholder="Your display name"
              placeholderTextColor="rgba(255, 255, 255, 0.3)"
              maxLength={DISPLAY_NAME_MAX_LENGTH}
            />
            <Text style={styles.inputHint}>
              {displayName.length}/{DISPLAY_NAME_MAX_LENGTH}
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
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: 'hidden',
    position: 'relative',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 32,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  changePhotoText: {
    marginTop: 12,
    fontSize: 14,
    color: '#ff2d55',
    fontWeight: '500',
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

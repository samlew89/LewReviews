// ============================================================================
// LewReviews Mobile - Discover Tab
// ============================================================================
// Search for users and see suggested accounts to follow
// ============================================================================

import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { getCurrentUser } from '../../lib/supabase';
import { useUserSearch } from '../../hooks/useUserSearch';
import { useSuggestedUsers } from '../../hooks/useSuggestedUsers';
import { UserListItem } from '../../components/UserListItem';
import type { UserSearchResult } from '../../types';

export default function DiscoverScreen() {
  const insets = useSafeAreaInsets();
  const [searchText, setSearchText] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: getCurrentUser,
    staleTime: 1000 * 60 * 5,
  });

  const { results: searchResults, isLoading: isSearching } = useUserSearch(searchText);
  const { users: suggestedUsers, isLoading: isLoadingSuggestions } = useSuggestedUsers();

  const isSearchMode = searchText.length > 0;

  const handleClear = useCallback(() => {
    setSearchText('');
    inputRef.current?.blur();
  }, []);

  const renderUser = useCallback(
    ({ item }: { item: UserSearchResult }) => (
      <UserListItem user={item} currentUserId={currentUser?.id ?? null} />
    ),
    [currentUser?.id]
  );

  const keyExtractor = useCallback((item: UserSearchResult) => item.id, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Discover</Text>
      </View>
      <View style={styles.headerRule} />

      {/* Search bar */}
      <View style={styles.searchBarContainer}>
        <View style={[styles.searchBar, isFocused && styles.searchBarFocused]}>
          <Ionicons name="search-outline" size={18} color="rgba(255,255,255,0.4)" />
          <TextInput
            ref={inputRef}
            style={styles.searchInput}
            placeholder="Search users..."
            placeholderTextColor="rgba(255,255,255,0.3)"
            value={searchText}
            onChangeText={setSearchText}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={handleClear} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={18} color="rgba(255,255,255,0.4)" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Content */}
      {isSearchMode ? (
        // Search results
        isSearching ? (
          <View style={styles.centered}>
            <ActivityIndicator size="small" color="#E8C547" />
          </View>
        ) : searchResults.length === 0 ? (
          <View style={styles.centered}>
            <Ionicons name="search-outline" size={40} color="rgba(255,255,255,0.2)" />
            <Text style={styles.emptyText}>No users found</Text>
          </View>
        ) : (
          <FlatList
            data={searchResults}
            renderItem={renderUser}
            keyExtractor={keyExtractor}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
          />
        )
      ) : (
        // Suggested users
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Suggested</Text>
          </View>
          {isLoadingSuggestions ? (
            <View style={styles.centered}>
              <ActivityIndicator size="small" color="#E8C547" />
            </View>
          ) : suggestedUsers.length === 0 ? (
            <View style={styles.centered}>
              <Ionicons name="people-outline" size={40} color="rgba(255,255,255,0.2)" />
              <Text style={styles.emptyText}>No suggestions yet</Text>
            </View>
          ) : (
            <FlatList
              data={suggestedUsers}
              renderItem={renderUser}
              keyExtractor={keyExtractor}
              contentContainerStyle={styles.listContent}
            />
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0C0C0C',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#EDEDED',
    letterSpacing: -0.4,
  },
  headerRule: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginHorizontal: 16,
  },
  searchBarContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141414',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
    borderWidth: 1,
    borderColor: '#1E1E1E',
  },
  searchBarFocused: {
    borderColor: 'rgba(232, 197, 71, 0.35)',
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#EDEDED',
    marginLeft: 8,
    marginRight: 8,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: -0.2,
    textTransform: 'uppercase',
  },
  listContent: {
    paddingBottom: 120,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 100,
  },
  emptyText: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 12,
  },
});

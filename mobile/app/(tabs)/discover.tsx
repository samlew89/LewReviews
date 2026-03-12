// ============================================================================
// LewReviews Mobile - Discover Tab
// ============================================================================
// Redesigned: Trending Debates, Hot Takes, People to Follow sections
// Search mode shows flat user list as before
// ============================================================================

import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { getCurrentUser, supabase } from '../../lib/supabase';
import { useUserSearch } from '../../hooks/useUserSearch';
import { useSuggestedUsers } from '../../hooks/useSuggestedUsers';
import { UserListItem } from '../../components/UserListItem';
import type { FeedVideo, UserSearchResult } from '../../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TREND_CARD_WIDTH = 115;
const TREND_CARD_HEIGHT = 140;
const HOT_TAKE_HEIGHT = 195;

// Placeholder data for when DB is empty — lets us work on UI
const PLACEHOLDER_TRENDING: Partial<FeedVideo>[] = [
  { id: 'ph-t1', title: 'The Batman', movie_title: 'The Batman', thumbnail_url: null, agree_responses_count: 73, disagree_responses_count: 27, username: 'cinephile', avatar_url: null, responses_count: 100 },
  { id: 'ph-t2', title: 'Dune: Part Two', movie_title: 'Dune: Part Two', thumbnail_url: null, agree_responses_count: 48, disagree_responses_count: 52, username: 'filmnerds', avatar_url: null, responses_count: 80 },
  { id: 'ph-t3', title: 'Oppenheimer', movie_title: 'Oppenheimer', thumbnail_url: null, agree_responses_count: 85, disagree_responses_count: 15, username: 'moviebuff42', avatar_url: null, responses_count: 60 },
];

const PLACEHOLDER_HOT_TAKES: Partial<FeedVideo>[] = [
  { id: 'ph-h1', title: 'Joker: Folie à Deux', movie_title: 'Joker: Folie à Deux', thumbnail_url: null, agree_responses_count: 31, disagree_responses_count: 69, username: 'cinephile', avatar_url: null, responses_count: 50 },
  { id: 'ph-h2', title: 'Wonka', movie_title: 'Wonka', thumbnail_url: null, agree_responses_count: 52, disagree_responses_count: 48, username: 'filmnerds', avatar_url: null, responses_count: 40 },
];

const PLACEHOLDER_PEOPLE: Partial<UserSearchResult>[] = [
  { id: 'ph-p1', username: 'moviebuff42', display_name: 'Movie Buff', avatar_url: null, followers_count: 120 },
  { id: 'ph-p2', username: 'realcritic', display_name: 'Real Critic', avatar_url: null, followers_count: 95 },
  { id: 'ph-p3', username: 'hottakes', display_name: 'Hot Takes', avatar_url: null, followers_count: 78 },
];

function getConsensusPercent(video: FeedVideo): number {
  const total = (video.agree_responses_count ?? 0) + (video.disagree_responses_count ?? 0);
  if (total === 0) return 0;
  return Math.round(((video.agree_responses_count ?? 0) / total) * 100);
}

function getConsensusColor(percent: number): string {
  if (percent >= 60) return 'rgba(52, 199, 89, 0.85)';
  if (percent >= 40) return 'rgba(255, 204, 0, 0.85)';
  return 'rgba(255, 59, 48, 0.85)';
}

export default function DiscoverScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
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

  // Fetch trending videos (root videos with most responses)
  const { data: trendingVideos = [] } = useQuery({
    queryKey: ['discover-trending'],
    queryFn: async (): Promise<FeedVideo[]> => {
      const { data, error } = await supabase
        .from('feed_videos')
        .select('*')
        .is('parent_video_id', null)
        .order('responses_count', { ascending: false })
        .limit(6);
      if (error) throw error;
      return (data as FeedVideo[]) ?? [];
    },
    staleTime: 1000 * 60 * 2,
  });

  // Fetch hot takes (most polarizing — closest to 50/50 split with responses)
  const { data: hotTakeVideos = [] } = useQuery({
    queryKey: ['discover-hot-takes'],
    queryFn: async (): Promise<FeedVideo[]> => {
      const { data, error } = await supabase
        .from('feed_videos')
        .select('*')
        .is('parent_video_id', null)
        .gt('responses_count', 0)
        .order('responses_count', { ascending: false })
        .limit(10);
      if (error) throw error;
      const videos = (data as FeedVideo[]) ?? [];
      // Sort by how close to 50/50 split (most polarizing first)
      return videos
        .sort((a, b) => {
          const aTotal = (a.agree_responses_count ?? 0) + (a.disagree_responses_count ?? 0);
          const bTotal = (b.agree_responses_count ?? 0) + (b.disagree_responses_count ?? 0);
          if (aTotal === 0) return 1;
          if (bTotal === 0) return -1;
          const aRatio = Math.abs(0.5 - (a.agree_responses_count ?? 0) / aTotal);
          const bRatio = Math.abs(0.5 - (b.agree_responses_count ?? 0) / bTotal);
          return aRatio - bRatio;
        })
        .slice(0, 4);
    },
    staleTime: 1000 * 60 * 2,
  });

  const isSearchMode = searchText.length > 0;

  // Use real data when available, placeholders otherwise
  const displayTrending = trendingVideos.length > 0
    ? trendingVideos
    : PLACEHOLDER_TRENDING as FeedVideo[];
  const displayHotTakes = hotTakeVideos.length >= 2
    ? hotTakeVideos.slice(0, 2)
    : PLACEHOLDER_HOT_TAKES as FeedVideo[];
  const displayPeople = suggestedUsers.length > 0
    ? suggestedUsers
    : PLACEHOLDER_PEOPLE as UserSearchResult[];

  // Batch-fetch follow states for search results
  const allUserIds = isSearchMode
    ? searchResults.map((u) => u.id)
    : suggestedUsers.map((u) => u.id);

  const { data: followingSet = new Set<string>() } = useQuery({
    queryKey: ['following-set', currentUser?.id, allUserIds.join(',')],
    queryFn: async () => {
      if (!currentUser?.id || allUserIds.length === 0) return new Set<string>();
      const { data, error } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', currentUser.id)
        .in('following_id', allUserIds);
      if (error) throw error;
      return new Set(data.map((f) => f.following_id));
    },
    enabled: !!currentUser?.id && allUserIds.length > 0,
    staleTime: 1000 * 30,
  });

  const handleClear = useCallback(() => {
    setSearchText('');
    inputRef.current?.blur();
  }, []);

  const handleVideoPress = useCallback(
    (videoId: string) => {
      if (videoId.startsWith('ph-')) return; // placeholder, no navigation
      router.push(`/video/${videoId}`);
    },
    [router]
  );

  const handleUserPress = useCallback(
    (userId: string) => {
      if (userId.startsWith('ph-')) return; // placeholder, no navigation
      router.push(`/profile/${userId}`);
    },
    [router]
  );

  const renderSearchUser = useCallback(
    ({ item }: { item: UserSearchResult }) => (
      <UserListItem
        user={item}
        currentUserId={currentUser?.id ?? null}
        initialFollowing={followingSet.has(item.id)}
      />
    ),
    [currentUser?.id, followingSet]
  );

  const keyExtractor = useCallback((item: UserSearchResult) => item.id, []);

  // ── Trending Debates Card ──
  const renderTrendCard = useCallback(
    ({ item }: { item: FeedVideo }) => {
      const percent = getConsensusPercent(item);
      const hasResponses = (item.agree_responses_count ?? 0) + (item.disagree_responses_count ?? 0) > 0;

      return (
        <TouchableOpacity
          style={styles.trendCard}
          onPress={() => handleVideoPress(item.id)}
          activeOpacity={0.85}
        >
          {item.thumbnail_url ? (
            <Image source={{ uri: item.thumbnail_url }} style={styles.trendImage} contentFit="cover" />
          ) : (
            <View style={[styles.trendImage, styles.trendImagePlaceholder]}>
              <Ionicons name="videocam" size={24} color="rgba(255,255,255,0.2)" />
            </View>
          )}
          {/* Consensus badge */}
          {hasResponses && (
            <View style={[styles.consensusBadge, { backgroundColor: getConsensusColor(percent) }]}>
              <Text style={styles.consensusText}>{percent}%</Text>
            </View>
          )}
          {/* Bottom overlay */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.75)']}
            style={styles.trendOverlay}
          >
            <Text style={styles.trendTitle} numberOfLines={1}>
              {item.movie_title || item.title}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      );
    },
    [handleVideoPress]
  );

  // ── Hot Take Card ──
  const renderHotTake = (video: FeedVideo, index: number) => {
    const percent = getConsensusPercent(video);
    const hasResponses = (video.agree_responses_count ?? 0) + (video.disagree_responses_count ?? 0) > 0;

    return (
      <TouchableOpacity
        key={video.id}
        style={[styles.hotTakeCard, index === 0 && { marginRight: 5 }, index === 1 && { marginLeft: 5 }]}
        onPress={() => handleVideoPress(video.id)}
        activeOpacity={0.85}
      >
        {video.thumbnail_url ? (
          <Image source={{ uri: video.thumbnail_url }} style={styles.hotTakeImage} contentFit="cover" />
        ) : (
          <View style={[styles.hotTakeImage, styles.trendImagePlaceholder]}>
            <Ionicons name="videocam" size={28} color="rgba(255,255,255,0.2)" />
          </View>
        )}
        {/* Consensus badge */}
        {hasResponses && (
          <View style={[styles.consensusBadge, { backgroundColor: getConsensusColor(percent) }]}>
            <Text style={styles.consensusText}>{percent}%</Text>
          </View>
        )}
        {/* Bottom overlay */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.75)']}
          style={styles.hotTakeOverlay}
        >
          <View style={styles.hotTakeUserRow}>
            {video.avatar_url ? (
              <Image source={{ uri: video.avatar_url }} style={styles.hotTakeAvatar} contentFit="cover" />
            ) : (
              <View style={[styles.hotTakeAvatar, styles.hotTakeAvatarPlaceholder]}>
                <Ionicons name="person" size={10} color="#fff" />
              </View>
            )}
            <Text style={styles.hotTakeUsername} numberOfLines={1}>@{video.username}</Text>
          </View>
          <Text style={styles.hotTakeMovie} numberOfLines={1}>
            {video.movie_title || video.title}
          </Text>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  // ── People to Follow Card ──
  const renderPersonCard = (user: UserSearchResult) => (
    <TouchableOpacity
      key={user.id}
      style={styles.personCard}
      onPress={() => handleUserPress(user.id)}
      activeOpacity={0.8}
    >
      {user.avatar_url ? (
        <Image source={{ uri: user.avatar_url }} style={styles.personAvatar} contentFit="cover" />
      ) : (
        <View style={[styles.personAvatar, styles.personAvatarPlaceholder]}>
          <Ionicons name="person" size={22} color="rgba(255,255,255,0.5)" />
        </View>
      )}
      <Text style={styles.personUsername} numberOfLines={1}>
        @{user.username}
      </Text>
    </TouchableOpacity>
  );

  // ── Section Header ──
  const SectionHeader = ({ title }: { title: string }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.seeAll}>See all</Text>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Discover</Text>
      </View>

      {/* Search bar */}
      <View style={styles.searchBarContainer}>
        <View style={[styles.searchBar, isFocused && styles.searchBarFocused]}>
          <Ionicons name="search-outline" size={18} color="rgba(255,255,255,0.4)" />
          <TextInput
            ref={inputRef}
            style={styles.searchInput}
            placeholder="Search movies, reviewers..."
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
        // Search results (flat user list)
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
            renderItem={renderSearchUser}
            keyExtractor={keyExtractor}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
          />
        )
      ) : (
        // Browse mode: Trending, Hot Takes, People
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Trending Debates ── */}
          <View style={styles.section}>
            <SectionHeader title="Trending Debates" />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.trendList}
            >
              {displayTrending.map((item) => (
                <React.Fragment key={item.id}>
                  {renderTrendCard({ item })}
                </React.Fragment>
              ))}
            </ScrollView>
          </View>

          {/* ── Hot Takes ── */}
          <View style={styles.section}>
            <SectionHeader title="Hot Takes 🔥" />
            <View style={styles.hotTakesRow}>
              {displayHotTakes.map((v, i) => renderHotTake(v, i))}
            </View>
          </View>

          {/* ── People to Follow ── */}
          <View style={styles.section}>
            <SectionHeader title="People to Follow" />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.peopleRow}
            >
              {displayPeople.slice(0, 6).map(renderPersonCard)}
            </ScrollView>
          </View>
        </ScrollView>
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
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.4,
  },
  searchBarContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 22,
    paddingHorizontal: 14,
    height: 44,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  searchBarFocused: {
    borderColor: 'rgba(232, 197, 71, 0.35)',
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#EDEDED',
    marginLeft: 10,
    marginRight: 8,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  section: {
    marginBottom: 18,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  seeAll: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.4)',
  },

  // ── Trending Debates ──
  trendList: {
    paddingHorizontal: 16,
    gap: 10,
  },
  trendCard: {
    width: TREND_CARD_WIDTH,
    height: TREND_CARD_HEIGHT,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#1A1A1A',
  },
  trendImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  trendImagePlaceholder: {
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  consensusBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  consensusText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  trendOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 8,
    paddingBottom: 8,
    paddingTop: 24,
  },
  trendTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // ── Hot Takes ──
  hotTakesRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
  },
  hotTakeCard: {
    flex: 1,
    height: HOT_TAKE_HEIGHT,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#1A1A1A',
  },
  hotTakeImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  hotTakeOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 8,
    paddingBottom: 8,
    paddingTop: 32,
  },
  hotTakeUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  hotTakeAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#FFFFFF',
    marginRight: 6,
  },
  hotTakeAvatarPlaceholder: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  hotTakeUsername: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  hotTakeMovie: {
    fontSize: 9,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.7)',
    marginTop: 1,
  },

  // ── People to Follow ──
  peopleRow: {
    paddingHorizontal: 16,
    gap: 16,
  },
  personCard: {
    alignItems: 'center',
    width: (SCREEN_WIDTH - 32 - 32) / 3,
  },
  personAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.2)',
    marginBottom: 8,
  },
  personAvatarPlaceholder: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  personUsername: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },

  // ── Search / Empty states ──
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

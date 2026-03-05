import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetFlatList,
  BottomSheetTextInput,
} from '@gorhom/bottom-sheet';
import { useTmdbSearch } from '../hooks/useTmdbSearch';
import type { TmdbSearchResult } from '../types';

interface MovieSearchSheetProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (result: TmdbSearchResult | null, title: string) => void;
}

const ACCENT = '#E8C547';
const SURFACE = '#0C0C0C';
const CARD = '#141414';
const BORDER = '#1E1E1E';
const TEXT_PRIMARY = '#EDEDED';
const TEXT_SECONDARY = '#666';

export default function MovieSearchSheet({
  visible,
  onClose,
  onSelect,
}: MovieSearchSheetProps) {
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ['85%'], []);
  const [query, setQuery] = useState('');
  const { results, isLoading, search, clear } = useTmdbSearch();

  useEffect(() => {
    if (visible) {
      bottomSheetRef.current?.present();
    } else {
      bottomSheetRef.current?.dismiss();
    }
  }, [visible]);

  const handleDismiss = useCallback(() => {
    setQuery('');
    clear();
    onClose();
  }, [clear, onClose]);

  const handleChangeText = useCallback((text: string) => {
    setQuery(text);
    search(text);
  }, [search]);

  const handleSelectResult = useCallback((result: TmdbSearchResult) => {
    const displayTitle = result.year
      ? `${result.title} (${result.year})`
      : result.title;
    setQuery('');
    clear();
    onSelect(result, displayTitle);
  }, [clear, onSelect]);

  const handleSelectGeneral = useCallback(() => {
    setQuery('');
    clear();
    onSelect(null, 'General');
  }, [clear, onSelect]);

  const renderBackdrop = useCallback(
    (props: React.ComponentProps<typeof BottomSheetBackdrop>) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
      />
    ),
    []
  );

  const showResults = query.length >= 2;

  const renderItem = useCallback(({ item }: { item: TmdbSearchResult }) => (
    <TouchableOpacity
      style={styles.resultItem}
      onPress={() => handleSelectResult(item)}
      activeOpacity={0.7}
    >
      {item.poster_path ? (
        <Image
          source={{ uri: item.poster_path }}
          style={styles.poster}
          contentFit="cover"
        />
      ) : (
        <View style={[styles.poster, styles.posterPlaceholder]}>
          <Ionicons
            name={item.media_type === 'movie' ? 'film-outline' : 'tv-outline'}
            size={16}
            color={TEXT_SECONDARY}
          />
        </View>
      )}
      <View style={styles.resultInfo}>
        <Text style={styles.resultTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.resultSubtitle}>
          {item.media_type === 'movie' ? 'Movie' : 'TV Show'}
          {item.year ? ` \u2022 ${item.year}` : ''}
        </Text>
      </View>
    </TouchableOpacity>
  ), [handleSelectResult]);

  const keyExtractor = useCallback(
    (item: TmdbSearchResult) => `${item.media_type}-${item.id}`,
    []
  );

  const renderHeader = useCallback(() => (
    <TouchableOpacity
      style={styles.resultItem}
      onPress={handleSelectGeneral}
      activeOpacity={0.7}
    >
      <View style={styles.generalIcon}>
        <Ionicons name="chatbubble-outline" size={20} color={TEXT_SECONDARY} />
      </View>
      <View style={styles.resultInfo}>
        <Text style={styles.resultTitle}>General</Text>
        <Text style={styles.resultSubtitle}>Not about a specific movie/show</Text>
      </View>
    </TouchableOpacity>
  ), [handleSelectGeneral]);

  const renderEmpty = useCallback(() => {
    if (isLoading) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="small" color={TEXT_SECONDARY} />
        </View>
      );
    }
    if (showResults && results.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No results found</Text>
          <TouchableOpacity onPress={handleSelectGeneral}>
            <Text style={styles.useGeneralLink}>Use "General" instead</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return null;
  }, [isLoading, showResults, results.length, handleSelectGeneral]);

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      snapPoints={snapPoints}
      onDismiss={handleDismiss}
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.background}
      handleIndicatorStyle={styles.handleIndicator}
      enablePanDownToClose
      keyboardBehavior="interactive"
      keyboardBlurBehavior="none"
      android_keyboardInputMode="adjustResize"
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Movie or Show</Text>
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color={TEXT_SECONDARY} style={styles.searchIcon} />
        <BottomSheetTextInput
          style={styles.searchInput}
          value={query}
          onChangeText={handleChangeText}
          placeholder="Search movies & TV shows..."
          placeholderTextColor="#3d3d3d"
          autoFocus
        />
        {isLoading && (
          <ActivityIndicator
            style={styles.searchSpinner}
            size="small"
            color={TEXT_SECONDARY}
          />
        )}
      </View>

      <BottomSheetFlatList
        data={showResults ? results : []}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
      />
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  background: {
    backgroundColor: SURFACE,
  },
  handleIndicator: {
    backgroundColor: '#fff',
    width: 36,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 12,
    backgroundColor: CARD,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: TEXT_PRIMARY,
    paddingVertical: 14,
    letterSpacing: -0.2,
  },
  searchSpinner: {
    marginLeft: 8,
  },
  listContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    gap: 12,
  },
  poster: {
    width: 36,
    height: 54,
    borderRadius: 4,
    backgroundColor: '#1a1a1a',
  },
  posterPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  generalIcon: {
    width: 36,
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultInfo: {
    flex: 1,
    gap: 2,
  },
  resultTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT_PRIMARY,
  },
  resultSubtitle: {
    fontSize: 12,
    color: TEXT_SECONDARY,
  },
  emptyContainer: {
    paddingVertical: 20,
    alignItems: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
    color: TEXT_SECONDARY,
  },
  useGeneralLink: {
    fontSize: 13,
    color: ACCENT,
    fontWeight: '500',
  },
});

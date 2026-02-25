import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTmdbSearch } from '../hooks/useTmdbSearch';
import type { TmdbSearchResult } from '../types';

interface MovieSearchInputProps {
  value: string;
  selectedResult: TmdbSearchResult | null;
  onSelect: (result: TmdbSearchResult | null, title: string) => void;
  disabled?: boolean;
}

const ACCENT = '#E8C547';
const CARD = '#141414';
const BORDER = '#1E1E1E';
const TEXT_PRIMARY = '#EDEDED';
const TEXT_SECONDARY = '#666';

export function MovieSearchInput({
  value,
  selectedResult,
  onSelect,
  disabled = false,
}: MovieSearchInputProps) {
  const [inputValue, setInputValue] = useState(value);
  const [isFocused, setIsFocused] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const { results, isLoading, search, clear } = useTmdbSearch();

  // Sync external value changes
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const handleChangeText = useCallback((text: string) => {
    setInputValue(text);
    setShowResults(true);
    search(text);
    // Clear selection when typing
    if (selectedResult) {
      onSelect(null, text);
    }
  }, [search, selectedResult, onSelect]);

  const handleSelectResult = useCallback((result: TmdbSearchResult) => {
    const displayTitle = result.year
      ? `${result.title} (${result.year})`
      : result.title;
    setInputValue(displayTitle);
    setShowResults(false);
    clear();
    onSelect(result, displayTitle);
  }, [clear, onSelect]);

  const handleSelectGeneral = useCallback(() => {
    setInputValue('General');
    setShowResults(false);
    clear();
    onSelect(null, 'General');
  }, [clear, onSelect]);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    if (inputValue.length >= 2 && !selectedResult) {
      setShowResults(true);
      search(inputValue);
    }
  }, [inputValue, selectedResult, search]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    // Delay hiding results to allow tap to register
    setTimeout(() => setShowResults(false), 200);
  }, []);

  const showDropdown = showResults && (results.length > 0 || isLoading || inputValue.length >= 2);

  return (
    <View style={styles.container}>
      <View style={styles.inputWrapper}>
        <TextInput
          style={[
            styles.input,
            isFocused && styles.inputFocused,
            selectedResult && styles.inputSelected,
          ]}
          value={inputValue}
          onChangeText={handleChangeText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder="Search movies & TV shows..."
          placeholderTextColor="#3d3d3d"
          editable={!disabled}
        />
        {isLoading && (
          <ActivityIndicator
            style={styles.loadingIndicator}
            size="small"
            color={TEXT_SECONDARY}
          />
        )}
        {selectedResult && !isLoading && (
          <View style={styles.checkIndicator}>
            <Ionicons name="checkmark-circle" size={20} color={ACCENT} />
          </View>
        )}
      </View>

      {showDropdown && (
        <View style={styles.dropdown}>
          <ScrollView
            style={styles.resultsList}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
          >
            {/* General option */}
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

            {results.map((result) => (
              <TouchableOpacity
                key={`${result.media_type}-${result.id}`}
                style={styles.resultItem}
                onPress={() => handleSelectResult(result)}
                activeOpacity={0.7}
              >
                {result.poster_path ? (
                  <Image
                    source={{ uri: result.poster_path }}
                    style={styles.poster}
                    contentFit="cover"
                  />
                ) : (
                  <View style={[styles.poster, styles.posterPlaceholder]}>
                    <Ionicons
                      name={result.media_type === 'movie' ? 'film-outline' : 'tv-outline'}
                      size={16}
                      color={TEXT_SECONDARY}
                    />
                  </View>
                )}
                <View style={styles.resultInfo}>
                  <Text style={styles.resultTitle} numberOfLines={1}>
                    {result.title}
                  </Text>
                  <Text style={styles.resultSubtitle}>
                    {result.media_type === 'movie' ? 'Movie' : 'TV Show'}
                    {result.year ? ` • ${result.year}` : ''}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}

            {!isLoading && results.length === 0 && inputValue.length >= 2 && (
              <View style={styles.noResults}>
                <Text style={styles.noResultsText}>No results found</Text>
                <TouchableOpacity onPress={handleSelectGeneral}>
                  <Text style={styles.useGeneralLink}>Use "General" instead</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 10,
  },
  inputWrapper: {
    position: 'relative',
  },
  input: {
    backgroundColor: CARD,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 16,
    paddingVertical: 14,
    paddingRight: 40,
    fontSize: 15,
    color: TEXT_PRIMARY,
    letterSpacing: -0.2,
  },
  inputFocused: {
    borderColor: 'rgba(232,197,71,0.35)',
  },
  inputSelected: {
    borderColor: 'rgba(232,197,71,0.5)',
  },
  loadingIndicator: {
    position: 'absolute',
    right: 14,
    top: '50%',
    marginTop: -10,
  },
  checkIndicator: {
    position: 'absolute',
    right: 14,
    top: '50%',
    marginTop: -10,
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 4,
    backgroundColor: CARD,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    maxHeight: 280,
    overflow: 'hidden',
  },
  resultsList: {
    maxHeight: 280,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
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
  noResults: {
    paddingVertical: 20,
    alignItems: 'center',
    gap: 8,
  },
  noResultsText: {
    fontSize: 13,
    color: TEXT_SECONDARY,
  },
  useGeneralLink: {
    fontSize: 13,
    color: ACCENT,
    fontWeight: '500',
  },
});

export default MovieSearchInput;

// ============================================================================
// LewReviews Mobile - RepliesDrawer Component
// Bottom sheet showing reply previews for a video
// ============================================================================

import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import {
  BottomSheetModal,
  BottomSheetFlatList,
  BottomSheetBackdrop,
} from '@gorhom/bottom-sheet';
import { useInfiniteResponses } from '../../hooks/useResponseChain';
import ReplyListItem from './ReplyListItem';
import type { VideoResponse } from '../../lib/video';

interface RepliesDrawerProps {
  videoId: string | null;
  onClose: () => void;
  onReplyPress: (replyId: string) => void;
}

export default function RepliesDrawer({
  videoId,
  onClose,
  onReplyPress,
}: RepliesDrawerProps) {
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ['50%', '85%'], []);

  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteResponses(videoId ?? undefined, 'all');

  // Flatten paginated responses
  const replies = useMemo(
    () => data?.pages.flatMap((page) => page.responses) ?? [],
    [data]
  );

  // Open/close based on videoId
  useEffect(() => {
    if (videoId) {
      bottomSheetRef.current?.present();
    } else {
      bottomSheetRef.current?.dismiss();
    }
  }, [videoId]);

  const handleDismiss = useCallback(() => {
    onClose();
  }, [onClose]);

  const handleReplyPress = useCallback(
    (replyId: string) => {
      bottomSheetRef.current?.dismiss();
      onReplyPress(replyId);
    },
    [onReplyPress]
  );

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const renderItem = useCallback(
    ({ item }: { item: VideoResponse }) => (
      <ReplyListItem reply={item} onPress={handleReplyPress} />
    ),
    [handleReplyPress]
  );

  const keyExtractor = useCallback((item: VideoResponse) => item.id, []);

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

  const renderFooter = useCallback(() => {
    if (!isFetchingNextPage) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color="#fff" />
      </View>
    );
  }, [isFetchingNextPage]);

  const renderEmpty = useCallback(() => {
    if (isLoading) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      );
    }
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No replies yet</Text>
      </View>
    );
  }, [isLoading]);

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      snapPoints={snapPoints}
      onDismiss={handleDismiss}
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.background}
      handleIndicatorStyle={styles.handleIndicator}
      enablePanDownToClose
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          Replies{replies.length > 0 ? ` (${replies.length})` : ''}
        </Text>
      </View>

      {/* Reply list */}
      <BottomSheetFlatList
        data={replies}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.listContent}
      />
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  background: {
    backgroundColor: '#0C0C0C',
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
  listContent: {
    flexGrow: 1,
  },
  footer: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 15,
  },
});

// ============================================================================
// LewReviews Mobile - Tab Navigation Layout
// Floating pill tab bar
// ============================================================================

import React from 'react';
import { Tabs } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePushNotificationListeners } from '../../hooks/usePushNotifications';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

// Pill geometry
const PILL_HEIGHT = 60;
const PILL_RADIUS = 26;
const PILL_H_MARGIN = 16;

// Tab configuration
const TAB_CONFIG: Record<string, {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconFocused: keyof typeof Ionicons.glyphMap;
}> = {
  feed: { label: 'FEED', icon: 'home-outline', iconFocused: 'home' },
  discover: { label: 'DISCOVER', icon: 'search-outline', iconFocused: 'search' },
  create: { label: '', icon: 'add', iconFocused: 'add' },
  leaderboard: { label: 'RANK', icon: 'trophy-outline', iconFocused: 'trophy' },
  profile: { label: 'PROFILE', icon: 'person-outline', iconFocused: 'person' },
};

function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  // Sit close to bottom safe area — small gap to preserve floating feel
  const bottomPadding = Math.max(Math.round(insets.bottom * 0.35), 4) + 4;

  return (
    <View style={[styles.tabBarContainer, { paddingBottom: bottomPadding }]}>
      {/* Frosted glass pill */}
      <BlurView intensity={40} tint="dark" style={styles.tabPill}>
        <View style={styles.tabPillInner}>
          {state.routes.map((route, index) => {
            const isFocused = state.index === index;
            const config = TAB_CONFIG[route.name];
            if (!config) return null;

            const isCreate = route.name === 'create';

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name, route.params);
              }
            };

            const onLongPress = () => {
              navigation.emit({
                type: 'tabLongPress',
                target: route.key,
              });
            };

            if (isCreate) {
              return (
                <TouchableOpacity
                  key={route.key}
                  style={styles.tabItem}
                  onPress={onPress}
                  onLongPress={onLongPress}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isFocused }}
                  accessibilityLabel="Create"
                >
                  <View style={styles.createButton}>
                    <Ionicons name="add" size={22} color="#fff" />
                  </View>
                </TouchableOpacity>
              );
            }

            const iconName = isFocused ? config.iconFocused : config.icon;
            const tintColor = isFocused ? '#fff' : 'rgba(255,255,255,0.4)';

            return (
              <TouchableOpacity
                key={route.key}
                style={[styles.tabItem, isFocused && styles.tabItemActive]}
                onPress={onPress}
                onLongPress={onLongPress}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityState={{ selected: isFocused }}
                accessibilityLabel={config.label}
              >
                <Ionicons name={iconName} size={20} color={tintColor} />
                <Text style={[styles.tabLabel, { color: tintColor }]}>
                  {config.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </BlurView>
    </View>
  );
}

export default function TabsLayout() {
  usePushNotificationListeners();

  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="feed" />
      <Tabs.Screen name="discover" />
      <Tabs.Screen name="create" />
      <Tabs.Screen name="leaderboard" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: PILL_H_MARGIN,
  },
  tabPill: {
    borderRadius: PILL_RADIUS,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 12,
  },
  tabPillInner: {
    flexDirection: 'row',
    height: PILL_HEIGHT,
    paddingVertical: 5,
    paddingHorizontal: 6,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    gap: 3,
  },
  tabItemActive: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  tabLabel: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  createButton: {
    width: 38,
    height: 30,
    borderRadius: 10,
    backgroundColor: '#ff2d55',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#ff2d55',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
});

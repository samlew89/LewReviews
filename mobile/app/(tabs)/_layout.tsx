// ============================================================================
// LewReviews Mobile - Tab Navigation Layout
// Feed, Create, Profile tabs with custom styling
// ============================================================================

import { Tabs } from 'expo-router';
import { View, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type TabIconProps = {
  name: keyof typeof Ionicons.glyphMap;
  color: string;
  focused: boolean;
};

function TabIcon({ name, color, focused }: TabIconProps) {
  return (
    <View style={styles.iconContainer}>
      <Ionicons name={name} size={focused ? 28 : 24} color={color} />
      {focused && <View style={[styles.activeIndicator, { backgroundColor: color }]} />}
    </View>
  );
}

function CreateTabIcon({ focused }: { focused: boolean }) {
  return (
    <View style={styles.createButtonContainer}>
      <View style={[styles.createButton, focused && styles.createButtonActive]}>
        <Ionicons name="add" size={28} color="#fff" />
      </View>
    </View>
  );
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: [
          styles.tabBar,
          { paddingBottom: insets.bottom > 0 ? insets.bottom : 8 },
        ],
        tabBarActiveTintColor: '#fff',
        tabBarInactiveTintColor: 'rgba(255, 255, 255, 0.5)',
        tabBarShowLabel: true,
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tabs.Screen
        name="feed"
        options={{
          title: 'Feed',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name={focused ? 'home' : 'home-outline'}
              color={color}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: '',
          tabBarIcon: ({ focused }) => <CreateTabIcon focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name={focused ? 'person' : 'person-outline'}
              color={color}
              focused={focused}
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    borderTopWidth: 0,
    elevation: 0,
    height: Platform.OS === 'ios' ? 85 : 65,
    paddingTop: 8,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 4,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  activeIndicator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 2,
  },
  createButtonContainer: {
    alignItems: 'center',
  },
  createButton: {
    width: 56,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#ff2d55',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 11,
  },
  createButtonActive: {
    transform: [{ scale: 1.05 }],
  },
});

import React from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Markdown from 'react-native-markdown-display';

interface LegalScreenProps {
  title: string;
  content: string;
}

const markdownStyles = StyleSheet.create({
  body: { color: '#fff', fontSize: 14, lineHeight: 22 },
  heading1: { color: '#fff', fontSize: 22, fontWeight: '700', marginTop: 24, marginBottom: 8 },
  heading2: { color: '#fff', fontSize: 18, fontWeight: '600', marginTop: 20, marginBottom: 6 },
  heading3: { color: '#fff', fontSize: 16, fontWeight: '600', marginTop: 16, marginBottom: 4 },
  paragraph: { color: 'rgba(255,255,255,0.85)', fontSize: 14, lineHeight: 22, marginBottom: 12 },
  strong: { color: '#fff', fontWeight: '600' },
  link: { color: '#d4a017' },
  bullet_list: { marginBottom: 8 },
  ordered_list: { marginBottom: 8 },
  list_item: { color: 'rgba(255,255,255,0.85)', fontSize: 14, lineHeight: 22, marginBottom: 4 },
  hr: { backgroundColor: 'rgba(255,255,255,0.15)', height: 1, marginVertical: 16 },
  table: { borderColor: 'rgba(255,255,255,0.2)' },
  thead: { backgroundColor: 'rgba(255,255,255,0.05)' },
  th: { color: '#fff', fontSize: 13, fontWeight: '600', padding: 8, borderColor: 'rgba(255,255,255,0.2)' },
  td: { color: 'rgba(255,255,255,0.85)', fontSize: 13, padding: 8, borderColor: 'rgba(255,255,255,0.2)' },
  tr: { borderColor: 'rgba(255,255,255,0.2)' },
  blockquote: { backgroundColor: 'rgba(255,255,255,0.05)', borderLeftColor: '#d4a017', borderLeftWidth: 3, paddingHorizontal: 12, paddingVertical: 4, marginBottom: 12 },
});

export default function LegalScreen({ title, content }: LegalScreenProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
        <View style={styles.headerSpacer} />
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 32 }}
      >
        <Markdown style={markdownStyles}>{content}</Markdown>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#fff', flex: 1, textAlign: 'center' },
  headerSpacer: { width: 40 },
  scroll: { flex: 1 },
});

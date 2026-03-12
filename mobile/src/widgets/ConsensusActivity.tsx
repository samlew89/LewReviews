// ============================================================================
// LewReviews — Dynamic Island Live Activity
// Shows consensus percentage for the current video in the Dynamic Island
// ============================================================================

import { Text } from '@expo/ui/swift-ui';
import { HStack } from '@expo/ui/swift-ui';
import { VStack } from '@expo/ui/swift-ui';
import { Image } from '@expo/ui/swift-ui';
import {
  font,
  foregroundStyle,
  padding,
  frame,
} from '@expo/ui/swift-ui/modifiers';
import { createLiveActivity } from 'expo-widgets';
import type { LiveActivityLayout } from 'expo-widgets';

export type ConsensusActivityProps = {
  percent: number;
  movieTitle: string;
  isAgree: boolean; // true = majority agree, false = majority disagree
};

function ConsensusActivity(props: ConsensusActivityProps): LiveActivityLayout {
  'widget';

  const accentColor = props.isAgree ? '#34C759' : '#FF3B30';
  const label = props.isAgree ? 'agree' : 'disagree';

  return {
    // Lock screen banner
    banner: (
      <HStack spacing={8} modifiers={[padding({ horizontal: 16, vertical: 12 })]}>
        <Image systemName="film" modifiers={[foregroundStyle(accentColor), frame({ width: 20, height: 20 })]} />
        <VStack modifiers={[frame({ maxWidth: 9999, alignment: 'leading' })]}>
          <Text modifiers={[font({ weight: 'semibold', size: 15 }), foregroundStyle('#FFFFFF')]}>
            {props.movieTitle}
          </Text>
          <HStack spacing={4}>
            <Text modifiers={[font({ weight: 'heavy', size: 14 }), foregroundStyle(accentColor)]}>
              {props.percent}%
            </Text>
            <Text modifiers={[font({ size: 13 }), foregroundStyle('#FFFFFFCC')]}>
              {label}
            </Text>
          </HStack>
        </VStack>
      </HStack>
    ),

    // Compact Dynamic Island — leading side
    compactLeading: (
      <Text modifiers={[font({ weight: 'heavy', size: 14 }), foregroundStyle(accentColor)]}>
        {props.percent}%
      </Text>
    ),

    // Compact Dynamic Island — trailing side
    compactTrailing: (
      <Text modifiers={[font({ weight: 'medium', size: 12 }), foregroundStyle('#FFFFFFCC')]}>
        {label}
      </Text>
    ),

    // Minimal (when another Live Activity takes priority)
    minimal: (
      <Text modifiers={[font({ weight: 'heavy', size: 12 }), foregroundStyle(accentColor)]}>
        {props.percent}%
      </Text>
    ),

    // Expanded — leading
    expandedLeading: (
      <VStack modifiers={[padding({ leading: 4 })]}>
        <Image systemName="film" modifiers={[foregroundStyle(accentColor), frame({ width: 24, height: 24 })]} />
      </VStack>
    ),

    // Expanded — trailing
    expandedTrailing: (
      <VStack modifiers={[padding({ trailing: 4 })]}>
        <Text modifiers={[font({ weight: 'heavy', size: 22 }), foregroundStyle(accentColor)]}>
          {props.percent}%
        </Text>
        <Text modifiers={[font({ size: 11 }), foregroundStyle('#FFFFFFCC')]}>
          {label}
        </Text>
      </VStack>
    ),

    // Expanded — bottom
    expandedBottom: (
      <Text
        modifiers={[
          font({ weight: 'medium', size: 13 }),
          foregroundStyle('#FFFFFFCC'),
          padding({ bottom: 4 }),
        ]}
      >
        {props.movieTitle}
      </Text>
    ),
  };
}

export default createLiveActivity('ConsensusActivity', ConsensusActivity);

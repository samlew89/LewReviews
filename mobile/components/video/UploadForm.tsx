import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Video, ResizeMode } from 'expo-av';
import { VideoMetadata, UploadProgress, VideoUploadInput } from '../../types';
import { CONTENT_CONSTRAINTS } from '../../constants/config';

interface UploadFormProps {
  selectedVideo: VideoMetadata | null;
  thumbnailUri: string | null;
  progress: UploadProgress;
  parentVideoId?: string;
  parentVideoTitle?: string;
  agreeDisagree?: boolean;
  onPickFromGallery: () => Promise<void>;
  onRecordVideo: () => Promise<void>;
  onUpload: (input: VideoUploadInput) => Promise<void>;
  onCancel: () => void;
  submitButtonText?: string;
  showAgreeDisagree?: boolean;
}

// ── Progress Indicator ──────────────────────────────────────────────────────

const ProgressIndicator: React.FC<{
  progress: number;
  stage: UploadProgress['stage'];
  message: string;
}> = ({ progress, stage, message }) => {
  const fillAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fillAnim, {
      toValue: progress,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [progress, fillAnim]);

  const isActive = stage !== 'idle' && stage !== 'error' && stage !== 'complete';
  if (!isActive && stage !== 'complete') return null;

  const fillWidth = fillAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={s.progressWrap}>
      <View style={s.progressTrack}>
        <Animated.View
          style={[
            s.progressFill,
            { width: fillWidth },
            stage === 'complete' && s.progressFillDone,
          ]}
        />
      </View>
      <Text style={s.progressMsg}>{message}</Text>
    </View>
  );
};

// ── Error Banner ────────────────────────────────────────────────────────────

const ErrorBanner: React.FC<{ error: string; onDismiss: () => void }> = ({
  error,
  onDismiss,
}) => (
  <View style={s.errorBanner}>
    <View style={s.errorDot} />
    <Text style={s.errorMsg} numberOfLines={2}>{error}</Text>
    <TouchableOpacity onPress={onDismiss} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
      <Ionicons name="close" size={18} color="rgba(255,255,255,0.5)" />
    </TouchableOpacity>
  </View>
);

// ── Video Preview ───────────────────────────────────────────────────────────

const VideoPreview: React.FC<{
  videoUri: string;
  thumbnailUri: string | null;
  duration: number;
}> = ({ videoUri, thumbnailUri, duration }) => {
  const [isPlaying, setIsPlaying] = useState(false);

  const fmt = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <View style={s.previewWrap}>
      {isPlaying ? (
        <Video
          source={{ uri: videoUri }}
          style={s.previewVideo}
          useNativeControls
          resizeMode={ResizeMode.CONTAIN}
          shouldPlay
          onPlaybackStatusUpdate={(status) => {
            if (status.isLoaded && status.didJustFinish) setIsPlaying(false);
          }}
        />
      ) : (
        <TouchableOpacity
          style={s.previewTouchable}
          onPress={() => setIsPlaying(true)}
          activeOpacity={0.9}
        >
          {thumbnailUri ? (
            <Image source={{ uri: thumbnailUri }} style={s.previewThumb} />
          ) : (
            <View style={s.previewPlaceholder}>
              <Ionicons name="film-outline" size={32} color="#333" />
            </View>
          )}
          <View style={s.previewOverlay}>
            <View style={s.playCircle}>
              <Ionicons name="play" size={24} color="#000" style={{ marginLeft: 2 }} />
            </View>
          </View>
          <View style={s.durationPill}>
            <Text style={s.durationLabel}>{fmt(duration)}</Text>
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
};

// ── Record / Gallery Picker ─────────────────────────────────────────────────

const MediaPicker: React.FC<{
  onRecord: () => void;
  onGallery: () => void;
  disabled: boolean;
  isResponse: boolean;
}> = ({ onRecord, onGallery, disabled, isResponse }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  return (
    <View style={s.pickerArea}>
      <Text style={s.pickerLabel}>
        {isResponse ? 'Record your response' : 'Record your take'}
      </Text>

      <View style={s.pickerActions}>
        <TouchableOpacity
          onPress={onRecord}
          disabled={disabled}
          activeOpacity={0.8}
          style={s.recordOuter}
        >
          <Animated.View style={[s.recordPulseRing, { transform: [{ scale: pulseAnim }] }]} />
          <View style={s.recordBtnCircle}>
            <View style={s.recordDot} />
          </View>
          <Text style={s.recordLabel}>Record</Text>
        </TouchableOpacity>

        <View style={s.pickerDivider}>
          <View style={s.dividerLine} />
          <Text style={s.dividerText}>or</Text>
          <View style={s.dividerLine} />
        </View>

        <TouchableOpacity
          onPress={onGallery}
          disabled={disabled}
          activeOpacity={0.7}
          style={s.galleryBtn}
        >
          <Ionicons name="images-outline" size={18} color="#999" />
          <Text style={s.galleryLabel}>Choose from library</Text>
          <Ionicons name="chevron-forward" size={14} color="#444" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ── Stance Picker ───────────────────────────────────────────────────────────

const StancePicker: React.FC<{
  value: boolean | undefined;
  onChange: (v: boolean) => void;
  parentTitle?: string;
  disabled: boolean;
}> = ({ value, onChange, parentTitle, disabled }) => {
  const agreeScale = useRef(new Animated.Value(1)).current;
  const disagreeScale = useRef(new Animated.Value(1)).current;

  const handlePress = (stance: boolean) => {
    const anim = stance ? agreeScale : disagreeScale;
    Animated.sequence([
      Animated.timing(anim, { toValue: 0.93, duration: 80, useNativeDriver: true }),
      Animated.timing(anim, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();
    onChange(stance);
  };

  return (
    <View style={s.stanceWrap}>
      {parentTitle && (
        <Text style={s.stanceContext} numberOfLines={1}>
          Responding to "{parentTitle}"
        </Text>
      )}
      <Text style={s.stanceTitle}>What's your stance?</Text>

      <View style={s.stanceRow}>
        <Animated.View style={[s.stanceCardWrap, { transform: [{ scale: agreeScale }] }]}>
          <TouchableOpacity
            style={[
              s.stanceCard,
              value === true && s.stanceCardAgreeActive,
            ]}
            onPress={() => handlePress(true)}
            disabled={disabled}
            activeOpacity={0.85}
          >
            <View style={[
              s.stanceIconBg,
              value === true ? s.stanceIconAgree : s.stanceIconInactive,
            ]}>
              <Ionicons
                name="checkmark-sharp"
                size={22}
                color={value === true ? '#fff' : '#4ade80'}
              />
            </View>
            <Text style={[
              s.stanceLabel,
              value === true && s.stanceLabelActive,
            ]}>
              Agree
            </Text>
          </TouchableOpacity>
        </Animated.View>

        <Animated.View style={[s.stanceCardWrap, { transform: [{ scale: disagreeScale }] }]}>
          <TouchableOpacity
            style={[
              s.stanceCard,
              value === false && s.stanceCardDisagreeActive,
            ]}
            onPress={() => handlePress(false)}
            disabled={disabled}
            activeOpacity={0.85}
          >
            <View style={[
              s.stanceIconBg,
              value === false ? s.stanceIconDisagree : s.stanceIconInactive,
            ]}>
              <Ionicons
                name="close-sharp"
                size={22}
                color={value === false ? '#fff' : '#f87171'}
              />
            </View>
            <Text style={[
              s.stanceLabel,
              value === false && s.stanceLabelActive,
            ]}>
              Disagree
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
};

// ── Main Upload Form ────────────────────────────────────────────────────────

export const UploadForm: React.FC<UploadFormProps> = ({
  selectedVideo,
  thumbnailUri,
  progress,
  parentVideoId,
  parentVideoTitle,
  agreeDisagree: initialAgreeDisagree,
  onPickFromGallery,
  onRecordVideo,
  onUpload,
  onCancel,
  submitButtonText = 'Upload Video',
  showAgreeDisagree = false,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [agreeDisagree, setAgreeDisagree] = useState<boolean | undefined>(initialAgreeDisagree);
  const [showError, setShowError] = useState(true);
  const [titleFocused, setTitleFocused] = useState(false);
  const [descFocused, setDescFocused] = useState(false);

  const isUploading = ['uploading', 'creating_record', 'compressing', 'generating_thumbnail'].includes(
    progress.stage
  );
  const isComplete = progress.stage === 'complete';
  const hasError = progress.stage === 'error' && showError;
  const canSubmit =
    selectedVideo &&
    title.trim().length >= CONTENT_CONSTRAINTS.TITLE_MIN_LENGTH &&
    !isUploading;

  const titleLen = title.length;
  const descLen = description.length;

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;

    if (showAgreeDisagree && agreeDisagree === undefined) {
      Alert.alert('Pick a side', 'Choose agree or disagree before posting.');
      return;
    }

    await onUpload({
      title: title.trim(),
      description: description.trim() || undefined,
      parentVideoId,
      agreeDisagree,
    });
  }, [canSubmit, title, description, parentVideoId, agreeDisagree, showAgreeDisagree, onUpload]);

  const handlePickFromGallery = useCallback(async () => {
    setShowError(true);
    await onPickFromGallery();
  }, [onPickFromGallery]);

  const handleRecordVideo = useCallback(async () => {
    setShowError(true);
    await onRecordVideo();
  }, [onRecordVideo]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={s.root}
    >
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollInner}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {hasError && progress.error && (
          <ErrorBanner error={progress.error} onDismiss={() => setShowError(false)} />
        )}

        {showAgreeDisagree && (
          <StancePicker
            value={agreeDisagree}
            onChange={setAgreeDisagree}
            parentTitle={parentVideoTitle}
            disabled={isUploading}
          />
        )}

        {selectedVideo ? (
          <>
            <VideoPreview
              videoUri={selectedVideo.uri}
              thumbnailUri={thumbnailUri}
              duration={selectedVideo.duration}
            />
            {!isUploading && (
              <TouchableOpacity
                style={s.changeBtn}
                onPress={handlePickFromGallery}
                activeOpacity={0.6}
              >
                <Ionicons name="swap-horizontal" size={14} color="#999" />
                <Text style={s.changeTxt}>Change video</Text>
              </TouchableOpacity>
            )}
          </>
        ) : (
          <MediaPicker
            onRecord={handleRecordVideo}
            onGallery={handlePickFromGallery}
            disabled={isUploading}
            isResponse={showAgreeDisagree}
          />
        )}

        {/* Title */}
        <View style={s.fieldWrap}>
          <View style={s.fieldHeader}>
            <Text style={s.fieldLabel}>Title</Text>
            <Text style={[
              s.fieldCount,
              titleLen > CONTENT_CONSTRAINTS.TITLE_MAX_LENGTH - 20 && s.fieldCountWarn,
            ]}>
              {titleLen}/{CONTENT_CONSTRAINTS.TITLE_MAX_LENGTH}
            </Text>
          </View>
          <TextInput
            style={[s.input, titleFocused && s.inputFocused]}
            value={title}
            onChangeText={setTitle}
            placeholder="What's your hot take?"
            placeholderTextColor="#3d3d3d"
            maxLength={CONTENT_CONSTRAINTS.TITLE_MAX_LENGTH}
            editable={!isUploading}
            onFocus={() => setTitleFocused(true)}
            onBlur={() => setTitleFocused(false)}
          />
        </View>

        {/* Description */}
        <View style={s.fieldWrap}>
          <View style={s.fieldHeader}>
            <Text style={[s.fieldLabel, s.fieldLabelOptional]}>Description</Text>
            <Text style={[
              s.fieldCount,
              descLen > CONTENT_CONSTRAINTS.DESCRIPTION_MAX_LENGTH - 100 && s.fieldCountWarn,
            ]}>
              {descLen}/{CONTENT_CONSTRAINTS.DESCRIPTION_MAX_LENGTH}
            </Text>
          </View>
          <TextInput
            style={[s.input, s.inputMulti, descFocused && s.inputFocused]}
            value={description}
            onChangeText={setDescription}
            placeholder="Add context, spoiler warnings, etc."
            placeholderTextColor="#3d3d3d"
            maxLength={CONTENT_CONSTRAINTS.DESCRIPTION_MAX_LENGTH}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            editable={!isUploading}
            onFocus={() => setDescFocused(true)}
            onBlur={() => setDescFocused(false)}
          />
        </View>

        <ProgressIndicator
          progress={progress.progress}
          stage={progress.stage}
          message={progress.message}
        />

        {/* Actions */}
        <View style={s.actions}>
          <TouchableOpacity
            style={s.cancelBtn}
            onPress={onCancel}
            disabled={isUploading}
            activeOpacity={0.6}
          >
            <Text style={s.cancelTxt}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.submitBtn, !canSubmit && s.submitBtnOff]}
            onPress={handleSubmit}
            disabled={!canSubmit}
            activeOpacity={0.85}
          >
            {isUploading ? (
              <ActivityIndicator color="#000" size="small" />
            ) : (
              <>
                <Text style={[s.submitTxt, !canSubmit && s.submitTxtOff]}>
                  {isComplete ? 'Posted' : submitButtonText}
                </Text>
                {isComplete && (
                  <Ionicons name="checkmark" size={18} color="#000" style={{ marginLeft: 4 }} />
                )}
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

// ── Styles ──────────────────────────────────────────────────────────────────

const ACCENT = '#E8C547';
const SURFACE = '#0C0C0C';
const CARD = '#141414';
const BORDER = '#1E1E1E';
const TEXT_PRIMARY = '#EDEDED';
const TEXT_SECONDARY = '#666';
const TEXT_MUTED = '#3d3d3d';
const AGREE_COLOR = '#4ade80';
const DISAGREE_COLOR = '#f87171';
const RADIUS = 14;

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: SURFACE,
  },
  scroll: {
    flex: 1,
  },
  scrollInner: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 48,
  },

  // ── Error Banner
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(248,113,113,0.08)',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.15)',
  },
  errorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: DISAGREE_COLOR,
    marginRight: 10,
  },
  errorMsg: {
    flex: 1,
    fontSize: 13,
    color: '#fca5a5',
    lineHeight: 18,
    letterSpacing: -0.1,
  },

  // ── Stance Picker
  stanceWrap: {
    marginBottom: 28,
  },
  stanceContext: {
    fontSize: 13,
    color: TEXT_SECONDARY,
    letterSpacing: -0.2,
    marginBottom: 4,
  },
  stanceTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    letterSpacing: -0.6,
    marginBottom: 16,
  },
  stanceRow: {
    flexDirection: 'row',
    gap: 10,
  },
  stanceCardWrap: {
    flex: 1,
  },
  stanceCard: {
    borderRadius: RADIUS,
    borderWidth: 1.5,
    borderColor: BORDER,
    backgroundColor: CARD,
    paddingVertical: 22,
    alignItems: 'center',
    gap: 10,
  },
  stanceCardAgreeActive: {
    borderColor: AGREE_COLOR,
    backgroundColor: 'rgba(74,222,128,0.06)',
  },
  stanceCardDisagreeActive: {
    borderColor: DISAGREE_COLOR,
    backgroundColor: 'rgba(248,113,113,0.06)',
  },
  stanceIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stanceIconInactive: {
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  stanceIconAgree: {
    backgroundColor: AGREE_COLOR,
  },
  stanceIconDisagree: {
    backgroundColor: DISAGREE_COLOR,
  },
  stanceLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: TEXT_SECONDARY,
    letterSpacing: -0.3,
  },
  stanceLabelActive: {
    color: TEXT_PRIMARY,
  },

  // ── Media Picker
  pickerArea: {
    alignItems: 'center',
    marginBottom: 28,
    paddingTop: 8,
  },
  pickerLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: TEXT_SECONDARY,
    letterSpacing: -0.3,
    marginBottom: 28,
  },
  pickerActions: {
    alignItems: 'center',
    width: '100%',
  },
  recordOuter: {
    alignItems: 'center',
    marginBottom: 24,
  },
  recordPulseRing: {
    position: 'absolute',
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 1.5,
    borderColor: 'rgba(232,197,71,0.2)',
  },
  recordBtnCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 3,
    borderColor: ACCENT,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  recordDot: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: ACCENT,
  },
  recordLabel: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: '600',
    color: ACCENT,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  pickerDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 18,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: BORDER,
  },
  dividerText: {
    marginHorizontal: 14,
    fontSize: 12,
    color: TEXT_MUTED,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  galleryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: RADIUS,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: CARD,
    width: '100%',
  },
  galleryLabel: {
    flex: 1,
    fontSize: 14,
    color: '#888',
    letterSpacing: -0.2,
  },

  // ── Video Preview
  previewWrap: {
    borderRadius: RADIUS,
    overflow: 'hidden',
    marginBottom: 8,
    backgroundColor: CARD,
    aspectRatio: 9 / 16,
    maxHeight: 360,
    alignSelf: 'center',
    width: '100%',
  },
  previewVideo: {
    width: '100%',
    height: '100%',
  },
  previewTouchable: {
    width: '100%',
    height: '100%',
  },
  previewThumb: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  previewPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: CARD,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  playCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  durationPill: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  durationLabel: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },

  // ── Change Video
  changeBtn: {
    flexDirection: 'row',
    alignSelf: 'center',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  changeTxt: {
    color: '#999',
    fontSize: 13,
    fontWeight: '500',
  },

  // ── Form Fields
  fieldWrap: {
    marginBottom: 18,
  },
  fieldHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: TEXT_PRIMARY,
    letterSpacing: -0.2,
  },
  fieldLabelOptional: {
    color: TEXT_SECONDARY,
  },
  fieldCount: {
    fontSize: 11,
    color: TEXT_MUTED,
    fontVariant: ['tabular-nums'],
  },
  fieldCountWarn: {
    color: '#d97706',
  },
  input: {
    backgroundColor: CARD,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: TEXT_PRIMARY,
    letterSpacing: -0.2,
  },
  inputFocused: {
    borderColor: 'rgba(232,197,71,0.35)',
  },
  inputMulti: {
    minHeight: 88,
    paddingTop: 14,
  },

  // ── Progress
  progressWrap: {
    marginVertical: 16,
  },
  progressTrack: {
    height: 3,
    backgroundColor: BORDER,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: ACCENT,
    borderRadius: 2,
  },
  progressFillDone: {
    backgroundColor: AGREE_COLOR,
  },
  progressMsg: {
    fontSize: 12,
    color: TEXT_SECONDARY,
    textAlign: 'center',
    marginTop: 8,
    letterSpacing: -0.1,
  },

  // ── Actions
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  cancelTxt: {
    fontSize: 15,
    fontWeight: '600',
    color: TEXT_SECONDARY,
    letterSpacing: -0.2,
  },
  submitBtn: {
    flex: 2,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: ACCENT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnOff: {
    backgroundColor: 'rgba(232,197,71,0.12)',
  },
  submitTxt: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000',
    letterSpacing: -0.2,
  },
  submitTxtOff: {
    color: 'rgba(232,197,71,0.35)',
  },
});

export default UploadForm;

# Changelog (Resolved Issues)

## App Store Prep
- Video compression: Added react-native-compressor with auto compression before upload
- EAS Build configured (eas.json), Sentry crash reporting, PostHog analytics

## Upload & Storage
- Video uploads were 0 bytes (fetch→blob broken in RN; fixed with FileSystem.uploadAsync)
- Avatar upload used atob() unavailable in RN (fixed with fetch→blob)
- Avatar upload used fetch→blob which produced 0-byte files; fixed with FileSystem.uploadAsync
- .mov uploads rejected with 415 (Content-Type was video/mov; fixed to video/quicktime)

## UI/UX Fixes
- Respond button showed "No video specified" (param name mismatch: parentVideoId vs videoId)
- Avatar button overlapped response indicator (moved to small inline avatar next to username)
- Profile layout: avatar and stats now in same horizontal row (TikTok-style)
- Profile stats row uses equal-width flex columns so middle column is always centered
- Profile avatar camera badge no longer clipped (borderRadius moved to image)
- Avatar tappable with "+" badge (no avatar) or pencil badge (has avatar)
- Edit profile simplified: single "Name" field, bio only, no avatar section
- Redesigned upload flows with dark cinema aesthetic (amber/gold accent, animated record button)
- Feed overlay used hardcoded bottom offsets; now uses dynamic TAB_BAR_HEIGHT + insets.bottom
- Video detail screen bottom offsets fixed (no tab bar on stack screen)
- Tab bar order: Feed | Discover | Create (+) | Ranks | Profile
- Tab bar: "Ranks" renamed to "Rank"

## Agree/Disagree System
- Replaced likes system with agree/disagree counts
- Profile page "Likes" stat replaced with "Ratio" (total agrees - total disagrees)
- Added Agreed/Disagreed tabs to profile
- Removed tap-to-vote; video responses are now the ONLY way to agree/disagree
- Replaced thumbs icons with checkmark/X icons
- Added consensus percentage display (e.g., "73% agree")
- Consensus percentage moved to top-left pill badge
- Agrees/Disagrees badge moved to right-side action icon

## Response Flow
- Consolidated response flow into single screen: stance picker + video record/upload in one modal
- Flat reply architecture: all replies target root video, no nested chains
- Replies button hidden on response videos; Reply button on responses redirects to root
- response-upload resolves parentVideoId to root if it points to a response

## Video Playback
- Removed swipe gestures for navigation (conflicted with FlatList scrolling)
- Share sheet no longer pauses/unpauses video (playback state preserved)
- Global mute: mute/unmute persists across all videos via module-level state
- Tap-to-pause: VideoCard root changed to Pressable with onTap prop
- Feed autoplay fix: share sheet effect was pausing videos on mount
- VideoPlayer no longer handles touch events; mute button lives in VideoFeed's VideoItem layer
- VideoPlayer buffering spinner no longer flashes on initial render
- VideoPlayer autoplay: single 100ms polling interval for play/pause and progress bar
- Feed videos now pause when switching to other tabs

## Replies Drawer
- Replies button opens bottom sheet drawer instead of navigating
- Shows all replies with avatar, username, stance, thumbnail, relative timestamp
- Uses @gorhom/bottom-sheet v5 with BottomSheetModal + BottomSheetFlatList
- Replies button icon changed from chevron-forward to people
- Video detail Replies button uses live response data from useResponseChain hook

## Navigation
- Post-upload navigation: new posts navigate to video detail; responses navigate to parent video
- Feed Replies button passes showReplies param for auto-navigation
- Added Discover tab, followers/following list screens

## Performance
- Replies button fetches first response ID directly (eliminated double-load)
- Response counts combined from 2 sequential COUNT queries into 1
- Parent video waterfall eliminated — parent_video_id passed from already-loaded data
- Added 2-minute staleTime to all response chain queries
- Leaderboard friends tab reduced from 2 queries to 1 (Supabase JOIN)
- Leaderboard all tab uses server-side ORDER BY
- Follow mutation invalidates on success only
- Video upload cache invalidation targeted to specific feed keys
- Video upload of responses invalidates parent video's response chain cache
- Added database indexes for profiles, follows, video_votes, videos
- Added vote_agree_count/vote_disagree_count to Video TypeScript type
- Feed query staleTime set to 1 minute (prevents spinner on tab switches)
- Feed cache invalidated after video upload
- VideoFeed renderItem stabilized: activeIndex read from ref

## Code Cleanup
- Removed dead code: Like/VideoVote types, useVideoDetail hook, unused thumbnailUrl prop
- Avatar upload no longer invalidates feed query (uses setQueriesData)
- VideoCard no longer imports supabase directly

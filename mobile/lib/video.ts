import { supabase } from './supabase';

// Types for video responses
export interface Video {
  id: string;
  user_id: string;
  parent_video_id: string | null;
  root_video_id: string | null;
  chain_depth: number;
  title: string;
  description: string | null;
  video_url: string;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  width: number | null;
  height: number | null;
  status: 'processing' | 'ready' | 'failed' | 'deleted';
  visibility: 'public' | 'unlisted' | 'private';
  views_count: number;
  likes_count: number;
  responses_count: number;
  agree_disagree: boolean | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
}

export interface VideoWithProfile extends Video {
  username: string;
  display_name: string | null;
  avatar_url: string | null;
}

export interface ResponseCounts {
  agree: number;
  disagree: number;
  total: number;
}

export interface VideoResponse extends VideoWithProfile {
  agree_disagree: boolean;
}

/**
 * Fetch a video by ID with its responses (direct children only for MVP)
 */
export async function getVideoWithResponses(
  videoId: string,
  limit: number = 20,
  offset: number = 0
): Promise<{
  video: VideoWithProfile | null;
  responses: VideoResponse[];
  responseCounts: ResponseCounts;
  error: Error | null;
}> {
  try {
    // Fetch the main video with profile info
    const { data: video, error: videoError } = await supabase
      .from('feed_videos')
      .select('*')
      .eq('id', videoId)
      .single();

    if (videoError) {
      throw videoError;
    }

    // Fetch direct responses with profile info
    const { data: responses, error: responsesError } = await supabase
      .from('feed_videos')
      .select('*')
      .eq('parent_video_id', videoId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (responsesError) {
      throw responsesError;
    }

    // Get response counts
    const counts = await getResponseCounts(videoId);

    return {
      video: video as VideoWithProfile,
      responses: (responses || []) as VideoResponse[],
      responseCounts: counts,
      error: null,
    };
  } catch (error) {
    return {
      video: null,
      responses: [],
      responseCounts: { agree: 0, disagree: 0, total: 0 },
      error: error as Error,
    };
  }
}

/**
 * Get response counts for a video (agree/disagree separately)
 */
export async function getResponseCounts(videoId: string): Promise<ResponseCounts> {
  try {
    // Count agree responses
    const { count: agreeCount, error: agreeError } = await supabase
      .from('videos')
      .select('*', { count: 'exact', head: true })
      .eq('parent_video_id', videoId)
      .eq('agree_disagree', true)
      .eq('status', 'ready')
      .eq('visibility', 'public');

    // agreeError handled silently

    // Count disagree responses
    const { count: disagreeCount, error: disagreeError } = await supabase
      .from('videos')
      .select('*', { count: 'exact', head: true })
      .eq('parent_video_id', videoId)
      .eq('agree_disagree', false)
      .eq('status', 'ready')
      .eq('visibility', 'public');

    // disagreeError handled silently

    const agree = agreeCount || 0;
    const disagree = disagreeCount || 0;

    return {
      agree,
      disagree,
      total: agree + disagree,
    };
  } catch {
    return { agree: 0, disagree: 0, total: 0 };
  }
}

/**
 * Get root video info for a response (the original video in the chain)
 * Falls back to parent_video_id if root_video_id is not set
 */
export async function getRootVideo(videoId: string): Promise<{
  root: VideoWithProfile | null;
  error: Error | null;
}> {
  try {
    // First get the video to find its root_video_id or parent_video_id
    const { data: video, error: videoError } = await supabase
      .from('videos')
      .select('root_video_id, parent_video_id')
      .eq('id', videoId)
      .single();

    if (videoError) {
      throw videoError;
    }

    // Use root_video_id, or fall back to parent_video_id for direct responses
    const rootId = video?.root_video_id || video?.parent_video_id;

    if (!rootId) {
      return { root: null, error: null };
    }

    // Fetch the root video with profile info
    const { data: root, error: rootError } = await supabase
      .from('feed_videos')
      .select('*')
      .eq('id', rootId)
      .single();

    if (rootError) {
      throw rootError;
    }

    return {
      root: root as VideoWithProfile,
      error: null,
    };
  } catch (error) {
    return {
      root: null,
      error: error as Error,
    };
  }
}

/**
 * Get parent video info if the current video is a response
 */
export async function getParentVideo(videoId: string): Promise<{
  parent: VideoWithProfile | null;
  error: Error | null;
}> {
  try {
    // First get the video to find its parent_video_id
    const { data: video, error: videoError } = await supabase
      .from('videos')
      .select('parent_video_id')
      .eq('id', videoId)
      .single();

    if (videoError) {
      throw videoError;
    }

    if (!video?.parent_video_id) {
      return { parent: null, error: null };
    }

    // Fetch the parent video with profile info
    const { data: parent, error: parentError } = await supabase
      .from('feed_videos')
      .select('*')
      .eq('id', video.parent_video_id)
      .single();

    if (parentError) {
      throw parentError;
    }

    return {
      parent: parent as VideoWithProfile,
      error: null,
    };
  } catch (error) {
    return {
      parent: null,
      error: error as Error,
    };
  }
}

/**
 * Fetch responses for a video with pagination
 */
export async function getVideoResponses(
  videoId: string,
  options: {
    limit?: number;
    offset?: number;
    stance?: 'agree' | 'disagree' | 'all';
  } = {}
): Promise<{
  responses: VideoResponse[];
  hasMore: boolean;
  error: Error | null;
}> {
  const { limit = 20, offset = 0, stance = 'all' } = options;

  try {
    let query = supabase
      .from('feed_videos')
      .select('*')
      .eq('parent_video_id', videoId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit);

    // Filter by stance if specified
    if (stance === 'agree') {
      query = query.eq('agree_disagree', true);
    } else if (stance === 'disagree') {
      query = query.eq('agree_disagree', false);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return {
      responses: (data || []) as VideoResponse[],
      hasMore: (data?.length || 0) === limit + 1,
      error: null,
    };
  } catch (error) {
    return {
      responses: [],
      hasMore: false,
      error: error as Error,
    };
  }
}

/**
 * Create a video response
 */
export async function createVideoResponse(params: {
  parentVideoId: string;
  agreeDisagree: boolean;
  title: string;
  description?: string;
  videoUrl: string;
  thumbnailUrl?: string;
  durationSeconds?: number;
  width?: number;
  height?: number;
}): Promise<{
  video: Video | null;
  error: Error | null;
}> {
  try {
    const { data: user } = await supabase.auth.getUser();

    if (!user.user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('videos')
      .insert({
        user_id: user.user.id,
        parent_video_id: params.parentVideoId,
        agree_disagree: params.agreeDisagree,
        title: params.title,
        description: params.description || null,
        video_url: params.videoUrl,
        thumbnail_url: params.thumbnailUrl || null,
        duration_seconds: params.durationSeconds || null,
        width: params.width || null,
        height: params.height || null,
        status: 'processing',
        visibility: 'public',
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return {
      video: data as Video,
      error: null,
    };
  } catch (error) {
    return {
      video: null,
      error: error as Error,
    };
  }
}

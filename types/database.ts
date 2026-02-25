/**
 * Database Types for LewReviews MVP
 *
 * These types are generated to match the Supabase schema.
 * Run `npx supabase gen types typescript` to regenerate from your schema.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

/**
 * Video status enum matching the database
 */
export type VideoStatus = 'processing' | 'ready' | 'failed' | 'deleted';

/**
 * Video visibility enum matching the database
 */
export type VideoVisibility = 'public' | 'unlisted' | 'private';

/**
 * Video rating scale (1-5)
 * 1 = Trash, 2 = Meh, 3 = Average, 4 = Great, 5 = Fire
 */
export type VideoRating = 1 | 2 | 3 | 4 | 5;

export const RATING_LABELS: Record<VideoRating, string> = {
  1: 'Trash',
  2: 'Meh',
  3: 'Average',
  4: 'Great',
  5: 'Fire',
} as const;

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          display_name: string | null;
          avatar_url: string | null;
          bio: string | null;
          website: string | null;
          followers_count: number;
          following_count: number;
          videos_count: number;
          likes_received_count: number;
          expo_push_token: string | null;
          push_enabled: boolean;
          badge_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username: string;
          display_name?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          website?: string | null;
          followers_count?: number;
          following_count?: number;
          videos_count?: number;
          likes_received_count?: number;
          expo_push_token?: string | null;
          push_enabled?: boolean;
          badge_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          username?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          website?: string | null;
          followers_count?: number;
          following_count?: number;
          videos_count?: number;
          likes_received_count?: number;
          expo_push_token?: string | null;
          push_enabled?: boolean;
          badge_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'profiles_id_fkey';
            columns: ['id'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
      videos: {
        Row: {
          id: string;
          user_id: string;
          parent_video_id: string | null;
          root_video_id: string | null;
          chain_depth: number;
          agree_disagree: boolean | null;
          title: string;
          description: string | null;
          video_url: string;
          thumbnail_url: string | null;
          duration_seconds: number | null;
          width: number | null;
          height: number | null;
          file_size_bytes: number | null;
          status: VideoStatus;
          visibility: VideoVisibility;
          views_count: number;
          likes_count: number;
          responses_count: number;
          created_at: string;
          updated_at: string;
          published_at: string | null;
          rating: VideoRating | null;
          movie_title: string | null;
          tmdb_id: number | null;
          tmdb_media_type: 'movie' | 'tv' | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          parent_video_id?: string | null;
          root_video_id?: string | null;
          chain_depth?: number;
          agree_disagree?: boolean | null;
          title: string;
          description?: string | null;
          video_url: string;
          thumbnail_url?: string | null;
          duration_seconds?: number | null;
          width?: number | null;
          height?: number | null;
          file_size_bytes?: number | null;
          status?: VideoStatus;
          visibility?: VideoVisibility;
          views_count?: number;
          likes_count?: number;
          responses_count?: number;
          created_at?: string;
          updated_at?: string;
          published_at?: string | null;
          rating?: VideoRating | null;
          movie_title?: string | null;
          tmdb_id?: number | null;
          tmdb_media_type?: 'movie' | 'tv' | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          parent_video_id?: string | null;
          root_video_id?: string | null;
          chain_depth?: number;
          agree_disagree?: boolean | null;
          title?: string;
          description?: string | null;
          video_url?: string;
          thumbnail_url?: string | null;
          duration_seconds?: number | null;
          width?: number | null;
          height?: number | null;
          file_size_bytes?: number | null;
          status?: VideoStatus;
          visibility?: VideoVisibility;
          views_count?: number;
          likes_count?: number;
          responses_count?: number;
          created_at?: string;
          updated_at?: string;
          published_at?: string | null;
          rating?: VideoRating | null;
          movie_title?: string | null;
          tmdb_id?: number | null;
          tmdb_media_type?: 'movie' | 'tv' | null;
        };
        Relationships: [
          {
            foreignKeyName: 'videos_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'videos_parent_video_id_fkey';
            columns: ['parent_video_id'];
            referencedRelation: 'videos';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'videos_root_video_id_fkey';
            columns: ['root_video_id'];
            referencedRelation: 'videos';
            referencedColumns: ['id'];
          }
        ];
      };
      likes: {
        Row: {
          id: string;
          user_id: string;
          video_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          video_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          video_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'likes_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'likes_video_id_fkey';
            columns: ['video_id'];
            referencedRelation: 'videos';
            referencedColumns: ['id'];
          }
        ];
      };
      follows: {
        Row: {
          id: string;
          follower_id: string;
          following_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          follower_id: string;
          following_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          follower_id?: string;
          following_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'follows_follower_id_fkey';
            columns: ['follower_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'follows_following_id_fkey';
            columns: ['following_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
      };
      notifications: {
        Row: {
          id: string;
          recipient_id: string;
          sender_id: string | null;
          type: 'new_review' | 'response';
          video_id: string | null;
          title: string;
          body: string;
          sent_at: string | null;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          recipient_id: string;
          sender_id?: string | null;
          type: 'new_review' | 'response';
          video_id?: string | null;
          title: string;
          body: string;
          sent_at?: string | null;
          read_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          recipient_id?: string;
          sender_id?: string | null;
          type?: 'new_review' | 'response';
          video_id?: string | null;
          title?: string;
          body?: string;
          sent_at?: string | null;
          read_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'notifications_recipient_id_fkey';
            columns: ['recipient_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'notifications_sender_id_fkey';
            columns: ['sender_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'notifications_video_id_fkey';
            columns: ['video_id'];
            referencedRelation: 'videos';
            referencedColumns: ['id'];
          }
        ];
      };
    };
    Views: {
      feed_videos: {
        Row: {
          id: string | null;
          user_id: string | null;
          parent_video_id: string | null;
          root_video_id: string | null;
          chain_depth: number | null;
          title: string | null;
          description: string | null;
          video_url: string | null;
          thumbnail_url: string | null;
          duration_seconds: number | null;
          views_count: number | null;
          likes_count: number | null;
          responses_count: number | null;
          vote_agree_count: number | null;
          vote_disagree_count: number | null;
          rating: VideoRating | null;
          movie_title: string | null;
          tmdb_id: number | null;
          tmdb_media_type: 'movie' | 'tv' | null;
          created_at: string | null;
          published_at: string | null;
          username: string | null;
          display_name: string | null;
          avatar_url: string | null;
        };
      };
    };
    Functions: {
      get_video_chain: {
        Args: {
          video_id: string;
        };
        Returns: {
          id: string;
          user_id: string;
          parent_video_id: string | null;
          title: string;
          thumbnail_url: string | null;
          chain_depth: number;
          created_at: string;
        }[];
      };
      get_video_responses: {
        Args: {
          video_id: string;
          limit_count?: number;
          offset_count?: number;
        };
        Returns: {
          id: string;
          user_id: string;
          title: string;
          thumbnail_url: string | null;
          likes_count: number;
          responses_count: number;
          created_at: string;
        }[];
      };
      increment_video_views: {
        Args: {
          video_id: string;
        };
        Returns: void;
      };
      has_user_liked_video: {
        Args: {
          video_id: string;
        };
        Returns: boolean;
      };
      is_user_following: {
        Args: {
          target_user_id: string;
        };
        Returns: boolean;
      };
      toggle_like: {
        Args: {
          video_id: string;
        };
        Returns: boolean;
      };
      toggle_follow: {
        Args: {
          target_user_id: string;
        };
        Returns: boolean;
      };
    };
    Enums: {
      video_status: VideoStatus;
      video_visibility: VideoVisibility;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

// Convenience type aliases
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert'];
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];

export type Video = Database['public']['Tables']['videos']['Row'];
export type VideoInsert = Database['public']['Tables']['videos']['Insert'];
export type VideoUpdate = Database['public']['Tables']['videos']['Update'];

export type Like = Database['public']['Tables']['likes']['Row'];
export type LikeInsert = Database['public']['Tables']['likes']['Insert'];

export type Follow = Database['public']['Tables']['follows']['Row'];
export type FollowInsert = Database['public']['Tables']['follows']['Insert'];

export type Notification = Database['public']['Tables']['notifications']['Row'];
export type NotificationInsert = Database['public']['Tables']['notifications']['Insert'];

export type FeedVideo = Database['public']['Views']['feed_videos']['Row'];

/**
 * Video with profile information for display
 */
export interface VideoWithProfile extends Video {
  profile: Profile;
}

/**
 * Response video with stance indication
 */
export interface ResponseVideo extends Video {
  agree_disagree: boolean; // Required for responses (not null)
  profile: Profile;
}

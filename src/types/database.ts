export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          favorite_yojijukugo: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username?: string;
          favorite_yojijukugo?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          username?: string;
          favorite_yojijukugo?: string | null;
          avatar_url?: string | null;
          updated_at?: string;
        };
      };
      expressions: {
        Row: {
          id: string;
          user_id: string;
          content: string;
          category: string;
          censor_status: 'safe' | 'grey' | 'banned';
          is_ai_checked: boolean;
          visibility: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          content: string;
          category: string;
          censor_status?: 'safe' | 'grey' | 'banned';
          is_ai_checked?: boolean;
          visibility?: boolean;
          created_at?: string;
        };
        Update: {
          censor_status?: 'safe' | 'grey' | 'banned';
          is_ai_checked?: boolean;
          visibility?: boolean;
        };
      };
      votes: {
        Row: {
          id: string;
          expression_id: string;
          user_id: string;
          vote_type: 'appropriate' | 'inappropriate';
          created_at: string;
        };
        Insert: {
          id?: string;
          expression_id: string;
          user_id: string;
          vote_type: 'appropriate' | 'inappropriate';
          created_at?: string;
        };
        Update: never;
      };
    };
    Enums: {
      censor_status: 'safe' | 'grey' | 'banned';
      vote_type: 'appropriate' | 'inappropriate';
    };
  };
}

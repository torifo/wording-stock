export type CensorStatus = 'safe' | 'grey' | 'banned';

export type VoteType = 'appropriate' | 'inappropriate';

export type Category =
  | '四字熟語'
  | '慣用句'
  | 'ことわざ'
  | '詩・俳句'
  | '名言・格言'
  | 'その他';

export interface Profile {
  id: string;
  username: string;
  favorite_expression: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Expression {
  id: string;
  user_id: string;
  content: string;
  category: Category;
  censor_status: CensorStatus;
  is_ai_checked: boolean;
  visibility: boolean;
  created_at: string;
  // JOIN フィールド
  profile?: Pick<Profile, 'username' | 'avatar_url'>;
  appropriate_count?: number;
  inappropriate_count?: number;
}

export interface Vote {
  id: string;
  expression_id: string;
  user_id: string;
  vote_type: VoteType;
  created_at: string;
}

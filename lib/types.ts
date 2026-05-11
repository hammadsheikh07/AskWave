export type Question = {
  id: string;
  body: string;
  created_at: string;
  vote_count: number;
};

export type Vote = {
  question_id: string;
  user_id: string;
  created_at: string;
};

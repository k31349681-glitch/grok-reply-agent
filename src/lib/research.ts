export type ResearchPost = {
  id: string;
  text: string;
  createdAt: string;
  originalAuthorName: string;
  originalAuthorHandle: string;
  originalTweetId: string;
  targetHandle: string;
  url: string;
};

export type ResearchDraftPair = {
  postId: string;
  reply: string;
  quote: string;
  provider: "openrouter";
};

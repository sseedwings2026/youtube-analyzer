
export interface YouTubeVideo {
  id: string;
  title: string;
  thumbnail: string;
  description: string;
  channelId: string;
  channelTitle: string;
  publishedAt: string;
  viewCount: number;
  commentCount: number;
  subscriberCount: number;
  efficiencyRatio: number; // Views per subscriber
}

export interface RecommendedTopic {
  keyword: string;
  description: string;
}

export interface VideoAnalysis {
  sentiment: string;
  topKeywords: string[];
  recommendations: RecommendedTopic[];
  audienceReaction: string;
}

export interface SearchState {
  keyword: string;
  duration: 'any' | 'short' | 'medium' | 'long';
  minEfficiency: number;
  isLoading: boolean;
  results: YouTubeVideo[];
  error: string | null;
}

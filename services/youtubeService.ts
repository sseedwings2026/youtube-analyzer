
const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

export const searchVideos = async (
  query: string, 
  apiKey: string, 
  duration: 'any' | 'short' | 'medium' | 'long' = 'any'
): Promise<any[]> => {
  if (!apiKey) throw new Error("YouTube API Key is missing. Please set it in Settings.");
  
  let searchUrl = `${YOUTUBE_API_BASE}/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=25&key=${apiKey}`;
  if (duration !== 'any') {
    searchUrl += `&videoDuration=${duration}`;
  }
  
  const response = await fetch(searchUrl);
  const data = await response.json();
  if (data.error) throw new Error(data.error.message);
  return data.items || [];
};

export const getVideoStatistics = async (videoIds: string[], apiKey: string): Promise<any[]> => {
  const statsUrl = `${YOUTUBE_API_BASE}/videos?part=statistics,snippet&id=${videoIds.join(',')}&key=${apiKey}`;
  const response = await fetch(statsUrl);
  const data = await response.json();
  if (data.error) throw new Error(data.error.message);
  return data.items || [];
};

export const getChannelStatistics = async (channelIds: string[], apiKey: string): Promise<Record<string, number>> => {
  const channelUrl = `${YOUTUBE_API_BASE}/channels?part=statistics&id=${channelIds.join(',')}&key=${apiKey}`;
  const response = await fetch(channelUrl);
  const data = await response.json();
  if (data.error) throw new Error(data.error.message);
  
  const mapping: Record<string, number> = {};
  data.items?.forEach((item: any) => {
    mapping[item.id] = parseInt(item.statistics.subscriberCount) || 0;
  });
  return mapping;
};

export const getComments = async (videoId: string, apiKey: string): Promise<string[]> => {
  const commentUrl = `${YOUTUBE_API_BASE}/commentThreads?part=snippet&videoId=${videoId}&maxResults=50&order=relevance&key=${apiKey}`;
  const response = await fetch(commentUrl);
  const data = await response.json();
  if (data.error) {
    if (data.error.errors?.[0]?.reason === 'commentsDisabled') {
      return ["(Comments are disabled for this video)"];
    }
    throw new Error(data.error.message);
  }
  
  return (data.items || []).map((item: any) => 
    item.snippet.topLevelComment.snippet.textDisplay
  );
};

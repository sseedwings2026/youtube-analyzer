
import React from 'react';
import { YouTubeVideo } from '../types';

interface VideoCardProps {
  video: YouTubeVideo;
  onAnalyze: (video: YouTubeVideo) => void;
  isAnalyzing: boolean;
}

const VideoCard: React.FC<VideoCardProps> = ({ video, onAnalyze, isAnalyzing }) => {
  const efficiency = video.efficiencyRatio.toFixed(2);
  const isHighEfficiency = video.efficiencyRatio > 2; // Arbitrary threshold for "viral"

  return (
    <div className="glass rounded-xl overflow-hidden flex flex-col transition-all hover:scale-[1.02] hover:bg-white/10">
      <div className="relative aspect-video">
        <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover" />
        <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-1 rounded text-xs font-medium">
          {new Date(video.publishedAt).toLocaleDateString()}
        </div>
      </div>
      
      <div className="p-4 flex-grow flex flex-col">
        <h3 className="font-semibold text-lg line-clamp-2 mb-2 h-14" dangerouslySetInnerHTML={{ __html: video.title }} />
        <p className="text-sm text-gray-400 mb-4">{video.channelTitle}</p>
        
        <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
          <div className="flex flex-col">
            <span className="text-gray-500 uppercase tracking-tighter">Views</span>
            <span className="font-bold text-gray-200">{video.viewCount.toLocaleString()}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-gray-500 uppercase tracking-tighter">Subscribers</span>
            <span className="font-bold text-gray-200">{video.subscriberCount.toLocaleString()}</span>
          </div>
        </div>

        <div className={`mt-auto p-3 rounded-lg flex items-center justify-between ${isHighEfficiency ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'}`}>
          <div>
            <span className="text-[10px] uppercase font-bold block opacity-70">Efficiency Ratio</span>
            <span className="text-xl font-black">{efficiency}x</span>
          </div>
          <button 
            onClick={() => onAnalyze(video)}
            disabled={isAnalyzing}
            className="px-4 py-2 bg-white text-black font-bold rounded-lg text-sm hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            {isAnalyzing ? '...' : 'Analyze'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default VideoCard;

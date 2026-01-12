
import React, { useState, useEffect } from 'react';
import { Search, Sparkles, TrendingUp, AlertCircle, X, ChevronRight, BarChart3, Youtube, Settings, Save, Key, ExternalLink, CheckCircle2, Clock, Filter, FileText, Send } from 'lucide-react';
import { YouTubeVideo, SearchState, VideoAnalysis } from './types';
import { searchVideos, getVideoStatistics, getChannelStatistics, getComments } from './services/youtubeService';
import { analyzeVideoContent, generateScriptOutline } from './services/geminiService';
import VideoCard from './components/VideoCard';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

// Fix: Define AIStudio inside declare global to properly augment the global Window object
// and prevent "Subsequent property declarations must have the same type" error.
declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }
  interface Window {
    aistudio?: AIStudio;
  }
}

const App: React.FC = () => {
  const [youtubeKey, setYoutubeKey] = useState<string>(localStorage.getItem('yt_api_key') || '');
  const [showSettings, setShowSettings] = useState(false);
  const [hasGeminiKey, setHasGeminiKey] = useState(false);
  
  const [search, setSearch] = useState<SearchState>({
    keyword: '',
    duration: 'any',
    minEfficiency: 1.0,
    isLoading: false,
    results: [],
    error: null,
  });

  const [analysis, setAnalysis] = useState<{
    isOpen: boolean;
    isLoading: boolean;
    data: VideoAnalysis | null;
    video: YouTubeVideo | null;
    selectedKeyword: string | null;
    scriptOutline: string | null;
    isGeneratingScript: boolean;
  }>({
    isOpen: false,
    isLoading: false,
    data: null,
    video: null,
    selectedKeyword: null,
    scriptOutline: null,
    isGeneratingScript: false,
  });

  useEffect(() => {
    checkKeys();
  }, []);

  const checkKeys = async () => {
    const hasYT = !!localStorage.getItem('yt_api_key');
    let hasGemini = false;
    if (window.aistudio?.hasSelectedApiKey) {
      hasGemini = await window.aistudio.hasSelectedApiKey();
    }
    setHasGeminiKey(hasGemini);
    if (!hasYT || !hasGemini) setShowSettings(true);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!search.keyword.trim() || !youtubeKey) return;

    setSearch(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const searchItems = await searchVideos(search.keyword, youtubeKey, search.duration);
      if (!searchItems.length) {
        setSearch(prev => ({ ...prev, isLoading: false, results: [], error: "검색 결과가 없습니다." }));
        return;
      }

      const videoIds = searchItems.map((item: any) => item.id.videoId);
      const videoStats = await getVideoStatistics(videoIds, youtubeKey);
      const channelIds = videoStats.map((item: any) => item.snippet.channelId);
      const channelStatsMapping = await getChannelStatistics(channelIds, youtubeKey);

      const processedResults: YouTubeVideo[] = videoStats.map((item: any) => {
        const views = parseInt(item.statistics.viewCount) || 0;
        const subscribers = channelStatsMapping[item.snippet.channelId] || 1;
        return {
          id: item.id,
          title: item.snippet.title,
          thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default.url,
          description: item.snippet.description,
          channelId: item.snippet.channelId,
          channelTitle: item.snippet.channelTitle,
          publishedAt: item.snippet.publishedAt,
          viewCount: views,
          commentCount: parseInt(item.statistics.commentCount) || 0,
          subscriberCount: subscribers,
          efficiencyRatio: views / subscribers
        };
      });

      // Client-side Viral Ratio filtering
      const filtered = processedResults.filter(v => v.efficiencyRatio >= search.minEfficiency);
      filtered.sort((a, b) => b.efficiencyRatio - a.efficiencyRatio);

      setSearch(prev => ({ ...prev, isLoading: false, results: filtered }));
    } catch (err: any) {
      setSearch(prev => ({ ...prev, isLoading: false, error: err.message }));
    }
  };

  const startAnalysis = async (video: YouTubeVideo) => {
    setAnalysis({ 
      isOpen: true, 
      isLoading: true, 
      data: null, 
      video, 
      selectedKeyword: null, 
      scriptOutline: null, 
      isGeneratingScript: false 
    });
    try {
      const comments = await getComments(video.id, youtubeKey);
      const result = await analyzeVideoContent(video.title, comments);
      setAnalysis(prev => ({ ...prev, isLoading: false, data: result }));
    } catch (err: any) {
      setAnalysis(prev => ({ ...prev, isLoading: false, data: null }));
      alert("분석 실패: " + err.message);
    }
  };

  const handleGenerateScript = async (keyword: string) => {
    if (!analysis.data) return;
    setAnalysis(prev => ({ ...prev, selectedKeyword: keyword, isGeneratingScript: true, scriptOutline: null }));
    try {
      const outline = await generateScriptOutline(keyword, analysis.data.audienceReaction);
      setAnalysis(prev => ({ ...prev, isGeneratingScript: false, scriptOutline: outline }));
    } catch (err: any) {
      setAnalysis(prev => ({ ...prev, isGeneratingScript: false }));
      alert("대본 생성 실패.");
    }
  };

  return (
    <div className="min-h-screen pb-20">
      <header className="sticky top-0 z-40 glass border-b border-white/10 px-4 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-red-600 p-2 rounded-lg">
              <Youtube className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">IdeaMiner Pro</h1>
              <p className="text-[10px] text-gray-500 uppercase font-semibold">AI 바이럴 콘텐츠 스튜디오</p>
            </div>
          </div>

          <div className="flex-grow flex items-center gap-2 max-w-3xl">
            <form onSubmit={handleSearch} className="flex-grow relative">
              <input
                type="text"
                placeholder="키워드 검색 (예: 테크 리뷰, 브이로그...)"
                className="w-full bg-white/5 border border-white/10 rounded-full py-3 px-6 pl-12 focus:outline-none focus:ring-2 focus:ring-red-500/50 transition-all text-sm"
                value={search.keyword}
                onChange={(e) => setSearch(prev => ({ ...prev, keyword: e.target.value }))}
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <button 
                type="submit"
                disabled={search.isLoading}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-4 py-2 rounded-full transition-colors"
              >
                {search.isLoading ? '검색 중...' : '탐색하기'}
              </button>
            </form>
            <button onClick={() => setShowSettings(true)} className="p-3 border border-white/10 rounded-full hover:bg-white/10 transition-colors">
              <Settings className="w-5 h-5 text-gray-300" />
            </button>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="max-w-7xl mx-auto mt-4 pt-4 border-t border-white/5 flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-3">
            <Clock className="w-4 h-4 text-gray-500" />
            <div className="flex bg-white/5 p-1 rounded-lg border border-white/10">
              {(['any', 'short', 'long'] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => setSearch(prev => ({ ...prev, duration: d }))}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${search.duration === d ? 'bg-white text-black' : 'text-gray-400 hover:text-white'}`}
                >
                  {d === 'any' ? '전체' : d === 'short' ? '숏폼(<4분)' : '롱폼(>20분)'}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 flex-grow max-w-xs">
            <Filter className="w-4 h-4 text-gray-500" />
            <div className="flex-grow flex flex-col gap-1">
              <div className="flex justify-between text-[10px] font-bold text-gray-500 uppercase">
                <span>바이럴 비율(Efficiency)</span>
                <span className="text-red-500">{search.minEfficiency.toFixed(1)}x+</span>
              </div>
              <input 
                type="range" min="0.5" max="10" step="0.5"
                value={search.minEfficiency}
                onChange={(e) => setSearch(prev => ({ ...prev, minEfficiency: parseFloat(e.target.value) }))}
                className="w-full accent-red-600 h-1 rounded-full cursor-pointer bg-white/10"
              />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 mt-8">
        {search.error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-center gap-3 mb-8">
            <AlertCircle className="w-5 h-5" />
            <p>{search.error}</p>
          </div>
        )}

        {search.results.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {search.results.map((video) => (
              <VideoCard 
                key={video.id} 
                video={video} 
                onAnalyze={startAnalysis}
                isAnalyzing={analysis.isLoading && analysis.video?.id === video.id}
              />
            ))}
          </div>
        ) : !search.isLoading && (
          <div className="text-center py-20 text-gray-500">
            <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p>검색 결과가 없습니다. 필터를 조정하거나 키워드를 변경해보세요.</p>
          </div>
        )}
      </main>

      {/* Analysis Drawer */}
      {analysis.isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setAnalysis(prev => ({ ...prev, isOpen: false }))} />
          <div className="relative w-full max-w-2xl bg-[#0a0a0a] h-full shadow-2xl border-l border-white/10 flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <h2 className="text-xl font-bold flex items-center gap-3">
                <Sparkles className="w-6 h-6 text-red-500" />
                AI 콘텐츠 분석 인사이트
              </h2>
              <button onClick={() => setAnalysis(prev => ({ ...prev, isOpen: false }))} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X /></button>
            </div>

            <div className="flex-grow overflow-y-auto p-6 space-y-8">
              {analysis.isLoading ? (
                <div className="flex flex-col items-center justify-center h-64 gap-4">
                  <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
                  <p className="text-gray-400 animate-pulse">댓글 반응 수집 및 한국어 분석 중...</p>
                </div>
              ) : analysis.data && (
                <>
                  <section>
                    <h3 className="text-xs font-bold uppercase text-gray-500 mb-4 flex items-center gap-2"><Filter className="w-4 h-4" /> 시청자 분위기 및 반응</h3>
                    <div className="p-4 glass rounded-xl border-l-4 border-red-500">
                      <p className="text-gray-200 font-medium mb-2">{analysis.data.sentiment}</p>
                      <p className="text-sm text-gray-400 leading-relaxed">{analysis.data.audienceReaction}</p>
                    </div>
                  </section>

                  <section>
                    <h3 className="text-xs font-bold uppercase text-gray-500 mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4" /> 주요 언급 키워드</h3>
                    <div className="flex flex-wrap gap-2">
                      {analysis.data.topKeywords.map((k, i) => (
                        <span key={i} className="px-3 py-1.5 bg-white/5 rounded-full text-sm border border-white/10 text-gray-300">#{k}</span>
                      ))}
                    </div>
                  </section>

                  <section>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xs font-bold uppercase text-gray-500 flex items-center gap-2"><Sparkles className="w-4 h-4 text-red-500" /> AI 추천 영상 주제 (하나를 선택해 보세요)</h3>
                    </div>
                    <div className="space-y-3">
                      {analysis.data.recommendations.map((rec, i) => (
                        <button
                          key={i}
                          onClick={() => handleGenerateScript(rec.keyword)}
                          className={`w-full text-left p-4 rounded-xl border transition-all ${analysis.selectedKeyword === rec.keyword ? 'bg-red-600 border-red-500 shadow-lg shadow-red-600/20' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-white">{rec.keyword}</span>
                            <ChevronRight className="w-4 h-4 opacity-50" />
                          </div>
                          <p className={`text-xs ${analysis.selectedKeyword === rec.keyword ? 'text-red-100' : 'text-gray-400'}`}>{rec.description}</p>
                        </button>
                      ))}
                    </div>
                  </section>

                  {/* Script Outline Section */}
                  {(analysis.isGeneratingScript || analysis.scriptOutline) && (
                    <section className="pt-8 border-t border-white/10">
                      <div className="flex items-center gap-2 mb-4 text-red-500">
                        <FileText className="w-5 h-5" />
                        <h3 className="font-bold">"{analysis.selectedKeyword}" 대본 목차</h3>
                      </div>
                      <div className="p-6 glass rounded-2xl border border-red-500/20">
                        {analysis.isGeneratingScript ? (
                          <div className="flex items-center gap-3 text-sm text-gray-400 animate-pulse">
                            <Send className="w-4 h-4 animate-bounce" />
                            한국어 대본 목차를 구성하고 있습니다...
                          </div>
                        ) : (
                          <div className="prose prose-invert prose-sm max-w-none whitespace-pre-wrap text-gray-300">
                            {analysis.scriptOutline}
                          </div>
                        )}
                      </div>
                    </section>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal (YouTube API Key) */}
      {showSettings && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
          <div className="glass w-full max-w-md rounded-3xl p-8 space-y-8 shadow-2xl animate-in fade-in zoom-in duration-300">
            <h2 className="text-2xl font-bold flex items-center gap-3"><Settings className="text-red-500" /> 설정</h2>
            <div className="space-y-4">
              <label className="block text-xs font-bold uppercase text-gray-500">YouTube API 키</label>
              <input 
                type="password" 
                value={youtubeKey}
                onChange={e => setYoutubeKey(e.target.value)}
                className="w-full bg-white/5 border border-white/10 p-4 rounded-xl focus:ring-2 focus:ring-red-600 outline-none"
                placeholder="YouTube API 키를 입력하세요..."
              />
              <button 
                onClick={() => { localStorage.setItem('yt_api_key', youtubeKey); checkKeys(); setShowSettings(false); }}
                className="w-full py-4 bg-red-600 rounded-xl font-bold hover:bg-red-700 transition-colors"
              >
                저장 후 탐색 시작
              </button>
              <button 
                onClick={async () => { await window.aistudio?.openSelectKey(); setShowSettings(false); checkKeys(); }}
                className="w-full py-4 bg-white/5 border border-white/10 rounded-xl font-bold hover:bg-white/10 transition-colors"
              >
                Gemini API 키 설정 (유료 계정 권장)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;


import { GoogleGenAI, Type } from "@google/genai";
import { VideoAnalysis } from "../types";

export const analyzeVideoContent = async (
  videoTitle: string,
  comments: string[]
): Promise<VideoAnalysis> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `
    다음 유튜브 영상의 제목과 댓글을 분석하여 시청자 반응을 요약하고 새로운 콘텐츠 아이디어를 제안해 주세요.
    영상 제목: ${videoTitle}
    댓글 내용: ${comments.slice(0, 40).join('\n')}

    **모든 응답은 반드시 한국어로 작성해 주세요.**
    
    다음 형식의 JSON으로 응답해 주세요:
    - sentiment: 전체적인 시청자 분위기 (1문장)
    - audienceReaction: 사람들이 왜 이 영상을 좋아하거나 싫어했는지에 대한 구체적인 분석 요약.
    - topKeywords: 사용자들이 가장 많이 언급한 핵심 키워드/주제 5개 리스트.
    - recommendations: 영상 제작을 추천하는 5개의 구체적인 주제/키워드. 각 항목은 'keyword'(키워드)와 'description'(추천 이유)을 포함해야 함.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            sentiment: { type: Type.STRING },
            audienceReaction: { type: Type.STRING },
            topKeywords: { type: Type.ARRAY, items: { type: Type.STRING } },
            recommendations: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  keyword: { type: Type.STRING },
                  description: { type: Type.STRING }
                },
                required: ["keyword", "description"]
              }
            }
          },
          required: ["sentiment", "audienceReaction", "topKeywords", "recommendations"]
        }
      }
    });

    return JSON.parse(response.text || '{}') as VideoAnalysis;
  } catch (error: any) {
    console.error(error);
    throw error;
  }
};

export const generateScriptOutline = async (
  keyword: string,
  context: string
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `
    다음 주제에 대해 전문적인 유튜브 대본 목차를 한국어로 작성해 주세요.
    대상 주제: ${keyword}
    참고 배경(시청자 맥락): ${context}

    **반드시 한국어로 작성해 주세요.**
    
    포함 내용:
    1. 인트로/훅 (첫 5초, 시청자를 사로잡는 멘트)
    2. 도입부 (영상 소개)
    3. 본문 구성 (3~5개의 핵심 포인트)
    4. 결론 및 행동 유도 (구독/좋아요 등)
    
    가독성이 좋게 마크다운(Markdown) 형식을 사용해 주세요. 임팩트 있고 간결하게 작성해 주세요.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
  });

  return response.text || "목차 생성에 실패했습니다.";
};

import axios from 'axios';
import type { YouTubeSearchResponse, YouTubeVideoListResponse } from './raw-types';

const BASE_URL = 'https://www.googleapis.com/youtube/v3';
const TIMEOUT_MS = 10_000;

// Quota cost per call (YouTube Data API v3)
const QUOTA_COST = { search: 100, videos: 1 } as const;

export class YouTubeQuotaExceededError extends Error {
  constructor() {
    super('YouTube API quota exceeded');
    this.name = 'YouTubeQuotaExceededError';
  }
}

export class YouTubeClient {
  private quotaUsedToday = 0;
  private readonly dailyLimit: number;

  constructor(
    private readonly apiKey: string,
    dailyLimit = 10_000,
  ) {
    this.dailyLimit = dailyLimit;
  }

  async searchShorts(params: {
    query?: string;
    publishedAfter?: Date;
    maxResults?: number;
  }): Promise<YouTubeSearchResponse> {
    this.checkQuota(QUOTA_COST.search);

    const response = await axios.get<YouTubeSearchResponse>(`${BASE_URL}/search`, {
      timeout: TIMEOUT_MS,
      params: {
        part: 'snippet',
        type: 'video',
        videoDuration: 'short',
        order: 'date',
        maxResults: params.maxResults ?? 50,
        ...(params.query && { q: params.query }),
        ...(params.publishedAfter && {
          publishedAfter: params.publishedAfter.toISOString(),
        }),
        key: this.apiKey,
      },
    });

    this.quotaUsedToday += QUOTA_COST.search;
    return response.data;
  }

  // videoIds: must be chunked to 50 before calling this method
  async fetchVideoMetrics(videoIds: string[]): Promise<YouTubeVideoListResponse> {
    if (videoIds.length === 0) return emptyVideoListResponse();
    if (videoIds.length > 50) throw new Error('fetchVideoMetrics: max 50 videoIds per call');

    this.checkQuota(QUOTA_COST.videos);

    const response = await axios.get<YouTubeVideoListResponse>(`${BASE_URL}/videos`, {
      timeout: TIMEOUT_MS,
      params: {
        part: 'statistics',
        id: videoIds.join(','),
        key: this.apiKey,
      },
    });

    this.quotaUsedToday += QUOTA_COST.videos;
    return response.data;
  }

  get quotaRemaining(): number {
    return this.dailyLimit - this.quotaUsedToday;
  }

  private checkQuota(cost: number): void {
    if (this.quotaUsedToday + cost > this.dailyLimit) {
      throw new YouTubeQuotaExceededError();
    }
  }
}

function emptyVideoListResponse(): YouTubeVideoListResponse {
  return {
    kind: 'youtube#videoListResponse',
    etag: '',
    pageInfo: { totalResults: 0, resultsPerPage: 0 },
    items: [],
  };
}

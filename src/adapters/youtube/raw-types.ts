export interface YouTubeSearchResponse {
  kind: 'youtube#searchListResponse';
  etag: string;
  nextPageToken?: string;
  regionCode?: string;
  pageInfo: { totalResults: number; resultsPerPage: number };
  items: YouTubeSearchItem[];
}

export interface YouTubeSearchItem {
  kind: 'youtube#searchResult';
  etag: string;
  id: { kind: 'youtube#video'; videoId: string };
  snippet: {
    publishedAt: string;
    channelId: string;
    title: string;
    description: string;
    channelTitle: string;
    liveBroadcastContent: string;
    publishTime: string;
  };
}

export interface YouTubeVideoListResponse {
  kind: 'youtube#videoListResponse';
  etag: string;
  pageInfo: { totalResults: number; resultsPerPage: number };
  items: YouTubeVideoItem[];
}

export interface YouTubeVideoItem {
  kind: 'youtube#video';
  etag: string;
  id: string;
  statistics: {
    viewCount?: string;
    likeCount?: string;
    commentCount?: string;
    favoriteCount?: string;
  };
}

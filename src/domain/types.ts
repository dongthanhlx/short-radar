export interface Short {
  videoId: string;
  channelId: string;
  title: string;
  publishedAt: Date;
  crawledAt: Date;
}

export interface MetricsSnapshot {
  videoId: string;
  capturedAt: Date;
  viewCount: number;
  likeCount: number;
  commentCount: number;
}

export interface Velocity {
  videoId: string;
  windowStart: Date;
  windowEnd: Date;
  viewsPerHour: number;
  likesPerHour: number;
}

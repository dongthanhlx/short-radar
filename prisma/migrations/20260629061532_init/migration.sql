-- CreateTable
CREATE TABLE "shorts" (
    "video_id" TEXT NOT NULL,
    "channel_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "published_at" TIMESTAMP(3) NOT NULL,
    "crawled_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shorts_pkey" PRIMARY KEY ("video_id")
);

-- CreateTable
CREATE TABLE "metrics_snapshots" (
    "id" SERIAL NOT NULL,
    "video_id" TEXT NOT NULL,
    "captured_at" TIMESTAMP(3) NOT NULL,
    "view_count" INTEGER NOT NULL,
    "like_count" INTEGER NOT NULL,
    "comment_count" INTEGER NOT NULL,

    CONSTRAINT "metrics_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "shorts_published_at_idx" ON "shorts"("published_at" DESC);

-- CreateIndex
CREATE INDEX "metrics_snapshots_video_id_captured_at_idx" ON "metrics_snapshots"("video_id", "captured_at");

-- CreateIndex
CREATE UNIQUE INDEX "metrics_snapshots_video_id_captured_at_key" ON "metrics_snapshots"("video_id", "captured_at");

-- AddForeignKey
ALTER TABLE "metrics_snapshots" ADD CONSTRAINT "metrics_snapshots_video_id_fkey" FOREIGN KEY ("video_id") REFERENCES "shorts"("video_id") ON DELETE RESTRICT ON UPDATE CASCADE;

"use client";

import { useState } from "react";
import { Post, TierName } from "@/types";
import { COLORS } from "@/utils/colors";

export default function CreatePostForm({
  creatorId,
  onPostCreated,
}: {
  creatorId: number;
  onPostCreated: (post: Post) => void;
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tier, setTier] = useState<TierName>("free");
  const [videoUrl, setVideoUrl] = useState("");
  const [status, setStatus] = useState<"idle" | "success">("idle");

  const handleSubmit = () => {
    if (!title.trim() || !body.trim()) return;

    const post: Post = {
      id: `post_${Date.now()}`,
      creatorId,
      title: title.trim(),
      body: body.trim(),
      tier,
      videoUrl: videoUrl.trim() || undefined,
      createdAt: new Date().toISOString(),
      likes: 0,
    };

    onPostCreated(post);
    setTitle("");
    setBody("");
    setTier("free");
    setVideoUrl("");
    setStatus("success");
    setTimeout(() => setStatus("idle"), 3000);
  };

  const inputStyle = {
    backgroundColor: "#150F28",
    color: COLORS.lightText,
    border: "1px solid #2D2550",
  };

  return (
    <div className="rounded-xl p-5" style={{ backgroundColor: COLORS.cardBg }}>
      <h3 className="text-white font-bold mb-4">Create Post</h3>

      <div className="space-y-3">
        {/* Title */}
        <input
          type="text"
          placeholder="Post title..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-lg px-3 py-2 text-sm outline-none focus:border-purple-500"
          style={inputStyle}
        />

        {/* Body */}
        <textarea
          placeholder="Write your post content..."
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={4}
          className="w-full rounded-lg px-3 py-2 text-sm outline-none resize-y focus:border-purple-500"
          style={inputStyle}
        />

        {/* Tier + Video URL row */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <label className="text-xs mb-1 block" style={{ color: COLORS.midGray }}>
              Access Tier
            </label>
            <select
              value={tier}
              onChange={(e) => setTier(e.target.value as TierName)}
              className="w-full rounded-lg px-3 py-2 text-sm outline-none"
              style={inputStyle}
            >
              <option value="free">Free — Everyone</option>
              <option value="Explorer">Explorer ($4.99/mo)</option>
              <option value="Scholar">Scholar ($9.99/mo)</option>
              <option value="VIP Learner">VIP Learner ($12.42/mo)</option>
            </select>
          </div>

          <div className="flex-1">
            <label className="text-xs mb-1 block" style={{ color: COLORS.midGray }}>
              Video URL (optional)
            </label>
            <input
              type="text"
              placeholder="YouTube or Vimeo link..."
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-sm outline-none focus:border-purple-500"
              style={inputStyle}
            />
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleSubmit}
            disabled={!title.trim() || !body.trim()}
            className="px-5 py-2 rounded-lg font-semibold text-sm text-white cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:opacity-80"
            style={{ backgroundColor: COLORS.purple }}
          >
            Publish Post
          </button>
          {status === "success" && (
            <span className="text-xs font-medium" style={{ color: COLORS.teal }}>
              Post published! Check the Feed tab.
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

import { and, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "../../../../db";
import { channelPosts, integrations } from "../../../../db/schema";
import { requireUser } from "../../../lib/auth";

// Kết nối Facebook/TikTok theo kiểu "dán access token": người dùng lấy token từ app
// developer của họ (Meta / TikTok for Business) rồi dán vào. Server tự gọi API để lấy
// số liệu bài đăng thật. KHÔNG bịa số — nếu token/quyền sai sẽ trả lỗi thật của nền tảng.

const GRAPH_VERSION = "v21.0";

type Platform = "facebook" | "tiktok";

type SocialPayload = {
  action?: "connect" | "sync" | "remove";
  platform?: Platform;
  accessToken?: string;
  accountId?: string;
  name?: string;
  project?: string;
  integrationId?: number;
  discoverAll?: boolean;
};

type NormalizedPost = {
  externalId: string;
  title: string;
  permalink: string | null;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  retention: number | null;
  avgWatch: number | null;
  publishedAt: string | null;
};

function toNumber(value: unknown): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function engagementRate(post: { views: number; likes: number; comments: number; shares: number }) {
  if (!post.views) return 0;
  return Math.round(((post.likes + post.comments + post.shares) / post.views) * 1000) / 10;
}

function winScore(post: { views: number; retention: number | null; engagement: number }) {
  const retentionScore = (post.retention ?? 0) * 0.5;
  const engagementScore = Math.min(post.engagement, 20) * 2;
  const viewsScore = post.views > 0 ? Math.min(20, Math.log10(post.views) * 4) : 0;
  return Math.round(Math.min(100, retentionScore + engagementScore + viewsScore));
}

function viewsLabel(views: number) {
  if (views >= 1_000_000) return `${(views / 1_000_000).toFixed(1).replace(".", ",")}M`;
  if (views >= 1_000) return `${(views / 1_000).toFixed(0)}K`;
  return String(views);
}

// ---- Facebook (Graph API) ----------------------------------------------------
async function fetchFacebook(pageId: string, token: string): Promise<NormalizedPost[]> {
  const fields = [
    "id",
    "message",
    "permalink_url",
    "created_time",
    "shares",
    "insights.metric(post_impressions,post_video_views,post_engaged_users,post_video_avg_time_watched)",
  ].join(",");
  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${encodeURIComponent(pageId)}/posts?fields=${encodeURIComponent(fields)}&limit=25&access_token=${encodeURIComponent(token)}`;
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  const data = (await response.json()) as {
    error?: { message?: string };
    data?: Array<{
      id: string;
      message?: string;
      permalink_url?: string;
      created_time?: string;
      shares?: { count?: number };
      insights?: { data?: Array<{ name: string; values?: Array<{ value?: unknown }> }> };
    }>;
  };
  if (data.error) throw new Error(`Facebook: ${data.error.message || "token hoặc quyền không hợp lệ."}`);
  if (!Array.isArray(data.data)) throw new Error("Facebook chưa trả về danh sách bài đăng. Kiểm tra Page ID và quyền read_insights.");
  return data.data.map((post) => {
    const insights = new Map((post.insights?.data || []).map((row) => [row.name, toNumber(row.values?.[0]?.value)]));
    const impressions = insights.get("post_impressions") || 0;
    const videoViews = insights.get("post_video_views") || 0;
    const engaged = insights.get("post_engaged_users") || 0;
    const avgWatchMs = insights.get("post_video_avg_time_watched") || 0;
    const views = videoViews || impressions;
    return {
      externalId: post.id,
      title: (post.message || "").split("\n")[0].slice(0, 140) || `Bài ${post.id}`,
      permalink: post.permalink_url || null,
      views,
      likes: engaged,
      comments: 0,
      shares: toNumber(post.shares?.count),
      retention: null,
      avgWatch: avgWatchMs ? Math.round(avgWatchMs / 1000) : null,
      publishedAt: post.created_time || null,
    } satisfies NormalizedPost;
  });
}

// Một User/System token → liệt kê mọi Page người dùng quản lý (kèm page token riêng).
async function fetchFacebookPages(userToken: string): Promise<Array<{ id: string; name: string; token: string }>> {
  const url = `https://graph.facebook.com/${GRAPH_VERSION}/me/accounts?fields=id,name,access_token&limit=100&access_token=${encodeURIComponent(userToken)}`;
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  const data = (await response.json()) as { error?: { message?: string }; data?: Array<{ id: string; name: string; access_token: string }> };
  if (data.error) throw new Error(`Facebook: ${data.error.message || "token không đọc được danh sách Page. Cần quyền pages_show_list."}`);
  return (data.data || []).map((page) => ({ id: page.id, name: page.name, token: page.access_token }));
}

// ---- TikTok (Business API) ---------------------------------------------------
// Lược đồ TikTok có thể đổi theo phiên bản; parse phòng thủ và trả lỗi thật nếu lệch.
async function fetchTikTok(businessId: string, token: string): Promise<NormalizedPost[]> {
  const url = "https://business-api.tiktok.com/open_api/v1.3/business/video/list/";
  const body = {
    business_id: businessId,
    fields: ["item_id", "caption", "share_url", "create_time", "video_views", "likes", "comments", "shares", "reach", "full_video_watched_rate", "average_time_watched"],
  };
  const response = await fetch(url, {
    method: "POST",
    headers: { "Access-Token": token, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await response.json()) as {
    code?: number;
    message?: string;
    data?: { videos?: Array<Record<string, unknown>>; list?: Array<Record<string, unknown>> };
  };
  if (data.code && data.code !== 0) throw new Error(`TikTok: ${data.message || "token hoặc business_id không hợp lệ."}`);
  const videos = data.data?.videos || data.data?.list || [];
  if (!Array.isArray(videos)) throw new Error("TikTok chưa trả về danh sách video. Kiểm tra business_id và quyền của token.");
  return videos.map((video) => {
    const views = toNumber(video.video_views ?? video.views);
    const fullRate = toNumber(video.full_video_watched_rate);
    const createTime = video.create_time ? new Date(toNumber(video.create_time) * 1000).toISOString() : null;
    return {
      externalId: String(video.item_id ?? video.video_id ?? ""),
      title: String(video.caption ?? video.title ?? "Video TikTok").slice(0, 140),
      permalink: (video.share_url as string) || null,
      views,
      likes: toNumber(video.likes),
      comments: toNumber(video.comments),
      shares: toNumber(video.shares),
      retention: fullRate ? Math.round(fullRate <= 1 ? fullRate * 100 : fullRate) : null,
      avgWatch: video.average_time_watched ? Math.round(toNumber(video.average_time_watched)) : null,
      publishedAt: createTime,
    } satisfies NormalizedPost;
  }).filter((post) => post.externalId);
}

async function fetchPlatform(platform: Platform, accountId: string, token: string) {
  return platform === "facebook" ? fetchFacebook(accountId, token) : fetchTikTok(accountId, token);
}

async function upsertPosts(platform: Platform, integrationId: number, project: string, posts: NormalizedPost[]) {
  const { env } = await import("cloudflare:workers");
  if (!env.DB) throw new Error("Kho dữ liệu chưa sẵn sàng.");
  const fetchedAt = new Date().toISOString();
  const sql = `INSERT INTO channel_posts (
    platform, integration_id, external_id, title, permalink, project,
    views, likes, comments, shares, retention, avg_watch, published_at, fetched_at, raw
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(platform, external_id) DO UPDATE SET
    integration_id = excluded.integration_id,
    title = excluded.title,
    permalink = excluded.permalink,
    project = excluded.project,
    views = excluded.views,
    likes = excluded.likes,
    comments = excluded.comments,
    shares = excluded.shares,
    retention = excluded.retention,
    avg_watch = excluded.avg_watch,
    published_at = excluded.published_at,
    fetched_at = excluded.fetched_at,
    raw = excluded.raw`;
  for (let index = 0; index < posts.length; index += 40) {
    const statements = posts.slice(index, index + 40).map((post) => env.DB.prepare(sql).bind(
      platform, integrationId, post.externalId, post.title, post.permalink, project,
      post.views, post.likes, post.comments, post.shares, post.retention, post.avgWatch,
      post.publishedAt, fetchedAt, null,
    ));
    if (statements.length) await env.DB.batch(statements);
  }
  return posts.length;
}

async function persistChannel(
  db: Awaited<ReturnType<typeof getDb>>,
  params: { platform: Platform; accountId: string; token: string; name: string; project: string; posts: NormalizedPost[]; now: string },
) {
  const { platform, accountId, token, name, project, posts, now } = params;
  const [matched] = await db
    .select()
    .from(integrations)
    .where(and(eq(integrations.sourceFileId, accountId), eq(integrations.sourceTab, platform)))
    .limit(1);
  const record = {
    kind: platform,
    name,
    sourceUrl: project,
    sourceFileId: accountId,
    sourceTab: platform,
    sourceFormat: platform,
    status: "live_synced",
    bridgeToken: token,
    rowsImported: posts.length,
    lastSyncedAt: now,
    updatedAt: now,
  };
  let integrationId = matched?.id;
  if (matched) {
    await db.update(integrations).set(record).where(eq(integrations.id, matched.id));
  } else {
    const [inserted] = await db.insert(integrations).values(record).returning({ id: integrations.id });
    integrationId = inserted?.id;
  }
  return integrationId ? upsertPosts(platform, integrationId, project || name, posts) : 0;
}

function channelView(row: typeof integrations.$inferSelect) {
  return {
    id: row.id,
    platform: row.kind,
    name: row.name,
    accountId: row.sourceFileId,
    status: row.status,
    rowsImported: row.rowsImported,
    lastSyncedAt: row.lastSyncedAt,
    project: row.sourceUrl,
  };
}

function postView(row: typeof channelPosts.$inferSelect) {
  const engagement = engagementRate(row);
  const score = winScore({ views: row.views, retention: row.retention, engagement });
  return {
    id: row.id,
    platform: row.platform === "facebook" ? "Facebook" : "TikTok",
    title: row.title || `Bài ${row.externalId}`,
    project: row.project || "—",
    permalink: row.permalink,
    views: viewsLabel(row.views),
    rawViews: row.views,
    retention: row.retention ?? 0,
    engagement,
    score,
    avgWatch: row.avgWatch,
    publishedAt: row.publishedAt,
    fetchedAt: row.fetchedAt,
  };
}

export async function GET(request: Request) {
  try {
    const guard = await requireUser(request);
    if ("response" in guard) return guard.response;
    const db = await getDb();
    const rawChannels = await db
      .select()
      .from(integrations)
      .where(inArray(integrations.kind, ["facebook", "tiktok"]))
      .orderBy(desc(integrations.updatedAt));
    const channels = rawChannels.map(channelView);
    const rawPosts = await db.select().from(channelPosts).orderBy(desc(channelPosts.views)).limit(200);
    const posts = rawPosts.map(postView).sort((a, b) => b.score - a.score);
    const summary = {
      channelCount: channels.length,
      facebook: channels.filter((channel) => channel.platform === "facebook").length,
      tiktok: channels.filter((channel) => channel.platform === "tiktok").length,
      posts: posts.length,
      topScore: posts[0]?.score ?? null,
      lastSyncedAt: channels[0]?.lastSyncedAt ?? null,
    };
    return Response.json({ channels, posts, summary });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Không đọc được dữ liệu kênh." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const guard = await requireUser(request, "director");
    if ("response" in guard) return guard.response;
    const payload = (await request.json()) as SocialPayload;
    const db = await getDb();
    const now = new Date().toISOString();

    if (payload.action === "remove") {
      if (!payload.integrationId) return Response.json({ error: "Thiếu mã kênh cần gỡ." }, { status: 400 });
      const [target] = await db.select().from(integrations).where(eq(integrations.id, payload.integrationId)).limit(1);
      if (!target) return Response.json({ error: "Không tìm thấy kênh." }, { status: 404 });
      await db.delete(channelPosts).where(and(eq(channelPosts.platform, target.kind), eq(channelPosts.integrationId, target.id)));
      await db.delete(integrations).where(eq(integrations.id, payload.integrationId));
      return Response.json({ ok: true, removed: target.name });
    }

    if (payload.action === "sync") {
      const targets = payload.integrationId
        ? await db.select().from(integrations).where(eq(integrations.id, payload.integrationId)).limit(1)
        : await db.select().from(integrations).where(inArray(integrations.kind, ["facebook", "tiktok"]));
      const usable = targets.filter((row) => row.bridgeToken && row.sourceFileId);
      if (!usable.length) return Response.json({ error: "Chưa có kênh nào để đồng bộ." }, { status: 400 });
      let total = 0;
      for (const target of usable) {
        const platform = target.kind as Platform;
        const posts = await fetchPlatform(platform, target.sourceFileId!, target.bridgeToken!);
        const count = await upsertPosts(platform, target.id, target.sourceUrl || target.name, posts);
        total += count;
        await db.update(integrations).set({ status: "live_synced", rowsImported: count, lastSyncedAt: now, updatedAt: now }).where(eq(integrations.id, target.id));
      }
      return Response.json({ ok: true, imported: total, channels: usable.length });
    }

    // action === "connect"
    const platform = payload.platform === "tiktok" ? "tiktok" : payload.platform === "facebook" ? "facebook" : null;
    if (!platform) return Response.json({ error: "Chọn nền tảng Facebook hoặc TikTok." }, { status: 400 });
    const token = payload.accessToken?.trim();
    if (!token) return Response.json({ error: "Dán access token lấy từ app developer của bạn." }, { status: 400 });
    const project = payload.project?.trim() || "";

    // Facebook + "tất cả Page": dùng User/System token để tự phát hiện mọi Page.
    if (platform === "facebook" && (payload.discoverAll || !payload.accountId?.trim())) {
      const pages = await fetchFacebookPages(token);
      if (!pages.length) return Response.json({ error: "Token này chưa quản lý Page nào, hoặc thiếu quyền pages_show_list · read_insights." }, { status: 400 });
      let totalPosts = 0;
      for (const page of pages) {
        const posts = await fetchFacebook(page.id, page.token);
        totalPosts += await persistChannel(db, { platform, accountId: page.id, token: page.token, name: page.name || `Facebook Page ${page.id}`, project, posts, now });
      }
      return Response.json({ ok: true, imported: totalPosts, channels: pages.length, message: `Đã kết nối ${pages.length} Page và lấy ${totalPosts} bài đăng thật từ 1 token.` });
    }

    const accountId = payload.accountId?.trim();
    if (!accountId) return Response.json({ error: platform === "facebook" ? "Nhập Page ID Facebook." : "Nhập business_id TikTok." }, { status: 400 });
    const name = payload.name?.trim() || (platform === "facebook" ? `Facebook Page ${accountId}` : `TikTok ${accountId}`);
    const posts = await fetchPlatform(platform, accountId, token);
    const count = await persistChannel(db, { platform, accountId, token, name, project, posts, now });
    return Response.json({ ok: true, imported: count, channels: 1, name, message: `Đã kết nối “${name}” và lấy ${count} bài đăng thật.` });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Kết nối kênh thất bại." }, { status: 500 });
  }
}

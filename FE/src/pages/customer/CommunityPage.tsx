import React, { useEffect, useMemo, useState } from "react";
import {
  FiEdit3,
  FiUsers,
  FiTag,
  FiZap,
  FiTrash2,
  FiSend,
  FiMessageCircle,
  FiMapPin,
  FiTrendingUp,
  FiClock,
  FiSearch,
  FiX,
} from "react-icons/fi";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../components/Toast";
import {
  communityApi,
  type CommunityPost,
  type CommunityTag,
  type PartnerSuggestion,
  type PostType,
} from "../../lib/communityApi";

const POST_TYPES: Array<{ id: PostType; label: string; hint: string; color: string }> = [
  { id: "sharing", label: "Chia sẻ", hint: "Chia sẻ điều bạn đang làm", color: "bg-blue-500" },
  { id: "seeking_partner", label: "Tìm cộng sự", hint: "Tìm người đồng hành cho dự án", color: "bg-emerald-500" },
  { id: "question", label: "Hỏi đáp", hint: "Đặt câu hỏi cho cộng đồng", color: "bg-amber-500" },
  { id: "event", label: "Sự kiện", hint: "Mời mọi người tham gia", color: "bg-purple-500" },
];

const typeMeta = (type: string) => POST_TYPES.find((t) => t.id === type) ?? POST_TYPES[0];

const timeAgo = (iso: string): string => {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const mins = Math.floor((Date.now() - then) / 60000);
  if (mins < 1) return "vừa xong";
  if (mins < 60) return `${mins} phút trước`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} ngày trước`;
  return new Date(iso).toLocaleDateString("vi-VN");
};

const CommunityPage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [tags, setTags] = useState<CommunityTag[]>([]);
  const [partners, setPartners] = useState<PartnerSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [partnersLoading, setPartnersLoading] = useState(true);

  const [sort, setSort] = useState<"relevant" | "recent">("relevant");
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [postType, setPostType] = useState<PostType>("sharing");
  const [posting, setPosting] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);

  const loadFeed = async (nextSort = sort, nextTag = tagFilter) => {
    setLoading(true);
    try {
      const data = await communityApi.listFeed({
        sort: nextSort,
        tagId: nextTag ?? undefined,
      });
      setPosts(data);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Không tải được bảng tin cộng đồng", "error");
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFeed(sort, tagFilter);
  }, [sort, tagFilter]);

  useEffect(() => {
    communityApi.listTags().then(setTags).catch(() => setTags([]));

    communityApi
      .suggestedPartners()
      .then(setPartners)
      .catch(() => setPartners([]))
      .finally(() => setPartnersLoading(false));
  }, []);

  const handlePost = async () => {
    if (!title.trim() || !content.trim()) {
      showToast("Vui lòng nhập tiêu đề và nội dung bài viết", "error");
      return;
    }
    setPosting(true);
    try {
      const created = await communityApi.createPost({
        title: title.trim(),
        content: content.trim(),
        postType,
      });
      setPosts((prev) => [created, ...prev.filter((p) => p.id !== created.id)]);
      setTitle("");
      setContent("");
      setPostType("sharing");
      setComposerOpen(false);
      showToast(
        created.tags.length > 0
          ? `Đã đăng bài! AI đã gắn nhãn: ${created.tags.join(", ")}`
          : "Đã đăng bài viết của bạn!",
        "success",
      );
      // A new post changes what the reader is "about", so the recommendations shift with it.
      communityApi.suggestedPartners().then(setPartners).catch(() => {});
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Không đăng được bài viết", "error");
    } finally {
      setPosting(false);
    }
  };

  const handleDelete = async (postId: string) => {
    try {
      await communityApi.deletePost(postId);
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      showToast("Đã xóa bài viết", "info");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Không xóa được bài viết", "error");
    }
  };

  const visiblePosts = useMemo(() => {
    if (!search.trim()) return posts;
    const q = search.toLowerCase();
    return posts.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.content.toLowerCase().includes(q) ||
        p.authorName.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q)),
    );
  }, [posts, search]);

  const activeTagName = tags.find((t) => t.id === tagFilter)?.name;

  return (
    <div className="max-w-6xl mx-auto py-6 px-4 font-sans animate-fade-in pb-20">
      {/* Header */}
      <div className="bg-slate-900 rounded-3xl p-8 mb-8 border border-slate-800 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500 rounded-full mix-blend-screen filter blur-3xl opacity-20 translate-x-1/3 -translate-y-1/3" />
        <div className="relative z-10">
          <h1 className="text-3xl md:text-4xl font-semibold text-white tracking-tight">
            Cộng đồng CoSpace
          </h1>
          <p className="text-sm font-medium bg-white/10 text-slate-200 px-3 py-1.5 rounded-lg border border-white/10 inline-block mt-3">
            Viết về điều bạn đang làm — hệ thống sẽ gợi ý bạn tới đúng người cùng lĩnh vực.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">
        {/* ── Main column ── */}
        <div className="space-y-6">
          {/* Composer */}
          <section className="bg-card rounded-3xl border border-border p-5 shadow-sm">
            {!composerOpen ? (
              <button
                onClick={() => setComposerOpen(true)}
                className="w-full flex items-center gap-3 text-left cursor-pointer group"
              >
                <div className="h-11 w-11 rounded-2xl bg-gradient-to-tr from-primary to-secondary text-white flex items-center justify-center font-bold shrink-0 overflow-hidden">
                  {user?.avatarUrl ? (
                    <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    (user?.fullName?.charAt(0) ?? "U").toUpperCase()
                  )}
                </div>
                <span className="flex-1 px-4 py-3 rounded-2xl bg-muted/50 border border-border text-sm text-muted-foreground group-hover:bg-muted transition-colors">
                  Bạn đang làm gì hay tìm cộng sự cho dự án nào?
                </span>
                <span className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold">
                  <FiEdit3 className="h-4 w-4" /> Viết bài
                </span>
              </button>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                    <FiEdit3 className="text-primary h-4 w-4" /> Bài viết mới
                  </h2>
                  <button
                    onClick={() => setComposerOpen(false)}
                    className="text-muted-foreground hover:text-foreground cursor-pointer"
                    aria-label="Đóng"
                  >
                    <FiX className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {POST_TYPES.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setPostType(t.id)}
                      title={t.hint}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                        postType === t.id
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-muted/40 text-foreground border-border hover:bg-muted"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={200}
                  placeholder="Tiêu đề — VD: Tìm co-founder kỹ thuật cho nền tảng EdTech"
                  className="w-full px-4 py-2.5 bg-muted/40 border border-border rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30"
                />

                <textarea
                  rows={5}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Mô tả chi tiết: bạn đang xây gì, cần người có kỹ năng nào, kinh nghiệm của bạn..."
                  className="w-full px-4 py-2.5 bg-muted/40 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none leading-relaxed"
                />

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                  <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                    <FiZap className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                    AI sẽ tự đọc bài và gắn nhãn lĩnh vực để đưa bài tới đúng người.
                  </p>
                  <button
                    onClick={handlePost}
                    disabled={posting}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-all disabled:opacity-50 cursor-pointer shrink-0"
                  >
                    <FiSend className="h-4 w-4" />
                    {posting ? "Đang đăng..." : "Đăng bài"}
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-1.5 bg-muted/50 p-1 rounded-xl border border-border w-fit">
              <button
                onClick={() => setSort("relevant")}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  sort === "relevant" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <FiTrendingUp className="h-3.5 w-3.5" /> Gợi ý cho bạn
              </button>
              <button
                onClick={() => setSort("recent")}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  sort === "recent" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <FiClock className="h-3.5 w-3.5" /> Mới nhất
              </button>
            </div>

            <div className="relative flex-1 max-w-xs">
              <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm bài viết, người, nhãn..."
                className="w-full pl-10 pr-4 py-2 text-xs bg-muted/50 border border-border rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            {activeTagName && (
              <button
                onClick={() => setTagFilter(null)}
                className="px-3 py-2 bg-muted text-xs font-semibold rounded-xl text-muted-foreground hover:text-foreground border border-border flex items-center gap-1 shrink-0 cursor-pointer"
              >
                Nhãn: {activeTagName} <FiX className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Tag chips */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {tags.slice(0, 14).map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => setTagFilter(tagFilter === tag.id ? null : tag.id)}
                  className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                    tagFilter === tag.id
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card text-muted-foreground border-border hover:text-foreground hover:border-primary/40"
                  }`}
                >
                  {tag.name}
                </button>
              ))}
            </div>
          )}

          {/* Feed */}
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-card border border-border rounded-3xl p-6 animate-pulse">
                  <div className="h-4 bg-muted rounded w-1/3 mb-3" />
                  <div className="h-3 bg-muted rounded w-2/3 mb-2" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : visiblePosts.length === 0 ? (
            <div className="text-center py-16 bg-card rounded-3xl border border-dashed border-border">
              <FiMessageCircle className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-50" />
              <h3 className="text-base font-bold text-foreground">Chưa có bài viết nào</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Hãy là người đầu tiên chia sẻ điều bạn đang xây dựng.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {visiblePosts.map((post) => {
                const meta = typeMeta(post.postType);
                return (
                  <article
                    key={post.id}
                    className="bg-card border border-border rounded-3xl p-6 shadow-sm hover:shadow-md hover:border-primary/30 transition-all"
                  >
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="flex items-center gap-3">
                        <div className="h-11 w-11 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold shrink-0 overflow-hidden">
                          {post.authorAvatar ? (
                            <img src={post.authorAvatar} alt="" className="h-full w-full object-cover" />
                          ) : (
                            post.authorName.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-foreground">{post.authorName}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {[post.authorProfession, post.authorCompany].filter(Boolean).join(" @ ") ||
                              "Thành viên CoSpace"}
                            {" · "}
                            {timeAgo(post.createdAt)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white ${meta.color}`}
                        >
                          {meta.label}
                        </span>
                        {post.mine && (
                          <button
                            onClick={() => handleDelete(post.id)}
                            className="text-muted-foreground hover:text-red-500 transition-colors cursor-pointer"
                            title="Xóa bài viết"
                          >
                            <FiTrash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <h3 className="text-lg font-bold text-foreground mb-1.5">{post.title}</h3>
                    <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-line mb-4">
                      {post.content}
                    </p>

                    <div className="flex flex-wrap items-center gap-1.5">
                      {post.tags.map((tag) => (
                        <span
                          key={tag}
                          className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-lg border ${
                            post.matchedTags.includes(tag)
                              ? "bg-primary/10 text-primary border-primary/30"
                              : "bg-muted/50 text-muted-foreground border-border/60"
                          }`}
                        >
                          {tag}
                        </span>
                      ))}
                      {post.branchName && (
                        <span className="text-[11px] text-muted-foreground inline-flex items-center gap-1 ml-1">
                          <FiMapPin className="h-3 w-3" /> {post.branchName}
                        </span>
                      )}
                    </div>

                    {post.matchedTags.length > 0 && !post.mine && (
                      <div className="mt-4 pt-3 border-t border-border/60 flex items-center gap-2 text-[11px]">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20">
                          <FiZap className="h-3 w-3" /> {post.relevanceScore}% phù hợp
                        </span>
                        <span className="text-muted-foreground">
                          Cùng quan tâm {post.matchedTags.slice(0, 3).join(", ")}
                        </span>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Right rail: people recommendations ── */}
        <aside className="space-y-4 lg:sticky lg:top-24">
          <section className="bg-card rounded-3xl border border-border p-5 shadow-sm">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <FiUsers className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-foreground">Người bạn nên kết nối</h2>
                <p className="text-[11px] text-muted-foreground">Dựa trên bài viết, kỹ năng và lĩnh vực</p>
              </div>
            </div>

            {partnersLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-muted/50 rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : partners.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">
                Cập nhật kỹ năng trong hồ sơ hoặc viết một bài để nhận gợi ý kết nối.
              </p>
            ) : (
              <div className="space-y-3">
                {partners.slice(0, 6).map((p) => (
                  <div
                    key={p.id}
                    className="p-3.5 rounded-2xl bg-muted/30 border border-border/60 hover:bg-muted/60 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-white flex items-center justify-center text-sm font-bold shrink-0 overflow-hidden">
                        {p.avatar && p.avatar.startsWith("http") ? (
                          <img src={p.avatar} alt="" className="h-full w-full object-cover" />
                        ) : (
                          p.avatar
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-bold text-foreground truncate">{p.name}</p>
                          <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 shrink-0">
                            {p.matchScore}%
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate">{p.profession}</p>

                        {p.matchReason && (
                          <p className="text-[11px] text-foreground/75 mt-1.5 leading-snug italic">
                            “{p.matchReason}”
                          </p>
                        )}

                        {p.commonTags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {p.commonTags.slice(0, 3).map((tag) => (
                              <span
                                key={tag}
                                className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}

                        <button
                          onClick={() => {
                            if (p.contactPublic && p.email) {
                              window.location.href = `mailto:${p.email}?subject=Ket noi tu CoSpace`;
                            } else {
                              showToast(`${p.name} đang ẩn thông tin liên hệ trực tiếp.`, "info");
                            }
                          }}
                          className="mt-2.5 w-full py-1.5 rounded-lg bg-primary/10 text-primary text-[11px] font-bold hover:bg-primary/20 transition-colors cursor-pointer"
                        >
                          Kết nối
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="bg-card rounded-3xl border border-border p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <FiTag className="h-4 w-4 text-amber-500" />
              <h2 className="text-sm font-bold text-foreground">Cách gợi ý hoạt động</h2>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Mỗi bài viết được AI đọc và gắn nhãn theo cùng bộ lĩnh vực với hồ sơ của bạn. Càng viết
              và cập nhật kỹ năng, hệ thống càng ghép bạn đúng người hơn.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
};

export default CommunityPage;

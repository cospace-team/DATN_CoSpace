import React, { useState } from "react";
import { FiMessageCircle, FiSend, FiTrash2 } from "react-icons/fi";
import { communityApi, type PostComment } from "../../../lib/communityApi";
import type { MemberPreview } from "../../../components/network/MemberProfileModal";

interface Props {
  postId: string;
  initialCount: number;
  /** "Trả lời" on a "Tìm cộng sự" post reads better than "Bình luận". */
  replyLabel: string;
  timeAgo: (iso: string) => string;
  onOpenMember: (member: MemberPreview) => void;
  onError: (message: string) => void;
}

/** Replies under a community post: collapsed to a count, opened on demand. */
const PostComments: React.FC<Props> = ({ postId, initialCount, replyLabel, timeAgo, onOpenMember, onError }) => {
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState<PostComment[] | null>(null);
  const [count, setCount] = useState(initialCount);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (next && comments === null) {
      try {
        const list = await communityApi.listComments(postId);
        setComments(list);
        setCount(list.length);
      } catch (e: any) {
        onError(e.message || "Không tải được bình luận.");
      }
    }
  };

  const send = async () => {
    const text = draft.trim();
    if (!text) return;
    setSending(true);
    try {
      const created = await communityApi.addComment(postId, text);
      setComments((list) => [...(list ?? []), created]);
      setCount((c) => c + 1);
      setDraft("");
    } catch (e: any) {
      onError(e.message || "Không gửi được bình luận.");
    } finally {
      setSending(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await communityApi.deleteComment(id);
      setComments((list) => (list ?? []).filter((c) => c.id !== id));
      setCount((c) => Math.max(0, c - 1));
    } catch (e: any) {
      onError(e.message || "Không xóa được bình luận.");
    }
  };

  return (
    <div className="mt-4 pt-3 border-t border-border/60">
      <button
        type="button"
        onClick={() => void toggle()}
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-primary transition-colors cursor-pointer"
      >
        <FiMessageCircle className="h-3.5 w-3.5" />
        {count > 0 ? `${count} bình luận` : replyLabel}
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          {comments === null ? (
            <p className="text-xs text-muted-foreground">Đang tải bình luận…</p>
          ) : (
            comments.map((c) => (
              <div key={c.id} className="flex items-start gap-2.5">
                <button
                  type="button"
                  onClick={() => onOpenMember({ userId: c.authorId, name: c.authorName, avatar: c.authorAvatar, profession: c.authorProfession })}
                  className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0 overflow-hidden cursor-pointer"
                  aria-label={`Xem hồ sơ ${c.authorName}`}
                >
                  {c.authorAvatar && c.authorAvatar.startsWith("http")
                    ? <img src={c.authorAvatar} alt="" className="h-full w-full object-cover" />
                    : c.authorName.charAt(0).toUpperCase()}
                </button>
                <div className="min-w-0 flex-1 rounded-2xl bg-muted/50 px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => onOpenMember({ userId: c.authorId, name: c.authorName, avatar: c.authorAvatar, profession: c.authorProfession })}
                      className="text-xs font-bold text-foreground hover:text-primary cursor-pointer truncate"
                    >
                      {c.authorName}
                    </button>
                    <span className="flex items-center gap-2 shrink-0 text-[10px] text-muted-foreground">
                      {timeAgo(c.createdAt)}
                      {c.mine && (
                        <button type="button" onClick={() => void remove(c.id)} className="hover:text-red-500 cursor-pointer" aria-label="Xóa bình luận">
                          <FiTrash2 className="h-3 w-3" />
                        </button>
                      )}
                    </span>
                  </div>
                  <p className="text-sm text-foreground/85 whitespace-pre-line break-words">{c.content}</p>
                </div>
              </div>
            ))
          )}
          <div className="flex items-end gap-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }}
              rows={1}
              maxLength={1000}
              placeholder="Viết bình luận… (Enter để gửi)"
              aria-label="Viết bình luận"
              className="input-field text-sm flex-1 resize-none min-h-[40px]"
            />
            <button
              type="button"
              onClick={() => void send()}
              disabled={sending || !draft.trim()}
              className="btn btn-primary btn-sm shrink-0"
              aria-label="Gửi bình luận"
            >
              <FiSend className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PostComments;

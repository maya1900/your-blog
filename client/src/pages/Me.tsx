import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bookmark,
  Download,
  Edit3,
  Eye,
  FileText,
  PenSquare,
  Calendar,
} from "lucide-react";
import { listArticles, listMyFavorites, downloadArticleMarkdown } from "@/api/articles";
import { updateMe, changePassword } from "@/api/users";
import { useAuthStore } from "@/stores/auth.store";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { AvatarEditor } from "@/components/AvatarEditor";
import { Avatar } from "@/components/Avatar";
import { formatDate } from "@/utils/format";
import { cn } from "@/utils/cn";

type Tab = "published" | "drafts" | "favorites" | "profile";

export function MePage() {
  const user = useAuthStore((s) => s.user);
  const [tab, setTab] = useState<Tab>("published");

  // Counts shown next to tabs — same query as published list, just total.
  const publishedQuery = useQuery({
    queryKey: ["my-articles", user?.id, "PUBLISHED"],
    queryFn: () =>
      listArticles({
        authorId: user!.id,
        status: "PUBLISHED",
        pageSize: 50,
      }),
    enabled: !!user,
  });

  const draftsQuery = useQuery({
    queryKey: ["my-articles", user?.id, "DRAFT"],
    queryFn: () =>
      listArticles({
        authorId: user!.id,
        status: "DRAFT",
        pageSize: 50,
      }),
    enabled: !!user,
  });

  const favoritesQuery = useQuery({
    queryKey: ["my-favorites", user?.id],
    queryFn: () => listMyFavorites({ pageSize: 50 }),
    enabled: !!user,
  });

  if (!user) {
    return (
      <div className="max-w-[1080px] mx-auto px-6 md:px-10 py-16">
        <p className="text-steel font-mono text-sm">LOADING…</p>
      </div>
    );
  }

  const publishedCount = publishedQuery.data?.total ?? 0;
  const draftsCount = draftsQuery.data?.total ?? 0;
  const favoritesCount = favoritesQuery.data?.total ?? 0;

  return (
    <>
      {/* Profile header */}
      <section className="border-b border-whisper bg-white/40">
        <div className="max-w-[1080px] mx-auto px-6 md:px-10 py-12">
          <div className="flex items-start gap-8 flex-wrap">
            <Avatar
              username={user.username}
              avatar={user.avatar}
              size={96}
              className="!ring-0 border border-whisper"
            />

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-3xl font-semibold tracking-tight">
                  {user.username}
                </h1>
                <span
                  className={cn("chip", user.role === "ADMIN" && "chip-active")}
                >
                  {user.role}
                </span>
                <span className="font-mono text-xs text-steel">
                  @{user.username}
                </span>
              </div>
              {user.bio && (
                <p className="mt-3 text-steel max-w-xl">{user.bio}</p>
              )}
              <div className="mt-4 flex items-center gap-2 font-mono text-xs text-steel">
                <Calendar size={13} />
                <span>加入于 {formatDate(user.createdAt)}</span>
              </div>
            </div>

            <div className="flex items-start gap-8">
              <div className="flex items-start gap-10">
                <Stat label="ARTICLES" value={publishedCount} />
                <Stat label="DRAFTS" value={draftsCount} />
                <Stat label="FAVORITES" value={favoritesCount} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tabs */}
      <div className="max-w-[1080px] mx-auto px-6 md:px-10">
        <nav className="flex gap-8 border-b border-whisper mt-2">
          <TabItem
            active={tab === "published"}
            onClick={() => setTab("published")}
            label="我的文章"
            count={publishedCount}
          />
          <TabItem
            active={tab === "drafts"}
            onClick={() => setTab("drafts")}
            label="草稿"
            count={draftsCount}
          />
          <TabItem
            active={tab === "favorites"}
            onClick={() => setTab("favorites")}
            label="我的收藏"
            count={favoritesCount}
          />
          <TabItem
            active={tab === "profile"}
            onClick={() => setTab("profile")}
            label="资料"
          />
        </nav>
      </div>

      {/* Content */}
      <main className="max-w-[1080px] mx-auto px-6 md:px-10 pt-8 pb-20">
        {tab === "published" && (
          <ArticleList query={publishedQuery} emptyMessage="还没有发布过文章" />
        )}
        {tab === "drafts" && (
          <ArticleList query={draftsQuery} emptyMessage="还没有草稿" tinted />
        )}
        {tab === "favorites" && <FavoritesList query={favoritesQuery} />}
        {tab === "profile" && <ProfileView />}
      </main>
    </>
  );
}

// ============ pieces ============

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="font-mono text-2xl font-semibold text-ink tracking-tight leading-none">
        {value}
      </span>
      <span className="font-mono text-[11px] text-steel tracking-[0.08em] mt-1">
        {label}
      </span>
    </div>
  );
}

function TabItem({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative py-3.5 text-[15px] transition-colors inline-flex items-center gap-2",
        active ? "text-klein" : "text-steel hover:text-ink",
      )}
    >
      {label}
      {count !== undefined && (
        <span
          className={cn(
            "inline-flex items-center justify-center min-w-[22px] h-[18px] px-1.5 rounded font-mono text-[11px]",
            active ? "bg-klein-tint text-klein" : "bg-whisper-soft text-steel",
          )}
        >
          {count}
        </span>
      )}
      {active && (
        <span className="absolute left-0 right-0 -bottom-px h-0.5 bg-klein" />
      )}
    </button>
  );
}

interface ArticleListProps {
  query: ReturnType<typeof useQuery<Awaited<ReturnType<typeof listArticles>>>>;
  emptyMessage: string;
  tinted?: boolean;
}

function ArticleList({ query, emptyMessage, tinted }: ArticleListProps) {
  if (query.isLoading) {
    return <p className="text-steel font-mono text-sm py-8">LOADING…</p>;
  }
  if (query.isError) {
    return (
      <p className="text-red-600 py-8">{(query.error as Error).message}</p>
    );
  }
  const items = query.data?.items ?? [];
  if (items.length === 0) {
    return (
      <EmptyState
        icon={<FileText size={28} strokeWidth={1.5} />}
        title={emptyMessage}
        description={
          tinted ? "开始一个新草稿,不发布也能保存" : "写下你的第一篇文章吧"
        }
        action={
          <Link to="/write" className="btn-primary !py-2 !px-4 text-sm">
            <PenSquare size={14} />
            写文章
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-3">
      {items.map((a) => (
        <article
          key={a.id}
          className={cn(
            "grid grid-cols-[160px_1fr_auto] gap-6 p-5 rounded-xl border transition-colors",
            tinted
              ? "bg-amber-50/50 border-amber-100 hover:border-klein"
              : "bg-white border-whisper hover:border-klein",
          )}
        >
          <Link
            to={`/articles/${a.slug}`}
            className="w-40 h-24 rounded-lg overflow-hidden border border-whisper bg-whisper-soft block"
          >
            {a.coverUrl ? (
              <img
                src={a.coverUrl}
                alt=""
                className="w-full h-full object-cover"
                style={{ filter: tinted ? "grayscale(40%)" : undefined }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-steel">
                <FileText size={20} strokeWidth={1.5} />
              </div>
            )}
          </Link>

          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <StatusBadge status={a.status} />
              <span className="chip">{a.category.name}</span>
              {a.tags.slice(0, 2).map((t) => (
                <span key={t.id} className="chip">
                  {t.name}
                </span>
              ))}
            </div>
            <h3 className="text-lg font-semibold leading-snug">
              <Link to={`/articles/${a.slug}`} className="hover:text-klein">
                {a.title}
              </Link>
            </h3>
            {a.summary && (
              <p className="mt-1 text-sm text-steel line-clamp-2">
                {a.summary}
              </p>
            )}
            <div className="mt-3 flex items-center gap-4 font-mono text-xs text-steel">
              <span>{formatDate(a.publishedAt ?? a.createdAt)}</span>
              {a.status === "PUBLISHED" && (
                <>
                  <span className="text-whisper">·</span>
                  <span className="inline-flex items-center gap-1">
                    <Eye size={12} />
                    {a.viewCount.toLocaleString()}
                  </span>
                </>
              )}
              <span className="text-whisper">·</span>
              <span>{a._count.comments} 评论</span>
            </div>
          </div>

          <div className="flex items-center gap-1 self-start">
            <Link
              to={`/articles/${a.slug}`}
              className="btn-icon !w-8 !h-8"
              title="查看"
            >
              <Eye size={14} />
            </Link>
            <Link
              to={`/write/${a.id}`}
              className="btn-icon !w-8 !h-8"
              title="编辑"
            >
              <Edit3 size={14} />
            </Link>
            <ExportButton slug={a.slug} />
          </div>
        </article>
      ))}
    </div>
  );
}

function ExportButton({ slug }: { slug: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <button
      type="button"
      onClick={async () => {
        if (busy) return;
        setBusy(true);
        setError(null);
        try {
          await downloadArticleMarkdown(slug);
        } catch (err) {
          setError((err as Error).message);
        } finally {
          setBusy(false);
        }
      }}
      disabled={busy}
      className="btn-icon !w-8 !h-8 disabled:opacity-50"
      title={error ?? "导出 Markdown"}
    >
      <Download size={14} className={busy ? "animate-pulse" : ""} />
    </button>
  );
}

function FavoritesList({
  query,
}: {
  query: ReturnType<
    typeof useQuery<Awaited<ReturnType<typeof listMyFavorites>>>
  >;
}) {
  if (query.isLoading) {
    return <p className="text-steel font-mono text-sm py-8">LOADING…</p>;
  }
  if (query.isError) {
    return (
      <p className="text-red-600 py-8">{(query.error as Error).message}</p>
    );
  }
  const items = query.data?.items ?? [];
  if (items.length === 0) {
    return (
      <EmptyState
        icon={<Bookmark size={28} strokeWidth={1.5} />}
        title="还没有收藏"
        description="在文章详情页点击书签图标收藏一篇"
        action={
          <Link to="/" className="btn-secondary">
            去逛文章
          </Link>
        }
      />
    );
  }
  return (
    <div className="space-y-3">
      {items.map((a) => (
        <article
          key={a.id}
          className="grid grid-cols-[160px_1fr_auto] gap-6 p-5 rounded-xl border bg-white border-whisper transition-colors hover:border-klein"
        >
          <Link
            to={`/articles/${a.slug}`}
            className="w-40 h-24 rounded-lg overflow-hidden border border-whisper bg-whisper-soft block"
          >
            {a.coverUrl ? (
              <img
                src={a.coverUrl}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-steel">
                <FileText size={20} strokeWidth={1.5} />
              </div>
            )}
          </Link>

          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="chip">{a.category.name}</span>
              {a.tags.slice(0, 2).map((t) => (
                <span key={t.id} className="chip">
                  {t.name}
                </span>
              ))}
            </div>
            <h3 className="text-lg font-semibold leading-snug">
              <Link to={`/articles/${a.slug}`} className="hover:text-klein">
                {a.title}
              </Link>
            </h3>
            {a.summary && (
              <p className="mt-1 text-sm text-steel line-clamp-2">
                {a.summary}
              </p>
            )}
            <div className="mt-3 flex items-center gap-3 font-mono text-xs text-steel">
              <span>作者 · {a.author.username}</span>
              <span className="text-whisper">·</span>
              <span className="inline-flex items-center gap-1">
                <Bookmark size={12} />
                收藏于 {formatDate(a.favoritedAt)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 self-start">
            <Link
              to={`/articles/${a.slug}`}
              className="btn-icon !w-8 !h-8"
              title="查看"
            >
              <Eye size={14} />
            </Link>
          </div>
        </article>
      ))}
    </div>
  );
}

function ProfileView() {
  const user = useAuthStore((s) => s.user)!;
  const setUser = useAuthStore((s) => s.setUser);
  const qc = useQueryClient();

  const [username, setUsername] = useState(user.username);
  const [bio, setBio] = useState(user.bio ?? "");
  const [avatar, setAvatar] = useState<string | null>(user.avatar);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const dirty =
    username.trim() !== user.username ||
    (bio || "") !== (user.bio ?? "") ||
    (avatar ?? null) !== (user.avatar ?? null);

  const saveMu = useMutation({
    mutationFn: () =>
      updateMe({
        username:
          username.trim() !== user.username ? username.trim() : undefined,
        bio: (bio || "") !== (user.bio ?? "") ? bio || null : undefined,
        avatar:
          (avatar ?? null) !== (user.avatar ?? null)
            ? avatar || null
            : undefined,
      }),
    onSuccess: (updated) => {
      setUser(updated);
      setSavedAt(Date.now());
      qc.invalidateQueries({ queryKey: ["my-articles"] });
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
    },
  });

  const errorMsg = saveMu.isError ? (saveMu.error as Error).message : null;
  const bioCount = bio.length;

  return (
    <>
    <div className="border border-whisper rounded-xl bg-white p-6 max-w-2xl">
      <h2 className="text-lg font-semibold mb-1">编辑资料</h2>
      <p className="text-sm text-steel mb-6">
        头像、昵称、简介可改。邮箱和角色由管理员管理,不能在这里改。
      </p>

      {/* Avatar */}
      <div className="mb-6">
        <p className="field-label mb-2">头像</p>
        <AvatarEditor
          value={avatar}
          onChange={setAvatar}
          fallback={user.username}
        />
      </div>

      {/* Username */}
      <div className="mb-5">
        <label className="field-label" htmlFor="me-username">
          昵称 / 用户名
        </label>
        <input
          id="me-username"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          maxLength={32}
          placeholder="3-32 字符,允许中文 / 字母 / 数字 / _ -"
          className="input"
        />
        <p className="mt-1 font-mono text-xs text-steel">
          也是登录用户名(改后下次登录用新的)
        </p>
      </div>

      {/* Bio */}
      <div className="mb-6">
        <label className="field-label" htmlFor="me-bio">
          简介
        </label>
        <textarea
          id="me-bio"
          value={bio}
          onChange={(e) => setBio(e.target.value.slice(0, 200))}
          maxLength={200}
          rows={3}
          placeholder="一两句话介绍自己。最多 200 字。"
          className="input resize-none"
        />
        <p
          className={cn(
            "mt-1 font-mono text-xs text-right",
            bioCount > 180 ? "text-amber-600" : "text-steel",
          )}
        >
          {bioCount} / 200
        </p>
      </div>

      {/* Save / status */}
      <div className="flex items-center gap-3 pt-2 border-t border-whisper">
        <button
          type="button"
          onClick={() => saveMu.mutate()}
          disabled={!dirty || saveMu.isPending || username.trim().length < 3}
          className="btn-primary !py-2 !px-5 text-sm"
        >
          {saveMu.isPending ? "保存中…" : "保存修改"}
        </button>

        {dirty && !saveMu.isPending && (
          <button
            type="button"
            onClick={() => {
              setUsername(user.username);
              setBio(user.bio ?? "");
              setAvatar(user.avatar);
              saveMu.reset();
              setSavedAt(null);
            }}
            className="btn-secondary"
          >
            撤销
          </button>
        )}

        {errorMsg && <p className="text-sm text-red-600 ml-auto">{errorMsg}</p>}
        {!errorMsg && savedAt && !dirty && (
          <p className="text-sm text-emerald-700 ml-auto">已保存 ✓</p>
        )}
      </div>

      {/* Read-only info */}
      <dl className="mt-8 pt-6 border-t border-whisper grid grid-cols-[100px_1fr] gap-y-2.5 font-mono text-sm">
        <dt className="text-steel">EMAIL</dt>
        <dd className="text-ink">{user.email}</dd>
        <dt className="text-steel">ROLE</dt>
        <dd>
          <span className={user.role === "ADMIN" ? "chip chip-active" : "chip"}>
            {user.role}
          </span>
        </dd>
        <dt className="text-steel">JOINED</dt>
        <dd className="text-ink">{formatDate(user.createdAt)}</dd>
      </dl>
    </div>
    <PasswordChangeCard />
  </>
  );
}

// ============ Change password card ============

function PasswordChangeCard() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const changeMu = useMutation({
    mutationFn: () => changePassword({ currentPassword: current, newPassword: next }),
    onSuccess: () => {
      setCurrent("");
      setNext("");
      setConfirm("");
      setSavedAt(Date.now());
    },
  });

  const mismatch = confirm.length > 0 && next !== confirm;
  const tooShort = next.length > 0 && next.length < 8;
  const sameAsOld = next.length > 0 && current.length > 0 && next === current;
  const canSubmit =
    current.length > 0 &&
    next.length >= 8 &&
    confirm === next &&
    !sameAsOld &&
    !changeMu.isPending;

  const errMsg = changeMu.isError ? (changeMu.error as Error).message : null;

  return (
    <div className="mt-6 border border-whisper rounded-xl bg-white p-6 max-w-2xl">
      <h2 className="text-lg font-semibold mb-1">修改密码</h2>
      <p className="text-sm text-steel mb-6">
        改密后需要重新登录其他设备。8-64 位,不能与当前密码相同。
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="field-label" htmlFor="pwd-current">
            当前密码
          </label>
          <input
            id="pwd-current"
            type="password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            autoComplete="current-password"
            className="input font-mono"
          />
        </div>
        <div>
          <label className="field-label" htmlFor="pwd-next">
            新密码
          </label>
          <input
            id="pwd-next"
            type="password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            autoComplete="new-password"
            className="input font-mono"
          />
          {tooShort && (
            <p className="mt-1 text-xs text-amber-600">至少 8 位</p>
          )}
          {sameAsOld && (
            <p className="mt-1 text-xs text-amber-600">不能与当前密码相同</p>
          )}
        </div>
        <div>
          <label className="field-label" htmlFor="pwd-confirm">
            确认新密码
          </label>
          <input
            id="pwd-confirm"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            className="input font-mono"
          />
          {mismatch && (
            <p className="mt-1 text-xs text-red-600">两次输入不一致</p>
          )}
        </div>
      </div>

      <div className="mt-5 pt-4 border-t border-whisper flex items-center gap-3">
        <button
          type="button"
          onClick={() => {
            changeMu.reset();
            setSavedAt(null);
            changeMu.mutate();
          }}
          disabled={!canSubmit}
          className="btn-primary !py-2 !px-5 text-sm"
        >
          {changeMu.isPending ? "提交中…" : "更新密码"}
        </button>
        {errMsg && <p className="text-sm text-red-600 ml-auto">{errMsg}</p>}
        {!errMsg && savedAt && (
          <p className="text-sm text-emerald-700 ml-auto">密码已更新 ✓</p>
        )}
      </div>
    </div>
  );
}

// ============ Avatar editor ============


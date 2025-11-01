'use client'

import { useEffect, useMemo, useState } from 'react'
import { Toaster, toast } from 'sonner'

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem
} from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog"

type Session = {
  id: number
  title: string
  system: string
  players?: string
  date?: string
  memo?: string
  logUrl?: string
}
type Paged = { items: Session[]; total: number }

const systemTone = (name?: string) => {
  if (!name) return "bg-gray-100 text-gray-700"
  const n = name.toLowerCase()
  if (n.includes("coc")) return "bg-indigo-100 text-indigo-700"
  if (n.includes("dnd") || n.includes("d&d")) return "bg-amber-100 text-amber-700"
  if (n.includes("sw2")) return "bg-emerald-100 text-emerald-700"
  return "bg-slate-100 text-slate-700"
}
const isValidUrl = (v?: string) => {
  if (!v) return true
  try { new URL(v); return true } catch { return false }
}

export default function Home() {
  const API_BASE = useMemo(() => process.env.NEXT_PUBLIC_API_BASE ?? "http://127.0.0.1:8000", [])

  // 一覧状態
  const [sessions, setSessions] = useState<Session[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  // クエリ
  const [q, setQ] = useState('')
  const [sortBy, setSortBy] = useState<'date' | 'title' | 'system' | 'id'>('date')
  const [order, setOrder] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(12)

  // 追加フォーム（新規追加専用）
  const [title, setTitle] = useState('')
  const [system, setSystem] = useState('')
  const [players, setPlayers] = useState('')
  const [dateLocal, setDateLocal] = useState('')
  const [memo, setMemo] = useState('')
  const [logUrl, setLogUrl] = useState('')

  // 削除
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [target, setTarget] = useState<Session | null>(null)

  // 詳細 & 編集（モーダル内で完結）
  const [detailOpen, setDetailOpen] = useState(false)
  const [selected, setSelected] = useState<Session | null>(null)
  const [editMode, setEditMode] = useState(false)             // ← モーダル内編集モード
  const [draft, setDraft] = useState<Session | null>(null)    // ← 編集ドラフト

  const fetchSessions = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        q, sort_by: sortBy, order, page: String(page), limit: String(limit),
      })
      const res = await fetch(`${API_BASE}/sessions?${params}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data: Paged = await res.json()
      setSessions(data.items ?? [])
      setTotal(data.total ?? 0)
    } catch (e: any) {
      toast.error('一覧の取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { fetchSessions() }, [q, sortBy, order, page, limit])

  const resetCreateForm = () => {
    setTitle(''); setSystem(''); setPlayers(''); setDateLocal(''); setMemo(''); setLogUrl('')
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !system.trim()) return toast.error('タイトルとシステムは必須です')
    if (!isValidUrl(logUrl)) return toast.error('プレイログURLが不正です')

    const payload: any = {
      title: title.trim(),
      system: system.trim(),
      players: players.trim() || undefined,
      memo: memo.trim() || undefined,
      logUrl: logUrl.trim() || undefined,
      ...(dateLocal ? { date: new Date(dateLocal).toISOString() } : {})
    }
    const res = await fetch(`${API_BASE}/sessions`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    })
    if (!res.ok) return toast.error(`POST failed (${res.status})`)
    toast.success('追加しました')
    resetCreateForm()
    setPage(1)
    fetchSessions()
  }

  const remove = async (id: number) => {
    const res = await fetch(`${API_BASE}/sessions/${id}`, { method: 'DELETE' })
    if (res.ok || res.status === 204) {
      toast('削除しました'); fetchSessions()
    } else {
      toast.error('削除に失敗しました')
    }
  }

  // ===== モーダル内編集ハンドラ =====
  const openDetail = (s: Session) => {
    setSelected(s)
    setEditMode(false)
    setDraft({
      ...s,
      // draftのdateはdatetime-localの値に合わせる（ISOの分切り捨て）
      date: s.date ? new Date(new Date(s.date).getTime() - new Date(s.date).getTimezoneOffset() * 60000)
        .toISOString().slice(0,16) : ''
    } as Session)
    setDetailOpen(true)
  }

  const saveDraft = async () => {
    if (!selected || !draft) return
    if (!draft.title?.trim() || !draft.system?.trim()) return toast.error('タイトルとシステムは必須です')
    if (!isValidUrl(draft.logUrl)) return toast.error('プレイログURLが不正です')

    const payload: any = {
      title: draft.title.trim(),
      system: draft.system.trim(),
      players: (draft.players || '').trim() || undefined,
      memo: (draft.memo || '').trim() || undefined,
      logUrl: (draft.logUrl || '').trim() || undefined,
    }
    if (draft.date) payload.date = new Date(draft.date).toISOString()

    const res = await fetch(`${API_BASE}/sessions/${selected.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) return toast.error(`PATCH failed (${res.status})`)

    toast.success('更新しました')
    setDetailOpen(false)
    setEditMode(false)
    setSelected(null)
    await fetchSessions()
  }

  const totalPages = Math.max(1, Math.ceil(total / limit))

  return (
    <main className="max-w-5xl mx-auto px-6 py-10 font-sans">
      {/* ヘッダーバー */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
        <h1 className="text-3xl font-semibold tracking-tight">🎲 TRPG セッション管理</h1>
        <div className="flex flex-wrap gap-3">
          <Input
            placeholder="検索（タイトル・システム・参加者）"
            value={q}
            onChange={(e) => { setPage(1); setQ(e.target.value) }}
            className="w-72"
          />
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
            <SelectTrigger className="w-28"><SelectValue placeholder="項目" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="date">日付</SelectItem>
              <SelectItem value="title">タイトル</SelectItem>
              <SelectItem value="system">システム</SelectItem>
              <SelectItem value="id">ID</SelectItem>
            </SelectContent>
          </Select>
          <Select value={order} onValueChange={(v) => setOrder(v as any)}>
            <SelectTrigger className="w-24"><SelectValue placeholder="順序" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="desc">降順</SelectItem>
              <SelectItem value="asc">昇順</SelectItem>
            </SelectContent>
          </Select>
          <Select value={String(limit)} onValueChange={(v) => { setPage(1); setLimit(Number(v)) }}>
            <SelectTrigger className="w-28"><SelectValue placeholder="件数" /></SelectTrigger>
            <SelectContent>
              {['12','24','36','60'].map(n => <SelectItem key={n} value={n}>{n}/page</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 追加フォーム（新規用） */}
      <Card className="p-5 mb-8 rounded-2xl shadow-sm">
        <form onSubmit={handleCreate} className="grid gap-3 md:grid-cols-2">
          <Input placeholder="タイトル（必須）" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Input placeholder="システム（必須）" value={system} onChange={(e) => setSystem(e.target.value)} />
          <Input placeholder="参加者（カンマ区切り）" value={players} onChange={(e) => setPlayers(e.target.value)} />
          <Input type="datetime-local" value={dateLocal} onChange={(e) => setDateLocal(e.target.value)} />
          <Input placeholder="プレイログURL（任意）" value={logUrl} onChange={(e) => setLogUrl(e.target.value)} className="md:col-span-2" />
          <Textarea placeholder="メモ（任意）" value={memo} onChange={(e) => setMemo(e.target.value)} className="md:col-span-2 min-h-[96px]" />
          <div className="md:col-span-2 flex gap-2">
            <Button type="submit" className="rounded-lg">追加</Button>
            <Button type="button" variant="outline" onClick={resetCreateForm} className="rounded-lg">クリア</Button>
          </div>
        </form>
      </Card>

      {/* 一覧（カードグリッド） */}
      {loading ? (
        <p className="text-sm text-muted-foreground">読み込み中…</p>
      ) : sessions.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground rounded-2xl">
          検索条件に一致するセッションがありません。新規追加してください。
        </Card>
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {sessions.map((s) => (
            <li key={s.id}>
              <Card
                className="p-4 rounded-2xl shadow-sm hover:shadow-md transition-shadow h-full cursor-pointer"
                onClick={() => openDetail(s)}
              >
                <div className="flex justify-between items-start gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-lg truncate">{s.title}</p>
                    <div className="mt-1 flex items-center gap-2 flex-wrap">
                      <span className={`inline-flex px-2 py-0.5 text-xs rounded-full ${systemTone(s.system)}`}>
                        {s.system}
                      </span>
                      <Badge variant="outline" className="text-xs font-normal">
                        {s.players || '参加者未設定'}
                      </Badge>
                    </div>
                    <p className="mt-2 text-xs text-gray-500">
                      {s.date ? new Date(s.date).toLocaleString() : '日程未設定'}
                    </p>
                  </div>

                  {/* 行アクション */}
                  <DropdownMenu modal={false}>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-full w-9 h-9 p-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        ⋯
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>アクション</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => openDetail(s)}>詳細/編集</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-red-600 focus:text-red-600"
                        onSelect={(e) => {
                          e.preventDefault()
                          setTarget(s)
                          setConfirmOpen(true)
                        }}
                      >
                        削除
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      {/* ページング */}
      <div className="mt-8 flex justify-center items-center gap-3">
        <Button variant="outline" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>◀</Button>
        <span className="text-sm">Page {page} / {totalPages}</span>
        <Button variant="outline" disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>▶</Button>
      </div>

      {/* 削除ダイアログ */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              この操作は取り消せません。<br />
              {target && <>ID {target.id}「{target.title}」を削除します。</>}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => { if (target) remove(target.id); setConfirmOpen(false) }}
            >
              削除する
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 詳細/編集モーダル（モーダル内で編集完結） */}
      <Dialog open={detailOpen} onOpenChange={(o) => { setDetailOpen(o); if (!o) { setEditMode(false); setSelected(null) } }}>
        <DialogContent className="max-w-lg">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl font-semibold">
                  {editMode ? 'セッションを編集' : selected.title}
                </DialogTitle>
                {!editMode && <DialogDescription>ID: {selected.id}</DialogDescription>}
              </DialogHeader>

              {!editMode ? (
                <div className="space-y-3 py-2 text-sm">
                  <p><span className="font-medium text-gray-600">システム：</span>{selected.system}</p>
                  <p><span className="font-medium text-gray-600">参加者：</span>{selected.players || '—'}</p>
                  <p><span className="font-medium text-gray-600">日付：</span>{selected.date ? new Date(selected.date).toLocaleString() : '—'}</p>
                  <p className="break-words">
                    <span className="font-medium text-gray-600">プレイログ：</span>
                    {selected.logUrl ? (
                      <a href={selected.logUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
                        {selected.logUrl}
                      </a>
                    ) : '—'}
                  </p>
                  <div>
                    <p className="font-medium text-gray-600">メモ：</p>
                    <p className="whitespace-pre-wrap text-gray-800 mt-1">{selected.memo || '—'}</p>
                  </div>
                </div>
              ) : (
                // 編集フォーム（モーダル内）
                <div className="grid gap-3 text-sm">
                  <Input
                    placeholder="タイトル（必須）"
                    value={draft?.title ?? ''}
                    onChange={(e) => setDraft(d => ({ ...(d as Session), title: e.target.value }))}
                  />
                  <Input
                    placeholder="システム（必須）"
                    value={draft?.system ?? ''}
                    onChange={(e) => setDraft(d => ({ ...(d as Session), system: e.target.value }))}
                  />
                  <Input
                    placeholder="参加者（カンマ区切り）"
                    value={draft?.players ?? ''}
                    onChange={(e) => setDraft(d => ({ ...(d as Session), players: e.target.value }))}
                  />
                  <Input
                    type="datetime-local"
                    value={(draft?.date as any as string) ?? ''}
                    onChange={(e) => setDraft(d => ({ ...(d as Session), date: e.target.value }))}
                  />
                  <Input
                    placeholder="プレイログURL（任意）"
                    value={draft?.logUrl ?? ''}
                    onChange={(e) => setDraft(d => ({ ...(d as Session), logUrl: e.target.value }))}
                  />
                  <Textarea
                    placeholder="メモ（任意）"
                    className="min-h-[96px]"
                    value={draft?.memo ?? ''}
                    onChange={(e) => setDraft(d => ({ ...(d as Session), memo: e.target.value }))}
                  />
                </div>
              )}

              <DialogFooter className="mt-2">
                {!editMode ? (
                  <>
                    <Button variant="outline" onClick={() => setEditMode(true)}>編集</Button>
                    <Button onClick={() => setDetailOpen(false)}>閉じる</Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" onClick={() => setEditMode(false)}>キャンセル</Button>
                    <Button onClick={saveDraft}>保存</Button>
                  </>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Toaster richColors />
    </main>
  )
}


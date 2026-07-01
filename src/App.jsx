import { useState, useEffect, useRef } from "react";

// 積読 — a place to face the books you bought but haven't read.
// Signature: the unread books render as a literal stack of spines.
// Spine thickness maps to page count; the "next to read" book glows like lamplight.

const STORE_KEY = "tsundoku:books:v1";

const SPINES = [
  "#c2553f", "#4f7a6a", "#d8a44a", "#6a6fa3",
  "#b3725e", "#7a8b5a", "#a04f6b", "#517089",
];

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// page count -> spine thickness in px (thicker book = taller spine)
function spineHeight(pages) {
  if (!pages) return 22;
  const p = Math.max(60, Math.min(900, pages));
  return Math.round(14 + ((p - 60) / (900 - 60)) * 30); // 14..44
}

function loadBooks() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveBooks(books) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(books));
  } catch (e) {
    /* storage full or blocked — keep the session going */
  }
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=DM+Sans:wght@400;500;700&display=swap');

* { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }

.tw-root {
  --bg: #1f1a1d;
  --bg2: #271f24;
  --surface: #2e262c;
  --line: #3c333a;
  --lamp: #e8a13c;
  --lamp-soft: rgba(232,161,60,.16);
  --cream: #f3ece1;
  --muted: #9a8f86;
  --danger: #d4715f;
  min-height: 100vh;
  background:
    radial-gradient(120% 70% at 50% -10%, #2a2127 0%, var(--bg) 55%) fixed;
  color: var(--cream);
  font-family: 'DM Sans', system-ui, sans-serif;
  display: flex;
  justify-content: center;
}
.tw-shell { width: 100%; max-width: 480px; padding: 22px 18px 130px; }

.tw-head { display: flex; align-items: baseline; gap: 10px; margin-bottom: 6px; }
.tw-mark {
  font-family: 'Fraunces', serif; font-weight: 700; font-size: 30px;
  letter-spacing: .04em; line-height: 1;
}
.tw-sub { color: var(--muted); font-size: 13px; margin-left: auto; }

/* ---- the pile (hero) ---- */
.tw-pile-wrap {
  margin: 18px 0 8px; padding: 22px 18px 16px;
  background: linear-gradient(180deg, var(--bg2), transparent);
  border: 1px solid var(--line); border-radius: 20px;
}
.tw-count {
  font-family: 'Fraunces', serif; font-weight: 700;
  font-size: 64px; line-height: .9; letter-spacing: -.02em;
  color: var(--cream);
}
.tw-count small { font-size: 22px; font-weight: 600; color: var(--muted); margin-left: 4px; }
.tw-count-label { color: var(--muted); font-size: 13px; margin-top: 4px; letter-spacing: .06em; }

.tw-stack { margin-top: 18px; display: flex; flex-direction: column-reverse; gap: 3px; }
.tw-spine {
  position: relative; border-radius: 4px; cursor: pointer;
  display: flex; align-items: center; padding: 0 12px;
  color: rgba(255,255,255,.92); font-size: 12px; font-weight: 500;
  box-shadow: inset 0 1px 0 rgba(255,255,255,.18), 0 1px 2px rgba(0,0,0,.35);
  transition: transform .15s ease, filter .15s ease;
  overflow: hidden; white-space: nowrap; text-overflow: ellipsis;
}
.tw-spine:active { transform: scale(.99); }
.tw-spine.next {
  box-shadow: inset 0 1px 0 rgba(255,255,255,.2), 0 0 0 1.5px var(--lamp), 0 0 18px var(--lamp-soft);
}
.tw-spine .tag {
  margin-left: auto; font-family: 'Fraunces', serif; font-weight: 700;
  font-size: 11px; background: var(--lamp); color: #2a1d08;
  padding: 1px 7px; border-radius: 999px; letter-spacing: .02em;
}
.tw-pile-empty { color: var(--muted); font-size: 14px; padding: 14px 2px 6px; line-height: 1.5; }
.tw-nudge {
  margin-top: 14px; font-size: 12.5px; color: var(--lamp);
  background: var(--lamp-soft); border-radius: 10px; padding: 9px 12px; line-height: 1.4;
}

/* ---- tabs ---- */
.tw-tabs { display: flex; gap: 6px; margin: 22px 0 12px; }
.tw-tab {
  flex: 1; padding: 9px 6px; border-radius: 11px; border: 1px solid var(--line);
  background: transparent; color: var(--muted); font: inherit; font-size: 13px;
  font-weight: 500; cursor: pointer; transition: all .15s ease;
}
.tw-tab[aria-selected="true"] { background: var(--surface); color: var(--cream); border-color: #4a4047; }
.tw-tab b { font-family: 'Fraunces', serif; }

/* ---- list ---- */
.tw-list { display: flex; flex-direction: column; gap: 10px; }
.tw-card {
  background: var(--surface); border: 1px solid var(--line); border-radius: 14px;
  overflow: hidden;
}
.tw-row { display: flex; align-items: stretch; cursor: pointer; }
.tw-rail { width: 6px; flex: 0 0 6px; }
.tw-body { padding: 13px 14px; flex: 1; min-width: 0; }
.tw-title {
  font-family: 'Fraunces', serif; font-weight: 600; font-size: 16.5px;
  line-height: 1.25; color: var(--cream);
  overflow: hidden; text-overflow: ellipsis; display: -webkit-box;
  -webkit-line-clamp: 2; -webkit-box-orient: vertical;
}
.tw-meta { color: var(--muted); font-size: 12.5px; margin-top: 3px; }
.tw-stars { color: var(--lamp); font-size: 13px; letter-spacing: 1px; }
.tw-note { color: var(--cream); opacity: .85; font-size: 13px; margin-top: 6px; line-height: 1.45; font-style: italic; }

.tw-actions { display: flex; gap: 8px; padding: 0 14px 13px; flex-wrap: wrap; }
.tw-btn {
  border: 1px solid var(--line); background: var(--bg2); color: var(--cream);
  font: inherit; font-size: 12.5px; font-weight: 500; padding: 7px 12px;
  border-radius: 9px; cursor: pointer; transition: all .12s ease;
}
.tw-btn:active { transform: scale(.97); }
.tw-btn.amber { background: var(--lamp); color: #2a1d08; border-color: var(--lamp); font-weight: 700; }
.tw-btn.ghost { color: var(--muted); }
.tw-btn.del { color: var(--danger); border-color: transparent; background: transparent; margin-left: auto; }

/* ---- floating add ---- */
.tw-fab {
  position: fixed; left: 50%; transform: translateX(-50%); bottom: 22px;
  background: var(--lamp); color: #2a1d08; border: none;
  font: inherit; font-weight: 700; font-size: 15px; padding: 14px 26px;
  border-radius: 999px; cursor: pointer; box-shadow: 0 8px 24px rgba(0,0,0,.4);
  display: flex; align-items: center; gap: 8px; z-index: 30;
}
.tw-fab:active { transform: translateX(-50%) scale(.97); }

/* ---- sheet ---- */
.tw-scrim {
  position: fixed; inset: 0; background: rgba(10,7,9,.6); z-index: 40;
  display: flex; align-items: flex-end; justify-content: center;
  backdrop-filter: blur(2px); animation: fade .18s ease;
}
.tw-sheet {
  width: 100%; max-width: 480px; background: var(--bg2);
  border: 1px solid var(--line); border-bottom: none;
  border-radius: 22px 22px 0 0; padding: 20px 18px calc(20px + env(safe-area-inset-bottom));
  animation: rise .22s cubic-bezier(.2,.7,.3,1);
}
.tw-sheet h2 { font-family: 'Fraunces', serif; font-weight: 700; font-size: 21px; margin: 0 0 16px; }
.tw-field { margin-bottom: 13px; }
.tw-field label { display: block; font-size: 12.5px; color: var(--muted); margin-bottom: 6px; }
.tw-input {
  width: 100%; background: var(--surface); border: 1px solid var(--line);
  border-radius: 11px; padding: 12px 13px; color: var(--cream);
  font: inherit; font-size: 16px; /* 16px avoids iOS zoom */
}
.tw-input:focus { outline: none; border-color: var(--lamp); }
.tw-input::placeholder { color: #6f655d; }
.tw-two { display: flex; gap: 10px; }
.tw-two .tw-field { flex: 1; }
.tw-rate { display: flex; gap: 8px; margin: 2px 0 4px; }
.tw-star {
  background: none; border: none; cursor: pointer; font-size: 30px; line-height: 1;
  color: #4a4047; padding: 0; transition: color .12s ease, transform .12s ease;
}
.tw-star.on { color: var(--lamp); }
.tw-star:active { transform: scale(.9); }
.tw-sheet-actions { display: flex; gap: 10px; margin-top: 8px; }
.tw-primary {
  flex: 1; background: var(--lamp); color: #2a1d08; border: none; font: inherit;
  font-weight: 700; font-size: 15px; padding: 14px; border-radius: 12px; cursor: pointer;
}
.tw-primary:disabled { opacity: .45; }
.tw-cancel {
  background: transparent; color: var(--muted); border: 1px solid var(--line);
  font: inherit; font-weight: 500; padding: 14px 18px; border-radius: 12px; cursor: pointer;
}

.tw-foot { text-align: center; color: var(--muted); font-size: 12px; margin-top: 26px; }
.tw-foot b { font-family: 'Fraunces', serif; color: var(--cream); }

@keyframes fade { from { opacity: 0 } to { opacity: 1 } }
@keyframes rise { from { transform: translateY(40px); opacity: .4 } to { transform: none; opacity: 1 } }
@media (prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important; } }
`;

export default function TsundokuApp() {
  const [books, setBooks] = useState(() => loadBooks());
  const [tab, setTab] = useState("unread");
  const [openId, setOpenId] = useState(null);
  const [adding, setAdding] = useState(false);
  const [finishing, setFinishing] = useState(null); // book being finished
  const first = useRef(true);

  // persist on change (skip the very first render)
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    saveBooks(books);
  }, [books]);

  const unread = books.filter((b) => b.status === "unread");
  const reading = books.filter((b) => b.status === "reading");
  const done = books.filter((b) => b.status === "done");
  const counts = { unread: unread.length, reading: reading.length, done: done.length };

  // pile: "next to read" floats to the top of the stack
  const pile = [...unread].sort((a, b) => (b.next === true) - (a.next === true));

  const list = tab === "unread" ? unread : tab === "reading" ? reading : done;

  function addBook(data) {
    const color = SPINES[books.length % SPINES.length];
    setBooks((bs) => [
      { id: uid(), status: "unread", next: false, color, addedAt: Date.now(), ...data },
      ...bs,
    ]);
    setAdding(false);
    setTab("unread");
  }

  function patch(id, changes) {
    setBooks((bs) => bs.map((b) => (b.id === id ? { ...b, ...changes } : b)));
  }

  function setNext(id) {
    setBooks((bs) => bs.map((b) => ({ ...b, next: b.id === id ? !b.next : false })));
  }

  function remove(id) {
    setBooks((bs) => bs.filter((b) => b.id !== id));
    setOpenId(null);
  }

  function finishBook(id, rating, note) {
    patch(id, { status: "done", next: false, rating, note: note.trim(), finishedAt: Date.now() });
    setFinishing(null);
    setOpenId(null);
  }

  const thisMonth = done.filter((b) => {
    const d = new Date(b.finishedAt || 0);
    const n = new Date();
    return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth();
  }).length;

  return (
    <div className="tw-root">
      <style>{CSS}</style>
      <div className="tw-shell">
        <div className="tw-head">
          <span className="tw-mark">積読</span>
          <span className="tw-sub">買った本と、向き合う</span>
        </div>

        {/* ---- the pile ---- */}
        <div className="tw-pile-wrap">
          <div className="tw-count">{counts.unread}<small>冊</small></div>
          <div className="tw-count-label">積んだまま</div>

          {pile.length === 0 ? (
            <div className="tw-pile-empty">棚は空っぽ。最初の1冊を積もう。</div>
          ) : (
            <div className="tw-stack">
              {pile.map((b) => (
                <div
                  key={b.id}
                  className={"tw-spine" + (b.next ? " next" : "")}
                  style={{ background: b.color, height: spineHeight(b.pages) }}
                  onClick={() => { setTab("unread"); setOpenId(b.id); }}
                  title={b.title}
                >
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{b.title}</span>
                  {b.next && <span className="tag">次に読む</span>}
                </div>
              ))}
            </div>
          )}

          {counts.unread >= 5 && (
            <div className="tw-nudge">積読が{counts.unread}冊。新しく買う前に、まず1冊。</div>
          )}
        </div>

        {/* ---- tabs ---- */}
        <div className="tw-tabs" role="tablist">
          {[
            ["unread", "積読"],
            ["reading", "読書中"],
            ["done", "読了"],
          ].map(([k, label]) => (
            <button
              key={k}
              className="tw-tab"
              role="tab"
              aria-selected={tab === k}
              onClick={() => { setTab(k); setOpenId(null); }}
            >
              {label} <b>{counts[k]}</b>
            </button>
          ))}
        </div>

        {/* ---- list ---- */}
        <div className="tw-list">
          {list.length === 0 && (
            <div className="tw-pile-empty" style={{ textAlign: "center", padding: "30px 10px" }}>
              {tab === "unread" && "積読はゼロ。気持ちいい。"}
              {tab === "reading" && "いま読んでいる本はまだない。積読から1冊どうぞ。"}
              {tab === "done" && "読み終えた本がここに並ぶ。"}
            </div>
          )}

          {list.map((b) => {
            const open = openId === b.id;
            return (
              <div className="tw-card" key={b.id}>
                <div className="tw-row" onClick={() => setOpenId(open ? null : b.id)}>
                  <div className="tw-rail" style={{ background: b.color }} />
                  <div className="tw-body">
                    <div className="tw-title">{b.title}</div>
                    <div className="tw-meta">
                      {b.author || "著者不明"}
                      {b.pages ? ` ・ ${b.pages}p` : ""}
                      {b.next && tab === "unread" ? " ・ 次に読む" : ""}
                    </div>
                    {b.status === "done" && (
                      <>
                        <div className="tw-stars">{"★".repeat(b.rating || 0)}{"☆".repeat(5 - (b.rating || 0))}</div>
                        {b.note && <div className="tw-note">“{b.note}”</div>}
                      </>
                    )}
                  </div>
                </div>

                {open && (
                  <div className="tw-actions">
                    {b.status === "unread" && (
                      <>
                        <button className="tw-btn amber" onClick={() => patch(b.id, { status: "reading", startedAt: Date.now() })}>読み始める</button>
                        <button className="tw-btn" onClick={() => setNext(b.id)}>{b.next ? "次に読むを外す" : "次に読む"}</button>
                      </>
                    )}
                    {b.status === "reading" && (
                      <>
                        <button className="tw-btn amber" onClick={() => setFinishing(b)}>読了にする</button>
                        <button className="tw-btn ghost" onClick={() => patch(b.id, { status: "unread" })}>積読に戻す</button>
                      </>
                    )}
                    {b.status === "done" && (
                      <button className="tw-btn ghost" onClick={() => setFinishing(b)}>感想を編集</button>
                    )}
                    <button className="tw-btn del" onClick={() => remove(b.id)}>削除</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="tw-foot">
          これまでに <b>{counts.done}</b> 冊読了 ・ 今月 <b>{thisMonth}</b> 冊
        </div>
      </div>

      <button className="tw-fab" onClick={() => setAdding(true)}>＋ 本を積む</button>

      {adding && <AddSheet onAdd={addBook} onClose={() => setAdding(false)} pileCount={counts.unread} />}
      {finishing && (
        <FinishSheet
          book={finishing}
          onSave={(r, n) => finishBook(finishing.id, r, n)}
          onClose={() => setFinishing(null)}
        />
      )}
    </div>
  );
}

function AddSheet({ onAdd, onClose, pileCount }) {
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [pages, setPages] = useState("");

  function submit() {
    if (!title.trim()) return;
    onAdd({ title: title.trim(), author: author.trim(), pages: pages ? parseInt(pages, 10) : null });
  }

  return (
    <div className="tw-scrim" onClick={onClose}>
      <div className="tw-sheet" onClick={(e) => e.stopPropagation()}>
        <h2>本を積む</h2>
        {pileCount >= 5 && (
          <div className="tw-nudge" style={{ marginTop: 0, marginBottom: 14 }}>
            すでに{pileCount}冊。積む前に、読んでない1冊を思い出して。
          </div>
        )}
        <div className="tw-field">
          <label>タイトル</label>
          <input className="tw-input" value={title} autoFocus
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="例：苦しみの手引き" />
        </div>
        <div className="tw-two">
          <div className="tw-field">
            <label>著者（任意）</label>
            <input className="tw-input" value={author}
              onChange={(e) => setAuthor(e.target.value)} placeholder="著者名" />
          </div>
          <div className="tw-field">
            <label>ページ数（任意）</label>
            <input className="tw-input" value={pages} inputMode="numeric"
              onChange={(e) => setPages(e.target.value.replace(/\D/g, ""))} placeholder="320" />
          </div>
        </div>
        <div className="tw-sheet-actions">
          <button className="tw-primary" disabled={!title.trim()} onClick={submit}>棚に積む</button>
          <button className="tw-cancel" onClick={onClose}>やめる</button>
        </div>
      </div>
    </div>
  );
}

function FinishSheet({ book, onSave, onClose }) {
  const [rating, setRating] = useState(book.rating || 0);
  const [note, setNote] = useState(book.note || "");

  return (
    <div className="tw-scrim" onClick={onClose}>
      <div className="tw-sheet" onClick={(e) => e.stopPropagation()}>
        <h2>{book.title}</h2>
        <div className="tw-field">
          <label>評価</label>
          <div className="tw-rate">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} className={"tw-star" + (n <= rating ? " on" : "")}
                onClick={() => setRating(n === rating ? 0 : n)} aria-label={`${n}つ星`}>★</button>
            ))}
          </div>
        </div>
        <div className="tw-field">
          <label>ひとことメモ</label>
          <textarea className="tw-input" rows={3} value={note}
            onChange={(e) => setNote(e.target.value)} placeholder="読んでどうだった？" />
        </div>
        <div className="tw-sheet-actions">
          <button className="tw-primary" onClick={() => onSave(rating, note)}>読了として残す</button>
          <button className="tw-cancel" onClick={onClose}>やめる</button>
        </div>
      </div>
    </div>
  );
}

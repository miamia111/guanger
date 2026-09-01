"""Local GUI manager for the 光而不耀 exhibition website."""

from __future__ import annotations

import json
import shutil
import tempfile
from datetime import datetime
from pathlib import Path
import tkinter as tk
from tkinter import filedialog, messagebox, ttk

from filename_rules import infer_filename

try:
    from PIL import Image, ImageOps, ImageTk
except ImportError:
    Image = ImageOps = ImageTk = None


ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "src" / "data" / "exhibition.json"
ART_DIR = ROOT / "public" / "artworks"
ORIGINAL_DIR = ROOT / "assets" / "originals"
IMAGE_TYPES = {".jpg", ".jpeg", ".png", ".webp", ".tif", ".tiff", ".bmp"}


def atomic_write_json(path: Path, data: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists():
        stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
        backup = path.with_suffix(f".backup-{stamp}.json")
        shutil.copy2(path, backup)
    with tempfile.NamedTemporaryFile("w", encoding="utf-8", suffix=".json", dir=path.parent, delete=False) as handle:
        json.dump(data, handle, ensure_ascii=False, indent=2)
        handle.write("\n")
        temporary = Path(handle.name)
    temporary.replace(path)


def next_work_id(works: list[dict]) -> str:
    used = {str(work.get("id", "")) for work in works}
    number = 1
    while f"work-{number:03d}" in used:
        number += 1
    return f"work-{number:03d}"


def save_webp_pair(source: Path, work_id: str) -> tuple[str, str]:
    if Image is None:
        raise RuntimeError("缺少 Pillow。请先运行：python -m pip install Pillow")
    ART_DIR.mkdir(parents=True, exist_ok=True)
    ORIGINAL_DIR.mkdir(parents=True, exist_ok=True)
    original = ORIGINAL_DIR / f"{work_id}{source.suffix.lower()}"
    if source.resolve() != original.resolve():
        shutil.copy2(source, original)
    with Image.open(source) as opened:
        image = ImageOps.exif_transpose(opened).convert("RGB")
        for suffix, edge, quality in (("thumb", 720, 78), ("large", 1800, 84)):
            output = image.copy()
            output.thumbnail((edge, edge), Image.Resampling.LANCZOS)
            output.save(ART_DIR / f"{work_id}-{suffix}.webp", "WEBP", quality=quality, method=6)
    return f"/artworks/{work_id}-thumb.webp", f"/artworks/{work_id}-large.webp"


class ImportDialog(tk.Toplevel):
    FIELDS = (("artist", "作者"), ("title", "作品名"), ("medium", "材料"), ("year", "年份"), ("size", "尺寸"), ("chapter", "章节"))

    def __init__(self, app: "ArtworkManager", files: list[str]):
        super().__init__(app)
        self.app = app
        self.title("批量导入 · 识别预览")
        self.geometry("1180x680")
        self.transient(app)
        self.grab_set()
        authors = sorted({w.get("artist", "") for w in app.data["works"] if w.get("artist")})
        self.rows = [infer_filename(path, app.data["settings"], authors) for path in files]
        self.current = 0
        self._build()
        self._show(0)

    def _build(self):
        header = ttk.Frame(self, padding=(18, 14)); header.pack(fill="x")
        ttk.Label(header, text=f"识别预览（{len(self.rows)} 个文件）", style="Title.TLabel").pack(side="left")
        ttk.Label(header, text="请检查后再确认导入；所有字段均可修改。", style="Muted.TLabel").pack(side="left", padx=18)
        body = ttk.Frame(self, padding=(18, 0, 18, 14)); body.pack(fill="both", expand=True)
        body.columnconfigure(1, weight=1); body.rowconfigure(0, weight=1)
        self.tree = ttk.Treeview(body, columns=("file", "artist", "title", "status"), show="headings", height=20)
        for key, text, width in (("file","文件名",270),("artist","作者",100),("title","作品名",180),("status","完整度",70)):
            self.tree.heading(key, text=text); self.tree.column(key, width=width, anchor="w")
        self.tree.grid(row=0, column=0, sticky="nsew", padx=(0, 18))
        self.tree.bind("<<TreeviewSelect>>", self._select)
        panel = ttk.LabelFrame(body, text="识别结果", padding=18); panel.grid(row=0, column=1, sticky="nsew")
        panel.columnconfigure(1, weight=1)
        self.vars = {}
        chapters = [f"{c['id']} · {c['title']}" for c in self.app.data["chapters"]]
        for row, (key, label) in enumerate(self.FIELDS):
            ttk.Label(panel, text=label).grid(row=row, column=0, sticky="w", pady=7, padx=(0, 12))
            var = tk.StringVar(); self.vars[key] = var
            widget = ttk.Combobox(panel, textvariable=var, values=chapters, state="readonly") if key == "chapter" else ttk.Entry(panel, textvariable=var)
            widget.grid(row=row, column=1, sticky="ew", pady=7)
        ttk.Button(panel, text="应用到当前文件", command=self._apply).grid(row=7, column=1, sticky="e", pady=(18,0))
        footer = ttk.Frame(self, padding=(18, 0, 18, 18)); footer.pack(fill="x")
        ttk.Button(footer, text="取消", command=self.destroy).pack(side="right")
        ttk.Button(footer, text="确认导入", style="Accent.TButton", command=self._confirm).pack(side="right", padx=10)
        for index, item in enumerate(self.rows):
            self.tree.insert("", "end", iid=str(index), values=(Path(item["source"]).name, item["artist"] or "待补", item["title"], f"{item['confidence']}/5"))

    def _show(self, index):
        self.current = index; item = self.rows[index]
        for key, _ in self.FIELDS:
            value = item.get(key, "")
            if key == "chapter" and value:
                chapter = next((c for c in self.app.data["chapters"] if c["id"] == value), None)
                value = f"{value} · {chapter['title']}" if chapter else value
            self.vars[key].set(value)
        self.tree.selection_set(str(index)); self.tree.see(str(index))

    def _select(self, _event=None):
        selected = self.tree.selection()
        if selected:
            self._show(int(selected[0]))

    def _apply(self):
        item = self.rows[self.current]
        for key, _ in self.FIELDS:
            value = self.vars[key].get().strip()
            item[key] = value.split(" · ", 1)[0] if key == "chapter" else value
        item["confidence"] = sum(bool(item.get(k)) for k in ("artist","title","medium","year","chapter"))
        self.tree.item(str(self.current), values=(Path(item["source"]).name, item["artist"] or "待补", item["title"], f"{item['confidence']}/5"))

    def _confirm(self):
        self._apply()
        try:
            for item in self.rows:
                work_id = next_work_id(self.app.data["works"])
                thumb, large = save_webp_pair(Path(item["source"]), work_id)
                self.app.data["works"].append({
                    "id": work_id, "chapter": item["chapter"] or "voices", "title": item["title"] or "未命名作品",
                    "artist": item["artist"] or "作者待补", "year": item["year"] or "资料待补",
                    "size": item["size"] or "尺寸待补", "medium": item["medium"] or "材料待补",
                    "thumbnail": thumb, "image": large, "description": "作品资料将在后续补充。"
                })
                if item["artist"]:
                    self.app.data["settings"]["authorChapters"][item["artist"]] = item["chapter"] or "voices"
            self.app.save(silent=True); self.app.refresh(); self.destroy()
            messagebox.showinfo("导入完成", f"已导入 {len(self.rows)} 件作品，并生成网页大图与缩略图。")
        except Exception as exc:
            messagebox.showerror("导入失败", str(exc), parent=self)


class ArtworkManager(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("光而不耀 · 作品管理")
        self.geometry("1380x820")
        self.minsize(1120, 680)
        with DATA_PATH.open(encoding="utf-8") as handle:
            self.data = json.load(handle)
        self.current_id = None
        self.preview_photo = None
        self._style(); self._build(); self.refresh()

    def _style(self):
        style = ttk.Style(self); style.theme_use("clam")
        self.configure(bg="#f5f2ef")
        style.configure(".", font=("Microsoft YaHei UI", 10), background="#f5f2ef", foreground="#211b20")
        style.configure("Title.TLabel", font=("Microsoft YaHei UI", 20, "bold"), background="#f5f2ef")
        style.configure("Muted.TLabel", foreground="#766e73", background="#f5f2ef")
        style.configure("Accent.TButton", background="#542749", foreground="white", padding=(16,9), borderwidth=0)
        style.map("Accent.TButton", background=[("active", "#68345b")])
        style.configure("Treeview", rowheight=54, background="#fffdfb", fieldbackground="#fffdfb", bordercolor="#ded8dc")
        style.configure("Treeview.Heading", font=("Microsoft YaHei UI", 9, "bold"), padding=8)

    def _build(self):
        top = ttk.Frame(self, padding=(22,16)); top.pack(fill="x")
        ttk.Label(top, text="作品管理", style="Title.TLabel").pack(side="left")
        ttk.Button(top, text="保存全部", command=self.save).pack(side="right")
        ttk.Button(top, text="批量导入图片", style="Accent.TButton", command=self.import_files).pack(side="right", padx=10)
        ttk.Button(top, text="新增作品", command=self.add_work).pack(side="right")

        toolbar = ttk.Frame(self, padding=(22,0,22,12)); toolbar.pack(fill="x")
        self.search_var = tk.StringVar(); search = ttk.Entry(toolbar, textvariable=self.search_var, width=44)
        search.pack(side="left"); search.bind("<KeyRelease>", lambda _e: self.refresh(keep=True))
        self.chapter_filter = tk.StringVar(value="全部章节")
        combo = ttk.Combobox(toolbar, textvariable=self.chapter_filter, state="readonly", width=18)
        combo["values"] = ["全部章节"] + [f"{c['id']} · {c['title']}" for c in self.data["chapters"]]
        combo.pack(side="left", padx=10); combo.bind("<<ComboboxSelected>>", lambda _e: self.refresh(keep=True))

        paned = ttk.Panedwindow(self, orient="horizontal"); paned.pack(fill="both", expand=True, padx=22, pady=(0,16))
        listing = ttk.Frame(paned); inspector = ttk.LabelFrame(paned, text="作品详情", padding=16)
        paned.add(listing, weight=3); paned.add(inspector, weight=2)
        columns = ("title","artist","year","chapter","medium")
        self.tree = ttk.Treeview(listing, columns=columns, show="headings", selectmode="browse")
        for key, label, width in (("title","作品名",190),("artist","作者",100),("year","年份",72),("chapter","归属章节",130),("medium","材料",130)):
            self.tree.heading(key, text=label); self.tree.column(key, width=width, anchor="w")
        self.tree.pack(fill="both", expand=True); self.tree.bind("<<TreeviewSelect>>", self.select_work)
        buttons = ttk.Frame(listing, padding=(0,10)); buttons.pack(fill="x")
        ttk.Button(buttons, text="上移", command=lambda: self.move(-1)).pack(side="left")
        ttk.Button(buttons, text="下移", command=lambda: self.move(1)).pack(side="left", padx=6)
        ttk.Button(buttons, text="删除作品", command=self.delete_work).pack(side="right")

        inspector.columnconfigure(1, weight=1); inspector.rowconfigure(8, weight=1)
        self.preview = ttk.Label(inspector, text="暂无作品图片", anchor="center")
        self.preview.grid(row=0, column=0, columnspan=3, sticky="ew", pady=(0,12))
        self.vars = {key: tk.StringVar() for key in ("id","title","artist","chapter","year","medium","size","image","thumbnail")}
        chapters = [f"{c['id']} · {c['title']}" for c in self.data["chapters"]]
        fields = (("title","作品名"),("artist","作者"),("chapter","归属章节"),("year","创作年份"),("medium","材料"),("size","尺寸"))
        for row, (key,label) in enumerate(fields, 1):
            ttk.Label(inspector, text=label).grid(row=row,column=0,sticky="w",pady=5,padx=(0,10))
            widget = ttk.Combobox(inspector,textvariable=self.vars[key],values=chapters,state="readonly") if key == "chapter" else ttk.Entry(inspector,textvariable=self.vars[key])
            widget.grid(row=row,column=1,columnspan=2,sticky="ew",pady=5)
        ttk.Label(inspector,text="作品简介").grid(row=7,column=0,sticky="nw",pady=5)
        self.description = tk.Text(inspector,height=7,wrap="word",font=("Microsoft YaHei UI",10),relief="solid",borderwidth=1)
        self.description.grid(row=7,column=1,columnspan=2,sticky="nsew",pady=5)
        ttk.Button(inspector,text="更换作品图片",command=self.replace_image).grid(row=9,column=1,sticky="w",pady=(12,0))
        ttk.Button(inspector,text="保存当前作品",style="Accent.TButton",command=self.apply_current).grid(row=9,column=2,sticky="e",pady=(12,0))
        self.bind("<Control-s>", lambda _e: self.apply_current())

    def chapter_label(self, chapter_id):
        chapter = next((c for c in self.data["chapters"] if c["id"] == chapter_id), None)
        return f"{chapter_id} · {chapter['title']}" if chapter else chapter_id

    def refresh(self, keep=False):
        selected = self.current_id if keep else None
        self.tree.delete(*self.tree.get_children())
        query = self.search_var.get().strip().lower() if hasattr(self, "search_var") else ""
        chapter_filter = self.chapter_filter.get().split(" · ",1)[0] if hasattr(self, "chapter_filter") else "全部章节"
        for work in self.data["works"]:
            haystack = " ".join(str(work.get(k,"")) for k in ("title","artist","medium","year")).lower()
            if query and query not in haystack: continue
            if chapter_filter != "全部章节" and work.get("chapter") != chapter_filter: continue
            self.tree.insert("","end",iid=work["id"],values=(work.get("title"),work.get("artist"),work.get("year"),self.chapter_label(work.get("chapter")),work.get("medium")))
        children = self.tree.get_children()
        target = selected if selected in children else (children[0] if children else None)
        if target: self.tree.selection_set(target); self.tree.focus(target); self.load_work(target)

    def select_work(self, _event=None):
        selected = self.tree.selection()
        if selected: self.load_work(selected[0])

    def load_work(self, work_id):
        work = next((w for w in self.data["works"] if w["id"] == work_id), None)
        if not work: return
        self.current_id = work_id
        for key,var in self.vars.items():
            value = work.get(key,"")
            if key == "chapter": value = self.chapter_label(value)
            var.set(value)
        self.description.delete("1.0","end"); self.description.insert("1.0",work.get("description",""))
        self.show_preview(work.get("image",""))

    def show_preview(self, relative):
        path = ROOT / "public" / relative.lstrip("/")
        if Image and path.exists():
            with Image.open(path) as opened:
                image = ImageOps.exif_transpose(opened); image.thumbnail((430,220),Image.Resampling.LANCZOS)
                self.preview_photo = ImageTk.PhotoImage(image.copy())
            self.preview.configure(image=self.preview_photo,text="")
        else: self.preview.configure(image="",text="暂无作品图片")

    def apply_current(self):
        work = next((w for w in self.data["works"] if w["id"] == self.current_id), None)
        if not work: return
        for key in ("title","artist","year","medium","size"):
            work[key] = self.vars[key].get().strip()
        work["chapter"] = self.vars["chapter"].get().split(" · ",1)[0] or "voices"
        work["description"] = self.description.get("1.0","end").strip()
        if work["artist"]: self.data["settings"]["authorChapters"][work["artist"]] = work["chapter"]
        self.save(silent=True); self.refresh(keep=True)

    def save(self, silent=False):
        atomic_write_json(DATA_PATH,self.data)
        if not silent: messagebox.showinfo("已保存","网站数据已保存，并自动创建时间戳备份。")

    def add_work(self):
        work_id = next_work_id(self.data["works"])
        self.data["works"].append({"id":work_id,"chapter":"voices","title":"未命名作品","artist":"作者待补","year":"资料待补","size":"尺寸待补","medium":"材料待补","thumbnail":"","image":"","description":""})
        self.save(silent=True); self.refresh(); self.tree.selection_set(work_id); self.load_work(work_id)

    def delete_work(self):
        if not self.current_id: return
        work = next((w for w in self.data["works"] if w["id"] == self.current_id),None)
        if work and messagebox.askyesno("确认删除",f"从目录删除《{work['title']}》？\n图片文件会保留，可手动恢复。"):
            self.data["works"].remove(work); self.current_id=None; self.save(silent=True); self.refresh()

    def move(self, delta):
        index = next((i for i,w in enumerate(self.data["works"]) if w["id"]==self.current_id),None)
        if index is None or not 0 <= index+delta < len(self.data["works"]): return
        self.data["works"][index],self.data["works"][index+delta]=self.data["works"][index+delta],self.data["works"][index]
        self.save(silent=True); self.refresh(keep=True)

    def import_files(self):
        files = filedialog.askopenfilenames(title="选择作品图片",filetypes=[("图片文件","*.jpg *.jpeg *.png *.webp *.tif *.tiff *.bmp")])
        if files: ImportDialog(self,list(files))

    def replace_image(self):
        if not self.current_id: return
        chosen = filedialog.askopenfilename(title="选择新图片",filetypes=[("图片文件","*.jpg *.jpeg *.png *.webp *.tif *.tiff *.bmp")])
        if chosen:
            try:
                thumb,large=save_webp_pair(Path(chosen),self.current_id)
                work=next(w for w in self.data["works"] if w["id"]==self.current_id)
                work["thumbnail"],work["image"]=thumb,large; self.save(silent=True); self.load_work(self.current_id)
            except Exception as exc: messagebox.showerror("图片处理失败",str(exc))


if __name__ == "__main__":
    ArtworkManager().mainloop()

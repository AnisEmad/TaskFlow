import { FormEvent, useCallback, useEffect, useState } from "react";
import { api, getToken, setToken, STATUS_LABELS, Project, Status, Task } from "./api";

type Page = { name: "dashboard" } | { name: "projects" } | { name: "project"; id: string };
const STATUSES: Status[] = ["todo", "in_progress", "done"];
const errMsg = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong");

function AuthForm({ onAuth }: { onAuth: () => void }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (mode === "register") await api.register(email, password);
      const { access_token } = await api.login(email, password);
      setToken(access_token);
      onAuth();
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth">
      <form className="card" onSubmit={submit}>
        <h1>TaskFlow</h1>
        <p className="muted">{mode === "login" ? "Log in to your account" : "Create an account"}</p>
        {error && <div className="error">{error}</div>}
        <label>Email<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <label>Password<input type="password" required minLength={8} maxLength={72} value={password} onChange={(e) => setPassword(e.target.value)} /></label>
        <button disabled={busy}>{mode === "login" ? "Log in" : "Register"}</button>
        <p className="muted">
          {mode === "login" ? "No account yet? " : "Already registered? "}
          <a href="#" onClick={(e) => { e.preventDefault(); setError(""); setMode(mode === "login" ? "register" : "login"); }}>
            {mode === "login" ? "Register" : "Log in"}
          </a>
        </p>
      </form>
    </div>
  );
}

function Dashboard({ open }: { open: (p: Page) => void }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    Promise.all([api.projects(), api.tasks()])
      .then(([p, t]) => { setProjects(p); setTasks(t); })
      .catch((e) => setError(errMsg(e)))
      .finally(() => setLoaded(true));
  }, []);

  if (!loaded) return <p className="muted">Loading…</p>;
  return (
    <>
      <h2>Dashboard</h2>
      {error && <div className="error">{error}</div>}
      <div className="stats">
        {STATUSES.map((s) => (
          <div className="card stat" key={s}>
            <strong>{tasks.filter((t) => t.status === s).length}</strong>
            <span className="muted">{STATUS_LABELS[s]}</span>
          </div>
        ))}
        <div className="card stat"><strong>{projects.length}</strong><span className="muted">Projects</span></div>
      </div>
      <h3>Your projects</h3>
      {projects.length === 0 && <p className="muted">No projects yet. Create your first one under Projects.</p>}
      {projects.map((p) => {
        const mine = tasks.filter((t) => t.project_id === p.id);
        const done = mine.filter((t) => t.status === "done").length;
        return (
          <div className="card row clickable" key={p.id} onClick={() => open({ name: "project", id: p.id })}>
            <span>{p.name}</span>
            <span className="muted">{done}/{mine.length} tasks done</span>
          </div>
        );
      })}
    </>
  );
}

function Projects({ open }: { open: (p: Page) => void }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(() => api.projects().then(setProjects).catch((e) => setError(errMsg(e))), []);
  useEffect(() => { load(); }, [load]);

  async function create(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await api.createProject(name, description);
      setName(""); setDescription("");
      await load();
    } catch (err) { setError(errMsg(err)); }
  }

  return (
    <>
      <h2>Projects</h2>
      {error && <div className="error">{error}</div>}
      <form className="card form" onSubmit={create}>
        <input placeholder="Project name" required maxLength={100} value={name} onChange={(e) => setName(e.target.value)} />
        <input placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} />
        <button>Create project</button>
      </form>
      {projects.length === 0 && <p className="muted">No projects yet.</p>}
      {projects.map((p) => (
        <div className="card clickable" key={p.id} onClick={() => open({ name: "project", id: p.id })}>
          <strong>{p.name}</strong>
          {p.description && <p className="muted">{p.description}</p>}
        </div>
      ))}
    </>
  );
}

function TaskRow({ task, onChange }: { task: Task; onChange: () => void }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [error, setError] = useState("");

  const run = async (fn: () => Promise<unknown>) => {
    setError("");
    try { await fn(); onChange(); } catch (e) { setError(errMsg(e)); }
  };

  if (editing) {
    return (
      <div className="card form">
        <input value={title} required onChange={(e) => setTitle(e.target.value)} />
        <input value={description} placeholder="Description" onChange={(e) => setDescription(e.target.value)} />
        <button onClick={() => run(async () => { await api.updateTask(task.id, { title, description: description || null }); setEditing(false); })}>Save</button>
        <button className="secondary" onClick={() => { setEditing(false); setTitle(task.title); setDescription(task.description ?? ""); }}>Cancel</button>
        {error && <div className="error">{error}</div>}
      </div>
    );
  }
  return (
    <div className={`card row ${task.status}`}>
      <div className="grow">
        <strong className={task.status === "done" ? "done-title" : ""}>{task.title}</strong>
        {task.description && <p className="muted">{task.description}</p>}
        {error && <div className="error">{error}</div>}
      </div>
      <select value={task.status} onChange={(e) => run(() => api.updateTask(task.id, { status: e.target.value as Status }))}>
        {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
      </select>
      <button className="secondary" onClick={() => setEditing(true)}>Edit</button>
      <button className="danger" onClick={() => { if (confirm(`Delete "${task.title}"?`)) run(() => api.deleteTask(task.id)); }}>Delete</button>
    </div>
  );
}

function ProjectTasks({ id, open }: { id: string; open: (p: Page) => void }) {
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(
    () => api.tasks(id).then(setTasks).catch((e) => setError(errMsg(e))), [id]);
  useEffect(() => {
    api.project(id).then(setProject).catch((e) => setError(errMsg(e)));
    load();
  }, [id, load]);

  async function create(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await api.createTask(id, title, description);
      setTitle(""); setDescription("");
      await load();
    } catch (err) { setError(errMsg(err)); }
  }

  return (
    <>
      <p><a href="#" onClick={(e) => { e.preventDefault(); open({ name: "projects" }); }}>← All projects</a></p>
      <h2>{project?.name ?? "Project"}</h2>
      {project?.description && <p className="muted">{project.description}</p>}
      {error && <div className="error">{error}</div>}
      <form className="card form" onSubmit={create}>
        <input placeholder="New task title" required maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} />
        <input placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} />
        <button>Add task</button>
      </form>
      {tasks.length === 0 && <p className="muted">No tasks yet. Add one above.</p>}
      {STATUSES.map((s) => {
        const list = tasks.filter((t) => t.status === s);
        return list.length > 0 && (
          <section key={s}>
            <h3>{STATUS_LABELS[s]} ({list.length})</h3>
            {list.map((t) => <TaskRow key={t.id + t.status + t.title} task={t} onChange={load} />)}
          </section>
        );
      })}
    </>
  );
}

export default function App() {
  const [authed, setAuthed] = useState(!!getToken());
  const [email, setEmail] = useState("");
  const [page, setPage] = useState<Page>({ name: "dashboard" });

  useEffect(() => {
    if (authed) api.me().then((u) => setEmail(u.email)).catch(() => {});
  }, [authed]);

  if (!authed) return <AuthForm onAuth={() => setAuthed(true)} />;

  const logout = () => { setToken(null); setAuthed(false); setPage({ name: "dashboard" }); };
  return (
    <>
      <nav>
        <strong>TaskFlow</strong>
        <button className={page.name === "dashboard" ? "active" : "secondary"} onClick={() => setPage({ name: "dashboard" })}>Dashboard</button>
        <button className={page.name !== "dashboard" ? "active" : "secondary"} onClick={() => setPage({ name: "projects" })}>Projects</button>
        <span className="grow" />
        <span className="muted email">{email}</span>
        <button className="secondary" onClick={logout}>Log out</button>
      </nav>
      <main>
        {page.name === "dashboard" && <Dashboard open={setPage} />}
        {page.name === "projects" && <Projects open={setPage} />}
        {page.name === "project" && <ProjectTasks id={page.id} open={setPage} />}
      </main>
    </>
  );
}

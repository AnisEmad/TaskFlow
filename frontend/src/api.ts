export type Status = "todo" | "in_progress" | "done";
export interface Project { id: string; name: string; description: string | null; created_at: string }
export interface Task {
  id: string; project_id: string; title: string; description: string | null; status: Status; created_at: string;
}
export const STATUS_LABELS: Record<Status, string> = { todo: "To Do", in_progress: "In Progress", done: "Done" };

const KEY = "taskflow_token";
export const getToken = () => localStorage.getItem(KEY);
export const setToken = (t: string | null) => (t ? localStorage.setItem(KEY, t) : localStorage.removeItem(KEY));

async function request<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  const token = getToken();
  const res = await fetch("/api" + path, {
    method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (res.status === 401 && token) {
    setToken(null);
    location.reload();
  }
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    const d = data?.detail;
    throw new Error(typeof d === "string" ? d : Array.isArray(d) ? d.map((x: { msg: string }) => x.msg).join(", ") : res.statusText);
  }
  return res.status === 204 ? (undefined as T) : res.json();
}

export const api = {
  register: (email: string, password: string) => request("/auth/register", "POST", { email, password }),
  login: (email: string, password: string) =>
    request<{ access_token: string }>("/auth/login", "POST", { email, password }),
  me: () => request<{ email: string }>("/auth/me"),
  projects: () => request<Project[]>("/tasks/projects"),
  project: (id: string) => request<Project>(`/tasks/projects/${id}`),
  createProject: (name: string, description: string) =>
    request<Project>("/tasks/projects", "POST", { name, description: description || null }),
  tasks: (projectId?: string) => request<Task[]>("/tasks/tasks" + (projectId ? `?project_id=${projectId}` : "")),
  createTask: (project_id: string, title: string, description: string) =>
    request<Task>("/tasks/tasks", "POST", { project_id, title, description: description || null }),
  updateTask: (id: string, patch: Partial<Pick<Task, "title" | "description" | "status">>) =>
    request<Task>(`/tasks/tasks/${id}`, "PATCH", patch),
  deleteTask: (id: string) => request<void>(`/tasks/tasks/${id}`, "DELETE"),
};

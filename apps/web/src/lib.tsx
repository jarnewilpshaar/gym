import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import nl from "./nl.json";
import { demoPlan, demoWeights } from "./demo";
import {
  defaultProfile,
  type Profile,
  type GeneratedPlan,
} from "../../../packages/shared/schema";
export const t = nl;
let refreshing: Promise<unknown> | null = null;
export async function api<T = unknown>(
  path: string,
  method = "GET",
  body?: unknown,
  retry = true,
): Promise<T> {
  const response = await fetch(`/api${path}`, {
    method,
    credentials: "include",
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  if (
    response.status === 401 &&
    retry &&
    path !== "/auth/login" &&
    path !== "/auth/refresh"
  ) {
    if (!refreshing)
      refreshing = api("/auth/refresh", "POST", {}, false).finally(() => {
        refreshing = null;
      });
    await refreshing;
    return api<T>(path, method, body, false);
  }
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? t.error);
  return result as T;
}
export type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  profile?: { data: Profile };
};
export type Progress = {
  id?: string;
  date: string;
  weight: number;
  waist?: number;
  notes?: string;
  photo?: string;
};
type Activity = {
  workouts: {
    dayKey: string;
    completed: boolean;
    sets: { exercise: string; number: number; reps: number; weight: number }[];
  }[];
  meals: { mealKey: string }[];
};
type Store = {
  user: User | null;
  booting: boolean;
  profile: Profile;
  plan: GeneratedPlan | null;
  version: number;
  progress: Progress[];
  activity: Activity;
  reload: () => Promise<void>;
  notify: (s: string) => void;
  setDemoProgress: (p: Progress) => void;
  demoMeals: string[];
  setDemoMeals: (v: string[]) => void;
  demoWorkout: boolean;
  setDemoWorkout: (v: boolean) => void;
};
const Context = createContext<Store>(null!);
export function useStore() {
  return useContext(Context);
}
export function Provider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [booting, setBooting] = useState(true);
  const [profile, setProfile] = useState(defaultProfile);
  const [plan, setPlan] = useState<GeneratedPlan | null>(demoPlan);
  const [version, setVersion] = useState(1);
  const [progress, setProgress] = useState<Progress[]>(demoWeights);
  const [activity, setActivity] = useState<Activity>({
    workouts: [],
    meals: [],
  });
  const [message, setMessage] = useState("");
  const [demoMeals, setDemoMeals] = useState<string[]>(["0"]);
  const [demoWorkout, setDemoWorkout] = useState(false);
  async function reload() {
    let me: User;
    try {
      me = await api<User>("/me");
    } catch {
      setUser(null);
      setPlan(demoPlan);
      setProfile(defaultProfile);
      setProgress(demoWeights);
      setBooting(false);
      return;
    }
    setUser(me);
    setProfile(me.profile?.data ?? defaultProfile);
    try {
      const [p, logs, a] = await Promise.all([
        api<{ response: GeneratedPlan; version: number } | null>("/plan"),
        api<Progress[]>("/progress"),
        api<Activity>("/activity"),
      ]);
      setPlan(p?.response ?? null);
      setVersion(p?.version ?? 0);
      setProgress(logs);
      setActivity(a);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t.error);
    } finally {
      setBooting(false);
    }
  }
  useEffect(() => {
    void reload();
  }, []);
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(""), 5500);
    return () => clearTimeout(timer);
  }, [message]);
  return (
    <Context.Provider
      value={{
        user,
        booting,
        profile,
        plan,
        version,
        progress,
        activity,
        reload,
        notify: setMessage,
        setDemoProgress: (p) => setProgress((old) => [...old, p]),
        demoMeals,
        setDemoMeals,
        demoWorkout,
        setDemoWorkout,
      }}
    >
      {children}
      <AnimatePresence>
        {message && (
          <motion.div
            role="status"
            className="toast"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            {message}
            <button
              className="icon-button"
              aria-label={t.close}
              onClick={() => setMessage("")}
            >
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </Context.Provider>
  );
}
export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const dialog = document.querySelector<HTMLDialogElement>("dialog");
    dialog?.showModal();
    return () => {
      dialog?.close();
      previous?.focus();
    };
  }, []);
  return (
    <motion.dialog
      className="modal"
      aria-label={title}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
    >
      <div className="section-head">
        <h2>{title}</h2>
        <button className="icon-button" aria-label={t.close} onClick={onClose}>
          <X size={20} />
        </button>
      </div>
      {children}
    </motion.dialog>
  );
}
export function EmptyPlan() {
  return (
    <div className="card empty">
      <p>{t.noPlan}</p>
      <a className="button" href="/intake">
        {t.startIntake}
      </a>
    </div>
  );
}
export const format = (n: number) =>
  n.toLocaleString("nl-NL", { maximumFractionDigits: 1 });

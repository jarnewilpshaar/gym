import { localDay } from "../../../packages/shared/activity";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  AnimatePresence,
  motion,
  Reorder,
  useReducedMotion,
  useScroll,
} from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Dumbbell,
  Leaf,
  LoaderCircle,
  Plus,
  Sparkles,
  Sprout,
  TrendingUp,
} from "lucide-react";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  calculateNutrition,
  profileSchema,
  type Profile,
} from "../../../packages/shared/schema";
import {
  api,
  EmptyPlan,
  format,
  Modal,
  t,
  useStore,
  type Progress,
} from "./lib";
import { Reveal } from "./components/motion";
import { WeightChart } from "./Dashboard";
function Title({ title, intro }: { title: string; intro?: string }) {
  return (
    <div className="page-title">
      <div className="eyebrow">{t.tagline}</div>
      <h1>{title}</h1>
      {intro && <p>{intro}</p>}
    </div>
  );
}
function AuthPage() {
  const { pathname, search } = useLocation();
  const { reload, notify } = useStore();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  const kind = pathname.slice(1);
  const title =
    kind === "register"
      ? t.register
      : kind === "forgot"
        ? t.forgot
        : kind === "reset"
          ? t.reset
          : kind === "verify"
            ? t.copy.confirmEmail
            : t.login;
  const raw = new URLSearchParams(search).get("token") ?? "";
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(e.currentTarget);
    try {
      if (kind === "login") {
        await api("/auth/login", "POST", {
          email: form.get("email"),
          password: form.get("password"),
        });
        await reload();
        navigate("/");
      } else if (kind === "register") {
        await api("/auth/register", "POST", {
          name: form.get("name"),
          email: form.get("email"),
          password: form.get("password"),
        });
        setSuccess(t.verifySent);
      } else if (kind === "forgot") {
        await api("/auth/forgot", "POST", { email: form.get("email") });
        setSuccess(t.forgotSent);
      } else if (kind === "reset") {
        await api("/auth/reset", "POST", {
          token: raw,
          password: form.get("password"),
        });
        notify(t.saved);
        navigate("/login");
      } else {
        await api("/auth/verify", "POST", { token: raw });
        setSuccess(t.verified);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t.error);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-layout">
      <div className="auth-visual">
        <Link className="logo" to="/welkom">
          <Sprout />
          {t.brand}.
        </Link>
        <div>
          <p className="auth-headline">{t.authIntro}</p>
          <p>{t.authSub}</p>
        </div>
        <Dumbbell strokeWidth={1} />
        <small>{t.footer}</small>
      </div>
      <div className="auth-form">
        <h1>{title}</h1>
        <p className="form-hint">{t.authSub}</p>
        <form onSubmit={submit}>
          {!success && (
            <>
              {kind === "register" && (
                <label className="field">
                  {t.name}
                  <input
                    name="name"
                    autoComplete="given-name"
                    required
                    maxLength={80}
                  />
                </label>
              )}
              {!["reset", "verify"].includes(kind) && (
                <label className="field">
                  {t.email}
                  <input
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                  />
                </label>
              )}
              {!["forgot", "verify"].includes(kind) && (
                <label className="field">
                  {t.password}
                  <input
                    name="password"
                    type="password"
                    autoComplete={
                      kind === "login" ? "current-password" : "new-password"
                    }
                    minLength={12}
                    maxLength={128}
                    required
                  />
                  <small className="form-hint">
                    {t.copy["minimaal_12_tekens"]}
                  </small>
                </label>
              )}
              {error && (
                <div className="form-error" role="alert">
                  {error}
                </div>
              )}
              <button className="button" disabled={busy}>
                {busy ? t.loading : title}
                <ArrowRight size={15} />
              </button>
            </>
          )}
          {success && (
            <div className="form-success" role="status">
              {success}
            </div>
          )}
        </form>
        <div className="auth-links">
          <Link to={kind === "login" ? "/register" : "/login"}>
            {kind === "login" ? t.register : t.login}
          </Link>
          <Link to={kind === "login" ? "/forgot" : "/"}>
            {kind === "login" ? t.forgot : t.overview}
          </Link>
        </div>
      </div>
    </div>
  );
}
function Generating() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setStep((s) => Math.min(2, s + 1)), 3500);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="generating" role="status" aria-live="polite">
      <LoaderCircle className="spinner" size={38} />
      <h2>{t.generate}</h2>
      {t.generating.map((s, i) => (
        <div className={`generation-step ${i <= step ? "active" : ""}`} key={s}>
          {i < step ? "✓ " : ""}
          {s}
          {i === step ? "…" : ""}
        </div>
      ))}
    </div>
  );
}
function Wizard() {
  const { profile, user, reload, notify } = useStore();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const form = useForm<Profile>({
    resolver: zodResolver(profileSchema) as never,
    defaultValues: profile,
  });
  const groups: (keyof Profile)[][] = [
    ["age", "sex", "height", "weight", "targetWeight", "goal"],
    ["level", "days", "minutes", "equipment", "injuries"],
    ["diet", "allergies", "budget", "cookingTime"],
  ];
  const choices: Partial<Record<keyof Profile, string[]>> = {
    sex: ["male", "female"],
    goal: ["lose", "gain", "maintain", "fitness"],
    level: ["beginner", "intermediate", "advanced"],
    equipment: ["gym", "home", "bodyweight"],
  };
  const text = ["injuries", "diet", "allergies"];
  async function next() {
    if (!(await form.trigger(groups[step]))) {
      setError(t.validation);
      return;
    }
    setError("");
    setStep((s) => s + 1);
  }
  async function generate(p: Profile) {
    if (!user) return;
    setBusy(true);
    setError("");
    try {
      await api("/profile", "PUT", p);
      await api("/generate", "POST", {});
      await reload();
      notify(t.saved);
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : t.aiMissing);
      await reload();
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="wizard">
      <Title title={t.wizardTitle} intro={t.disclaimer} />
      <div className="wizard-progress">
        {t.wizardSteps.map((s, i) => (
          <div className={i <= step ? "active" : ""} key={s}>
            <span>{i < step ? <Check size={12} /> : i + 1}</span>
            {s}
          </div>
        ))}
      </div>
      <div className="card">
        {busy ? (
          <Generating />
        ) : (
          <form
            onSubmit={form.handleSubmit(generate, () => setError(t.validation))}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.2 }}
                className="form-grid"
              >
                {groups[step].map((key) => (
                  <label
                    className={`field ${text.includes(key) ? "wide" : ""}`}
                    key={key}
                  >
                    {t.fields[key]}
                    {choices[key] ? (
                      <select {...form.register(key)}>
                        {choices[key]!.map((value) => (
                          <option value={value} key={value}>
                            {t.options[value as keyof typeof t.options]}
                          </option>
                        ))}
                      </select>
                    ) : text.includes(key) ? (
                      <textarea
                        {...form.register(key)}
                        maxLength={key === "injuries" ? 1000 : 500}
                      />
                    ) : (
                      <input
                        type="number"
                        step={
                          key === "weight" || key === "targetWeight"
                            ? "0.1"
                            : "1"
                        }
                        {...form.register(key)}
                      />
                    )}{" "}
                    {form.formState.errors[key] && (
                      <span className="form-error">{t.validation}</span>
                    )}
                  </label>
                ))}
              </motion.div>
            </AnimatePresence>
            {error && (
              <div className="form-error" role="alert">
                {error}
              </div>
            )}
            <div className="form-actions">
              {step > 0 && (
                <button
                  type="button"
                  className="outline-button"
                  onClick={() => setStep((s) => s - 1)}
                >
                  {t.back}
                </button>
              )}
              {step < 2 ? (
                <button key="next" type="button" onClick={() => void next()}>
                  {t.next}
                  <ArrowRight size={14} />
                </button>
              ) : (
                <button key="generate" type="submit">
                  <Sparkles size={14} />
                  {t.generate}
                </button>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
type SetEntry = {
  exercise: string;
  number: number;
  reps: number;
  weight: number;
};
function Training() {
  const {
    plan,
    version,
    user,
    activity,
    reload,
    notify,
    setDemoWorkout,
    demoWorkout,
  } = useStore();
  const [day, setDay] = useState(0);
  const [week, setWeek] = useState(0);
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [weights, setWeights] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const [order, setOrder] = useState<number[]>([]);
  const exercises = plan?.workout[week]?.days[day]?.exercises;
  useEffect(() => {
    setOrder(exercises?.map((_, i) => i) ?? []);
    setDone({});
    setWeights({});
  }, [exercises]);
  if (!plan || !exercises) return <EmptyPlan />;
  const dayKey = `${localDay()}:v${version}:w${week}:d${day}`;
  const completed = user
    ? activity.workouts.some((w) => w.dayKey === dayKey && w.completed)
    : demoWorkout;
  async function finish() {
    setBusy(true);
    try {
      const sets: SetEntry[] = [];
      for (const [i, e] of (exercises ?? []).entries())
        for (let j = 1; j <= e.sets; j++)
          if (done[`${i}-${j}`])
            sets.push({
              exercise: e.name,
              number: j,
              reps: Number.parseInt(e.reps) || 10,
              weight: weights[`${i}-${j}`] ?? 0,
            });
      if (user) {
        await api("/workout-log", "PUT", { dayKey, completed: true, sets });
        await reload();
      } else setDemoWorkout(true);
      setCelebrate(true);
      notify(t.finished);
    } catch (err) {
      notify(err instanceof Error ? err.message : t.error);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Title title={t.workoutTitle} intro={t.workoutIntro} />
      <div className="tabs">
        {plan.workout.map((w, i) => (
          <button
            className={week === i ? "active" : ""}
            onClick={() => {
              setWeek(i);
              setDay(0);
            }}
            key={i}
          >
            {t.copy["week"]}
            {w.week}
          </button>
        ))}
      </div>
      <div className="tabs">
        {plan.workout[week].days.map((d, i) => (
          <button
            className={day === i ? "active" : ""}
            onClick={() => setDay(i)}
            key={i}
          >
            {d.name}
          </button>
        ))}
      </div>
      <Reorder.Group
        axis="y"
        values={order}
        onReorder={setOrder}
        className="stack"
        style={{ listStyle: "none", padding: 0 }}
      >
        {order.map((i) => {
          const e = exercises[i];
          if (!e) return null;
          return (
            <Reorder.Item value={i} key={i} className="card exercise-row">
              <div className="exercise-index">{i + 1}</div>
              <div className="exercise-info">
                <h3>{e.name}</h3>
                <div className="exercise-meta">
                  {e.sets} {t.sets} · {e.reps} {t.reps} · {e.rest}{" "}
                  {t.restSeconds}
                </div>
                <p>{e.notes}</p>
                <div className="set-list">
                  {Array.from({ length: e.sets }, (_, j) => {
                    const key = `${i}-${j + 1}`;
                    return (
                      <div className="set-check" key={j}>
                        <label>
                          <input
                            aria-label={`${e.name}, set ${j + 1}`}
                            type="checkbox"
                            checked={!!done[key]}
                            onChange={(ev) =>
                              setDone((v) => ({
                                ...v,
                                [key]: ev.target.checked,
                              }))
                            }
                          />{" "}
                          {t.copy["set"]}
                          {j + 1}
                        </label>
                        <input
                          aria-label={`${e.name}, set ${j + 1}, kilogram`}
                          type="number"
                          min="0"
                          max="500"
                          step="0.5"
                          value={weights[key] ?? 0}
                          onChange={(ev) =>
                            setWeights((v) => ({
                              ...v,
                              [key]: Number(ev.target.value),
                            }))
                          }
                        />
                        <span>{t.copy["kg"]}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </Reorder.Item>
          );
        })}
      </Reorder.Group>
      {celebrate && (
        <motion.div
          className="confetti"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <span>✦</span>
          <CheckCircle2 color="#789260" />
          <span>✦</span>
        </motion.div>
      )}
      <button
        className="complete-button"
        disabled={
          busy ||
          completed ||
          Object.values(done).filter(Boolean).length !==
            exercises.reduce((n, e) => n + e.sets, 0)
        }
        onClick={() => void finish()}
      >
        {completed ? t.finished : t.finish}
      </button>
      <p className="form-hint" style={{ marginTop: 15 }}>
        {t.disclaimer}
      </p>
    </>
  );
}
function Nutrition() {
  const {
    plan,
    user,
    profile,
    activity,
    demoMeals,
    setDemoMeals,
    reload,
    notify,
  } = useStore();
  const [day, setDay] = useState(0);
  const [shopping, setShopping] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!plan) return <EmptyPlan />;
  const checked = user ? activity.meals.map((m) => m.mealKey) : demoMeals;
  const nutrition = calculateNutrition(profile);
  async function toggle(i: number, value: boolean) {
    setBusy(true);
    try {
      if (user) {
        await api("/meal-log", "PUT", { mealKey: String(i), checked: value });
        await reload();
      } else
        setDemoMeals(
          value
            ? [...demoMeals, String(i)]
            : demoMeals.filter((k) => k !== String(i)),
        );
    } catch (err) {
      notify(err instanceof Error ? err.message : t.error);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="progress-top">
        <Title title={t.navigation[2]} intro={t.nutritionIntro} />
        <button className="outline-button" onClick={() => setShopping(true)}>
          {t.groceries}
        </button>
      </div>
      <div className="card nutrition-totals">
        {[
          nutrition.calories,
          nutrition.protein,
          nutrition.carbs,
          nutrition.fat,
        ].map((n, i) => (
          <div key={i}>
            <small>{i === 0 ? "Calorieën" : t.macros[i - 1]}</small>
            <strong>
              {format(n)} <small>{i === 0 ? "kcal" : "g"}</small>
            </strong>
          </div>
        ))}
      </div>
      <div className="tabs">
        {plan.meals.map((d, i) => (
          <button
            className={i === day ? "active" : ""}
            key={i}
            onClick={() => setDay(i)}
          >
            {d.day}
          </button>
        ))}
      </div>
      <div className="meal-grid">
        {plan.meals[day].meals.map((meal, i) => (
          <Reveal className="card meal-card" key={`${day}-${i}`}>
            <div className="meal-label">{t.meals[i] ?? t.nutrition}</div>
            <h2>{meal.name}</h2>
            <ul>
              {meal.ingredients.map((food, j) => (
                <li key={j}>
                  {food.name} — {format(food.grams)}
                  {t.copy["g"]}
                </li>
              ))}
            </ul>
            <div className="exercise-meta">
              {Math.round(meal.protein)}
              {t.copy["g"]}
              {t.macros[0].toLowerCase()} · {Math.round(meal.carbs)}
              {t.copy["g"]}
              {t.macros[1].toLowerCase()} · {Math.round(meal.fat)}
              {t.copy["g"]}
              {t.macros[2].toLowerCase()}
            </div>
            <div className="meal-bottom">
              <strong>
                {meal.kcal}
                {t.copy["kcal"]}
              </strong>
              <label>
                <input
                  type="checkbox"
                  disabled={busy || day !== 0}
                  checked={day === 0 && checked.includes(String(i))}
                  onChange={(e) => void toggle(i, e.target.checked)}
                />
                {t.consumed}
              </label>
            </div>
          </Reveal>
        ))}
      </div>
      <AnimatePresence>
        {shopping && (
          <Modal title={t.groceries} onClose={() => setShopping(false)}>
            <div className="grocery-list">
              {plan.groceries.map((item, i) => (
                <label key={i}>
                  <input type="checkbox" />
                  {item}
                </label>
              ))}
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </>
  );
}
function ProgressPage() {
  const { progress, user, reload, setDemoProgress, notify } = useStore();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    try {
      const file = fd.get("photo") as File;
      let photo: string | undefined;
      if (file?.size) {
        if (
          file.size > 4000000 ||
          !["image/jpeg", "image/png", "image/webp"].includes(file.type)
        )
          throw new Error(t.copy.photoError);
        photo = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      }
      const p: Progress = {
        weight: Number(fd.get("weight")),
        waist: fd.get("waist") ? Number(fd.get("waist")) : undefined,
        notes: String(fd.get("notes")),
        photo,
        date: new Date().toISOString(),
      };
      if (user) {
        await api("/progress", "POST", p);
        await reload();
      } else setDemoProgress(p);
      setOpen(false);
      notify(t.saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.error);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="progress-top">
        <Title title={t.navigation[3]} intro={t.progressIntro} />
        <button onClick={() => setOpen(true)} className="button">
          <Plus size={15} />
          {t.log}
        </button>
      </div>
      <Reveal className="card">
        <h2>{t.weight}</h2>
        <WeightChart large />
      </Reveal>
      <div className="card" style={{ marginTop: 22 }}>
        <h2>{t.history}</h2>
        {progress.length ? (
          [...progress].reverse().map((p, i) => (
            <div className="history-row" key={p.id ?? i}>
              <strong>
                {format(p.weight)}
                {t.copy["kg"]}
              </strong>
              <span>
                {p.date.length > 4
                  ? new Date(p.date).toLocaleDateString("nl-NL")
                  : `${p.date} oktober`}
              </span>
              {p.waist && (
                <span>
                  {format(p.waist)}
                  {t.copy["cm"]}
                </span>
              )}
              {p.photo && <img src={p.photo} alt={t.photo} />}
              <span>{p.notes}</span>
            </div>
          ))
        ) : (
          <p className="empty">{t.empty}</p>
        )}
      </div>
      <AnimatePresence>
        {open && (
          <Modal title={t.log} onClose={() => setOpen(false)}>
            <form onSubmit={save}>
              <div className="form-grid">
                <label className="field">
                  {t.weight}
                  {t.copy["kg_2"]}
                  <input
                    type="number"
                    name="weight"
                    required
                    min="40"
                    max="250"
                    step="0.1"
                  />
                </label>
                <label className="field">
                  {t.waist}
                  <input
                    type="number"
                    name="waist"
                    min="30"
                    max="250"
                    step="0.1"
                  />
                </label>
                <label className="field wide">
                  {t.photo}
                  <input
                    type="file"
                    name="photo"
                    accept="image/jpeg,image/png,image/webp"
                  />
                </label>
                <label className="field wide">
                  {t.notes}
                  <textarea name="notes" maxLength={1000} />
                </label>
              </div>
              {error && (
                <div className="form-error" role="alert">
                  {error}
                </div>
              )}
              <div className="form-actions">
                <button disabled={busy}>{busy ? t.loading : t.save}</button>
              </div>
            </form>
          </Modal>
        )}
      </AnimatePresence>
    </>
  );
}
function SettingsPage() {
  const { user, profile, version, reload, notify } = useStore();
  const navigate = useNavigate();
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  async function regenerate() {
    if (!feedback.trim()) {
      notify(t.feedbackRequired);
      return;
    }
    setBusy(true);
    try {
      await api("/generate", "POST", { feedback });
      await reload();
      notify(t.saved);
      setFeedback("");
    } catch (err) {
      notify(err instanceof Error ? err.message : t.error);
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    try {
      await api("/auth/logout", "POST", {});
      await reload();
      navigate("/login");
    } catch (err) {
      notify(err instanceof Error ? err.message : t.error);
    }
  }
  async function exportData() {
    try {
      const data = await api("/export");
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = "sterk-gegevens.json";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      notify(err instanceof Error ? err.message : t.error);
    }
  }
  async function remove() {
    setBusy(true);
    try {
      await api("/account", "DELETE", { confirmation });
      await reload();
      navigate("/register");
    } catch (err) {
      notify(err instanceof Error ? err.message : t.error);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Title title={t.accountTitle} />
      <div className="card settings-card">
        <h2>{user?.name ?? t.demo}</h2>
        <p className="muted">{user?.email ?? t.demoText}</p>
        <div className="settings-row">
          <span>{t.fields.goal}</span>
          <strong>{t.options[profile.goal]}</strong>
        </div>
        <div className="settings-row">
          <span>{t.target}</span>
          <strong>
            {profile.targetWeight}
            {t.copy["kg"]}
          </strong>
        </div>
        <div className="settings-row">
          <span>{t.version}</span>
          <strong>{version}</strong>
        </div>
        <div className="form-actions">
          <Link className="button" to={user ? "/intake" : "/register"}>
            {t.startIntake}
          </Link>
        </div>
      </div>
      <div className="card settings-card">
        {busy ? (
          <Generating />
        ) : (
          <>
            <h2>{t.adjust}</h2>
            <p className="muted">{t.feedbackHint}</p>
            <label className="field">
              {t.feedback}
              <textarea
                value={feedback}
                maxLength={1500}
                onChange={(e) => setFeedback(e.target.value)}
              />
            </label>
            {user ? (
              <button onClick={() => void regenerate()}>{t.regenerate}</button>
            ) : (
              <Link className="button" to="/register">
                {t.needsAccount}
              </Link>
            )}
          </>
        )}
      </div>
      {user && (
        <div className="card settings-card">
          <div className="settings-row">
            <span>{t.export}</span>
            <button
              className="outline-button"
              onClick={() => void exportData()}
            >
              {t.export}
            </button>
          </div>
          <div className="settings-row">
            <span>{t.logout}</span>
            <button className="outline-button" onClick={() => void logout()}>
              {t.logout}
            </button>
          </div>
          <div className="settings-row">
            <span>{t.delete}</span>
            <button className="danger" onClick={() => setDeleting(true)}>
              {t.delete}
            </button>
          </div>
        </div>
      )}
      <p className="form-hint">{t.disclaimer}</p>
      <AnimatePresence>
        {deleting && (
          <Modal title={t.delete} onClose={() => setDeleting(false)}>
            <p>{t.deleteText}</p>
            <label className="field">
              {t.copy["verwijder"]}
              <input
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
              />
            </label>
            <button
              className="danger"
              disabled={confirmation !== "VERWIJDER" || busy}
              onClick={() => void remove()}
            >
              {t.delete}
            </button>
          </Modal>
        )}
      </AnimatePresence>
    </>
  );
}
type AdminData = {
  users: {
    id: string;
    name: string;
    email: string;
    role: string;
    verified: boolean;
  }[];
  exercises: { id: string; name: string; muscle: string; equipment: string }[];
  generations: {
    id: string;
    status: string;
    model: string;
    tokens: number;
    createdAt: string;
  }[];
};
function Admin() {
  const [data, setData] = useState<AdminData | null>(null);
  const { notify } = useStore();
  useEffect(() => {
    api<AdminData>("/admin")
      .then(setData)
      .catch((e) => notify(e.message));
  }, [notify]);
  async function role(id: string, value: string) {
    try {
      await api(`/admin/users/${id}`, "PATCH", { role: value });
      setData(await api<AdminData>("/admin"));
    } catch (e) {
      notify(e instanceof Error ? e.message : t.error);
    }
  }
  async function exercise(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    try {
      await api(
        "/admin/exercises",
        "POST",
        Object.fromEntries(new FormData(form)),
      );
      setData(await api<AdminData>("/admin"));
      form.reset();
      notify(t.saved);
    } catch (err) {
      notify(err instanceof Error ? err.message : t.error);
    }
  }
  return (
    <>
      <Title title={t.admin} />
      {data ? (
        <div className="admin-grid">
          <div className="card">
            <h2>
              {t.users} ({data.users.length})
            </h2>
            {data.users.map((u) => (
              <div className="admin-row" key={u.id}>
                <span>
                  {u.name}
                  <small>
                    {u.email} ·{" "}
                    {u.verified ? t.copy.confirmed : t.copy.unconfirmed}
                  </small>
                </span>
                <select
                  aria-label={`${u.name}: rol`}
                  value={u.role}
                  onChange={(e) => void role(u.id, e.target.value)}
                >
                  <option>{t.copy["user"]}</option>
                  <option>{t.copy["admin"]}</option>
                </select>
              </div>
            ))}
          </div>
          <div className="card">
            <h2>{t.usage}</h2>
            <p className="muted">
              {t.copy["tokens"]}{" "}
              {data.generations
                .reduce((n, g) => n + g.tokens, 0)
                .toLocaleString("nl-NL")}
              {
                t.copy[
                  "facturatie_en_actuele_kosten_vind_je_in_de_anthropic_co"
                ]
              }
            </p>
            {data.generations.map((g) => (
              <div className="admin-row" key={g.id}>
                <span>
                  {g.model}
                  <small>{g.status}</small>
                </span>
                <strong>{g.tokens}</strong>
              </div>
            ))}
          </div>
          <div className="card">
            <h2>
              {t.library} ({data.exercises.length})
            </h2>
            {data.exercises.map((e) => (
              <div className="admin-row" key={e.id}>
                <span>
                  {e.name}
                  <small>
                    {e.muscle} · {e.equipment}
                  </small>
                </span>
              </div>
            ))}
          </div>
          <div className="card">
            <h2>{t.copy["oefening_toevoegen_of_bijwerken"]}</h2>
            <form onSubmit={exercise}>
              {["name", "muscle", "equipment", "instructions"].map((key, i) => (
                <label className="field" key={key}>
                  {
                    [
                      t.copy.exerciseName,
                      t.copy.muscle,
                      t.copy.equipmentLabel,
                      t.copy.instructions,
                    ][i]
                  }
                  <input
                    name={key}
                    required
                    minLength={key === "instructions" ? 5 : 2}
                  />
                </label>
              ))}
              <button>{t.save}</button>
            </form>
          </div>
        </div>
      ) : (
        <div className="skeleton" />
      )}
    </>
  );
}
function Landing() {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll();
  useEffect(() => {
    if (reduced) return;
    const lenis = new Lenis({ autoRaf: true, anchors: true });
    gsap.registerPlugin(ScrollTrigger);
    const context = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>(".how-step").forEach((el) =>
        gsap.fromTo(
          el,
          { opacity: 0.35 },
          {
            opacity: 1,
            scrollTrigger: {
              trigger: el,
              start: "top 75%",
              end: "top 35%",
              scrub: true,
            },
          },
        ),
      );
    }, ref);
    const resize = () => ScrollTrigger.refresh();
    window.addEventListener("resize", resize);
    return () => {
      lenis.destroy();
      context.revert();
      window.removeEventListener("resize", resize);
    };
  }, [reduced]);
  return (
    <div className="landing" ref={ref}>
      <motion.div
        className="scroll-progress"
        style={{ scaleX: scrollYProgress }}
      />
      <nav className="landing-nav">
        <Link className="logo" to="/">
          <span className="logo-mark">
            <Sprout />
          </span>
          {t.brand}.
        </Link>
        <div>
          <a href="#hoe">{t.how}</a>
          <Link to="/login">{t.login}</Link>
          <Link className="button" to="/register">
            {t.start}
          </Link>
        </div>
      </nav>
      <section className="landing-hero">
        <div>
          <div className="eyebrow">{t.tagline}</div>
          <h1>
            {t.landingTitle.split(" ").map((word, i) => (
              <motion.span
                key={i}
                style={{ display: "inline-block", marginRight: ".23em" }}
                initial={{ opacity: 0, y: reduced ? 0 : 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
              >
                {word}
              </motion.span>
            ))}
          </h1>
          <p>{t.landingText}</p>
          <Link className="button" to="/register">
            {t.startIntake}
            <ArrowRight size={17} />
          </Link>
        </div>
        <Reveal className="hero-visual">
          <div className="hero-badge">
            <CheckCircle2 size={22} />
            <span>{t.copy["jouw_plan_helemaal_persoonlijk"]}</span>
          </div>
          <Dumbbell strokeWidth={1} />
          <span>{t.copy["elke_dag_een_beetje_sterker"]}</span>
        </Reveal>
      </section>
      <section className="landing-section">
        <div className="features">
          {t.features.map((s, i) => {
            const Icon = [Dumbbell, Leaf, TrendingUp][i];
            return (
              <Reveal className="card" key={s}>
                <Icon color="#789260" />
                <h3>{s}</h3>
                <p>{[t.workoutIntro, t.nutritionIntro, t.progressIntro][i]}</p>
              </Reveal>
            );
          })}
        </div>
      </section>
      <section id="hoe" className="landing-section how-section">
        <div className="how-sticky">
          <div className="eyebrow">{t.copy["een_plan_dat_bij_je_past"]}</div>
          <h2>{t.how}</h2>
          <p>{t.landingText}</p>
          <Link className="button" to="/register">
            {t.start}
            <ArrowRight size={15} />
          </Link>
        </div>
        <div className="how-steps">
          {t.howSteps.map((s, i) => (
            <div className="how-step" key={s}>
              <span>0{i + 1}</span>
              <h3>{s}</h3>
              <p>{[t.wizardTitle, t.coachText, t.progressIntro][i]}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="landing-section">
        <div className="eyebrow">{t.copy["zo_kan_jouw_week_eruitzien"]}</div>
        <h2>{t.upper}</h2>
        <div className="features">
          {t.examples.map((name) => (
            <Reveal className="card" key={name}>
              <Dumbbell />
              <h3>{name}</h3>
              <p>{t.copy["3_sets_10_12_herhalingen"]}</p>
            </Reveal>
          ))}
        </div>
        <p className="form-hint">
          {t.copy["voorbeeldschema_jouw_persoonlijke_schema_wordt_afgestem"]}
        </p>
      </section>
      <section className="landing-section">
        <div className="landing-cta">
          <Sparkles color="#789260" style={{ margin: "0 auto 20px" }} />
          <h2>{t.pricing}</h2>
          <p>{t.pricingText}</p>
          <Link className="button" to="/register">
            {t.register}
            <ArrowRight size={15} />
          </Link>
        </div>
      </section>
      <footer className="landing-footer">
        <p>{t.disclaimer}</p>
        <Link to="/">{t.overview} →</Link>
        <p>
          © {new Date().getFullYear()}
          {t.copy["sterk_2"]}
          {t.footer}
        </p>
      </footer>
    </div>
  );
}
export default function Pages() {
  const { pathname } = useLocation();
  if (pathname === "/welkom") return <Landing />;
  if (
    ["/login", "/register", "/forgot", "/reset", "/verify"].includes(pathname)
  )
    return <AuthPage />;
  if (pathname === "/intake") return <Wizard />;
  if (pathname === "/training") return <Training />;
  if (pathname === "/voeding") return <Nutrition />;
  if (pathname === "/voortgang") return <ProgressPage />;
  if (pathname === "/admin") return <Admin />;
  return <SettingsPage />;
}

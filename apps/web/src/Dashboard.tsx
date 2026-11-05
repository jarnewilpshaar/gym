import { useReducedMotion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Clock3,
  Dumbbell,
  Flame,
  Leaf,
  Scale,
  Sparkles,
  Target,
  TrendingDown,
} from "lucide-react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CountUp, Reveal } from "./components/motion";
import { calculateNutrition } from "../../../packages/shared/schema";
import { format, t, useStore } from "./lib";
export function WeightChart({ large = false }: { large?: boolean }) {
  const { progress } = useStore();
  const reduced = useReducedMotion();
  return (
    <div
      className={`chart ${large ? "large" : ""}`}
      role="img"
      aria-label={t.progressSub}
    >
      {progress.length ? (
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <AreaChart
            data={progress}
            margin={{ top: 12, right: 12, left: -23, bottom: 0 }}
          >
            <defs>
              <linearGradient id="weightFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#829b6c" stopOpacity={0.18} />
                <stop offset="100%" stopColor="#829b6c" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              minTickGap={35}
              tick={{ fill: "#959b93", fontSize: 10 }}
              tickFormatter={(v: string) =>
                v.length > 4
                  ? new Date(v).toLocaleDateString("nl-NL", {
                      day: "numeric",
                      month: "short",
                    })
                  : `${v} okt`
              }
            />
            <YAxis
              domain={["dataMin - 1", "dataMax + 1"]}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "#959b93", fontSize: 10 }}
              tickFormatter={(n: number) => `${Math.round(n)}`}
            />
            <Tooltip
              contentStyle={{
                background: "var(--surface)",
                border: "1px solid var(--line)",
                borderRadius: 10,
              }}
              formatter={(v) => [`${v} kg`, t.weight]}
            />
            <Area
              type="monotone"
              dataKey="weight"
              stroke="#789260"
              strokeWidth={2.5}
              fill="url(#weightFill)"
              isAnimationActive={!reduced}
              animationDuration={900}
            />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <div className="empty">{t.empty}</div>
      )}
    </div>
  );
}
export default function Dashboard() {
  const { user, plan, profile, progress, demoMeals, activity, demoWorkout } =
    useStore();
  const nutrition = calculateNutrition(profile);
  const meals = plan?.meals[0]?.meals ?? [];
  const checked = user ? activity.meals.map((m) => m.mealKey) : demoMeals;
  const eaten = meals.reduce(
    (sum, m, i) => sum + (checked.includes(String(i)) ? m.kcal : 0),
    0,
  );
  const current = progress.at(-1)?.weight ?? profile.weight;
  const done = user
    ? activity.workouts.filter((w) => w.completed).length
    : demoWorkout
      ? 3
      : 2;
  const date = new Date();
  const monday = (date.getDay() + 6) % 7;
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">{t.copy["jouw_persoonlijke_coach"]}</div>
          <h1>
            {t.greeting}, {user?.name ?? "Jarne"}{" "}
            <span className="wave">☀</span>
          </h1>
          <p>{t.intro}</p>
        </div>
        <Link className="outline-button heading-button" to="/intake">
          <Sparkles size={15} />
          {user ? t.adjust : t.startIntake}
        </Link>
      </div>
      {!user && (
        <div className="demo-banner">
          <span>
            <span className="status-dot" />
            {t.demo} <span className="demo-explanation">— {t.demoText}</span>
          </span>
          <Link to="/register">
            {t.start}
            <ArrowRight size={14} />
          </Link>
        </div>
      )}
      <div className="stats-grid">
        {[
          {
            icon: Dumbbell,
            value: done,
            suffix: `/ ${profile.days}`,
            sub: t.copy.weekGoal,
            color: "green",
          },
          {
            icon: Flame,
            value: eaten,
            suffix: `/ ${format(nutrition.calories)}`,
            sub: `${format(Math.max(0, nutrition.calories - eaten))} kcal ${t.remaining}`,
            color: "orange",
          },
          {
            icon: Scale,
            value: current,
            suffix: "kg",
            sub: `${format(Math.abs((progress[0]?.weight ?? current) - current))} kg sinds je start`,
            color: "blue",
          },
          {
            icon: Flame,
            value: user ? 0 : 5,
            suffix: t.days,
            sub: t.copy.keepRhythm,
            color: "purple",
          },
        ].map((stat, i) => (
          <Reveal key={i} className="card stat" delay={i * 0.05}>
            <div className="stat-top">
              <span>{t.stats[i]}</span>
              <span className={`stat-icon ${stat.color}`}>
                <stat.icon size={17} />
              </span>
            </div>
            <div className="stat-number">
              {Number.isInteger(stat.value) ? (
                <CountUp value={stat.value} />
              ) : (
                format(stat.value)
              )}
              <small>{stat.suffix}</small>
            </div>
            <div className="stat-bottom">
              <span>{stat.sub}</span>
              {i === 0 && (
                <div className="mini-bar">
                  <i
                    style={{
                      transform: `scaleX(${Math.min(1, done / profile.days)})`,
                    }}
                  />
                </div>
              )}
            </div>
          </Reveal>
        ))}
      </div>
      <div className="dashboard-grid">
        <div className="dashboard-main">
          <Reveal className="training-feature">
            <div className="training-copy">
              <div className="light-eyebrow">
                <span className="live-dot" />
                {t.workoutSub}
              </div>
              <h2>{t.todayWorkout}</h2>
              <p>{plan?.workout[0]?.days[0]?.name ?? t.noPlan}</p>
              <div className="training-meta">
                <span>
                  <Clock3 size={14} />
                  {profile.minutes} {t.minutes}
                </span>
                <span>
                  <Dumbbell size={15} />
                  {plan?.workout[0]?.days[0]?.exercises.length ?? 0}{" "}
                  {t.exercises}
                </span>
              </div>
              <Link className="light-button" to="/training">
                {t.viewWorkout}
                <ArrowUpRight size={16} />
              </Link>
            </div>
            <div className="training-art" aria-hidden="true">
              <span className="art-circle one" />
              <span className="art-circle two" />
              <Dumbbell strokeWidth={1.15} />
              <span className="art-tag">
                <span />
                {t.copy["build_yourself"]}
              </span>
            </div>
            <span className="feature-number" aria-hidden="true">
              01
            </span>
          </Reveal>
          <Reveal className="card week-card">
            <div className="section-head">
              <h2>{t.weekOverview}</h2>
              <span className="muted">{t.week}</span>
            </div>
            <div className="week-days">
              {t.dayNames.map((day, i) => (
                <Link
                  to="/training"
                  className={`week-day ${i === monday ? "selected" : ""}`}
                  key={day}
                >
                  <span>{day}</span>
                  <strong>
                    {new Date(
                      date.getFullYear(),
                      date.getMonth(),
                      date.getDate() - monday + i,
                    ).getDate()}
                  </strong>
                  <span
                    className={`day-indicator ${[0, 1, 3, 4].includes(i) ? "training" : ""}`}
                  >
                    {i < 2 ? (
                      <Check size={12} />
                    ) : i === 3 || i === 4 ? (
                      <Dumbbell size={12} />
                    ) : (
                      <span>–</span>
                    )}
                  </span>
                </Link>
              ))}
            </div>
            <div className="week-legend">
              <span>
                <i className="legend-dot filled" />
                {t.complete}
              </span>
              <span>
                <i className="legend-dot" />
                {t.scheduled}
              </span>
              <span>
                <i className="legend-dot gray" />
                {t.rest}
              </span>
            </div>
          </Reveal>
          <Reveal className="card progress-card">
            <div className="section-head">
              <div>
                <h2>{t.progress}</h2>
                <p className="muted">{t.progressSub}</p>
              </div>
              <Link className="text-link" to="/voortgang">
                {t.viewProgress}
                <ArrowUpRight size={14} />
              </Link>
            </div>
            <div className="chart-summary">
              <strong>
                {format(current)}
                <small>{t.copy["kg"]}</small>
              </strong>
              <span>
                <TrendingDown size={13} />
                {format((progress[0]?.weight ?? current) - current)}
                {t.copy["kg"]}
              </span>
              <div>
                {t.target}
                <b>
                  {profile.targetWeight}
                  {t.copy["kg"]}
                </b>
              </div>
            </div>
            <WeightChart />
          </Reveal>
        </div>
        <div className="dashboard-side">
          <Reveal className="card nutrition-card">
            <div className="section-head">
              <h2>{t.nutrition}</h2>
              <Link className="icon-link" to="/voeding" aria-label={t.viewPlan}>
                <ArrowUpRight size={18} />
              </Link>
            </div>
            <div className="nutrition-overview">
              <div className="calorie-ring">
                <svg viewBox="0 0 120 120" aria-hidden="true">
                  <circle cx="60" cy="60" r="51" />
                  <circle
                    className="ring-fill"
                    cx="60"
                    cy="60"
                    r="51"
                    strokeDasharray={`${Math.min(1, eaten / nutrition.calories) * 320.4} 320.4`}
                  />
                </svg>
                <div>
                  <Flame size={17} />
                  <strong>{format(eaten)}</strong>
                  <small>
                    {t.copy["kcal"]}
                    {t.consumed}
                  </small>
                </div>
              </div>
              <div className="calorie-details">
                <span>
                  {t.goal}
                  <b>
                    {format(nutrition.calories)} <small>{t.copy["kcal"]}</small>
                  </b>
                </span>
                <span>
                  {t.remaining}
                  <b>
                    {format(Math.max(0, nutrition.calories - eaten))}{" "}
                    <small>{t.copy["kcal"]}</small>
                  </b>
                </span>
              </div>
            </div>
            <div className="macro-grid">
              {["protein", "carbs", "fat"].map((macro, i) => {
                const key = macro as "protein" | "carbs" | "fat";
                const amount = meals.reduce(
                  (n, m, j) => n + (checked.includes(String(j)) ? m[key] : 0),
                  0,
                );
                return (
                  <div key={key}>
                    <span>
                      <i className={`macro-dot m${i}`} />
                      {t.macros[i]}
                    </span>
                    <strong>
                      {Math.round(amount)}
                      <small>
                        {" "}
                        / {nutrition[key]}
                        {t.copy["g"]}
                      </small>
                    </strong>
                    <div className={`macro-bar m${i}`}>
                      <i
                        style={{
                          transform: `scaleX(${Math.min(1, amount / nutrition[key])})`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="meal-preview">
              {meals.slice(0, 3).map((m, i) => (
                <Link to="/voeding" key={m.name}>
                  <span
                    className={`meal-bullet ${checked.includes(String(i)) ? "checked" : ""}`}
                  >
                    {checked.includes(String(i)) ? (
                      <Check size={12} />
                    ) : (
                      <Leaf size={13} />
                    )}
                  </span>
                  <div>
                    <strong>{t.meals[i]}</strong>
                    <small>{m.name}</small>
                  </div>
                  <span>
                    {m.kcal}
                    <small>{t.copy["kcal"]}</small>
                  </span>
                </Link>
              ))}
            </div>
            <Link className="full-link" to="/voeding">
              {t.viewPlan}
              <ArrowRight size={15} />
            </Link>
          </Reveal>
          <Reveal className="coach-card">
            <span className="coach-symbol">
              <Sparkles size={19} />
            </span>
            <span className="eyebrow">{t.coach}</span>
            <h2>{t.coachTitle}</h2>
            <p>{t.coachText}</p>
            <Link to={user ? "/profiel" : "/register"}>
              {t.adjust}
              <ArrowRight size={15} />
            </Link>
            <Sparkles
              className="coach-decoration"
              size={95}
              strokeWidth={0.6}
            />
          </Reveal>
          <div className="daily-tip">
            <span className="tip-icon">
              <Target size={18} />
            </span>
            <div>
              <span className="eyebrow">{t.tip}</span>
              <h3>{t.tipTitle}</h3>
              <p>{t.tipText}</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

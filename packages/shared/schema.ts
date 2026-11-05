import { z } from "zod";
export const profileSchema = z.object({
  age: z.coerce.number().int().min(18).max(90),
  sex: z.enum(["male", "female"]),
  height: z.coerce.number().min(120).max(230),
  weight: z.coerce.number().min(40).max(250),
  targetWeight: z.coerce.number().min(40).max(250),
  goal: z.enum(["lose", "gain", "maintain", "fitness"]),
  level: z.enum(["beginner", "intermediate", "advanced"]),
  days: z.coerce.number().int().min(1).max(6),
  minutes: z.coerce.number().min(15).max(120),
  equipment: z.enum(["gym", "home", "bodyweight"]),
  injuries: z.string().max(1000),
  diet: z.string().max(300),
  allergies: z.string().max(500),
  budget: z.coerce.number().min(3).max(100),
  cookingTime: z.coerce.number().min(5).max(120),
});
export type Profile = z.infer<typeof profileSchema>;
export function calculateNutrition(p: Profile) {
  const bmr =
    10 * p.weight + 6.25 * p.height - 5 * p.age + (p.sex === "male" ? 5 : -161);
  const tdee = Math.round(bmr * (1.25 + p.days * 0.06));
  const calories = Math.max(
    p.sex === "male" ? 1500 : 1200,
    tdee + (p.goal === "lose" ? -350 : p.goal === "gain" ? 250 : 0),
  );
  const protein = Math.round(p.weight * 1.8);
  const fat = Math.round((calories * 0.28) / 9);
  return {
    bmr: Math.round(bmr),
    tdee,
    calories,
    protein,
    fat,
    carbs: Math.round((calories - protein * 4 - fat * 9) / 4),
  };
}
export const exerciseSchema = z.object({
  name: z.string(),
  sets: z.number().int().min(1).max(8),
  reps: z.string(),
  rest: z.number().min(0).max(300),
  muscle: z.string(),
  notes: z.string(),
});
export const generatedSchema = z.object({
  workout: z
    .array(
      z.object({
        week: z.number(),
        days: z
          .array(
            z.object({
              name: z.string(),
              exercises: z.array(exerciseSchema).min(1).max(12),
            }),
          )
          .min(1)
          .max(7),
      }),
    )
    .min(1)
    .max(8),
  meals: z
    .array(
      z.object({
        day: z.string(),
        meals: z
          .array(
            z.object({
              name: z.string(),
              ingredients: z.array(
                z.object({ name: z.string(), grams: z.number().positive() }),
              ),
              kcal: z.number().positive(),
              protein: z.number().nonnegative(),
              carbs: z.number().nonnegative(),
              fat: z.number().nonnegative(),
            }),
          )
          .min(1)
          .max(6),
      }),
    )
    .min(1)
    .max(7),
  groceries: z.array(z.string()),
});
export type GeneratedPlan = z.infer<typeof generatedSchema>;
export const defaultProfile: Profile = {
  age: 28,
  sex: "male",
  height: 182,
  weight: 82.4,
  targetWeight: 78,
  goal: "lose",
  level: "intermediate",
  days: 4,
  minutes: 60,
  equipment: "gym",
  injuries: "",
  diet: "Geen voorkeur",
  allergies: "",
  budget: 12,
  cookingTime: 30,
};

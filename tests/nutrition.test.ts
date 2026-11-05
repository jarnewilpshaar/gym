import { test } from "node:test";
import assert from "node:assert/strict";
import {
  calculateNutrition,
  defaultProfile,
  generatedSchema,
  profileSchema,
} from "../packages/shared/schema.ts";
test("Mifflin-St Jeor and macro energy are calculated consistently", () => {
  const n = calculateNutrition(defaultProfile);
  assert.equal(n.bmr, 1827);
  assert.equal(n.tdee, 2721);
  assert.equal(n.calories, 2371);
  assert.ok(
    Math.abs(n.protein * 4 + n.carbs * 4 + n.fat * 9 - n.calories) <= 2,
  );
});
test("female formula and calorie floor apply", () => {
  const n = calculateNutrition({
    ...defaultProfile,
    sex: "female",
    weight: 45,
    height: 150,
    age: 65,
    days: 1,
  });
  assert.equal(n.bmr, 902);
  assert.equal(n.calories, 1200);
});
test("intake rejects minors, missing restrictions and unreasonable training frequency", () => {
  assert.equal(
    profileSchema.safeParse({ ...defaultProfile, age: 17 }).success,
    false,
  );
  assert.equal(
    profileSchema.safeParse({ ...defaultProfile, days: 8 }).success,
    false,
  );
  const p = { ...defaultProfile, allergies: undefined };
  assert.equal(profileSchema.safeParse(p).success, false);
});
test("AI output requires exercise detail and positive nutrition values", () => {
  assert.equal(
    generatedSchema.safeParse({ workout: [], meals: [], groceries: [] })
      .success,
    false,
  );
  assert.equal(
    generatedSchema.safeParse({
      workout: [
        {
          week: 1,
          days: [
            {
              name: "A",
              exercises: [
                {
                  name: "Squat",
                  sets: 3,
                  reps: "10",
                  rest: 60,
                  muscle: "Benen",
                  notes: "Rustig",
                },
              ],
            },
          ],
        },
      ],
      meals: [
        {
          day: "Maandag",
          meals: [
            {
              name: "Kwark",
              ingredients: [{ name: "Kwark", grams: 200 }],
              kcal: -100,
              protein: 20,
              carbs: 10,
              fat: 2,
            },
          ],
        },
      ],
      groceries: [],
    }).success,
    false,
  );
});

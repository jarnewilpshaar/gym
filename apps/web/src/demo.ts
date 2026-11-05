import type { GeneratedPlan } from "../../../packages/shared/schema";
import nl from "./nl.json";
export const demoPlan: GeneratedPlan = nl.demoPlan;
export const demoWeights = [
  84.8, 84.5, 84.7, 84.1, 83.8, 84, 83.4, 83.6, 83.1, 82.8, 83, 82.4,
].map((weight, i) => ({ date: String(i + 1), weight }));

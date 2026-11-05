# Datamodel

```mermaid
erDiagram
 User ||--o| Profile : heeft
 Profile ||--o{ Goal : doelen
 Profile ||--o{ DietaryPreference : voorkeuren
 Profile ||--o{ Equipment : apparatuur
 Profile ||--o{ Injury : beperkingen
 User ||--o{ WorkoutPlan : versies
 WorkoutPlan ||--|{ WorkoutWeek : weken
 WorkoutWeek ||--|{ WorkoutDay : dagen
 WorkoutDay ||--|{ WorkoutExercise : oefeningen
 Exercise ||--o{ WorkoutExercise : bibliotheek
 User ||--o{ MealPlan : versies
 MealPlan ||--|{ MealDay : dagen
 MealDay ||--|{ Meal : maaltijden
 Meal ||--|{ MealItem : ingredienten
 Food ||--o{ MealItem : voedingswaarden
 User ||--o{ ProgressLog : metingen
 User ||--o{ WorkoutLog : trainingen
 WorkoutLog ||--o{ SetLog : sets
 User ||--o{ MealLog : afgevinkt
 User ||--o{ AIGeneration : aanvragen
 User ||--o{ RefreshToken : sessies
 User ||--o{ ActionToken : verificatie_en_herstel
```

Profielvelden staan in `Profile.data`, gevalideerd door het gedeelde Zod-schema. De uitbreidbare Goal/Equipment/Injury/DietaryPreference-relaties zijn voorbereid voor toekomstige filters; de huidige intake leest en schrijft de JSON als bron. AI-generaties worden zowel als gevalideerde JSON-versie als relationele trainings- en voedingsplannen opgeslagen. Gebruikersgegevens hebben cascade-delete. Unieke combinaties voorkomen dubbele versies, maaltijdlogs en sets.

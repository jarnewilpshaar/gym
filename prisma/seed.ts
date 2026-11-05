import "dotenv/config";
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
const groups: [string, string, string[]][] = [
  [
    "Borst",
    "gym",
    [
      "Bankdrukken met halter",
      "Bankdrukken met dumbbells",
      "Schuin bankdrukken met dumbbells",
      "Borstdrukken op machine",
      "Cable fly",
      "Dumbbell fly",
    ],
  ],
  [
    "Rug",
    "gym",
    [
      "Lat pulldown",
      "Zittend roeien",
      "Roeien met halter",
      "Roeien met dumbbell",
      "Optrekken",
      "Face pull",
      "Straight-arm pulldown",
      "Roeien op machine",
    ],
  ],
  [
    "Schouders",
    "gym",
    [
      "Schouderdrukken met dumbbells",
      "Schouderdrukken met halter",
      "Zijwaarts heffen met dumbbells",
      "Voorwaarts heffen met dumbbells",
      "Reverse fly",
      "Schouderdrukken op machine",
    ],
  ],
  [
    "Benen",
    "gym",
    [
      "Squat met halter",
      "Goblet squat",
      "Leg press",
      "Roemeense deadlift",
      "Leg extension",
      "Liggende leg curl",
      "Zittende leg curl",
      "Hip thrust",
      "Bulgaarse split squat",
      "Uitstappen met dumbbells",
      "Step-up met dumbbells",
      "Staand kuitheffen",
      "Zittend kuitheffen",
      "Sumo deadlift",
    ],
  ],
  [
    "Biceps",
    "gym",
    [
      "Biceps curl met halter",
      "Biceps curl met dumbbells",
      "Hammer curl",
      "Cable curl",
      "Preacher curl",
    ],
  ],
  [
    "Triceps",
    "gym",
    [
      "Triceps pushdown",
      "Triceps extension boven het hoofd",
      "Smal bankdrukken",
      "Triceps kickback",
    ],
  ],
  [
    "Core",
    "bodyweight",
    [
      "Plank",
      "Zijplank",
      "Dead bug",
      "Bird dog",
      "Crunch",
      "Omgekeerde crunch",
      "Mountain climber",
      "Hollow hold",
    ],
  ],
  [
    "Benen",
    "bodyweight",
    [
      "Squat met lichaamsgewicht",
      "Uitstappen met lichaamsgewicht",
      "Glute bridge",
      "Wall sit",
      "Kuitheffen op één been",
    ],
  ],
  [
    "Borst",
    "bodyweight",
    ["Opdrukken", "Opdrukken op de knieën", "Schuin opdrukken"],
  ],
  [
    "Conditie",
    "bodyweight",
    ["Stevig wandelen", "Rustig joggen", "Jumping jack", "Knieheffen"],
  ],
];
try {
  for (const [muscle, equipment, names] of groups)
    for (const name of names)
      await db.exercise.upsert({
        where: { name },
        create: {
          name,
          muscle,
          equipment,
          instructions:
            "Kies een pijnvrije bewegingsuitslag. Beweeg gecontroleerd, blijf rustig ademen en stop bij scherpe pijn. Vraag bij twijfel om begeleiding bij de uitvoering.",
        },
        update: { muscle, equipment },
      });
  for (const food of [
    { name: "Magere kwark", kcal: 59, protein: 10, carbs: 4, fat: 0.2 },
    { name: "Havermout", kcal: 370, protein: 13, carbs: 60, fat: 7 },
    { name: "Broccoli", kcal: 34, protein: 2.8, carbs: 4, fat: 0.4 },
  ])
    await db.food.upsert({
      where: { name: food.name },
      create: food,
      update: food,
    });
  process.stdout.write(
    `${groups.reduce((n, g) => n + g[2].length, 0)} oefeningen en 3 voedingsmiddelen toegevoegd.\n`,
  );
} finally {
  await db.$disconnect();
}

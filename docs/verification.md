# Controle — 5 november 2026

## Uitgevoerd

- TypeScript strict: frontend en backend slagen.
- ESLint: geen fouten of waarschuwingen.
- Vier tests slagen: energieformule, macro-energie, calorieondergrens en profiel-/AI-validatie.
- Productiebuild slaagt. Grafieken, animatiebibliotheek en validatie zijn in afzonderlijke bundels gesplitst.
- API `/health` geeft HTTP 200 en meldt expliciet dat de server nog niet is geconfigureerd.
- Mutatie vanuit een vreemde Origin geeft HTTP 403.
- Beheer zonder sessie geeft HTTP 401.
- Vite-pagina geeft HTTP 200.
- Nederlandse interface en voorbeeldinhoud in `nl.json` nagelezen op spelling; consistente je/jij-toon. Geen verzonnen reviews of abonnementskosten.
- Initiële PostgreSQL-migratie gegenereerd vanuit Prisma. Seed bevat 63 oefeningen; exacte telling wordt bij uitvoeren getoond.
- GitHub en GitLab gebruiken dezelfde lint-, test- en buildopdrachten. Synchronisatie gebruikt gewone pushes, zonder force of verwijderingen.

## Nog te verifiëren

- Browsercontrole van alle routes op 320 px, mobiel, tablet en desktop; toetsenbordfocus, modals, scrollsectie en donker thema.
- Docker is niet beschikbaar in deze omgeving. Migratie en seed zijn nog niet uitgevoerd tegen een PostgreSQL-database.
- Registratie, e-mailverificatie, reset, refresh-rotatie, persoonlijke opslag en data-export/-verwijdering moeten samen met PostgreSQL en SMTP worden getest.
- Geen Anthropic-sleutel ingesteld: echte generatie, retries en inhoudelijke geschiktheid nog niet gecontroleerd.
- CI is pas geverifieerd als de providers de gepushte pipelines succesvol uitvoeren.

Deze versie is lokale ontwikkelcode en nog niet gereed voor publiek productiegebruik.

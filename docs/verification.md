# Controle — 5 november 2026

## Uitgevoerd

- TypeScript strict: frontend en backend slagen.
- ESLint: geen fouten of waarschuwingen.
- Zeven tests slagen: energieformule, macro-energie, calorieondergrens, profiel-/AI-validatie, weektotalen, reeksen en datumgrenzen in de Nederlandse tijdzone.
- Productiebuild slaagt. Grafieken, animatiebibliotheek en validatie zijn in afzonderlijke bundels gesplitst.
- API `/health` geeft HTTP 200 in de geconfigureerde testomgeving.
- Mutatie vanuit een vreemde Origin geeft HTTP 403.
- Beheer zonder sessie geeft HTTP 401.
- Vite-pagina geeft HTTP 200.
- Alle 40 Playwright-browsergevallen slagen op 320, 375, 768 en 1440 pixels: openbare routes, inloggen, persoonlijke schema's, intake, beheer, maaltijden, trainingssets, voortgang, modals, focus, donker thema en minder beweging. De bekeken mobiele schermafbeeldingen tonen geen overlap of horizontale uitloop.
- Alle 16 fasen van `npm run test:mobile` slagen, inclusief de volledige browsersuite en de PostgreSQL-/SMTP-/API-integratie. `npm test`, `npm run lint` en `npm run build` slagen eveneens.
- Nederlandse interface en voorbeeldinhoud in `nl.json` nagelezen op spelling; consistente je/jij-toon. Geen verzonnen reviews of abonnementskosten.
- De Prisma-migratie en seed met 63 oefeningen zijn daadwerkelijk uitgevoerd tegen een geïsoleerde PostgreSQL 18.6-server. Docker is daarvoor niet nodig.
- Lokale SMTP-integratie geslaagd: de app verstuurt verificatie- en herstelmails naar de testopvanger; de links worden vervolgens gebruikt in de API-test.
- Registratie, bcrypt-hashing, gehashte eenmalige tokens, httpOnly-cookies, refresh-rotatie, replay-afwijzing, Origin-controle, intakevalidatie, logging, gebruikersisolatie, export en cascade-verwijdering zijn integraal getest.
- Accesscookies zijn nu gekoppeld aan een bestaande sessie in de database: uitloggen, refresh-rotatie en wachtwoordreset trekken oude toegang daadwerkelijk in.
- Claude SDK-contract getest via een lokale HTTP-server, met geldige uitvoer, ongeldige JSON, retry, versieopslag, foutenregistratie en een dagelijkse limiet die een API-herstart overleeft.
- Providerfouten (zoals onvoldoende API-tegoed) geven HTTP 503 met een veilige Nederlandse melding. De vorige schemaversie blijft behouden. De inloglimiet geeft HTTP 429 met JSON, zodat de interface de melding kan tonen.
- Mobiele fout hersteld: de lange actieknop op de profielpagina valt op 320 px niet meer buiten de kaart. Het mobiele menu is verborgen voor toetsenbordfocus wanneer het dicht is; wanneer het open is, blijven Tab en Shift+Tab binnen het menu en sluit Escape het menu.
- Na de volledige suite zijn vier gerichte browsertests opnieuw geslaagd voor donker thema en navigatie. De groene maaltijdlabels halen op alle vier breedtes een gemeten contrastverhouding van minimaal 4,5:1. De knopkleur blijft afzonderlijk afgestemd op witte knoptekst. Een nagekeken voorbeeld staat in [donker-375.png](screenshots/donker-375.png).
- Anthropic is echt aangeroepen met uitsluitend een fictief testprofiel. De provider weigerde de generatie wegens onvoldoende API-tegoed. Een succesvolle live-generatie is dus nog niet bewezen. De sleutel staat uitsluitend in de genegeerde `.env` en niet in gevolgde projectbestanden.
- GitHub en GitLab gebruiken dezelfde lint-, test- en buildopdrachten. Synchronisatie gebruikt gewone pushes, zonder force of verwijderingen.
- Bestaand project `gymgroup2/gym` gekoppeld; de oorspronkelijke GitLab-commit is behouden. `main`, `develop`, `feature/design-system` en `feature/platform` zijn naar beide providers gepusht.

## Nog te verifiëren

- Succesvolle live-generatie na aanvullen van Anthropic API-tegoed. Voer daarna `npm run test:claude` opnieuw uit.
- Externe SMTP-provider, afleverbaarheid en DNS-records voor een productie-e-maildomein. De geslaagde e-mailtest gebruikt een echte lokale SMTP-server en verstuurt niets naar derden.
- Productie-PostgreSQL, HTTPS-cookies, productieback-ups, echte apparaten en eventuele e-mail-/AI-providerlimieten. De tests gebruiken geïsoleerde lokale diensten en fictieve gegevens.
- CI is pas geverifieerd als de providers de gepushte pipelines succesvol uitvoeren.

Deze versie is lokale ontwikkelcode en nog niet gereed voor publiek productiegebruik.

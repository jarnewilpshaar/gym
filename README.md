# Sterk

Nederlandstalig platform voor persoonlijke training, voeding en voortgang. React 19 + TypeScript + Vite, Express, Prisma/PostgreSQL en Claude via de backend.

## Starten

Vereist: Node.js 22+, npm en PostgreSQL 17 (of Docker Compose).

```sh
npm ci
cp .env.example .env
# Vervang JWT_SECRET door minimaal 32 willekeurige tekens.
docker compose up -d
npm run db:generate
npm run db:deploy
npm run db:seed
npm run dev
```

Op Windows: `Copy-Item .env.example .env`. Open http://127.0.0.1:5173. De API luistert op 127.0.0.1:3001. Mailpit toont lokale verificatie- en herstelmails op http://127.0.0.1:8025. Gebruik consequent `127.0.0.1` voor de app, want `WEB_ORIGIN` wordt gecontroleerd bij wijzigingen.

Zonder database en sleutels kun je de duidelijk gemarkeerde demo bekijken. Demogegevens blijven alleen in het geheugen van de browser en verdwijnen bij vernieuwen. Registratie en persoonlijke opslag vereisen een werkende database. AI-generatie vereist `ANTHROPIC_API_KEY`; stel `ANTHROPIC_MODEL` in op een model waartoe je account toegang heeft. Sleutels horen uitsluitend in `.env`, nooit in de frontend of Git.

## Structuur

- `apps/web/src/components/motion.tsx`: gedeelde Reveal, Stagger, CountUp, PageTransition en Skeleton.
- `apps/web/src/nl.json`: Nederlandse interface, voorbereid op verdere vertalingen.
- `apps/api/src/index.ts`: accounts, cookies, rollen, intake, Claude, logs en data-export/-verwijdering.
- `packages/shared/schema.ts`: Zod-contracten en berekening van energiebehoefte en macro's.
- `prisma`: relationeel schema, initiële migratie en seed met meer dan 50 oefeningen.
- `tests`: berekeningen en validatiegrenzen.

## GitHub en GitLab

GitHub `origin`: https://github.com/jarnewilpshaar/gym.git.

Dezelfde Git-geschiedenis kan naar beide diensten worden gepusht. Gebruik `main` voor een gecontroleerde versie, `develop` voor integratie, `feature/...` voor nieuwe functies en `fix/...` voor reparaties. `feature/platform` bevat de verdere platformbouw. Beide providers draaien dezelfde lint-, test- en buildcontroles.

GitLab `gitlab`: https://gitlab.com/gymgroup2/gym.git. Beide remotes zijn lokaal gekoppeld.

Gebruik voor synchronisatie:

```sh
npm run sync -- develop
```

`npm run sync -- <branch>` pusht de gekozen lokale branch eerst naar GitHub en daarna naar GitLab. Het script forceert niets en verwijdert niets. Als de tweede push mislukt, herstel eerst die verbinding en voer het script opnieuw uit. Doe wijzigingen via één provider tegelijk: haal wijzigingen van die remote op, integreer ze lokaal en synchroniseer daarna beide remotes. Zo vermijd je tegengestelde merges en spiegel-lussen. Er is geen achtergrondspiegel die zonder jouw actie pusht.

Gebruik de normale Git Credential Manager of SSH voor authenticatie. Bewaar geen toegangstokens in remote-URL's, workflowbestanden of projectbestanden.

## Controleren

```sh
npm run lint
npm test
npm run build
```

`npm run db:deploy` past de meegeleverde migratie toe. Nieuwe schemawijzigingen maak je met `npm run db:migrate -- --name beschrijving`. Seeden is herhaalbaar en maakt geen accounts met standaardwachtwoorden. Geef een eigen, geverifieerd account via de database de rol `admin` om beheer te openen.

## Veiligheid en grenzen

Wachtwoorden worden met bcrypt gehasht. Refresh- en eenmalige actietokens worden alleen gehasht opgeslagen. Cookies zijn httpOnly, SameSite Strict en in productie Secure. Mutaties controleren de Origin-header. De server gebruikt Helmet, inputvalidatie en rate limiting. React rendert ingevoerde tekst als tekst. Foto's accepteren uitsluitend JPEG/PNG/WebP, maximaal 4 MB via de interface. Elke AI-poging telt mee voor de dagelijkse limiet; uitvoer wordt met Zod gecontroleerd en eenmaal opnieuw aangevraagd bij ongeldige JSON. De limiet begrenst aanvragen en outputtokens; dit is geen harde euro-limiet op je Anthropic-account.

De energieformule is een schatting; activiteitsfactoren en voedingswaarden zijn geen medisch advies. Het platform is voor volwassenen. Te lage doelgewichten worden geweigerd. Laat gegenereerde schema's bij medische beperkingen door een deskundige beoordelen. De AI kan ondanks instructies inhoudelijke fouten maken; JSON-validatie bewijst geen medische geschiktheid.

Voordat je publiek live gaat: gebruik HTTPS, een afgeschermde productie-database, een eigen SMTP-provider, een privacyverklaring en een bewaarbeleid voor back-ups. Data-export en accountverwijdering werken op de live database; verwijdering wist geen eventuele externe back-ups. Voor productie is aanvullende beveiligingsreview nodig.

## Verificatiestatus

Zie `docs/verification.md` voor uitgevoerde controles en nog ontbrekende integratiechecks. De interface is nog geen bewijs dat externe diensten geconfigureerd of getest zijn.

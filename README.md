# Codenames – Multiplayer-Wortspiel

Webbasiertes Codenames für Kurse mit bis zu 16 Spielern. Kein Login erforderlich.

**Stack:** React · Vite · TypeScript · Supabase (Datenbank + Realtime)

---

## Schnellstart

### 1. Voraussetzungen

- Node.js 18+
- Ein kostenloses [Supabase-Konto](https://supabase.com)

### 2. Projekt einrichten

```bash
# Im Projektverzeichnis
npm install
```

### 3. Supabase konfigurieren

**Schritt 1 – Projekt erstellen**  
Neues Supabase-Projekt anlegen. Region möglichst nahe am Standort der Nutzer wählen.

**Schritt 2 – SQL-Schema ausführen**  
Im Supabase Dashboard → **SQL Editor** → folgenden Code einfügen und ausführen:

```sql
create extension if not exists "pgcrypto";

create table games (
  id                  uuid primary key default gen_random_uuid(),
  room_code           text not null unique,
  host_id             uuid not null,
  status              text not null default 'waiting'
                        check (status in ('waiting', 'playing', 'finished')),
  current_team        text not null default 'red'
                        check (current_team in ('red', 'blue')),
  winner              text check (winner in ('red', 'blue')),
  end_reason          text check (end_reason in ('all_red_found', 'all_blue_found', 'assassin')),
  turn_phase          text not null default 'clue'
                        check (turn_phase in ('clue', 'guess')),
  current_clue_word   text,
  current_clue_number int,
  guesses_remaining   int,
  created_at          timestamptz not null default now()
);

create table cards (
  id       uuid primary key default gen_random_uuid(),
  game_id  uuid not null references games(id) on delete cascade,
  word     text not null,
  color    text not null check (color in ('red', 'blue', 'neutral', 'assassin')),
  revealed boolean not null default false,
  position integer not null check (position >= 0 and position <= 24),
  unique (game_id, position)
);

create table players (
  id              uuid primary key default gen_random_uuid(),
  game_id         uuid not null references games(id) on delete cascade,
  local_player_id uuid not null,
  name            text not null,
  team            text not null default 'spectator'
                    check (team in ('red', 'blue', 'spectator')),
  role            text not null default 'operative'
                    check (role in ('operative', 'spymaster')),
  joined_at       timestamptz not null default now(),
  last_seen       timestamptz not null default now(),
  unique (game_id, local_player_id)
);

create index on cards(game_id);
create index on players(game_id);
create index on games(room_code);

alter table games   enable row level security;
alter table cards    enable row level security;
alter table players  enable row level security;

create policy "public read/write" on games   for all using (true) with check (true);
create policy "public read/write" on cards    for all using (true) with check (true);
create policy "public read/write" on players  for all using (true) with check (true);

create or replace function give_clue(
  p_local_player_id uuid, p_game_id uuid, p_word text, p_number int
) returns void language plpgsql as $$
declare
  v_game   games%rowtype;
  v_player players%rowtype;
begin
  select * into v_game from games where id = p_game_id for update;
  if not found or v_game.status != 'playing' or v_game.turn_phase != 'clue' then return; end if;
  select * into v_player from players
    where game_id = p_game_id and local_player_id = p_local_player_id;
  if not found or v_player.role != 'spymaster' or v_player.team != v_game.current_team then return; end if;
  update games set
    current_clue_word   = p_word,
    current_clue_number = p_number,
    guesses_remaining   = case when p_number = 0 then 25 else p_number + 1 end,
    turn_phase          = 'guess'
  where id = p_game_id;
end;
$$;

create or replace function reveal_card(p_local_player_id uuid, p_game_id uuid, p_card_id uuid)
returns void language plpgsql as $$
declare
  v_card      cards%rowtype;
  v_game      games%rowtype;
  v_player    players%rowtype;
  v_red_left  int;
  v_blue_left int;
begin
  select * into v_card from cards where id = p_card_id for update;
  if not found or v_card.revealed then return; end if;

  select * into v_game from games where id = p_game_id;
  if not found then return; end if;
  if v_card.game_id != p_game_id then return; end if;

  select * into v_player from players
    where game_id = p_game_id and local_player_id = p_local_player_id;

  if not found                              then return; end if;
  if v_game.status   != 'playing'           then return; end if;
  if v_game.turn_phase != 'guess'           then return; end if;
  if v_player.team   != v_game.current_team then return; end if;
  if v_player.role    = 'spymaster'         then return; end if;

  update cards set revealed = true where id = p_card_id;

  if v_card.color = 'assassin' then
    update games set
      status              = 'finished',
      winner              = case when v_player.team = 'red' then 'blue' else 'red' end,
      end_reason          = 'assassin',
      turn_phase          = 'clue',
      current_clue_word   = null,
      current_clue_number = null,
      guesses_remaining   = null
    where id = v_game.id;
    return;
  end if;

  select count(*) into v_red_left
    from cards where game_id = v_game.id and color = 'red'  and revealed = false;
  select count(*) into v_blue_left
    from cards where game_id = v_game.id and color = 'blue' and revealed = false;

  if v_card.color = 'red'  and v_red_left  = 0 then
    update games set status = 'finished', winner = 'red',  end_reason = 'all_red_found',
      turn_phase = 'clue', current_clue_word = null, current_clue_number = null, guesses_remaining = null
    where id = v_game.id; return;
  end if;
  if v_card.color = 'blue' and v_blue_left = 0 then
    update games set status = 'finished', winner = 'blue', end_reason = 'all_blue_found',
      turn_phase = 'clue', current_clue_word = null, current_clue_number = null, guesses_remaining = null
    where id = v_game.id; return;
  end if;

  -- Falsche Farbe → sofortiger Zugwechsel
  if v_card.color != v_game.current_team then
    update games set
      current_team        = case when v_game.current_team = 'red' then 'blue' else 'red' end,
      turn_phase          = 'clue',
      current_clue_word   = null,
      current_clue_number = null,
      guesses_remaining   = null
    where id = v_game.id;
    return;
  end if;

  -- Richtige Farbe → guesses_remaining dekrementieren
  if v_game.guesses_remaining - 1 <= 0 then
    update games set
      current_team        = case when v_game.current_team = 'red' then 'blue' else 'red' end,
      turn_phase          = 'clue',
      current_clue_word   = null,
      current_clue_number = null,
      guesses_remaining   = null
    where id = v_game.id;
  else
    update games set guesses_remaining = v_game.guesses_remaining - 1 where id = v_game.id;
  end if;
end;
$$;
```

**Bestehende Datenbank aktualisieren (falls das Schema bereits angelegt wurde):**  
Statt das Schema neu zu erstellen, diese Migrationsbefehle ausführen:

```sql
-- Neue Spalten zur games-Tabelle hinzufügen
alter table games
  add column if not exists turn_phase          text not null default 'clue'
    check (turn_phase in ('clue', 'guess')),
  add column if not exists current_clue_word   text,
  add column if not exists current_clue_number int,
  add column if not exists guesses_remaining   int;

-- give_clue-Funktion anlegen (s.o.)
-- reveal_card-Funktion ersetzen (s.o.)
```

**Schritt 3 – Realtime aktivieren**  
Supabase Dashboard → **Database → Replication** → für `games`, `cards`, `players` jeweils Realtime einschalten.

**Schritt 4 – API-Schlüssel kopieren**  
Supabase Dashboard → **Project Settings → API**:
- `Project URL` → `VITE_SUPABASE_URL`
- `anon public` Key → `VITE_SUPABASE_ANON_KEY`

### 4. Umgebungsvariablen

Datei `.env.local` im Projektstamm erstellen:

```env
VITE_SUPABASE_URL=https://dein-projekt.supabase.co
VITE_SUPABASE_ANON_KEY=dein-anon-key
```

### 5. Lokal starten

```bash
npm run dev
```

Die App öffnet sich unter `http://localhost:5173`.

---

## Spielanleitung

1. **Host** öffnet die App, gibt seinen Namen ein und klickt „Neues Spiel erstellen"
2. Host gibt 25 Begriffe ein und bestätigt → ein Raumcode wird generiert
3. Host teilt den Raumcode (oder die URL `/game/RAUMCODE`) mit den Teilnehmern
4. **Spieler** geben ihren Namen und den Raumcode ein → Beitreten
5. Alle wählen Team (Rot/Blau/Zuschauer) und Rolle (Ermittler/Geheimdienstchef)
6. Host klickt „Spiel starten"
7. Ermittler des aktiven Teams klicken Karten auf. Geheimdienstchefs sehen die Farben von Anfang an

**Kartenverteilung:** 9 Rot · 8 Blau · 7 Neutral · 1 Attentäter  
**Rotes Team beginnt.**

**Spielende:**
- Alle roten Karten aufgedeckt → Rot gewinnt
- Alle blauen Karten aufgedeckt → Blau gewinnt
- Attentäter aufgedeckt → aufdeckendes Team verliert

---

## Deployment

### Vercel

```bash
npm run build       # Prüfen, ob der Build funktioniert
```

1. Repository auf GitHub pushen
2. [vercel.com](https://vercel.com) → „New Project" → Repository importieren
3. Unter **Environment Variables** `VITE_SUPABASE_URL` und `VITE_SUPABASE_ANON_KEY` eintragen
4. Deploy

Die `vercel.json` im Projekt konfiguriert automatisch das SPA-Routing.

### Netlify

1. Repository importieren
2. Build-Befehl: `npm run build`
3. Publish-Verzeichnis: `dist`
4. Environment Variables eintragen
5. Datei `public/_redirects` mit folgendem Inhalt erstellen:

```
/* /index.html 200
```

---

## Projektstruktur

```
src/
├── App.tsx                    # Router-Einstiegspunkt
├── main.tsx                   # React-Root
├── index.css                  # Globale Styles
├── context/
│   └── LocalPlayerContext.tsx # Spieler-Identität via Context
├── lib/
│   ├── types.ts               # TypeScript-Interfaces
│   ├── supabase.ts            # Supabase-Client
│   └── utils.ts               # generateRoomCode, distributeColors
├── hooks/
│   ├── useLocalPlayer.ts      # localStorage-UUID
│   ├── useGame.ts             # Realtime-Abo: games
│   ├── useCards.ts            # Realtime-Abo: cards
│   └── usePlayers.ts          # Realtime-Abo: players
├── pages/
│   ├── HomePage.tsx           # Startseite
│   ├── CreateGamePage.tsx     # Spiel erstellen
│   └── GameRoom.tsx           # Spielraum
└── components/
    ├── Board.tsx              # 5×5-Raster
    ├── Card.tsx               # Einzelne Karte
    ├── Sidebar.tsx            # Rauminfo, Aktionen
    └── PlayerList.tsx         # Spielerliste
```

---

## Hinweis

Dieses Projekt ist für den privaten Kursgebrauch entwickelt. Es ist kein vollständig sicherheitsgehärtetes System – RLS ist aktiviert, aber mit offenen Policies. Für öffentliche Deployments sollten die Policies auf die tatsächlichen Anforderungen eingeschränkt werden.

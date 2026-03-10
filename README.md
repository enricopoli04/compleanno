# Evento App

Applicazione web per la gestione di un evento con sistema di partecipazione e organizzazione macchine.

## Stack Tecnologico

- **Frontend**: Vue 3 + TypeScript + Vite + Pinia + Vue Router
- **Backend**: Express + TypeScript + Mongoose
- **Database**: MongoDB

## Prerequisiti

- **Node.js** v18+
- **MongoDB** (locale o Atlas)

## Setup

### 1. Installa MongoDB

Se non hai MongoDB installato, puoi:
- Installarlo localmente: https://www.mongodb.com/docs/manual/installation/
- Usare MongoDB Atlas (cloud gratuito): https://www.mongodb.com/atlas

### 2. Backend

```bash
cd server
npm install
```

Modifica il file `.env` se necessario:

```env
PORT=3001
MONGODB_URI=mongodb://localhost:27017/event-app
JWT_SECRET=cambia-questa-chiave-segreta-in-produzione
```

Avvia il server:

```bash
npm run dev
```

### 3. Frontend

```bash
cd client
npm install
npm run dev
```

Il frontend sarà disponibile su `http://localhost:5173`.
Il proxy Vite inoltra le chiamate `/api` al backend sulla porta 3001.

## Struttura

```
event-app/
├── client/                  # Frontend Vue 3
│   ├── src/
│   │   ├── api.ts           # Client HTTP
│   │   ├── App.vue          # Layout principale + navbar
│   │   ├── main.ts          # Entry point
│   │   ├── router/          # Vue Router
│   │   ├── stores/          # Pinia stores (auth)
│   │   ├── pages/
│   │   │   ├── LoginPage.vue
│   │   │   ├── SignupPage.vue
│   │   │   ├── EventPage.vue        # Info evento (editabile)
│   │   │   └── AttendancePage.vue   # Partecipazione + macchine
│   │   └── styles/
│   │       └── global.css
│   └── ...
├── server/                  # Backend Express
│   ├── src/
│   │   ├── index.ts         # Entry point
│   │   ├── middleware/
│   │   │   └── auth.ts      # JWT middleware
│   │   ├── models/
│   │   │   ├── User.ts      # Utente (username, password, attending)
│   │   │   └── Car.ts       # Macchina (driver, seats, passengers)
│   │   └── routes/
│   │       ├── auth.ts      # Login + Signup
│   │       └── event.ts     # Partecipazione + Macchine
│   └── .env
└── README.md
```

## Funzionalità

### Autenticazione
- **Sign Up**: solo username + password
- **Login**: solo username + password
- JWT token salvato in localStorage

### Pagina Evento
- Informazioni sull'evento (testo placeholder da personalizzare)
- Pulsante per andare alla partecipazione

### Pagina Partecipazione
- **Menu laterale**: lista di chi ha risposto Sì e chi No
- **Sezione principale**: scegli se partecipare o meno
- Puoi cambiare risposta in qualsiasi momento
- Se rispondi **Sì**, si sblocca la sezione macchine

### Organizzazione Macchine
- **Offri passaggio**: indica quanti posti hai disponibili
- **Sali in macchina**: scegli in quale macchina vuoi andare
- **Esci dalla macchina**: se cambi idea
- **Rimuovi macchina**: se sei il conducente
- Tabelle con conducente e passeggeri per ogni macchina
- Se cambi la partecipazione a "No", vieni rimosso automaticamente da tutte le macchine

## Personalizzazione

Per modificare le informazioni sull'evento, edita il file:
`client/src/pages/EventPage.vue`

Cambia il testo nei tag `<h1>`, `<p>`, e nelle sezioni "strips" con le tue informazioni.

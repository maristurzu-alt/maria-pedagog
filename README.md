# Maria-Pedagog · Antrenament BAC Română L2

Aplicație web pentru antrenament individual la proba de limba și literatura română a Bacalaureatului, destinată elevilor din clasa a XII-a care studiază româna ca limbă nematernă (nivel B1–B2).

## Ce conține

- `index.html` — aplicația: Subiectele I–III, centralizarea punctajului, corectura profesorului, butonul „Ajută-mă” și salvarea opțională a progresului pe dispozitiv.
- `api/chat.js` — funcția de server (Vercel) care trimite răspunsul elevului către modelul AI și întoarce feedbackul formativ.

## Configurare pe Vercel

Variabile de mediu:

- `GOOGLE_API_KEY` — obligatorie pentru corectarea AI. Cheia rămâne doar pe server; elevul nu introduce nicio cheie.
- `GEMINI_MODEL` — opțională; implicit `gemini-2.5-flash`.

Fără cheie, aplicația funcționează în continuare: Subiectul I se corectează automat, iar butonul „Ajută-mă” afișează un mesaj că AI-ul nu este activat.

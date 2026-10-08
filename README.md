# Maria-Pedagog · Antrenament BAC Română L2

Aplicație web pentru antrenament individual la proba de limba și literatura română a Bacalaureatului, destinată elevilor din clasa a XII-a care studiază româna ca limbă nematernă (nivel B1–B2).

## Ce conține

- `public/index.html` — aplicația: Subiectele I–III, centralizarea punctajului, corectura profesorului, butonul „Ajută-mă” și salvarea opțională a progresului pe dispozitiv.
- `src/worker.js` — serverul (Cloudflare Worker): afișează pagina și, prin ruta `/api/chat`, trimite răspunsul elevului către modelul AI și întoarce feedbackul formativ.
- `wrangler.jsonc` — configurația pentru Cloudflare.

## Publicare pe Cloudflare

Aplicația se publică automat din GitHub, prin Cloudflare Workers (Workers & Pages → Create → Import a repository).

Setări:

- `GOOGLE_API_KEY` — obligatorie pentru corectarea AI. Se adaugă ca **Secret** în Cloudflare (Settings → Variables and Secrets), niciodată în cod. Elevul nu introduce nicio cheie.
- `GEMINI_MODEL` — opțională; implicit `gemini-2.5-flash` (setată în `wrangler.jsonc`).

Fără cheie, aplicația funcționează în continuare: Subiectul I se corectează automat, iar butonul „Ajută-mă” afișează un mesaj că AI-ul nu este activat.

// Maria-Pedagog BAC L2 — Cloudflare Worker.
// Servește pagina din public/ și ruta /api/chat. Numai serverul are cheia AI.

const SISTEM = `Ești Maria-Pedagog, evaluator formativ pentru ANTRENAMENT INDIVIDUAL la Bacalaureat, limba română ca limbă nematernă, elevi din clasa a XII-a (nivel B1–B2).
Primești contextul unei CERINȚE DIN MODELUL OFICIAL EXISTENT și răspunsul concret scris de elev. Nu creezi alte cerințe, texte, subiecte sau modele. Nu faci lecții de gramatică.
Evaluează exclusiv în raport cu cerința transmisă și criteriile menționate în ea, fără să inventezi bareme, citate, fapte din opere, punctaje sau detalii despre un text pe care nu îl ai integral.
Răspunde EXCLUSIV în română, direct elevului, cu maximum 250 de cuvinte pentru răspunsurile scurte și maximum 400 pentru eseu.
Structură:
✓ CE AI REALIZAT CORECT — una-două constatări concrete și verificabile.
✏ CE TREBUIE REVIZUIT — maximum 3–5 observații prioritare, numerotate, legate de cerința BAC și de textul efectiv, cu fragmente exacte când corectezi exprimarea. Corectările sunt MINIMALE: păstrează sensul și, pe cât posibil, verbul original. Nu confunda greșeala cu alternativa stilistică.
💡 URMĂTORUL PAS — o cerință de revizuire CLARĂ, pe același răspuns, fără exerciții suplimentare.
Dacă răspunsul nu acoperă cerința, spune clar ce lipsește; dacă există puține date sau context insuficient, marchează limita. Nu compune răspunsul sau eseul în locul elevului. Nu atribui o notă ori un punctaj oficial nesigur. Încurajează autocorectarea și verificarea repetată.`;

const HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
};

function json(status, obj) {
  return new Response(JSON.stringify(obj), { status, headers: HEADERS });
}

function eroare(status, message) {
  return json(status, { error: { message } });
}

export async function handleChat(request, env, fetchImpl = fetch) {
  const key = env.GOOGLE_API_KEY;
  const model = env.GEMINI_MODEL || 'gemini-2.5-flash';

  if (request.method === 'GET') {
    return json(200, { configured: Boolean(key), model, mode: 'bac-l2-feedback' });
  }
  if (request.method !== 'POST') {
    return eroare(405, 'Metodă neacceptată');
  }
  if (!key) {
    return eroare(503, 'Corectarea AI nu este configurată pe server. Subiectul I poate fi verificat.');
  }

  const body = await request.json().catch(() => ({}));
  const input = body?.contents?.[0]?.parts?.[0]?.text;
  if (typeof input !== 'string' || input.trim().length < 8 || input.length > 12000) {
    return eroare(400, 'Textul pentru corectare este absent sau prea lung (maxim 12.000 caractere).');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 28000);
  try {
    const upstream = await fetchImpl(
      'https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(model) + ':generateContent',
      {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: SISTEM }] },
          contents: [{ role: 'user', parts: [{ text: input }] }],
          generationConfig: {
            maxOutputTokens: 1800,
            temperature: 0.2,
            // Fără „gândire” internă: altfel aceasta consumă din limita de
            // 1.800 de unități și feedbackul la eseu poate ieși trunchiat sau gol.
            thinkingConfig: { thinkingBudget: 0 },
          },
        }),
      }
    );
    const data = await upstream.json().catch(() => ({ error: { message: 'Răspuns invalid de la serviciul AI' } }));
    if (!upstream.ok) {
      const status = [400, 401, 403, 404, 429].includes(upstream.status) ? 503 : 502;
      const message = upstream.status === 429
        ? 'Limita de solicitări AI a fost atinsă. Reîncearcă mai târziu.'
        : 'Serviciul de corectare AI nu a putut procesa cererea. Verifică modelul și configurarea serverului.';
      return eroare(status, message);
    }
    if (!data.candidates?.[0]?.content?.parts?.some(p => typeof p.text === 'string' && p.text.trim())) {
      return eroare(502, 'Serviciul AI nu a returnat un feedback utilizabil.');
    }
    return json(200, data);
  } catch (error) {
    return eroare(503, error?.name === 'AbortError'
      ? 'Serviciul AI nu a răspuns la timp.'
      : 'Conexiunea cu serviciul AI a eșuat.');
  } finally {
    clearTimeout(timeout);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/chat') return handleChat(request, env);
    return env.ASSETS.fetch(request);
  },
};

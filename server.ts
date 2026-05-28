import express from "express";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

import { GoogleGenAI } from "@google/genai";

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-initialized Gemini Client
let aiClient: GoogleGenAI | null = null;
function getGeminiClient() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("La clé d'API GEMINI_API_KEY n'est pas configurée dans l'application.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// API routes FIRST
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.post("/api/analyze-error", async (req, res) => {
  try {
    const { errorMessage, posProvider, service } = req.body;
    if (!errorMessage) {
      return res.status(400).json({ error: "Le message d'erreur est obligatoire pour l'analyse." });
    }

    const ai = getGeminiClient();
    const prompt = `Vous êtes un ingénieur de support de haut niveau expert en intégration de caisses de restauration/commerce (POS API).
Analyse l'erreur de synchronisation suivante rencontrée par l'un de nos marchands et formule un diagnostic clair et des étapes de résolution en français :

- Caisse (POS Provider) : ${posProvider || 'Non spécifié'}
- Service de synchronisation : ${service || 'Non spécifié'}
- Message d'erreur brut : ${errorMessage}

Formate ta réponse de façon extrêmement propre en Markdown. Elle doit être très structurée, concise, et rassurante :
1. **Ce que cela signifie** : Une phrase simple et abordable expliquant le problème sans jargon excessif.
2. **Comment résoudre l'erreur** : 2 à 3 étapes de dépannage concrètes, prioritaires, numérotées pour rétablir la situation. Indique si le marchand doit aller dans les paramètres de notre application NordicRevenues pour réinitialiser la clé d'API ou s'il s'agit d'une panne temporaire du fournisseur de caisse.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    res.json({ analysis: response.text || "Désolé, l'IA n'a pas pu formuler de diagnostic pour cette erreur." });
  } catch (error: any) {
    console.error("Gemini Error:", error);
    res.status(500).json({ error: error.message || "Erreur interne lors du diagnostic IA." });
  }
});

// --- Spotify OAuth ---
app.get("/api/auth/spotify/url", (req, res) => {
  const redirectUri = req.query.redirectUri as string;
  if (!process.env.SPOTIFY_CLIENT_ID) {
    return res.status(500).json({ error: "Clés d'API Spotify non configurées" });
  }
  const params = new URLSearchParams({
    client_id: process.env.SPOTIFY_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'user-read-private user-read-email playlist-read-private playlist-read-collaborative',
    state: redirectUri
  });
  res.json({ url: `https://accounts.spotify.com/authorize?${params}` });
});

app.get(['/auth/spotify/callback', '/auth/spotify/callback/'], async (req, res) => {
  const { code, state, error } = req.query;
  const redirectUri = state as string;

  if (error) return res.send(`<html><body><p>Error: ${error}</p></body></html>`);

  try {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(process.env.SPOTIFY_CLIENT_ID + ':' + process.env.SPOTIFY_CLIENT_SECRET).toString('base64')
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code as string,
        redirect_uri: redirectUri
      })
    });
    const data = await response.json();
    if (data.access_token) {
      res.send(`<html><body><script>if(window.opener){window.opener.postMessage({type:'SPOTIFY_AUTH_SUCCESS',token:'${data.access_token}'},'*');window.close();}else{window.location.href='/';}</script><p>Succès. Cette fenêtre va se fermer.</p></body></html>`);
    } else {
      res.send(`<html><body><p>Error: ${JSON.stringify(data)}</p></body></html>`);
    }
  } catch (err) {
    res.send(`<html><body><p>Server Error</p></body></html>`);
  }
});

// --- Deezer OAuth ---
app.get("/api/auth/deezer/url", (req, res) => {
  const redirectUri = req.query.redirectUri as string;
  if (!process.env.DEEZER_APP_ID) {
    return res.status(500).json({ error: "Clés d'API Deezer non configurées" });
  }
  const params = new URLSearchParams({
    app_id: process.env.DEEZER_APP_ID,
    redirect_uri: redirectUri,
    perms: 'basic_access,email,offline_access,manage_library'
  });
  res.json({ url: `https://connect.deezer.com/oauth/auth.php?${params}` });
});

app.get(['/auth/deezer/callback', '/auth/deezer/callback/'], async (req, res) => {
  const { code } = req.query;
  try {
    const response = await fetch(`https://connect.deezer.com/oauth/access_token.php?app_id=${process.env.DEEZER_APP_ID}&secret=${process.env.DEEZER_APP_SECRET}&code=${code}`);
    const text = await response.text();
    const params = new URLSearchParams(text);
    const token = params.get('access_token');
    
    if (token) {
      res.send(`<html><body><script>if(window.opener){window.opener.postMessage({type:'DEEZER_AUTH_SUCCESS',token:'${token}'},'*');window.close();}else{window.location.href='/';}</script><p>Succès. Cette fenêtre va se fermer.</p></body></html>`);
    } else {
      res.send(`<html><body><p>Error: ${text}</p></body></html>`);
    }
  } catch (err) {
    res.send(`<html><body><p>Server Error</p></body></html>`);
  }
});

// --- YouTube OAuth ---
app.get("/api/auth/youtube/url", (req, res) => {
  const redirectUri = req.query.redirectUri as string;
  if (!process.env.YOUTUBE_CLIENT_ID) {
    return res.status(500).json({ error: "Clés d'API YouTube non configurées" });
  }
  const params = new URLSearchParams({
    client_id: process.env.YOUTUBE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/youtube.readonly',
    access_type: 'offline',
    state: redirectUri
  });
  res.json({ url: `https://accounts.google.com/o/oauth2/v2/auth?${params}` });
});

app.get(['/auth/youtube/callback', '/auth/youtube/callback/'], async (req, res) => {
  const { code, state, error } = req.query;
  const redirectUri = state as string;

  if (error) return res.send(`<html><body><p>Error: ${error}</p></body></html>`);

  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.YOUTUBE_CLIENT_ID || '',
        client_secret: process.env.YOUTUBE_CLIENT_SECRET || '',
        code: code as string,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri
      })
    });
    const data = await response.json();
    if (data.access_token) {
      res.send(`<html><body><script>if(window.opener){window.opener.postMessage({type:'YOUTUBE_AUTH_SUCCESS',token:'${data.access_token}'},'*');window.close();}else{window.location.href='/';}</script><p>Succès. Cette fenêtre va se fermer.</p></body></html>`);
    } else {
      res.send(`<html><body><p>Error: ${JSON.stringify(data)}</p></body></html>`);
    }
  } catch (err) {
    res.send(`<html><body><p>Server Error</p></body></html>`);
  }
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else if (!process.env.VERCEL) {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  if (!process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
}

startServer();

export default app;

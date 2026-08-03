// Cloudflare Pages Function — /api/delete
// Archive (soft-delete) une page Notion du Tracker à la demande du bouton "Supprimer" du dashboard.
// Variables d'environnement requises (à définir dans Cloudflare Pages > Settings > Environment variables) :
//   NOTION_TOKEN   : jeton d'intégration interne Notion (partagé avec la base "Tracker")
//   DELETE_SECRET  : chaîne partagée avec le client (doit correspondre à DELETE_SECRET_CLIENT dans index.html)

function corsHeaders() {
  return {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, x-delete-secret",
  };
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env.DELETE_SECRET || request.headers.get("x-delete-secret") !== env.DELETE_SECRET) {
    return new Response(JSON.stringify({ error: "Non autorisé" }), { status: 401, headers: corsHeaders() });
  }

  if (!env.NOTION_TOKEN) {
    return new Response(JSON.stringify({ error: "NOTION_TOKEN non configuré côté serveur" }), { status: 500, headers: corsHeaders() });
  }

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return new Response(JSON.stringify({ error: "JSON invalide" }), { status: 400, headers: corsHeaders() });
  }

  const rawId = String(body.pageId || "").replace(/^market-/, "").trim();
  if (!/^[0-9a-fA-F]{32}$/.test(rawId) && !/^[0-9a-fA-F-]{36}$/.test(rawId)) {
    return new Response(JSON.stringify({ error: "pageId invalide" }), { status: 400, headers: corsHeaders() });
  }

  const notionRes = await fetch(`https://api.notion.com/v1/pages/${rawId}`, {
    method: "PATCH",
    headers: {
      "Authorization": `Bearer ${env.NOTION_TOKEN}`,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ archived: true }),
  });

  if (!notionRes.ok) {
    const errText = await notionRes.text();
    return new Response(JSON.stringify({ error: "Notion a refusé la requête", detail: errText }), { status: notionRes.status, headers: corsHeaders() });
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: corsHeaders() });
}

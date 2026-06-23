const MCP_ENDPOINT = "https://mcp.deepwiki.com/mcp";
const REQUEST_TIMEOUT = 180000;
const MAX_CONTENT_LENGTH = 120000;

function json(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(payload));
}

function extractText(result) {
  if (!result) return "";
  if (typeof result === "string") return result;
  if (Array.isArray(result.content)) {
    return result.content
      .filter((item) => item && item.type === "text")
      .map((item) => item.text || "")
      .join("\n\n");
  }
  if (result.result) return extractText(result.result);
  if (result.answer) return String(result.answer);
  if (result.text) return String(result.text);
  return JSON.stringify(result, null, 2);
}

function extractQueryId(result) {
  if (!result || typeof result !== "object") return null;

  const candidates = [
    result.queryId,
    result.query_id,
    result.id,
    result.conversationId,
    result.conversation_id,
    result.sessionId,
    result.session_id,
    result.result?.queryId,
    result.result?.query_id,
    result.result?.id,
    result.metadata?.queryId,
    result.metadata?.query_id,
    result.meta?.queryId,
    result.meta?.query_id,
  ];

  return candidates.find((value) => typeof value === "string" && value.trim()) || null;
}

function truncate(text, maxLen = MAX_CONTENT_LENGTH) {
  if (!text || text.length <= maxLen) return text;
  return `${text.slice(0, maxLen)}\n\n---\n⚠️ [内容已截断] 原始 ${text.length} 字符，已截断至 ${maxLen} 字符。`;
}

async function parseSSE(response) {
  const text = await response.text();
  const lines = text.split("\n");
  let lastData = null;

  for (const line of lines) {
    if (line.startsWith("data: ")) {
      const dataStr = line.slice(6).trim();
      if (dataStr && dataStr !== "[DONE]") {
        try {
          lastData = JSON.parse(dataStr);
        } catch {
          // ignore malformed SSE chunk
        }
      }
    }
  }

  if (lastData) {
    if (lastData.error) throw new Error(`MCP SSE Error: ${JSON.stringify(lastData.error)}`);
    return lastData.result || lastData;
  }

  return { content: [{ type: "text", text }] };
}

async function mcpCall(toolName, args) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const response = await fetch(MCP_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "tools/call",
        params: {
          name: toolName,
          arguments: args,
        },
        id: Date.now(),
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const detail = await response.text().catch(() => "Unknown error");
      throw new Error(`DeepWiki MCP HTTP ${response.status}: ${detail.slice(0, 800)}`);
    }

    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      const data = await response.json();
      if (data.error) throw new Error(`MCP Error: ${JSON.stringify(data.error)}`);
      return data.result || data;
    }

    if (contentType.includes("text/event-stream")) {
      return parseSSE(response);
    }

    const text = await response.text();
    try {
      const data = JSON.parse(text);
      if (data.error) throw new Error(`MCP Error: ${JSON.stringify(data.error)}`);
      return data.result || data;
    } catch {
      return { content: [{ type: "text", text }] };
    }
  } catch (error) {
    clearTimeout(timeout);
    if (error?.name === "AbortError") {
      throw new Error(`DeepWiki MCP 请求超时 (${REQUEST_TIMEOUT / 1000} 秒)`);
    }
    throw error;
  }
}

function normalizeRepo(repo) {
  if (!repo || typeof repo !== "string") return null;
  const cleaned = repo
    .trim()
    .replace(/^https?:\/\/(www\.)?(github\.com|deepwiki\.com)\//, "")
    .replace(/\/+$/, "");
  const parts = cleaned.split("/").filter(Boolean);
  return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : null;
}

function buildQuestion(question, deepResearch) {
  const trimmed = String(question || "").trim();
  if (!deepResearch) return trimmed;
  if (trimmed.startsWith("[DEEP RESEARCH]")) return trimmed;
  return `[DEEP RESEARCH] ${trimmed}`;
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return json(res, 204, {});
  }

  if (req.method !== "POST") {
    return json(res, 405, { status: "error", error: "Method Not Allowed" });
  }

  try {
    const body = typeof req.body === "object" && req.body ? req.body : JSON.parse(req.body || "{}");
    const repoName = normalizeRepo(body.repo || body.repoName);
    const question = body.question || body.followUpQuestion || body.query || body.q;
    const queryId = typeof body.queryId === "string" && body.queryId.trim() ? body.queryId.trim() : null;
    const deepResearch = body.deepResearch === true || body.deep_research === true;

    if (!repoName) {
      return json(res, 400, { status: "error", error: "缺少或无法解析 repo，请使用 owner/repo 格式。" });
    }

    if (!question || !String(question).trim()) {
      return json(res, 400, { status: "error", error: "缺少 question / followUpQuestion。" });
    }

    const toolArgs = queryId
      ? {
          repoName,
          queryId,
          followUpQuestion: buildQuestion(question, deepResearch),
        }
      : {
          repoName,
          question: buildQuestion(question, deepResearch),
        };

    let result;
    try {
      result = await mcpCall("ask_question", toolArgs);
    } catch (firstError) {
      if (!queryId) throw firstError;
      result = await mcpCall("ask_question", {
        repoName,
        question: buildQuestion(
          `继续上一轮 DeepWiki 查询 (${queryId})，请回答这个追问：${question}`,
          deepResearch,
        ),
      });
    }

    const answer = truncate(extractText(result));
    const nextQueryId = extractQueryId(result) || queryId;

    return json(res, 200, {
      status: "success",
      answer,
      queryId: nextQueryId,
      rawQueryId: extractQueryId(result),
    });
  } catch (error) {
    return json(res, 500, {
      status: "error",
      error: error?.message || "DeepWiki MCP 调用失败",
    });
  }
}
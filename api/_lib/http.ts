export function sendJson(res: any, status: number, data: unknown) {
  res.status(status).setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(data));
}

export function sendMethodNotAllowed(res: any, methods: string[]) {
  res.setHeader("Allow", methods.join(", "));
  sendJson(res, 405, { error: "Method not allowed" });
}

/**
 * Send an error response, honoring a `status` property when present (e.g.
 * AuthError uses 401). Falls back to 500 for unexpected errors.
 */
export function sendError(res: any, error: unknown) {
  const status = (error as { status?: unknown })?.status;
  const message = error instanceof Error ? error.message : "Unknown error";
  sendJson(res, typeof status === "number" ? status : 500, { error: message });
}

export async function readJsonBody<T>(req: any): Promise<T> {
  if (req.body && typeof req.body === "object") return req.body as T;
  if (typeof req.body === "string") return JSON.parse(req.body) as T;

  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? (JSON.parse(raw) as T) : ({} as T);
}

export function queryParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

import type { PreparedRequest } from "./prepare";

export type CodeLanguage = "curl" | "fetch" | "node";

export const CODE_LANGUAGES: { id: CodeLanguage; label: string; monaco: string }[] = [
  { id: "curl", label: "cURL", monaco: "shell" },
  { id: "fetch", label: "JavaScript Fetch", monaco: "javascript" },
  { id: "node", label: "Node.js Fetch", monaco: "javascript" },
];

function shellQuote(s: string): string {
  // POSIX single-quote escaping
  return `'${s.replace(/'/g, `'\\''`)}'`;
}

function jsString(s: string): string {
  return JSON.stringify(s);
}

function isJson(text: string): boolean {
  try {
    JSON.parse(text);
    return true;
  } catch {
    return false;
  }
}

export function generateCurl(req: PreparedRequest): string {
  const lines: string[] = [];
  const methodFlag = req.method === "GET" && !req.body ? "" : req.method === "HEAD" ? " --head" : ` -X ${req.method}`;
  lines.push(`curl${methodFlag} ${shellQuote(req.url)}`);
  for (const [k, v] of req.headers) lines.push(`  -H ${shellQuote(`${k}: ${v}`)}`);
  if (req.body?.kind === "text" && req.body.text) {
    lines.push(`  --data-raw ${shellQuote(req.body.text)}`);
  } else if (req.body?.kind === "multipart") {
    for (const f of req.body.fields) {
      if (f.type === "file") lines.push(`  -F ${shellQuote(`${f.key}=@${f.fileName ?? "file"}`)}`);
      else lines.push(`  -F ${shellQuote(`${f.key}=${f.value}`)}`);
    }
  }
  return lines.join(" \\\n");
}

function headersObject(req: PreparedRequest, indent: string): string {
  if (req.headers.length === 0) return "";
  const inner = req.headers.map(([k, v]) => `${indent}  ${jsString(k)}: ${jsString(v)}`).join(",\n");
  return `${indent}headers: {\n${inner}\n${indent}},\n`;
}

function jsBody(req: PreparedRequest, indent: string): { pre: string; prop: string } {
  if (!req.body) return { pre: "", prop: "" };
  if (req.body.kind === "text") {
    const ct = req.headers.find(([k]) => k.toLowerCase() === "content-type")?.[1] ?? "";
    if (/json/i.test(ct) && isJson(req.body.text)) {
      const pretty = JSON.stringify(JSON.parse(req.body.text), null, 2).replace(/\n/g, `\n${indent}`);
      return { pre: "", prop: `${indent}body: JSON.stringify(${pretty}),\n` };
    }
    return { pre: "", prop: `${indent}body: ${jsString(req.body.text)},\n` };
  }
  const lines = ["const formData = new FormData();"];
  for (const f of req.body.fields) {
    if (f.type === "file") lines.push(`formData.append(${jsString(f.key)}, fileInput.files[0], ${jsString(f.fileName ?? "file")});`);
    else lines.push(`formData.append(${jsString(f.key)}, ${jsString(f.value)});`);
  }
  return { pre: `${lines.join("\n")}\n\n`, prop: `${indent}body: formData,\n` };
}

export function generateFetch(req: PreparedRequest): string {
  const body = jsBody(req, "  ");
  return (
    `${body.pre}const response = await fetch(${jsString(req.url)}, {\n` +
    `  method: ${jsString(req.method)},\n` +
    headersObject(req, "  ") +
    body.prop +
    `});\n\n` +
    `if (!response.ok) {\n  throw new Error(\`Request failed with status \${response.status}\`);\n}\n\n` +
    (req.method === "HEAD"
      ? `console.log(Object.fromEntries(response.headers));\n`
      : `const contentType = response.headers.get("content-type") ?? "";\nconst data = contentType.includes("application/json") ? await response.json() : await response.text();\nconsole.log(data);\n`)
  );
}

export function generateNode(req: PreparedRequest): string {
  const body = jsBody(req, "    ");
  let pre = body.pre;
  if (req.body?.kind === "multipart" && req.body.fields.some((f) => f.type === "file")) {
    pre =
      `import { readFile } from "node:fs/promises";\n\n` +
      pre.replace(
        /formData\.append\(("(?:[^"\\]|\\.)*"), fileInput\.files\[0\], ("(?:[^"\\]|\\.)*")\);/g,
        (_m, key: string, name: string) => `formData.append(${key}, new Blob([await readFile(${name})]), ${name});`,
      );
  }
  return (
    `// Requires Node.js 18+ (built-in fetch). Save as request.mjs and run: node request.mjs\n` +
    pre +
    `const controller = new AbortController();\n` +
    `const timeout = setTimeout(() => controller.abort(), 30_000);\n\n` +
    `try {\n` +
    `  const response = await fetch(${jsString(req.url)}, {\n` +
    `    method: ${jsString(req.method)},\n` +
    headersObject(req, "    ") +
    body.prop +
    `    signal: controller.signal,\n` +
    `  });\n\n` +
    `  console.log(response.status, response.statusText);\n` +
    (req.method === "HEAD" ? `  console.log(Object.fromEntries(response.headers));\n` : `  const text = await response.text();\n  console.log(text);\n`) +
    `} finally {\n  clearTimeout(timeout);\n}\n`
  );
}

export function generateCode(lang: CodeLanguage, req: PreparedRequest): string {
  switch (lang) {
    case "curl":
      return generateCurl(req);
    case "fetch":
      return generateFetch(req);
    case "node":
      return generateNode(req);
  }
}

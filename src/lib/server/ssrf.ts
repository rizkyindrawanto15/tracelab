import "server-only";
import dns from "node:dns";
import net from "node:net";

/**
 * SSRF protection for the TraceLab proxy.
 * Every address a hostname resolves to is checked *at connection time* (via a
 * custom `lookup`), so DNS-rebinding tricks cannot slip a private IP through.
 */

function ipv4ToInt(ip: string): number {
  return ip.split(".").reduce((acc, oct) => (acc << 8) + Number(oct), 0) >>> 0;
}

const BLOCKED_V4: [string, number][] = [
  ["0.0.0.0", 8], // "this" network
  ["10.0.0.0", 8], // private
  ["100.64.0.0", 10], // carrier-grade NAT
  ["127.0.0.0", 8], // loopback
  ["169.254.0.0", 16], // link-local incl. cloud metadata 169.254.169.254
  ["172.16.0.0", 12], // private
  ["192.0.0.0", 24], // IETF protocol assignments
  ["192.0.2.0", 24], // TEST-NET-1
  ["192.88.99.0", 24], // 6to4 relay
  ["192.168.0.0", 16], // private
  ["198.18.0.0", 15], // benchmarking
  ["198.51.100.0", 24], // TEST-NET-2
  ["203.0.113.0", 24], // TEST-NET-3
  ["224.0.0.0", 4], // multicast
  ["240.0.0.0", 4], // reserved + broadcast
];

function isBlockedV4(ip: string): boolean {
  const n = ipv4ToInt(ip);
  return BLOCKED_V4.some(([base, bits]) => {
    const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
    return (n & mask) === (ipv4ToInt(base) & mask);
  });
}

function expandV6(ip: string): number[] | null {
  let addr = ip.toLowerCase();
  const zone = addr.indexOf("%");
  if (zone >= 0) addr = addr.slice(0, zone);
  // Embedded IPv4 tail (e.g. ::ffff:127.0.0.1)
  const v4Tail = /(\d+\.\d+\.\d+\.\d+)$/.exec(addr);
  if (v4Tail) {
    const n = ipv4ToInt(v4Tail[1]);
    addr = addr.slice(0, -v4Tail[1].length) + `${(n >>> 16).toString(16)}:${(n & 0xffff).toString(16)}`;
  }
  const halves = addr.split("::");
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(":") : [];
  const tail = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
  const fill = halves.length === 2 ? 8 - head.length - tail.length : 0;
  const groups = [...head, ...Array(Math.max(fill, 0)).fill("0"), ...tail].map((g) => parseInt(g || "0", 16));
  return groups.length === 8 && groups.every((g) => Number.isFinite(g)) ? groups : null;
}

function isBlockedV6(ip: string): boolean {
  const g = expandV6(ip);
  if (!g) return true;
  const allZeroPrefix = (n: number) => g.slice(0, n).every((x) => x === 0);
  if (g.every((x) => x === 0)) return true; // ::
  if (allZeroPrefix(7) && g[7] === 1) return true; // ::1
  // IPv4-mapped / compatible / NAT64 → check embedded IPv4
  const embedded = `${g[6] >> 8}.${g[6] & 0xff}.${g[7] >> 8}.${g[7] & 0xff}`;
  if (allZeroPrefix(5) && (g[5] === 0xffff || g[5] === 0)) return isBlockedV4(embedded);
  if (g[0] === 0x64 && g[1] === 0xff9b) return isBlockedV4(embedded);
  if ((g[0] & 0xfe00) === 0xfc00) return true; // unique local fc00::/7
  if ((g[0] & 0xffc0) === 0xfe80) return true; // link-local fe80::/10
  if ((g[0] & 0xffc0) === 0xfec0) return true; // site-local (deprecated)
  if ((g[0] & 0xff00) === 0xff00) return true; // multicast
  if (g[0] === 0x2001 && g[1] === 0x0db8) return true; // documentation
  if (g[0] === 0x2002) return true; // 6to4 (can embed private v4)
  if (g[0] === 0x2001 && g[1] === 0) return true; // Teredo
  return false;
}

export function isBlockedAddress(ip: string): boolean {
  const family = net.isIP(ip);
  if (family === 4) return isBlockedV4(ip);
  if (family === 6) return isBlockedV6(ip);
  return true;
}

export class BlockedHostError extends Error {
  code = "EBLOCKEDHOST";
}

type LookupCallback = (err: NodeJS.ErrnoException | null, address: string | dns.LookupAddress[], family?: number) => void;

/** Drop-in replacement for dns.lookup that refuses private destinations. */
export function safeLookup(hostname: string, options: dns.LookupOptions | number | LookupCallback, callback?: LookupCallback) {
  const cb = (typeof options === "function" ? options : callback) as LookupCallback;
  const opts: dns.LookupOptions = typeof options === "object" ? options : typeof options === "number" ? { family: options } : {};
  dns.lookup(hostname, { ...opts, all: true, verbatim: true }, (err, addresses) => {
    if (err) return cb(err, "", 0);
    const list = addresses as dns.LookupAddress[];
    if (list.length === 0) return cb(Object.assign(new Error(`No addresses for ${hostname}`), { code: "ENOTFOUND" }), "", 0);
    const blocked = list.find((a) => isBlockedAddress(a.address));
    if (blocked) {
      return cb(new BlockedHostError(`Destination ${hostname} resolves to a private or reserved address.`), "", 0);
    }
    if (opts.all) return cb(null, list);
    return cb(null, list[0].address, list[0].family);
  });
}

/** Validate a hostname that is an IP literal (lookup is skipped for literals). */
export function assertPublicHost(hostname: string): void {
  const host = hostname.replace(/^\[|\]$/g, "");
  if (net.isIP(host) && isBlockedAddress(host)) {
    throw new BlockedHostError(`Destination ${host} is a private or reserved address.`);
  }
  const lower = host.toLowerCase();
  if (lower === "localhost" || lower.endsWith(".localhost") || lower.endsWith(".local") || lower.endsWith(".internal")) {
    throw new BlockedHostError(`Destination ${host} is an internal hostname.`);
  }
}

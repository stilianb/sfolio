/**
 * Password gate for a static host.
 *
 * GitHub Pages only serves files, so there is no server to check a password.
 * Instead, after the build, every HTML page in `dist/` is encrypted with
 * AES-256-GCM using a key derived from SITE_PASSWORD (PBKDF2-SHA256), and
 * replaced by a small page with one password field. The real markup never
 * ships in plain text: without the password there is nothing to read.
 *
 * The derived key is kept in sessionStorage after a correct entry, so moving
 * between pages does not ask again until the browser tab session ends.
 *
 * SITE_PASSWORD comes from the environment (a GitHub Actions secret in CI,
 * a git-ignored `.env` file locally). The build fails without it so an
 * unprotected site is never published by accident.
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { pbkdf2Sync, randomBytes, createCipheriv } from "node:crypto";
import { loadEnv } from "vite";

const ITERATIONS = 310_000;

async function* htmlFiles(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* htmlFiles(path);
    else if (entry.name.endsWith(".html")) yield path;
  }
}

function encrypt(key, plaintext) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const body = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final(), cipher.getAuthTag()]);
  return { iv: iv.toString("base64"), data: body.toString("base64") };
}

function gatePage({ salt, iv, data }, cryptoJs) {
  const payload = JSON.stringify({ s: salt, i: iv, d: data, n: ITERATIONS });
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow, noarchive, nosnippet, noimageindex">
<meta name="referrer" content="no-referrer">
<title>Protected</title>
<style>
:root{color-scheme:light dark;--bg:#fafafa;--fg:#111;--line:#d4d4d4;--err:#b42318}
@media (prefers-color-scheme:dark){:root{--bg:#0d0d0d;--fg:#f2f2f2;--line:#3a3a3a;--err:#f97066}}
*{box-sizing:border-box}
html,body{height:100%;margin:0}
body{display:grid;place-items:center;background:var(--bg);color:var(--fg);font:16px/1.4 system-ui,-apple-system,"Segoe UI",sans-serif;padding:16px}
form{width:100%;max-width:320px;display:grid;gap:8px}
.field{position:relative}
input{width:100%;padding:12px 44px 12px 14px;font:inherit;color:inherit;background:transparent;border:1px solid var(--line);border-radius:6px;outline-offset:2px}
input[aria-invalid=true]{border-color:var(--err)}
button{font:inherit;cursor:pointer}
.eye{position:absolute;top:4px;right:4px;bottom:4px;width:36px;display:grid;place-items:center;padding:0;border:0;border-radius:4px;background:transparent;color:inherit}
.enter{padding:12px 14px;border:0;border-radius:2px;background:#171512;color:#fff}
@media (prefers-color-scheme:dark){.enter{background:#f4f1e8;color:#171512}}
button:disabled{opacity:.6;cursor:default}
:focus-visible{outline:2px solid var(--fg);outline-offset:2px}
.sr{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
.msg{min-height:1.4em;margin:0;font-size:14px}
.msg:empty{display:none}
#gate[hidden]{display:none}
</style>
</head>
<body>
<form id="gate" hidden autocomplete="off">
<div class="field">
<label class="sr" for="pw">Password</label>
<input id="pw" type="password" placeholder="Password" autofocus required autocomplete="current-password">
<button type="button" class="eye" id="reveal" aria-label="Show password" aria-pressed="false">
<svg class="open" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>
<svg class="shut" hidden viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M3 3l18 18"/><path d="M10.5 6.2A10 10 0 0 1 12 6c6 0 10 6 10 6a18 18 0 0 1-3.2 3.6M6.1 6.1C3.6 7.8 2 12 2 12a18 18 0 0 0 6.1 5.5"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>
</button>
</div>
<button class="enter" id="enter" type="submit">Enter</button>
<p id="msg" class="msg" role="status" aria-live="polite"></p>
</form>
<script>
${cryptoJs}
(async()=>{
const P=${payload};
const b=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
const K="gate:"+P.s;
const f=document.getElementById("gate"),pw=document.getElementById("pw"),msg=document.getElementById("msg"),enter=document.getElementById("enter"),reveal=document.getElementById("reveal");
function unlock(key){
  const html=new TextDecoder().decode(aesGcmDecrypt(key,b(P.i),b(P.d)));
  document.open();document.write(html);document.close();
}
function derive(p){return pbkdf2Sha256(new TextEncoder().encode(p),b(P.s),P.n,32)}
let saved=null;try{saved=sessionStorage.getItem(K)}catch(e){}
if(saved){try{unlock(b(saved));return}catch(e){try{sessionStorage.removeItem(K)}catch(_){}}}
f.hidden=false;pw.focus();
reveal.addEventListener("click",()=>{
  const show=pw.type==="password";
  pw.type=show?"text":"password";
  reveal.setAttribute("aria-pressed",show?"true":"false");
  reveal.setAttribute("aria-label",show?"Hide password":"Show password");
  reveal.querySelector(".open").hidden=show;
  reveal.querySelector(".shut").hidden=!show;
  pw.focus();
});
f.addEventListener("submit",e=>{
  e.preventDefault();pw.disabled=true;enter.disabled=true;reveal.disabled=true;msg.textContent="Checking…";
  setTimeout(()=>{
    try{
      const raw=derive(pw.value.trim());
      unlock(raw);
      try{sessionStorage.setItem(K,btoa(String.fromCharCode(...raw)))}catch(_){}
    }catch(err){
      pw.disabled=false;enter.disabled=false;reveal.disabled=false;pw.value="";pw.setAttribute("aria-invalid","true");msg.textContent="Incorrect password";pw.focus();
    }
  },30);
});
pw.addEventListener("input",()=>{pw.removeAttribute("aria-invalid");if(msg.textContent==="Incorrect password")msg.textContent=""});
})();
</script>
</body>
</html>
`;
}

export default function passwordGate() {
  let root;
  return {
    name: "password-gate",
    hooks: {
      "astro:config:done": ({ config }) => {
        root = fileURLToPath(config.root);
      },
      "astro:build:done": async ({ dir, logger }) => {
        const env = { ...loadEnv("production", root, ""), ...process.env };
        const password = String(env.SITE_PASSWORD ?? "").trim();
        const cryptoJs = (await readFile(new URL("./gate-crypto.mjs", import.meta.url), "utf8"))
          .replace(/^\/\*\*[\s\S]*?\*\/\s*/, "")
          .replace(/^export /gm, "");
        if (!password) {
          throw new Error(
            "SITE_PASSWORD is not set. Add it to .env locally or as a repository secret in CI. Refusing to publish an unprotected site.",
          );
        }
        const salt = randomBytes(16);
        const key = pbkdf2Sync(password, salt, ITERATIONS, 32, "sha256");
        const outDir = fileURLToPath(dir);
        let count = 0;
        for await (const file of htmlFiles(outDir)) {
          const html = await readFile(file, "utf8");
          const { iv, data } = encrypt(key, html);
          await writeFile(file, gatePage({ salt: salt.toString("base64"), iv, data }, cryptoJs));
          count++;
        }
        logger.info(`Encrypted ${count} pages behind the password gate.`);
      },
    },
  };
}

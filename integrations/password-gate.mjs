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

function gatePage({ salt, iv, data }) {
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
form{width:100%;max-width:320px}
input{width:100%;padding:12px 14px;font:inherit;color:inherit;background:transparent;border:1px solid var(--line);border-radius:8px;outline-offset:2px}
input[aria-invalid=true]{border-color:var(--err)}
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
#gate[hidden]{display:none}
</style>
</head>
<body>
<form id="gate" hidden autocomplete="off">
<label class="sr" for="pw">Password</label>
<input id="pw" type="password" placeholder="Password" autofocus required autocomplete="current-password">
<p id="msg" class="sr" role="status" aria-live="polite"></p>
</form>
<script>
(async()=>{
const P=${payload};
const b=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
const K="gate:"+P.s;
const f=document.getElementById("gate"),pw=document.getElementById("pw"),msg=document.getElementById("msg");
async function open(raw){
  const key=await crypto.subtle.importKey("raw",raw,"AES-GCM",false,["decrypt"]);
  const out=await crypto.subtle.decrypt({name:"AES-GCM",iv:b(P.i)},key,b(P.d));
  const html=new TextDecoder().decode(out);
  if(document.readyState==="loading")await new Promise(r=>document.addEventListener("DOMContentLoaded",r,{once:true}));
  document.open();document.write(html);document.close();
}
async function derive(p){
  const base=await crypto.subtle.importKey("raw",new TextEncoder().encode(p),"PBKDF2",false,["deriveBits"]);
  return new Uint8Array(await crypto.subtle.deriveBits({name:"PBKDF2",hash:"SHA-256",salt:b(P.s),iterations:P.n},base,256));
}
let saved=null;try{saved=sessionStorage.getItem(K)}catch(e){}
if(saved){try{await open(b(saved));return}catch(e){try{sessionStorage.removeItem(K)}catch(_){}}}
f.hidden=false;pw.focus();
f.addEventListener("submit",async e=>{
  e.preventDefault();pw.disabled=true;
  try{
    const raw=await derive(pw.value);
    await open(raw);
    try{sessionStorage.setItem(K,btoa(String.fromCharCode(...raw)))}catch(_){}
  }catch(err){
    pw.disabled=false;pw.value="";pw.setAttribute("aria-invalid","true");msg.textContent="Incorrect password";pw.focus();
  }
});
pw.addEventListener("input",()=>{pw.removeAttribute("aria-invalid");msg.textContent=""});
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
        const password = env.SITE_PASSWORD;
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
          await writeFile(file, gatePage({ salt: salt.toString("base64"), iv, data }));
          count++;
        }
        logger.info(`Encrypted ${count} pages behind the password gate.`);
      },
    },
  };
}

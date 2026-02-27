import { exec } from "node:child_process";

function run(command) {
  return new Promise((resolve) => {
    const child = exec(command, { env: process.env });

    let out = "";
    let err = "";

    child.stdout.on("data", (d) => {
      const text = d.toString();
      out += text;
      process.stdout.write(text);
    });

    child.stderr.on("data", (d) => {
      const text = d.toString();
      err += text;
      process.stderr.write(text);
    });

    child.on("close", (code) => {
      resolve({ code: code ?? 1, out, err });
    });
  });
}

const first = await run("npm exec vite build");
if (first.code === 0) {
  process.exit(0);
}

const combined = `${first.out}\n${first.err}`;
const lockError =
  combined.includes("EPERM") &&
  combined.includes("Permission denied") &&
  combined.includes("dist");

if (!lockError) {
  process.exit(first.code);
}

const fallbackOutDir = `dist-fallback-${Date.now()}`;
console.warn(
  `\n[build] Dist appears locked on Windows. Retrying with --outDir ${fallbackOutDir} ...\n`
);

const second = await run(
  `npm exec vite build -- --emptyOutDir false --outDir ${fallbackOutDir}`
);

if (second.code === 0) {
  console.warn(
    `\n[build] Build succeeded in ${fallbackOutDir}. Close apps locking dist and rebuild when possible.\n`
  );
}

process.exit(second.code);

import type { Plugin } from "vite";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export function nvimPlugin(): Plugin {
  return {
    name: "nvim-keybindings",
    configureServer(server) {
      server.middlewares.use("/api/nvim-maps", async (_req, res) => {
        try {
          const { stdout } = await execFileAsync("nvim", [
            "--headless",
            "-c",
            "redir! > /dev/stdout | silent verbose map | redir END | qall!",
          ], { timeout: 5000 });

          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ ok: true, raw: stdout }));
        } catch (e) {
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({
            ok: false,
            error: e instanceof Error ? e.message : String(e),
          }));
        }
      });
    },
  };
}

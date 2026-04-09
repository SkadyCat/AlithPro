const fs = require("fs");
const path = require("path");
const { execFileSync, spawnSync } = require("child_process");

function existing(filePath) {
  return filePath && fs.existsSync(filePath) ? filePath : null;
}

function findGodotConsole() {
  const envCandidates = [
    process.env.GODOT_CONSOLE,
    process.env.GODOT_BIN,
    process.env.GODOT
  ].filter(Boolean);

  for (const candidate of envCandidates) {
    const hit = existing(candidate);
    if (hit) {
      return hit;
    }
  }

  const localAppData = process.env.LOCALAPPDATA;
  if (localAppData) {
    const wingetRoot = path.join(localAppData, "Microsoft", "WinGet", "Packages");
    if (fs.existsSync(wingetRoot)) {
      for (const entry of fs.readdirSync(wingetRoot)) {
        if (!entry.startsWith("GodotEngine.GodotEngine_")) {
          continue;
        }
        const candidate = path.join(wingetRoot, entry, "Godot_v4.6.2-stable_win64_console.exe");
        const hit = existing(candidate);
        if (hit) {
          return hit;
        }
      }
    }
  }

  const commandCandidates = [
    "Godot_v4.6.2-stable_win64_console.exe",
    "Godot_v4.6-stable_win64_console.exe",
    "godot4",
    "godot"
  ];

  for (const command of commandCandidates) {
    const probe = spawnSync("where.exe", [command], { encoding: "utf8" });
    if (probe.status === 0) {
      const line = probe.stdout
        .split(/\r?\n/)
        .map((item) => item.trim())
        .find(Boolean);
      if (line) {
        return line;
      }
    }
  }

  throw new Error("Unable to find a Godot console executable. Set GODOT_CONSOLE or install Godot console.");
}

function main() {
  const projectRoot = path.resolve(__dirname, "..");
  const godot = findGodotConsole();

  execFileSync(
    godot,
    ["--headless", "--path", projectRoot, "--script", "res://tools/generate_bag_ui.gd"],
    {
      cwd: projectRoot,
      stdio: "inherit"
    }
  );
}

main();

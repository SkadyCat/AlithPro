"""
launch-agent.py  —  Windows console-aware agent launcher
Usage: python launch-agent.py <workspace> [model] [launcher]

Spawns the resolved launcher .bat in a NEW console window so Copilot CLI
gets a real TTY (CREATE_NEW_CONSOLE). Prints the child PID to stdout.

If [model] is omitted, the model is auto-discovered from
workspace/<workspace>/config.json (key: "model").
"""
import subprocess
import sys
import os
import json
import re

def _find_pwsh7_dir():
    """Locate the PowerShell 7+ directory containing pwsh.exe.

    Search order:
    1. Common standard install paths (newest first).
    2. 'where pwsh' / 'which pwsh' from current environment.
    3. Windows registry HKLM InstallLocation (best-effort).
    Returns the directory string, or '' if not found.
    """
    # 1. Common paths — newest first so we always prefer the latest
    candidates = []
    pf = os.environ.get('ProgramFiles', r'C:\Program Files')
    for major in range(10, 6, -1):
        for minor in range(20, -1, -1):
            candidates.append(os.path.join(pf, 'PowerShell', f'{major}.{minor}'))
            candidates.append(os.path.join(pf, 'PowerShell', f'{major}.{minor}.0'))
        candidates.append(os.path.join(pf, 'PowerShell', str(major)))
    for d in candidates:
        if os.path.isfile(os.path.join(d, 'pwsh.exe')):
            return d

    # 2. Locate via shell (handles non-standard installs already in PATH)
    where_cmd = 'where' if sys.platform == 'win32' else 'which'
    try:
        result = subprocess.run([where_cmd, 'pwsh'], capture_output=True, text=True, timeout=5)
        if result.returncode == 0:
            for line in result.stdout.strip().splitlines():
                line = line.strip()
                if line.lower().endswith('pwsh.exe') or line.lower().endswith('pwsh'):
                    candidate_dir = os.path.dirname(line)
                    pwsh = os.path.join(candidate_dir, 'pwsh.exe')
                    if os.path.isfile(pwsh):
                        # Only return PS 7+ (major >= 7)
                        try:
                            ver = subprocess.run(
                                [pwsh, '-NoProfile', '-NonInteractive', '-Command',
                                 '$PSVersionTable.PSVersion.Major'],
                                capture_output=True, text=True, timeout=5
                            )
                            if ver.returncode == 0 and int(ver.stdout.strip()) >= 7:
                                return candidate_dir
                        except Exception:
                            pass
    except Exception:
        pass

    # 3. Windows registry
    if sys.platform == 'win32':
        try:
            import winreg
            for root in (winreg.HKEY_LOCAL_MACHINE, winreg.HKEY_CURRENT_USER):
                try:
                    key = winreg.OpenKey(root, r'SOFTWARE\Microsoft\PowerShellCore\InstalledVersions')
                    for i in range(winreg.QueryInfoKey(key)[0]):
                        sub_name = winreg.EnumKey(key, i)
                        sub = winreg.OpenKey(key, sub_name)
                        try:
                            loc, _ = winreg.QueryValueEx(sub, 'InstallLocation')
                            if os.path.isfile(os.path.join(loc, 'pwsh.exe')):
                                return loc
                        except FileNotFoundError:
                            pass
                except FileNotFoundError:
                    pass
        except Exception:
            pass

    return ''

def read_text_if_exists(path):
    if not os.path.exists(path):
        return ''
    with open(path, 'r', encoding='utf-8', errors='ignore') as f:
        return f.read()

def sanitize_workspace_name(workspace):
    return re.sub(r'[^A-Za-z0-9._-]', '-', str(workspace or ''))

def resolve_workspace_dir(root_dir, workspace):
    repo_root = os.path.abspath(os.path.join(root_dir, '..'))
    if os.path.basename(repo_root) == workspace:
        return repo_root
    return os.path.join(root_dir, 'workspace', workspace)

def load_workspace_model(root_dir, workspace):
    """Read model from the resolved workspace config.json if present."""
    config_path = os.path.join(resolve_workspace_dir(root_dir, workspace), 'config.json')
    if os.path.exists(config_path):
        try:
            with open(config_path, 'r', encoding='utf-8') as f:
                cfg = json.load(f)
            return cfg.get('model', '')
        except Exception:
            pass
    return ''

def read_run_bat_model(workspace_dir):
    content = read_text_if_exists(os.path.join(workspace_dir, 'run.bat'))
    match = re.search(r'--model=([^\s\r\n]+)', content)
    return match.group(1) if match else ''

def build_run_bat_content(model):
    lines = [
        '@echo off',
        'echo ========================================',
        'echo   GitHub Copilot CLI launcher (wmsxwd)',
        'echo ========================================',
        '',
        ':: Keep this file in CRLF format so cmd.exe reads each command correctly.',
        ':: If your proxy port differs, update PROXY_PORT below.',
        'set PROXY_PORT=7897',
        '',
        ':: Configure proxy',
        'set HTTP_PROXY=http://127.0.0.1:%PROXY_PORT%',
        'set HTTPS_PROXY=http://127.0.0.1:%PROXY_PORT%',
        'set NO_PROXY=localhost,127.0.0.1,.github.com,.githubusercontent.com,*.github.com',
        '',
        f'copilot --allow-all --model={model}',
        '',
    ]
    return '\r\n'.join(lines)

def build_run_without_proxy_bat_content(model):
    lines = [
        '@echo off',
        'echo ========================================',
        'echo   GitHub Copilot CLI launcher (wmsxwd)',
        'echo ========================================',
        '',
        f'copilot --allow-all --model={model}',
        '',
    ]
    return '\r\n'.join(lines)

def build_export_log_bat_content(model):
    lines = [
        '@echo off',
        'setlocal EnableExtensions',
        '',
        'cd /d %~dp0',
        'if not exist logs mkdir logs',
        '',
        'set "shell_log=logs\\copilot-shell.log"',
        '',
        '(',
        '    echo [INFO] Starting Copilot CLI with shell output redirected to "%shell_log%".',
        f'    echo [INFO] Command line: copilot --allow-all --model={model} --log-dir=logs --log-level=all %*',
        f'    copilot --allow-all --model={model} --log-dir=logs --log-level=all %*',
        ') > "%shell_log%" 2>&1',
        '',
        'endlocal',
        '',
    ]
    return '\r\n'.join(lines)

def write_text_if_changed(path, content):
    current = read_text_if_exists(path)
    if current == content:
        return
    with open(path, 'w', encoding='ascii', newline='') as f:
        f.write(content)

def normalize_workspace_launchers(root_dir, workspace, explicit_model=''):
    workspace_dir = resolve_workspace_dir(root_dir, workspace)
    model = explicit_model or load_workspace_model(root_dir, workspace) or read_run_bat_model(workspace_dir)
    if not model:
        model = 'claude-sonnet-4.6'
    write_text_if_changed(os.path.join(workspace_dir, 'run.bat'), build_run_bat_content(model))
    write_text_if_changed(os.path.join(workspace_dir, 'run_without_proxy.bat'), build_run_without_proxy_bat_content(model))
    write_text_if_changed(os.path.join(workspace_dir, 'export_log.bat'), build_export_log_bat_content(model))
    return model

def resolve_launcher(root_dir, workspace, launcher, use_proxy=True):
    if launcher:
        return os.path.abspath(launcher)

    workspace_dir = resolve_workspace_dir(root_dir, workspace)

    # Choose proxy or no-proxy launcher
    if not use_proxy:
        no_proxy_launcher = os.path.join(workspace_dir, 'run_without_proxy.bat')
        if os.path.exists(no_proxy_launcher):
            return no_proxy_launcher

    # Primary: resolved workspace/run.bat
    workspace_launcher = os.path.join(workspace_dir, 'run.bat')
    if os.path.exists(workspace_launcher):
        return workspace_launcher

    # Legacy fallback: resolved workspace/run-agent.bat
    workspace_launcher_legacy = os.path.join(workspace_dir, 'run-agent.bat')
    if os.path.exists(workspace_launcher_legacy):
        return workspace_launcher_legacy

    workspace_launcher = os.path.join(
        root_dir,
        f'run-copilotcli-workspace-{sanitize_workspace_name(workspace or "default")}.bat'
    )
    if os.path.exists(workspace_launcher):
        return workspace_launcher
    return os.path.join(root_dir, 'run-copilotcli-loop.bat')

def main():
    workspace = sys.argv[1] if len(sys.argv) > 1 else 'test'
    model     = sys.argv[2] if len(sys.argv) > 2 else ''
    # Check for --no-proxy flag (can be arg 3 or 4)
    use_proxy = '--no-proxy' not in sys.argv
    # launcher is a positional arg that is NOT --no-proxy
    launcher = ''
    for arg in sys.argv[3:]:
        if arg != '--no-proxy':
            launcher = arg
            break

    root_dir = os.path.dirname(os.path.abspath(__file__))
    model = normalize_workspace_launchers(root_dir, workspace, model)
    bat_file = resolve_launcher(root_dir, workspace, launcher, use_proxy)

    # Auto-discover model from workspace config when not explicitly provided
    if not model:
        model = load_workspace_model(root_dir, workspace)

    env = os.environ.copy()
    if model:
        env['COPILOTCLI_MODEL'] = model

    # Ensure PowerShell 7 (pwsh.exe) is findable regardless of inherited PATH.
    # The Copilot CLI explicitly invokes `pwsh.exe --version` to detect PS6+.
    ps7_dir = _find_pwsh7_dir()
    if ps7_dir:
        current_path = env.get('PATH', '')
        if ps7_dir.lower() not in current_path.lower():
            env['PATH'] = ps7_dir + os.pathsep + current_path

    # CREATE_NEW_CONSOLE gives the child process a real console (TTY).
    # Note: CREATE_NEW_CONSOLE and DETACHED_PROCESS are mutually exclusive on Windows;
    #       CREATE_NEW_CONSOLE alone is sufficient — the child owns its own console
    #       and will survive after this launcher exits.
    CREATE_NEW_CONSOLE = 0x00000010
    command = ['cmd.exe', '/c', bat_file]
    if os.path.basename(bat_file).lower() == 'run-copilotcli-loop.bat':
        command.extend(['-workspace', workspace])

    proc = subprocess.Popen(
        command,
        env=env,
        cwd=os.path.dirname(bat_file),
        creationflags=CREATE_NEW_CONSOLE,
        close_fds=True,
    )

    # Print PID so the Node caller can capture it
    print(proc.pid, flush=True)

if __name__ == '__main__':
    main()

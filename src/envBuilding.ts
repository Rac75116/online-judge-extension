import * as vscode from "vscode";
import { KnownError } from "./error";

const install_script = `
import io, zipfile, urllib.request, os, shutil, threading, subprocess, time

dest = os.path.join(os.path.expanduser("~/Desktop"), "Workspace")
if os.path.isdir(dest):
    shutil.rmtree(dest)
os.mkdir(dest)
print("Initialized the directory.")


def Install(name, parent, url, olddir, newdir):
    with (
        urllib.request.urlopen(url) as res,
        io.BytesIO(res.read()) as bytes_io,
        zipfile.ZipFile(bytes_io) as zip,
    ):
        print(f"Installed {name}.")
        new_dest = os.path.join(dest, parent, name)
        zip.extractall(new_dest)
        if olddir != "":
            src = os.path.join(new_dest, olddir)
            dst = os.path.join(dest, "lib", newdir)
            shutil.move(src, dst)
        print(f"Extracted the ZIP file of {name}.")


def InstallFromPip(name):
    subprocess.run(
        ["pip", "install", name], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
    )
    print(f"Installed {name}.")


def InstallFromPyPyPip(name):
    subprocess.run(
        [
            os.path.join(dest, "PyPy/pypy3.10-v7.3.19-win64/pypy.exe"),
            "-m",
            "pip",
            "install",
            name,
        ],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    print(f"Installed {name} in PyPy.")


def InstallVSCExt(id):
    subprocess.run(
        ["code", "--install-extension", id],
        shell=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    print(f"Installed {id}.")


def InstallPyPy():
    Install(
        "PyPy",
        "",
        "https://downloads.python.org/pypy/pypy3.10-v7.3.19-win64.zip",
        "",
        "",
    )
    subprocess.run(
        [os.path.join(dest, "PyPy/pypy3.10-v7.3.19-win64/pypy.exe"), "-m", "ensurepip"],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    print("pip has been activated in PyPy.")
    InstallFromPyPyPip("numpy")


def InstallTemplate():
    Install(
        "Template",
        "",
        "https://rac75116.github.io/downloads/KyoproTemplate.zip",
        "",
        "",
    )
    p = os.path.join(dest, "Template/KyoproTemplate")
    for name in os.listdir(p):
        shutil.move(os.path.join(p, name), dest)
    shutil.rmtree(os.path.join(dest, "Template"))


threads = []
threads.append(threading.Thread(target=InstallTemplate))
threads.append(threading.Thread(target=InstallPyPy))
threads.append(
    threading.Thread(
        target=Install,
        args=(
            "LLVM",
            "",
            "https://github.com/mstorsjo/llvm-mingw/releases/download/20250114/llvm-mingw-20250114-ucrt-x86_64.zip",
            "",
            "",
        ),
    )
)
threads.append(
    threading.Thread(
        target=Install,
        args=(
            "Boost",
            "download",
            "https://archives.boost.io/release/1.87.0/source/boost_1_87_0.zip",
            "boost_1_87_0/boost",
            "boost",
        ),
    )
)
threads.append(
    threading.Thread(
        target=Install,
        args=(
            "ac-library",
            "download",
            "https://github.com/atcoder/ac-library/archive/refs/heads/master.zip",
            "ac-library-master/atcoder",
            "atcoder",
        ),
    )
)
threads.append(
    threading.Thread(
        target=Install,
        args=(
            "GSHlib",
            "download",
            "https://github.com/Rac75116/GSHlib/archive/refs/heads/main.zip",
            "GSHlib-main/gsh",
            "gsh",
        ),
    )
)
threads.append(
    threading.Thread(
        target=Install,
        args=(
            "libcpprime",
            "download",
            "https://github.com/Rac75116/libcpprime/archive/refs/heads/main.zip",
            "libcpprime-main/libcpprime",
            "libcpprime",
        ),
    )
)
threads.append(
    threading.Thread(
        target=Install,
        args=(
            "Nyaan",
            "download",
            "https://github.com/NyaanNyaan/library/archive/refs/heads/master.zip",
            "library-master",
            "nyaan",
        ),
    )
)
threads.append(
    threading.Thread(
        target=Install,
        args=(
            "ei1333",
            "download",
            "https://github.com/ei1333/library/archive/refs/heads/master.zip",
            "library-master",
            "ei1333",
        ),
    )
)
threads.append(
    threading.Thread(
        target=Install,
        args=(
            "Nachia",
            "download",
            "https://github.com/NachiaVivias/cp-library/archive/refs/heads/main.zip",
            "cp-library-main/Cpp/Include/nachia",
            "nachia",
        ),
    )
)
threads.append(
    threading.Thread(
        target=Install,
        args=(
            "noshi91",
            "download",
            "https://github.com/noshi91/Library/archive/refs/heads/master.zip",
            "Library-master",
            "noshi91",
        ),
    )
)
threads.append(
    threading.Thread(
        target=Install,
        args=(
            "shiomusubi496",
            "download",
            "https://github.com/shiomusubi496/library/archive/refs/heads/main.zip",
            "library-main",
            "shiomusubi496",
        ),
    )
)
threads.append(
    threading.Thread(
        target=Install,
        args=(
            "maspy",
            "download",
            "https://github.com/maspypy/library/archive/refs/heads/main.zip",
            "library-main",
            "maspy",
        ),
    )
)
threads.append(threading.Thread(target=InstallFromPip, args=("numpy",)))
threads.append(threading.Thread(target=InstallFromPip, args=("psutil",)))
threads.append(
    threading.Thread(target=InstallVSCExt, args=("akamud.vscode-theme-onedark",))
)
threads.append(
    threading.Thread(target=InstallVSCExt, args=("formulahendry.code-runner",))
)
threads.append(threading.Thread(target=InstallVSCExt, args=("charliermarsh.ruff",)))
threads.append(threading.Thread(target=InstallVSCExt, args=("esbenp.prettier-vscode",)))
threads.append(
    threading.Thread(target=InstallVSCExt, args=("ms-ceintl.vscode-language-pack-ja",))
)
threads.append(
    threading.Thread(
        target=InstallVSCExt, args=("llvm-vs-code-extensions.vscode-clangd",)
    )
)
threads.append(threading.Thread(target=InstallVSCExt, args=("ms-python.python",)))
threads.append(threading.Thread(target=InstallVSCExt, args=("ms-vscode.cpptools",)))
threads.append(threading.Thread(target=InstallVSCExt, args=("usernamehw.errorlens",)))
threads.append(threading.Thread(target=InstallVSCExt, args=("vadimcn.vscode-lldb",)))
threads.append(
    threading.Thread(target=InstallVSCExt, args=("vscode-icons-team.vscode-icons",))
)
for thr in threads:
    thr.start()
    time.sleep(0.05)
for thr in threads:
    thr.join()
shutil.rmtree(os.path.join(dest, "download"))
print("Finished: " + dest)
`;

export const envBuilding_command = vscode.commands.registerCommand("oj-ext.envBuilding", async () => {
    const userHome = process.env[process.platform === "win32" ? "USERPROFILE" : "HOME"];
    if (userHome === undefined) {
        throw new KnownError("Failed to get the DESKTOP path.");
    }
    const path = vscode.Uri.joinPath(vscode.Uri.file(userHome), "Desktop", "oj-ext-env-builder.py");
    await vscode.workspace.fs.writeFile(path, new TextEncoder().encode(install_script));
    vscode.commands.executeCommand("oj-ext.setup");
    const terminal = vscode.window.createTerminal();
    terminal.show();
    terminal.sendText(`python -u ${path.fsPath}`, true);
});

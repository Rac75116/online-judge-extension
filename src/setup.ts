import * as vscode from "vscode";
import * as os from "node:os";
import { check_oj_api_version, check_oj_verify_version, check_oj_version, check_py_version, has_selenium } from "./checker";
import { exec_async, catch_error, file_exists } from "./global";
import { UnknownError } from "./error";

export async function setup(reporter: (increment: number) => void) {
    const increment_width = 100 / 18;
    const install_dir = vscode.Uri.joinPath(vscode.Uri.file(os.homedir()), "./.oj-ext/setup");
    if (await file_exists(install_dir.fsPath)) {
        await vscode.workspace.fs.delete(install_dir, { recursive: true });
    }
    await vscode.workspace.fs.createDirectory(install_dir);
    const sleep = (msec: number) => new Promise((resolve) => setTimeout(resolve, msec));
    const commands1 = [
        "pip3 uninstall -y online-judge-api-client",
        "pip3 uninstall -y online-judge-tools",
        "pip3 uninstall -y online-judge-verify-helper",
        "pip3 install -U selenium",
        "pip3 install -U setuptools",
        "pip3 install online-judge-api-client",
        "pip3 install online-judge-tools",
        "pip3 install online-judge-verify-helper",
        "pip3 install python-minifier",
    ];
    for (const command of commands1) {
        const { error, stdout, stderr } = await exec_async(command, true);
        if (error) {
            throw new UnknownError("Something went wrong.");
        }
        reporter(increment_width);
        await sleep(300);
    }
    const download_zip = async (url: string, filename: string) => {
        const res = await fetch(url);
        const filepath = vscode.Uri.joinPath(install_dir, filename);
        await vscode.workspace.fs.writeFile(filepath, new Uint8Array(await res.arrayBuffer()));
        reporter(increment_width);
    };
    const install_zip = async (filename: string) => {
        const filepath = vscode.Uri.joinPath(install_dir, filename);
        const { error, stdout, stderr } = await exec_async(`pip3 install -U --no-deps --force-reinstall "${filepath.fsPath}"`, true);
        if (error) {
            throw new UnknownError("Something went wrong.");
        }
        reporter(increment_width);
        await sleep(300);
    };
    try {
        const promise_api_client = download_zip("https://github.com/online-judge-tools/api-client/archive/refs/heads/master.zip", "api-client.zip");
        const promise_oj = download_zip("https://github.com/online-judge-tools/oj/archive/refs/heads/master.zip", "oj.zip");
        const promise_verify = download_zip("https://github.com/online-judge-tools/verification-helper/archive/refs/heads/master.zip", "verification-helper.zip");
        await Promise.all([promise_api_client, promise_oj, promise_verify]);
        await sleep(100);
        await install_zip("api-client.zip");
        await install_zip("oj.zip");
        await install_zip("verification-helper.zip");
    } catch (e: any) {
        throw e;
    } finally {
        await vscode.workspace.fs.delete(install_dir, { recursive: true });
    }
    await check_oj_version(true);
    reporter(increment_width);
    await check_oj_api_version(true);
    reporter(increment_width);
    await check_oj_verify_version(true);
    reporter(increment_width);
    await has_selenium(true);
    reporter(increment_width);
}

export const setup_command = vscode.commands.registerCommand("oj-ext.setup", async () => {
    await catch_error("setup", async () => {
        await check_py_version();

        await vscode.window.withProgress(
            {
                title: `Setup`,
                location: vscode.ProgressLocation.Notification,
                cancellable: false,
            },
            async (progress) => {
                return new Promise(async (resolve, reject) => {
                    progress.report({ message: "Installing...", increment: 0 });
                    try {
                        await setup((increment) => {
                            progress.report({ message: "Installing...", increment: increment });
                        });
                    } catch (error) {
                        reject(error);
                        return;
                    }
                    resolve(null);
                });
            }
        );
        await vscode.window.showInformationMessage("Everything needed is now installed.");
    });
});

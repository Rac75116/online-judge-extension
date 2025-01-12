import * as vscode from "vscode";
import { check_py_version } from "./checker";
import { async_exec } from "./global";

export async function setup(reporter: (increment: number) => void) {
    const sleep = (msec: number) => new Promise((resolve) => setTimeout(resolve, msec));
    const commands = [
        "pip3 uninstall -y online-judge-api-client",
        "pip3 uninstall -y online-judge-tools",
        "pip3 uninstall -y online-judge-verify-helper",
        "pip3 install -U selenium",
        "pip3 install -U setuptools",
        "pip3 install online-judge-api-client",
        "pip3 install online-judge-tools",
        "pip3 install online-judge-verify-helper",
        "pip3 install -U --no-deps --force-reinstall git+https://github.com/online-judge-tools/api-client.git",
        "pip3 install -U --no-deps --force-reinstall git+https://github.com/online-judge-tools/oj.git",
        "pip3 install -U --no-deps --force-reinstall git+https://github.com/online-judge-tools/verification-helper.git",
        "oj -h",
        "oj-api -h",
        "oj-verify -h",
        "oj-bundle -h",
    ];
    for (const command of commands) {
        const { error, stdout, stderr } = await async_exec(command);
        if (stdout !== "") {
            console.log(stdout);
        }
        if (stderr !== "") {
            console.error(stderr);
        }
        if (error) {
            throw new Error("Something went wrong during the installation.");
        }
        reporter(100 / commands.length);
        await sleep(500);
    }
}

export const setup_command = vscode.commands.registerCommand("online-judge-extension.setup", async () => {
    if (!(await check_py_version())) {
        return;
    }
    vscode.window.withProgress(
        {
            title: `Setup`,
            location: vscode.ProgressLocation.Notification,
            cancellable: false,
        },
        async (progress) => {
            return new Promise(async (resolve) => {
                progress.report({ message: "Installing...", increment: 0 });
                await setup((increment) => {
                    progress.report({ message: "Installing...", increment: increment });
                });
                progress.report({ message: "Everything needed is now installed." });
                setTimeout(() => resolve(null), 5000);
            });
        }
    );
});

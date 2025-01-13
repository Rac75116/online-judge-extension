import * as vscode from "vscode";
import { services, service_url, async_exec, select_service } from "./global";
import { has_selenium, check_oj_version } from "./checker";

export async function login_service(service: number, use_selenium: boolean | any) {
    const url = service_url[service];
    const { error, stdout, stderr } = await async_exec(`oj login --check ${url}`);
    if (stdout !== "") {
        console.log(stdout);
    }
    if (stderr !== "") {
        console.error(stderr);
    }
    if (!error) {
        vscode.window.showInformationMessage("You have already signed in.");
        return;
    }
    if (use_selenium) {
        await vscode.window.withProgress(
            {
                title: `Login`,
                location: vscode.ProgressLocation.Notification,
                cancellable: false,
            },
            async (progress) => {
                return new Promise(async (resolve, reject) => {
                    progress.report({ message: "Prease wait a moment..." });
                    let ended = false;
                    setTimeout(() => !ended && progress.report({ message: "The process ends automatically when the window is closed." }), 3000);
                    const { error, stdout, stderr } = await async_exec(`oj login --use-browser always ${url}`);
                    ended = true;
                    if (stdout !== "") {
                        console.log(stdout);
                    }
                    if (stderr !== "") {
                        console.error(stderr);
                    }
                    if (error) {
                        reject(new Error(stdout.includes("[FAILURE] You are not signed in.") ? "You are not signed in." : "Something went wrong."));
                        return;
                    }
                    resolve(null);
                    vscode.window.showInformationMessage("Signed in successfully.");
                });
            }
        );
    } else {
        if (service !== services.Codeforces) {
            throw new Error('Cannot sign in because Selenium is not installed. Run "pip3 install selenium".');
        }
        const user = await vscode.window.showInputBox({
            ignoreFocusOut: true,
            prompt: "Enter your username.",
        });
        const pass = await vscode.window.showInputBox({
            ignoreFocusOut: true,
            password: true,
            prompt: "Enter your password.",
        });
        const { error, stdout, stderr } = await async_exec(`oj login -u ${user} -p ${pass} --use-browser never ${url}`);
        if (stdout !== "") {
            console.log(stdout);
        }
        if (stderr !== "") {
            console.error(stderr);
        }
        if (error) {
            if (stdout.includes("Username or Password is incorrect.")) {
                throw new Error("Username or Password is incorrect.");
            } else if (stdout.includes("Invalid handle or password.")) {
                throw new Error("Invalid handle or password.");
            } else {
                throw new Error("Something went wrong.");
            }
        }
        vscode.window.showInformationMessage("Signed in successfully.");
    }
}

export const login_command = vscode.commands.registerCommand("online-judge-extension.login", async () => {
    const info = await Promise.all([check_oj_version(), has_selenium()]);
    if (!info[0]) {
        return;
    }
    const service = await select_service([services.Atcoder, /* services.Codeforces, */ services.HackerRank, services.Toph, services.yukicoder]);
    if (service === undefined) {
        return;
    }
    login_service(service, info[1]);
});

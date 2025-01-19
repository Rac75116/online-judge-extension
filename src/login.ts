import * as vscode from "vscode";
import { services, service_url, async_exec, select_service, catch_error } from "./global";
import { has_selenium, check_oj_version, check_py_version } from "./checker";
import { EnvironmentError, KnownError, UnknownError } from "./error";

export async function login_service(service: number, use_selenium: boolean) {
    const url = service_url[service];
    const { error, stdout, stderr } = await async_exec(`oj login --check ${url}`, true);
    if (!error) {
        vscode.window.showInformationMessage("login: You have already signed in.");
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
                    const { error, stdout, stderr } = await async_exec(`oj login --use-browser always ${url}`, true);
                    ended = true;
                    if (error) {
                        if (stdout.includes("[FAILURE] You are not signed in.")) {
                            reject(new KnownError("You are not signed in."));
                        } else {
                            reject(new UnknownError("Something went wrong."));
                        }
                        return;
                    }
                    resolve(null);
                    vscode.window.showInformationMessage("login: Signed in successfully.");
                });
            }
        );
    } else {
        if (service !== services.AtCoder) {
            throw new EnvironmentError("Cannot sign in because Selenium is not installed.");
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
        const { error, stdout, stderr } = await async_exec(`oj login -u ${user} -p ${pass} --use-browser never ${url}`, true);
        if (error) {
            if (stdout.includes("Username or Password is incorrect.")) {
                throw new KnownError("Username or Password is incorrect.");
            } else if (stdout.includes("Invalid handle or password.")) {
                throw new KnownError("Invalid handle or password.");
            } else {
                throw new UnknownError("Something went wrong.");
            }
        }
        vscode.window.showInformationMessage("login: Signed in successfully.");
    }
}

export const login_command = vscode.commands.registerCommand("oj-ext.login", async () => {
    await catch_error("login", async () => {
        await check_py_version();
        await check_oj_version();

        const selenium = await has_selenium();
        const service = await select_service([services.Atcoder, /* services.Codeforces, */ services.HackerRank, services.Toph, services.yukicoder]);
        if (service === undefined) {
            return;
        }
        await login_service(service, selenium);
    });
});

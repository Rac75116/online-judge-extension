import * as vscode from "vscode";
import { exec_async, catch_error } from "./global";
import { check_oj_version, check_py_version } from "./checker";
import { UnknownError } from "./error";

export async function remove_cookie() {
    const { error, stdout, stderr } = await exec_async(`oj -h`, true);
    if (error) {
        throw new UnknownError("Something went wrong.");
    }
    const cookie_path = stdout.match(/path to cookie\. \(default: (.+?)\)/)?.[1];
    if (cookie_path === undefined) {
        throw new UnknownError("Something went wrong.");
    }
    await vscode.workspace.fs.delete(vscode.Uri.file(cookie_path));
}

export const logout_command = vscode.commands.registerCommand("oj-ext.logout", async () => {
    await catch_error("logout", async () => {
        await check_py_version();
        await check_oj_version();

        const selection = await vscode.window.showInformationMessage("oj-ext: This command signs you out of the all services. Are you sure?", "OK", "cancel");
        if (selection !== "OK") {
            return;
        }
        await remove_cookie();
        vscode.window.showInformationMessage("oj-ext: Signed out successfully.");
    });
});

import * as vscode from "vscode";
import * as fs from "node:fs";
import { async_exec } from "./global";

export async function remove_cookie() {
    const { error, stdout, stderr } = await async_exec(`oj -h`);
    if (stdout !== "") {
        console.log(stdout);
    }
    if (stderr !== "") {
        console.error(stderr);
    }
    if (error) {
        throw new Error("Something went wrong.");
    }
    const cookie_path = stdout.match(/path to cookie\. \(default: (.+?)\)/)?.[1];
    if (cookie_path === undefined) {
        throw new Error("Something went wrong.");
    }
    try {
        fs.unlinkSync(cookie_path);
    } catch {}
}

export const logout_command = vscode.commands.registerCommand("online-judge-extension.logout", async () => {
    const selection = await vscode.window.showInformationMessage("This command signs you out of the all services. Are you sure?", "continue", "cancel");
    if (selection !== "continue") {
        return;
    }
    await remove_cookie();
    vscode.window.showInformationMessage("Signed out successfully.");
});

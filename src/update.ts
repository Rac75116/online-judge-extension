import * as vscode from "vscode";
import { check_oj_api_version, check_py_version } from "./checker";
import { catch_error } from "./global";

export const update_command = vscode.commands.registerCommand("oj-ext.update", async (target_directory: vscode.Uri) => {
    await catch_error("update", async () => {
        await check_py_version();
        await check_oj_api_version();
    });
});

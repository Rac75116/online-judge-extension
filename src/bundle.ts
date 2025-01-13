import * as vscode from "vscode";
import * as path from "node:path";
import * as copyPaste from "copy-paste";
import { get_config_checking, async_exec } from "./global";
import { check_oj_verify_version } from "./checker";
import { format_code } from "./format";

export function hide_filepath(code: string) {
    return code.replaceAll(/#line\s(\d+)\sR?".*"/g, "#line $1");
}

export function erase_line_directives(code: string) {
    return code.replaceAll(/#line\s\d+(\sR?".*")?/g, "");
}

export async function bundle_code(target: vscode.Uri) {
    const config_include_path = get_config_checking<string[]>("includePath");
    const config_hide_path = get_config_checking<boolean>("hidePath");
    const config_erase_line_directives = get_config_checking<boolean>("eraseLineDirectives");
    const { error, stdout, stderr } = await async_exec(`cd ${path.dirname(target.fsPath)} && oj-bundle ${target.fsPath}${config_include_path.map((value) => " -I " + value).join("")}`);
    if (stderr !== "") {
        console.error(stderr);
    }
    if (error) {
        throw new Error("Failed to bundle the file.");
    }
    return "/* This code was bundled by `oj-bundle` and `online-judge-extension`. */\n" + (config_erase_line_directives ? erase_line_directives(stdout) : config_hide_path ? hide_filepath(stdout) : stdout);
}

export const bundle_command = vscode.commands.registerCommand("online-judge-extension.bundle", async (target_file: vscode.Uri) => {
    if (!(await check_oj_verify_version())) {
        return;
    }

    await vscode.window.withProgress(
        {
            title: `Bundling ${path.basename(target_file.fsPath)}`,
            location: vscode.ProgressLocation.Notification,
            cancellable: false,
        },
        async (progress) => {
            return new Promise(async (resolve, reject) => {
                let interval: any;
                let loopCounter = 1;
                progress.report({ message: "working." });
                interval = setInterval(() => {
                    loopCounter++;
                    if (loopCounter > 3) {
                        loopCounter = 1;
                    }
                    progress.report({ message: "working" + ".".repeat(loopCounter) });
                }, 300);
                try {
                    let bundled: string;
                    bundled = await bundle_code(target_file);
                    bundled = await format_code(path.dirname(target_file.fsPath), bundled);
                    copyPaste.copy(bundled, () => {
                        clearInterval(interval);
                        progress.report({ message: "copied to clipboard." });
                        setTimeout(() => resolve(null), 2500);
                    });
                } catch (error) {
                    reject(error);
                    return;
                }
            });
        }
    );
});

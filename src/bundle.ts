import * as vscode from "vscode";
import * as path from "node:path";
import * as copyPaste from "copy-paste";
import { get_config_checking, async_exec, catch_error } from "./global";
import { check_oj_verify_version, check_py_version } from "./checker";
import { format_code } from "./format";
import { UnknownError } from "./error";

export function hide_filepath(code: string) {
    return code.replaceAll(/#line\s(\d+)\sR?".*"/g, "#line $1");
}

export function erase_line_directives(code: string) {
    return code.replaceAll(/#line\s\d+(\sR?".*")?/g, "");
}

export async function bundle_code(target_file: string) {
    const config_include_path = get_config_checking<string[]>("includePath");
    const config_hide_path = get_config_checking<boolean>("hidePath");
    const config_erase_line_directives = get_config_checking<boolean>("eraseLineDirectives");
    const { error, stdout, stderr } = await async_exec(`cd ${path.dirname(target_file)} && oj-bundle ${target_file}${config_include_path.map((value) => " -I " + value).join("")}`);
    if (stderr !== "") {
        console.error(stderr);
    }
    if (error) {
        throw new UnknownError("Something went wrong.");
    }
    return "/* This code was bundled by `oj-bundle` and `online-judge-extension`. */\n" + (config_erase_line_directives ? erase_line_directives(stdout) : config_hide_path ? hide_filepath(stdout) : stdout);
}

export const bundle_command = vscode.commands.registerCommand("oj-ext.bundle", async (target_file: vscode.Uri) => {
    await catch_error("bundle", async () => {
        await check_py_version();
        await check_oj_verify_version();

        await vscode.window.withProgress(
            {
                title: `Bundling ${path.basename(target_file.fsPath)}`,
                location: vscode.ProgressLocation.Notification,
                cancellable: false,
            },
            async (progress) => {
                return new Promise(async (resolve, reject) => {
                    try {
                        progress.report({ message: "Bundling..." });
                        let bundled = await bundle_code(target_file.fsPath);
                        progress.report({ message: "Formatting..." });
                        bundled = await format_code(path.dirname(target_file.fsPath), bundled);
                        progress.report({ message: "Copying..." });
                        copyPaste.copy(bundled, () => {
                            progress.report({ message: "Copied to clipboard." });
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
});

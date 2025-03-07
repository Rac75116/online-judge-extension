import * as vscode from "vscode";
import * as path from "node:path";
import { get_config_checking, exec_async, catch_error, expand_variables, get_language, replace_async, normalize } from "./global";
import { check_oj_verify_version, check_py_version } from "./checker";
import { minify_code } from "./minify";
import { KnownError, UnknownError } from "./error";

export function hide_filepath(code: string) {
    return code.replaceAll(/#line\s(\d+)\sR?".*"/g, "#line $1");
}

export function erase_line_directives(code: string) {
    return code.replaceAll(/#line\s\d+(\sR?".*")?/g, "");
}

async function bundle_cxx_code(target_file: string) {
    const config_include_path = get_config_checking<string[]>("includePath");
    const config_hide_path = get_config_checking<boolean>("hidePath");
    const config_erase_line_directives = get_config_checking<boolean>("eraseLineDirectives");
    const { error, stdout, stderr } = await exec_async(`cd ${path.dirname(target_file)} && oj-bundle ${target_file}${config_include_path.map((value) => " -I " + expand_variables(value)).join("")}`);
    if (stderr !== "") {
        console.error(stderr);
    }
    if (error) {
        throw new UnknownError("Something went wrong.");
    }
    return config_erase_line_directives ? erase_line_directives(stdout) : config_hide_path ? hide_filepath(stdout) : stdout;
}

async function bundle_py_code_rec(target_file: string, bundled: Set<string>) {
    const code = new TextDecoder().decode(await vscode.workspace.fs.readFile(vscode.Uri.file(target_file)));
    const result = await replace_async(code, /from\s+(.+)\s+import\s+[\s\S]+\s+#\s+!oj-ext\s+import\s+(.+)/gm, async (match: string, name: string, ipath: string) => {
        ipath = expand_variables(ipath);
        const npath = path.normalize(path.isAbsolute(ipath) ? ipath : vscode.Uri.joinPath(vscode.Uri.file(path.dirname(target_file)), ipath).fsPath);
        console.log(npath);
        if (bundled.has(npath)) {
            return "";
        }
        bundled.add(npath);
        const sub = await bundle_py_code_rec(npath, bundled);
        return `# begin import ${name}\n` + sub.trim() + `\n# end import ${name}`;
    });
    return result;
}

async function bundle_py_code(target_file: string) {
    const bundled = new Set<string>();
    const tpath = normalize(target_file, "");
    bundled.add(tpath);
    return bundle_py_code_rec(tpath, bundled);
}

export async function bundle_code(target_file: string) {
    const lang = get_language(path.extname(target_file));
    if (lang === "c++" || lang === "c") {
        return bundle_cxx_code(target_file);
    } else if (lang === "python") {
        return bundle_py_code(target_file);
    } else {
        throw new KnownError("This language is not supported by `oj-ext.bundle`.");
    }
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
                        const config_minify = get_config_checking<boolean>("minify");
                        if (config_minify) {
                            progress.report({ message: "Minifying..." });
                            bundled = await minify_code(bundled, path.extname(target_file.fsPath));
                        }
                        progress.report({ message: "Copying..." });
                        const dst = get_config_checking<string>("bundledFileDestination");
                        if (dst === "clipboard") {
                            await vscode.env.clipboard.writeText(bundled);
                            progress.report({ message: "Copied to clipboard." });
                            setTimeout(() => resolve(null), 2500);
                        } else {
                            await vscode.workspace.fs.writeFile(vscode.Uri.file(expand_variables(dst)), new TextEncoder().encode(bundled));
                            progress.report({ message: `Copied to ${path.basename(dst)}.` });
                            setTimeout(() => resolve(null), 2500);
                        }
                    } catch (error) {
                        reject(error);
                        return;
                    }
                });
            }
        );
    });
});

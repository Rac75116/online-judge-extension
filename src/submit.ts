import * as vscode from "vscode";
import * as path from "node:path";
import * as os from "node:os";
import { check_oj_version, check_py_version } from "./checker";
import { get_config_checking, exec_async, catch_error, random_id, get_language } from "./global";
import { bundle_code, erase_line_directives, hide_filepath } from "./bundle";
import { minify_code } from "./minify";
import { UnknownError } from "./error";

export async function submit_code(target: string, problem: string, reporter: (message: string) => void) {
    const config_cxx_latest = get_config_checking<boolean>("guessC++Latest");
    const config_cxx_compiler = get_config_checking<string>("guessC++Compiler");
    const config_py_version = get_config_checking<string>("guessPythonVersion");
    const config_py_interpreter = get_config_checking<string>("guessPythonInterpreter");
    const config_bundle = get_config_checking<boolean>("bundleBeforeSubmission");
    const config_open_brower = get_config_checking<boolean>("openBrowser");
    const config_minify = get_config_checking<boolean>("minify");
    const cxx_latest = config_cxx_latest ? "--guess-cxx-latest" : "--no-guess-latest";
    const cxx_compiler = "--guess-cxx-compiler " + (config_cxx_compiler === "GCC" ? "gcc" : config_cxx_compiler === "Clang" ? "clang" : "all");
    const py_version = "--guess-python-version " + (config_py_version === "Python2" ? "2" : config_py_version === "Python3" ? "3" : config_py_version === "Auto" ? "auto" : "all");
    const py_interpreter = "--guess-python-interpreter " + (config_py_interpreter === "CPython" ? "cpython" : config_py_interpreter === "PyPy" ? "pypy" : "all");
    const open_brower = config_open_brower ? "--open" : "--no-open";

    const lang = get_language(path.extname(target));
    let code = "";
    if (config_bundle && (lang === "c++" || lang === "c" || lang === "python")) {
        reporter("Bundling...");
        code = await bundle_code(target);
        if (config_minify) {
            reporter("Minifying...");
            code = await minify_code(code, ".cpp");
        }
    } else {
        reporter("Bundling...");
        code = new TextDecoder().decode(await vscode.workspace.fs.readFile(vscode.Uri.file(target)));
        if (lang === "c++" || lang === "c") {
            const config_erase_line_directives = get_config_checking<boolean>("eraseLineDirectives");
            const config_hide_path = get_config_checking<boolean>("hidePath");
            if (config_erase_line_directives || config_hide_path) {
                code = config_erase_line_directives ? erase_line_directives(code) : hide_filepath(code);
            }
        }
        if (config_minify) {
            reporter("Minifying...");
            code = await minify_code(code, path.extname(target));
        }
    }
    const new_target = vscode.Uri.joinPath(vscode.Uri.file(os.homedir()), `./.oj-ext/submit/${random_id(32)}/submission${path.extname(target)}`);
    await vscode.workspace.fs.writeFile(new_target, new TextEncoder().encode(code));
    reporter("Submitting...");
    const { error, stdout, stderr } = await exec_async(`oj submit --wait 0 --yes ${cxx_latest} ${cxx_compiler} ${py_version} ${py_interpreter} ${open_brower} ${problem} ${new_target}`, true);
    await vscode.workspace.fs.delete(vscode.Uri.file(path.dirname(new_target.fsPath)), { recursive: true });
    if (error) {
        throw new UnknownError("Something went wrong.");
    }
}

export const submit_command = vscode.commands.registerCommand("oj-ext.submit", async (target_file: vscode.Uri) => {
    await catch_error("submit", async () => {
        await check_py_version();
        await check_oj_version();

        const problem_url = await vscode.window.showInputBox({
            ignoreFocusOut: true,
            placeHolder: "e.g. https://codeforces.com/contest/1606/problem/A",
            prompt: "Enter the problem url.",
        });
        if (problem_url === undefined) {
            return;
        }
        await vscode.window.withProgress(
            {
                title: `Submit`,
                location: vscode.ProgressLocation.Notification,
                cancellable: false,
            },
            async (progress) => {
                return new Promise(async (resolve, reject) => {
                    progress.report({ message: "Waiting..." });
                    try {
                        await submit_code(target_file.fsPath, problem_url, (message) => {
                            progress.report({ message: message });
                        });
                    } catch (error) {
                        reject(error);
                        return;
                    }
                    progress.report({ message: "Successfully submitted." });
                    setTimeout(() => resolve(null), 2500);
                });
            }
        );
    });
});

import * as vscode from "vscode";
import * as path from "node:path";
import { check_oj_version } from "./checker";
import { get_config_checking, async_exec, catch_error } from "./global";
import { bundle_code, erase_line_directives, hide_filepath } from "./bundle";
import { format_code } from "./format";

export async function submit_code(target: vscode.Uri, problem: string, reporter: (message: string) => void) {
    reporter("Getting settings...");
    const config_cxx_latest = get_config_checking<boolean>("guessC++Latest");
    const config_cxx_compiler = get_config_checking<string>("guessC++Compiler");
    const config_py_version = get_config_checking<string>("guessPythonVersion");
    const config_py_interpreter = get_config_checking<string>("guessPythonInterpreter");
    const config_bundle = get_config_checking<boolean>("bundleBeforeSubmission");
    const config_open_brower = get_config_checking<boolean>("openBrowser");
    if (config_cxx_latest === undefined || config_cxx_compiler === undefined || config_py_version === undefined || config_py_interpreter === undefined || config_bundle === undefined || config_open_brower === undefined) {
        return;
    }
    const cxx_latest = config_cxx_latest ? "--guess-cxx-latest" : "--no-guess-latest";
    const cxx_compiler = "--guess-cxx-compiler " + (config_cxx_compiler === "GCC" ? "gcc" : config_cxx_compiler === "Clang" ? "clang" : "all");
    const py_version = "--guess-python-version " + (config_py_version === "Python2" ? "2" : config_py_version === "Python3" ? "3" : config_py_version === "Auto" ? "auto" : "all");
    const py_interpreter = "--guess-python-interpreter " + (config_py_interpreter === "CPython" ? "cpython" : config_py_interpreter === "PyPy" ? "pypy" : "all");
    const open_brower = config_open_brower ? "--open" : "--no-open";

    const is_cxx = [".c", ".C", ".cc", ".cp", ".cpp", ".cxx", ".c++", ".h", ".H", ".hh", ".hp", ".hpp", ".hxx", ".h++"].includes(path.extname(target.fsPath));
    if (config_bundle && is_cxx) {
        reporter("Bundling...");
        let bundled = await bundle_code(target);
        reporter("Formatting...");
        bundled = await format_code(path.dirname(target.fsPath), bundled);
        target = vscode.Uri.joinPath(target, `../${path.basename(target.fsPath)}.bundled${path.extname(target.fsPath)}`);
        await vscode.workspace.fs.writeFile(target, new TextEncoder().encode(bundled));
    } else {
        const config_erase_line_directives = get_config_checking<boolean>("eraseLineDirectives");
        const config_hide_path = get_config_checking<boolean>("hidePath");
        if (config_erase_line_directives || config_hide_path) {
            reporter("Bundling...");
            let code = new TextDecoder().decode(await vscode.workspace.fs.readFile(target));
            const new_target = vscode.Uri.joinPath(target, `../${path.basename(target.fsPath)}.bundled${path.extname(target.fsPath)}`);
            code = config_erase_line_directives ? erase_line_directives(code) : hide_filepath(code);
            reporter("Formatting...");
            code = await format_code(path.dirname(target.fsPath), code);
            await vscode.workspace.fs.writeFile(new_target, new TextEncoder().encode(code));
            target = new_target;
        } else {
            reporter("Formatting...");
            let code = new TextDecoder().decode(await vscode.workspace.fs.readFile(target));
            const new_target = vscode.Uri.joinPath(target, `../${path.basename(target.fsPath)}.bundled${path.extname(target.fsPath)}`);
            code = await format_code(path.dirname(target.fsPath), code);
            await vscode.workspace.fs.writeFile(new_target, new TextEncoder().encode(code));
            target = new_target;
        }
    }
    reporter("Submitting...");
    const { error, stdout, stderr } = await async_exec(`oj submit --wait 0 --yes ${cxx_latest} ${cxx_compiler} ${py_version} ${py_interpreter} ${open_brower} ${problem} ${target.fsPath}`);
    vscode.workspace.fs.delete(target);
    if (stdout !== "") {
        console.log(stdout);
    }
    if (stderr !== "") {
        console.error(stderr);
    }
    if (error) {
        throw new Error("Something went wrong.");
    }
}

export const submit_command = vscode.commands.registerCommand("online-judge-extension.submit", async (target_file: vscode.Uri) => {
    await catch_error("submit", async () => {
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
                        await submit_code(target_file, problem_url, (message) => {
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

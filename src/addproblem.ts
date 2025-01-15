import * as vscode from "vscode";
import { check_oj_api_version } from "./checker";
import { get_template, file_exists, make_file_folder_name, async_exec } from "./global";

export async function get_problem_data(url: string) {
    if (url.includes("judge.yosupo.jp")) {
        vscode.window.showInformationMessage("Please wait a moment...");
    }
    const { error, stdout, stderr } = await async_exec(`oj-api --wait=0.0 get-problem ${url}`);
    if (stdout !== "") {
        console.log(stdout);
    }
    if (stderr !== "") {
        console.error(stderr);
    }
    if (error) {
        throw new Error("Something went wrong.");
    }
    const problem = JSON.parse(stdout);
    let name = "";
    if ("name" in problem.result) {
        name = problem.result.name;
    } else {
        if (problem.result.url.startsWith("http://judge.u-aizu.ac.jp")) {
            name = problem.result.url.split("=").at(-1);
        } else if (problem.result.url.startsWith("http://golf.shinh.org")) {
            name = problem.result.url.split("?").at(-1).replaceAll("+", " ");
        } else if (problem.result.url.startsWith("https://csacademy.com")) {
            name = problem.result.url.split("/").at(-2);
        } else if (problem.result.url.startsWith("https://www.facebook.com")) {
            const v = problem.result.url.split("/");
            name = v.at(-4) + "-" + v.at(-3) + "-" + v.at(-1);
        } else if (problem.result.url.startsWith("http://poj.org/")) {
            name = problem.result.url.split("?").at(-1);
        } else {
            name = problem.result.url.split("/").at(-1);
        }
    }
    return { problem, name };
}

export const addproblem_command = vscode.commands.registerCommand("online-judge-extension.addproblem", async (target_directory: vscode.Uri) => {
    if (!(await check_oj_api_version())) {
        return;
    }

    const template = await get_template();
    if (template === undefined) {
        return;
    }
    const [template_uri, file_or_command] = template;
    if (await file_exists(vscode.Uri.joinPath(target_directory, "contest.oj-ext.json"))) {
        vscode.window.showErrorMessage("Something went wrong.");
        return;
    }

    const problem_url = await vscode.window.showInputBox({
        ignoreFocusOut: true,
        placeHolder: "ex) https://codeforces.com/contest/1606/problem/A",
        prompt: "Enter the problem url.",
    });
    if (problem_url === undefined || problem_url === "") {
        return;
    }
    const { problem, name } = await get_problem_data(problem_url);
    const dir = vscode.Uri.joinPath(target_directory, make_file_folder_name(name));
    await vscode.workspace.fs.createDirectory(dir);
    vscode.workspace.fs.writeFile(vscode.Uri.joinPath(dir, "problem.oj-ext.json"), new TextEncoder().encode(JSON.stringify(problem, null, 4)));
    const file = vscode.Uri.joinPath(dir, file_or_command);
    if (template_uri === undefined) {
        vscode.workspace.fs.writeFile(file, new Uint8Array());
    } else {
        vscode.workspace.fs.copy(template_uri, file);
    }
});

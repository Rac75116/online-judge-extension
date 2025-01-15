import * as vscode from "vscode";
import * as path from "path";
import { check_oj_api_version } from "./checker";
import { file_exists, get_template, service_url, services } from "./global";
import { get_contest_data } from "./createdir";

export const update_command = vscode.commands.registerCommand("online-judge-extension.update", async (target_directory: vscode.Uri) => {
    if (!(await check_oj_api_version())) {
        return;
    }

    if (await file_exists(vscode.Uri.joinPath(target_directory, "contest.oj-ext.json"))) {
        const template = await get_template();
        if (template === undefined) {
            return;
        }
        const [template_uri, file_or_command] = template;

        const url: string = JSON.parse((await vscode.workspace.fs.readFile(vscode.Uri.joinPath(target_directory, "contest.oj-ext.json"))).toString()).result.url;
        const service: number = Number(Object.keys(service_url).find((value) => url.startsWith(service_url[Number(value)])));
        const contest_id = url.split("/").at(-1);
        if (contest_id === undefined) {
            throw new Error("Faild to extract contest id from url.");
        }

        const { contest, dirname, stat } = await get_contest_data(service, contest_id);
        if (stat === undefined) {
            return;
        }
        if (path.basename(target_directory.fsPath) !== dirname) {
            const new_uri = vscode.Uri.joinPath(target_directory, "../" + dirname);
            await vscode.workspace.fs.rename(target_directory, new_uri);
            target_directory = new_uri;
        }
        if (service === services.Atcoder) {
            contest.result.problems = contest.result.problems.filter((problem: any) => !("alphabet" in problem.context && problem.context.alphabet === "A-Final"));
        }
        vscode.workspace.fs.writeFile(vscode.Uri.joinPath(target_directory, "contest.oj-ext.json"), new TextEncoder().encode(JSON.stringify(contest, null, 4)));
        contest.result.problems.forEach(async (problem: any, index: number) => {
            problem.status = stat;
            const dir = vscode.Uri.joinPath(target_directory, "alphabet" in problem.context ? problem.context.alphabet : String(index) + " " + problem.name);
            if ((await file_exists(dir)) !== vscode.FileType.Directory) {
                await vscode.workspace.fs.createDirectory(dir);
                const file = vscode.Uri.joinPath(dir, file_or_command);
                if (template_uri === undefined) {
                    vscode.workspace.fs.writeFile(file, new Uint8Array());
                } else {
                    vscode.workspace.fs.copy(template_uri, file);
                }
            }
            vscode.workspace.fs.writeFile(vscode.Uri.joinPath(dir, "problem.oj-ext.json"), new TextEncoder().encode(JSON.stringify(problem, null, 4)));
        });
    } else if (await file_exists(vscode.Uri.joinPath(target_directory, "problem.oj-ext.json"))) {
        const template = await get_template();
        if (template === undefined) {
            return;
        }
        const [template_uri, file_or_command] = template;
        const url: string = JSON.parse((await vscode.workspace.fs.readFile(vscode.Uri.joinPath(target_directory, "problem.oj-ext.json"))).toString()).result.url;
        // TODO
    } else {
        throw new Error("Something went wrong.");
    }
});

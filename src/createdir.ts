import * as vscode from "vscode";
import { check_oj_api_version } from "./checker";
import { select_service, services, service_url, async_exec, make_file_folder_name, get_template, catch_error } from "./global";

export async function get_contest_data(service: number, contest_id: string) {
    let contest_url = service_url[service];
    if (service === services.Atcoder || service === services.yukicoder) {
        contest_url += `contests/${contest_id}/`;
    } else if (service === services.Atcoder_Problems) {
        contest_url += `#/contest/show/${contest_id}/`;
    } else if (service === services.CodeChef) {
        contest_url += contest_id + "/";
    } else if (service === services.Codeforces) {
        contest_url += `contest/${contest_id}/`;
    }
    const { error, stdout, stderr } = await async_exec(`oj-api --wait=0.0 get-contest ${contest_url}`);
    if (stdout !== "") {
        console.log(stdout);
    }
    if (stderr !== "") {
        console.error(stderr);
    }

    let contest = JSON.parse(stdout);
    if (contest.status === "ok") {
        return { contest: contest, dirname: make_file_folder_name(contest.result.name), stat: "summary" };
    } else if (service === services.Atcoder) {
        let n = 0;
        let s = 0;
        let f2 = false;
        let name = "";
        if (/abc[0-9]{3}/.test(contest_id)) {
            let abc = Number(contest_id.substring(3));
            if (abc <= 125) {
                n = 4;
            } else if (abc <= 211) {
                n = 6;
            } else if (abc <= 318) {
                n = 8;
            } else {
                n = 7;
            }
            name = `AtCoder Beginner Contest ${abc}`;
        } else if (/arc[0-9]{3}/.test(contest_id)) {
            let arc = Number(contest_id.substring(3));
            if (arc <= 57) {
                n = 4;
            } else {
                n = 6;
                if (arc <= 104) {
                    s = 2;
                }
                if (arc === 120) {
                    f2 = true;
                }
            }
            name = `AtCoder Regular Contest ${arc}`;
        } else if (/agc[0-9]{3}/.test(contest_id)) {
            let agc = Number(contest_id.substring(3));
            n = 6;
            if (agc === 28) {
                f2 = true;
            }
            name = `AtCoder Grand Contest ${agc}`;
        } else if (/ahc[0-9]{3}/.test(contest_id)) {
            n = 1;
            name = `AtCoder Heuristic Contest ${contest_id.substring(3)}`;
        } else {
            const cnt = await vscode.window.showInputBox({
                ignoreFocusOut: true,
                placeHolder: "ex) 7",
                prompt: "Enter the number of problems. (1-26)",
            });
            if (cnt === undefined || cnt === "") {
                return { contest: contest, dirname: "", stat: undefined };
            }
            n = Number(cnt);
            if (!Number.isInteger(n) || n < 1 || n > 26) {
                throw new Error("Incorrect input. Enter an integer between 1 and 26.");
            }
            name = "Atcoder_" + contest_id;
        }
        let problem_id: string[] = [];
        for (let i = s; i < n; ++i) {
            problem_id.push(String.fromCharCode("a".charCodeAt(0) + i));
        }
        if (f2) {
            problem_id.push("f2");
        }
        contest.status = "guess";
        contest.result = {
            url: `https://atcoder.jp/contests/${contest_id}`,
            name: null,
            problems: [],
        };
        problem_id.forEach((id) =>
            contest.result.problems.push({
                url: `https://atcoder.jp/contests/${contest_id}/${contest_id.replaceAll("-", "_")}_${id}`,
                name: null,
                context: {
                    contest: {
                        url: `https://atcoder.jp/contests/${contest_id}`,
                        name: null,
                    },
                    alphabet: id.toUpperCase(),
                },
            })
        );
        return { contest: contest, dirname: make_file_folder_name(name), stat: "guess" };
    } else if (service === services.Codeforces) {
        const cnt = await vscode.window.showInputBox({
            ignoreFocusOut: true,
            placeHolder: "ex) 7",
            prompt: "Enter the number of problems. (1-26)",
        });
        if (cnt === undefined || cnt === "") {
            return { contest: contest, dirname: "", stat: undefined };
        }
        const n = Number(cnt);
        if (!Number.isInteger(n) || n < 1 || n > 26) {
            throw new Error("Incorrect input. Enter an integer between 1 and 26.");
        }
        contest.status = "guess";
        contest.result = {
            url: `https://codeforces.com/contest/${contest_id}`,
            name: null,
            problems: [],
        };
        for (let i = 0; i < n; ++i) {
            const id = String.fromCharCode("A".charCodeAt(0) + i);
            contest.result.problems.push({
                url: `https://codeforces.com/contest/${contest_id}/problem/${id}`,
                name: null,
                context: {
                    contest: {
                        url: `https://atcoder.jp/contests/${contest_id}`,
                        name: null,
                    },
                    alphabet: id,
                },
            });
        }
        return { contest: contest, dirname: make_file_folder_name("Codeforces_" + contest_id), stat: "guess" };
    } else if (service === services.CodeChef) {
        contest.status = "guess";
        contest.result = {
            url: `https://www.codechef.com/${contest_id}`,
            name: null,
            problems: [],
        };
        return { contest: contest, dirname: make_file_folder_name(contest_id), stat: "guess" };
    } else {
        throw new Error("Could not retrieve contest information.");
    }
}

export const createdir_command = vscode.commands.registerCommand("online-judge-extension.createdir", async (target_directory: vscode.Uri) => {
    await catch_error("createdir", async () => {
        await check_oj_api_version();

        const template = await get_template();
        if (template === undefined) {
            return;
        }
        const [template_uri, file_or_command] = template;

        const service = await select_service([services.Atcoder, services.Atcoder_Problems, services.CodeChef, services.Codeforces, services.yukicoder]);
        if (service === undefined) {
            return;
        }
        const contest_id = await vscode.window.showInputBox({
            ignoreFocusOut: true,
            placeHolder: "ex) abc001",
            prompt: "Enter the contest id.",
        });
        if (contest_id === undefined || contest_id === "") {
            return;
        }

        const { contest, dirname, stat } = await get_contest_data(service, contest_id);
        if (stat === undefined) {
            return;
        }
        if (service === services.Atcoder) {
            contest.result.problems = contest.result.problems.filter((problem: any) => !("alphabet" in problem.context && problem.context.alphabet === "A-Final"));
        }
        const dir = vscode.Uri.joinPath(target_directory, dirname);
        vscode.workspace.fs.createDirectory(dir);
        vscode.workspace.fs.writeFile(vscode.Uri.joinPath(dir, "contest.oj-ext.json"), new TextEncoder().encode(JSON.stringify(contest, null, 4)));
        contest.result.problems.forEach(async (problem: any, index: number) => {
            problem.status = stat;
            const dir2 = vscode.Uri.joinPath(dir, "alphabet" in problem.context ? problem.context.alphabet : String(index) + " " + problem.name);
            await vscode.workspace.fs.createDirectory(dir2);
            vscode.workspace.fs.writeFile(vscode.Uri.joinPath(dir2, "problem.oj-ext.json"), new TextEncoder().encode(JSON.stringify(problem, null, 4)));
            const file = vscode.Uri.joinPath(dir2, file_or_command);
            if (template_uri === undefined) {
                vscode.workspace.fs.writeFile(file, new Uint8Array());
            } else {
                vscode.workspace.fs.copy(template_uri, file);
            }
        });
    });
});

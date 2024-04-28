import * as vscode from "vscode";
import * as child_process from "node:child_process";
import * as path from "node:path";
import { check_py_version, check_oj_version, check_oj_api_version, has_selenium } from "./checker";

const services: { [name: string]: number } = {
    Aizu_Online_Judge: 1,
    Anarchy_Golf: 2,
    Atcoder: 3,
    Atcoder_Problems: 4,
    CodeChef: 5,
    Codeforces: 6,
    CS_Academy: 7,
    Meta_Hacker_Cup: 8,
    HackerRank: 9,
    Kattis: 10,
    Library_Checker: 11,
    PKU_JudgeOnline: 12,
    Sphere_Online_Judge: 13,
    Topcoder: 14,
    Toph: 15,
    yukicoder: 16,
};
const service_name: { [id: number]: string } = {
    1: "Aizu Online Judge",
    2: "Anarchy Golf",
    3: "Atcoder",
    4: "Atcoder Problems",
    5: "CodeChef",
    6: "Codeforces",
    7: "CS Academy",
    8: "Meta Hacker Cup",
    9: "HackerRank",
    10: "Kattis",
    11: "Library Checker",
    12: "PKU JudgeOnline",
    13: "Sphere Online Judge",
    14: "Topcoder",
    15: "Toph",
    16: "yukicoder",
};
const service_url: { [service: number]: string } = {
    1: "https://onlinejudge.u-aizu.ac.jp/home",
    2: "http://golf.shinh.org/",
    3: "https://atcoder.jp/",
    4: "https://kenkoooo.com/atcoder/",
    5: "https://www.codechef.com/",
    6: "https://codeforces.com/",
    7: "https://csacademy.com/",
    8: "https://www.facebook.com/hackercup/",
    9: "https://www.hackerrank.com/",
    10: "https://open.kattis.com/",
    11: "https://judge.yosupo.jp/",
    12: "http://poj.org/",
    13: "https://www.spoj.com/",
    14: "https://arena.topcoder.com/",
    15: "https://toph.co/",
    16: "https://yukicoder.me/",
};
async function select_service(target: number[]) {
    if (target.length === 1) {
        return target[0];
    } else {
        const service = (await vscode.window.showQuickPick(target.map((id) => service_name[id])))?.replace(" ", "_");
        if (service === undefined) return undefined;
        else return services[service];
    }
}

export function activate(context: vscode.ExtensionContext) {
    console.log('"Online Judge Extension" is now active!');

    let disposable1 = vscode.commands.registerCommand("online-judge-extension.setup", async () => {
        if (!(await check_py_version())) return;
        vscode.window.showInformationMessage("Installing setuptools...");
        child_process.exec("pip3 install setuptools", (error, stdout, stderr) => {
            if (stdout !== "") console.log(stdout);
            if (stderr !== "") console.error(stderr);
            if (error) {
                vscode.window.showErrorMessage("Something went wrong.");
                return;
            }
            vscode.window.showInformationMessage("Installing Selenium...");
            child_process.exec("pip3 install selenium", (error, stdout, stderr) => {
                if (stdout !== "") console.log(stdout);
                if (stderr !== "") console.error(stderr);
                if (error) {
                    vscode.window.showErrorMessage("Something went wrong.");
                    return;
                }
                vscode.window.showInformationMessage("Installing online-judge-tools...");
                child_process.exec("pip3 install online-judge-tools", (error, stdout, stderr) => {
                    if (stdout !== "") console.log(stdout);
                    if (stderr !== "") console.error(stderr);
                    if (error) vscode.window.showErrorMessage("Something went wrong.");
                    vscode.window.showInformationMessage("online-judge-tools installed successfully.");
                });
            });
        });
    });
    context.subscriptions.push(disposable1);

    let disposable2 = vscode.commands.registerCommand("online-judge-extension.newdir", async (target_directory: vscode.Uri) => {
        if (!(await check_oj_api_version())) return;

        const config = vscode.workspace.getConfiguration("oje");
        const template_path = config.get<string>("templateFile");
        let template_uri: vscode.Uri | undefined = undefined;
        let file_or_command = "Main";
        if (template_path !== undefined && template_path !== "") {
            template_uri = vscode.Uri.file(template_path);
            try {
                const stat = await vscode.workspace.fs.stat(template_uri);
                if (stat.type !== 1) {
                    if (stat.type === 2) vscode.window.showErrorMessage('"Template File" path is a directory, not a file.');
                    else vscode.window.showErrorMessage('The file pointed to by "Template File" path does not exist.');
                    return;
                }
            } catch {
                vscode.window.showErrorMessage('The file pointed to by "Template File" path does not exist.');
                return;
            }
            file_or_command = path.basename(template_path);
        }

        const service = await select_service([services.Atcoder, services.Atcoder_Problems, services.CodeChef, services.yukicoder]);
        if (service === undefined) return;
        const contest_id = await vscode.window.showInputBox({
            ignoreFocusOut: true,
            placeHolder: "ex) abc001",
            prompt: "Enter the contest id.",
        });
        if (contest_id === undefined || contest_id === "") return;
        let contest_url = service_url[service];
        if (service === services.Atcoder || service === services.yukicoder) contest_url += `contests/${contest_id}/`;
        else if (service === services.Atcoder_Problems) contest_url += `#/contest/show/${contest_id}/`;
        else if (service === services.CodeChef) contest_url += contest_id;
        else if (service === services.Codeforces) contest_url += `contest/${contest_id}/`;

        child_process.exec(`oj-api --wait=0.0 get-contest ${contest_url}`, async (error, stdout, stderr) => {
            if (stderr !== "") console.log(stderr);
            if (error) {
                vscode.window.showErrorMessage("Something went wrong.");
                return;
            }
            let contest = JSON.parse(stdout);
            const createdir = (stat: string) => {
                const dir = vscode.Uri.joinPath(target_directory, contest_id);
                vscode.workspace.fs.createDirectory(dir);
                vscode.workspace.fs.writeFile(vscode.Uri.joinPath(dir, "contest.json"), new TextEncoder().encode(JSON.stringify(contest, null, 4)));
                contest.result.problems.forEach((problem: any) => {
                    problem.status = stat;
                    const dir2 = vscode.Uri.joinPath(dir, problem.context.alphabet);
                    vscode.workspace.fs.createDirectory(dir2);
                    vscode.workspace.fs.writeFile(vscode.Uri.joinPath(dir2, "problem.json"), new TextEncoder().encode(JSON.stringify(problem, null, 4)));
                    const file = vscode.Uri.joinPath(dir2, file_or_command);
                    if (template_uri === undefined) {
                        vscode.workspace.fs.writeFile(file, new Uint8Array());
                    } else {
                        vscode.workspace.fs.copy(template_uri, file);
                    }
                });
            };
            if (contest.status === "ok") {
                createdir("summary");
            } else {
                let n = 0;
                let s = 0;
                let f2 = false;
                if (/abc[0-9]{3}/.test(contest_id)) {
                    let abc = Number(contest_id.substring(3));
                    if (abc <= 125) n = 4;
                    else if (abc <= 211) n = 6;
                    else if (abc <= 318) n = 8;
                    else n = 7;
                } else if (/arc[0-9]{3}/.test(contest_id)) {
                    let arc = Number(contest_id.substring(3));
                    if (arc <= 57) n = 4;
                    else {
                        n = 6;
                        if (arc <= 104) s = 2;
                        if (arc === 120) f2 = true;
                    }
                } else if (/agc[0-9]{3}/.test(contest_id)) {
                    let agc = Number(contest_id.substring(3));
                    n = 6;
                    if (agc === 28) f2 = true;
                } else {
                    const cnt = await vscode.window.showInputBox({
                        ignoreFocusOut: true,
                        placeHolder: "ex) 7",
                        prompt: "Enter the number of problems. (1-26)",
                    });
                    if (cnt === undefined || cnt === "") return;
                    n = Number(cnt);
                    if (!Number.isInteger(n) || n < 1 || n > 26) {
                        vscode.window.showErrorMessage("Incorrect input. Enter an integer between 1 and 26.");
                        return;
                    }
                }
                let problem_id: string[] = [];
                for (let i = s; i < n; ++i) problem_id.push(String.fromCharCode("a".charCodeAt(0) + i));
                if (f2) problem_id.push("f2");
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
                createdir("guess");
            }
        });
    });
    context.subscriptions.push(disposable2);

    let disposable3 = vscode.commands.registerCommand("online-judge-extension.login", async () => {
        const info = await Promise.all([check_oj_version(), has_selenium()]);
        if (!info[0]) return;
        const service = await select_service([services.Atcoder, services.Codeforces, services.HackerRank, services.Toph, services.yukicoder]);
        if (service === undefined) return;
        const url = service_url[service];
        child_process.exec(`oj login --check ${url}`, async (error, stdout, stderr) => {
            if (stdout !== "") console.log(stdout);
            if (stderr !== "") console.error(stderr);
            if (!error) {
                vscode.window.showInformationMessage("You have already signed in.");
                return;
            }
            if (info[1]) {
                vscode.window.showInformationMessage("Please wait a moment...");
                child_process.exec(`oj login ${url}`, (error, stdout, stderr) => {
                    if (stdout !== "") console.log(stdout);
                    if (stderr !== "") console.error(stderr);
                    if (error) vscode.window.showErrorMessage("Something went wrong.");
                    else vscode.window.showInformationMessage("Signed in successfully.");
                });
            } else {
                if (service !== services.Atcoder && service !== services.Codeforces) {
                    vscode.window.showErrorMessage('Cannot sign in because Selenium is not installed. Run "pip3 install selenium".');
                    return;
                }
                const user = await vscode.window.showInputBox({
                    ignoreFocusOut: true,
                    prompt: "Enter your username.",
                });
                const pass = await vscode.window.showInputBox({
                    ignoreFocusOut: true,
                    password: true,
                    prompt: "Enter your password.",
                });
                child_process.exec(`oj login -u ${user} -p ${pass} --use-browser never ${url}`, (error, stdout, stderr) => {
                    if (stdout !== "") console.log(stdout);
                    if (stderr !== "") console.error(stderr);
                    if (error) {
                        if (stdout.includes("Username or Password is incorrect.")) vscode.window.showErrorMessage("Username or Password is incorrect.");
                        else if (stdout.includes("Invalid handle or password.")) vscode.window.showErrorMessage("Invalid handle or password.");
                        else vscode.window.showErrorMessage("Something went wrong.");
                    } else vscode.window.showInformationMessage("Signed in successfully.");
                });
            }
        });
    });
    context.subscriptions.push(disposable3);

    //let disposable4 = vscode.commands.registerCommand("online-judge-extention.submit", async () => {});
}

export function deactivate() {}

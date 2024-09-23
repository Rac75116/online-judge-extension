import * as vscode from "vscode";
import * as child_process from "node:child_process";
import * as path from "node:path";
import * as copy_paste from "copy-paste";
import { check_py_version, check_oj_version, check_oj_api_version, has_selenium, check_oj_verify_version } from "./checker";

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
} as const;
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
} as const;
const service_url: { [service: number]: string } = {
    1: "https://onlinejudge.u-aizu.ac.jp/home/",
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
} as const;

async function file_exists(uri: vscode.Uri) {
    try {
        const stat = await vscode.workspace.fs.stat(uri);
        return stat.type;
    } catch {
        return vscode.FileType.Unknown;
    }
}

async function select_service(target: number[]) {
    if (target.length === 1) {
        return target[0];
    } else {
        const service = (await vscode.window.showQuickPick(target.map((id) => service_name[id])))?.replace(" ", "_");
        if (service === undefined) return undefined;
        else return services[service];
    }
}

function make_file_folder_name(old: string) {
    return old.replaceAll("\\", "_").replaceAll("/", "_").replaceAll(":", "_").replaceAll("*", "_").replaceAll("?", "_").replaceAll('"', "_").replaceAll("<", "_").replaceAll(">", "_").replaceAll("|", "_").replaceAll(";", "_").replaceAll("%", "_");
}

async function get_template(): Promise<[vscode.Uri | undefined, string] | undefined> {
    const config = vscode.workspace.getConfiguration("oje");
    const template_path = config.get<string>("templateFile");
    let template_uri: vscode.Uri | undefined = undefined;
    let file_or_command = "Main";
    if (template_path !== undefined && template_path !== "") {
        template_uri = vscode.Uri.file(template_path);
        const ft = await file_exists(template_uri);
        if (ft !== vscode.FileType.File) {
            if (ft === vscode.FileType.Directory) {
                vscode.window.showErrorMessage('"Template File" path is a directory, not a file.');
            } else if (ft === vscode.FileType.SymbolicLink) {
                vscode.window.showErrorMessage("Symbolic links are not available.");
            } else {
                vscode.window.showErrorMessage('The file pointed to by "Template File" path does not exist.');
            }
            return undefined;
        }
        file_or_command = path.basename(template_path);
    }
    return [template_uri, file_or_command];
}

function login_service(service: number, use_selenium: boolean | any) {
    const url = service_url[service];
    child_process.exec(`oj login --check ${url}`, async (error, stdout, stderr) => {
        if (stdout !== "") console.log(stdout);
        if (stderr !== "") console.error(stderr);
        if (!error) {
            vscode.window.showInformationMessage("You have already signed in.");
            return;
        }
        if (use_selenium) {
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
}

function get_contest_data(service: number, contest_id: string, callback: any) {
    let contest_url = service_url[service];
    if (service === services.Atcoder || service === services.yukicoder) contest_url += `contests/${contest_id}/`;
    else if (service === services.Atcoder_Problems) contest_url += `#/contest/show/${contest_id}/`;
    else if (service === services.CodeChef) contest_url += contest_id + "/";
    else if (service === services.Codeforces) contest_url += `contest/${contest_id}/`;
    child_process.exec(`oj-api --wait=0.0 get-contest ${contest_url}`, async (error, stdout, stderr) => {
        if (stdout !== "") console.log(stdout);
        if (stderr !== "") console.error(stderr);

        let contest = JSON.parse(stdout);
        if (contest.status === "ok") {
            callback(contest, make_file_folder_name(contest.result.name), "summary");
        } else if (service === services.Atcoder) {
            let n = 0;
            let s = 0;
            let f2 = false;
            let name = "";
            if (/abc[0-9]{3}/.test(contest_id)) {
                let abc = Number(contest_id.substring(3));
                if (abc <= 125) n = 4;
                else if (abc <= 211) n = 6;
                else if (abc <= 318) n = 8;
                else n = 7;
                name = `AtCoder Beginner Contest ${abc}`;
            } else if (/arc[0-9]{3}/.test(contest_id)) {
                let arc = Number(contest_id.substring(3));
                if (arc <= 57) n = 4;
                else {
                    n = 6;
                    if (arc <= 104) s = 2;
                    if (arc === 120) f2 = true;
                }
                name = `AtCoder Regular Contest ${arc}`;
            } else if (/agc[0-9]{3}/.test(contest_id)) {
                let agc = Number(contest_id.substring(3));
                n = 6;
                if (agc === 28) f2 = true;
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
                if (cnt === undefined || cnt === "") return;
                n = Number(cnt);
                if (!Number.isInteger(n) || n < 1 || n > 26) {
                    vscode.window.showErrorMessage("Incorrect input. Enter an integer between 1 and 26.");
                    return;
                }
                name = "Atcoder_" + contest_id;
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
            callback(contest, make_file_folder_name(name), "guess");
        } else if (service === services.Codeforces) {
            const cnt = await vscode.window.showInputBox({
                ignoreFocusOut: true,
                placeHolder: "ex) 7",
                prompt: "Enter the number of problems. (1-26)",
            });
            if (cnt === undefined || cnt === "") return;
            const n = Number(cnt);
            if (!Number.isInteger(n) || n < 1 || n > 26) {
                vscode.window.showErrorMessage("Incorrect input. Enter an integer between 1 and 26.");
                return;
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
            callback(contest, make_file_folder_name("Codeforces_" + contest_id), "guess");
        } else if (service === services.CodeChef) {
            contest.status = "guess";
            contest.result = {
                url: `https://www.codechef.com/${contest_id}`,
                name: null,
                problems: [],
            };
            callback(contest, make_file_folder_name(contest_id), "guess");
        } else {
            vscode.window.showErrorMessage("Could not retrieve contest information.");
        }
    });
}

function get_problem_data(url: string, callback: any) {
    if (url.includes("judge.yosupo.jp")) {
        vscode.window.showInformationMessage("Please wait a moment...");
    }
    child_process.exec(`oj-api --wait=0.0 get-problem ${url}`, (error, stdout, stderr) => {
        if (stdout !== "") console.log(stdout);
        if (stderr !== "") console.error(stderr);
        if (error) {
            vscode.window.showErrorMessage("Something went wrong.");
            return;
        }
        const problem = JSON.parse(stdout);
        let name = "";
        if ("name" in problem.result) name = problem.result.name;
        else {
            if (problem.result.url.startsWith("http://judge.u-aizu.ac.jp")) name = problem.result.url.split("=").at(-1);
            else if (problem.result.url.startsWith("http://golf.shinh.org")) name = problem.result.url.split("?").at(-1).replaceAll("+", " ");
            else if (problem.result.url.startsWith("https://csacademy.com")) name = problem.result.url.split("/").at(-2);
            else if (problem.result.url.startsWith("https://www.facebook.com")) {
                const v = problem.result.url.split("/");
                name = v.at(-4) + "-" + v.at(-3) + "-" + v.at(-1);
            } else if (problem.result.url.startsWith("http://poj.org/")) name = problem.result.url.split("?").at(-1);
            else name = problem.result.url.split("/").at(-1);
        }
        callback(problem, name);
    });
}

function submit_code(target: vscode.Uri, problem: string, callback?: any) {
    const config = vscode.workspace.getConfiguration("oje");
    const config_cxx_latest = config.get<boolean>("guessC++Latest");
    const config_cxx_compiler = config.get<string>("guessC++Compiler");
    const config_py_version = config.get<string>("guessPythonVersion");
    const config_py_interpreter = config.get<string>("guessPythonInterpreter");
    const config_open_brower = config.get<boolean>("openBrowser");
    if (config_cxx_latest === undefined || config_cxx_compiler === undefined || config_py_version === undefined || config_py_interpreter === undefined || config_open_brower === undefined) {
        vscode.window.showErrorMessage("Failed to get configuration.");
        return;
    }
    const cxx_latest = config_cxx_latest ? "--guess-cxx-latest" : "--no-guess-latest";
    const cxx_compiler = "--guess-cxx-compiler " + config_cxx_compiler === "GCC" ? "gcc" : config_cxx_compiler === "Clang" ? "clang" : "all";
    const py_version = "--guess-python-version " + config_py_version === "Python2" ? "2" : config_py_version === "Python3" ? "3" : config_py_version === "Auto" ? "auto" : "all";
    const py_interpreter = "--guess-python-interpreter " + config_py_interpreter === "CPython" ? "cpython" : config_py_interpreter === "PyPy" ? "pypy" : "all";
    const open_brower = config_open_brower ? "--open" : "--no-open";

    child_process.exec(`oj submit --wait 0 --yes ${cxx_latest} ${cxx_compiler} ${py_version} ${py_interpreter} ${open_brower} ${problem} ${target.fsPath}`, (error, stdout, stderr) => {
        if (stdout !== "") console.log(stdout);
        if (stderr !== "") console.error(stderr);
        if (error) {
            vscode.window.showErrorMessage("Something went wrong.");
            return;
        }
        /*
        if (browse) {
            child_process.exec(`python -m webbrowser -t "${res.result.url}"`, (error, stdout, stderr) => {
                if (stdout !== "") console.log(stdout);
                if (stderr !== "") console.error(stderr);
                if (error) vscode.window.showErrorMessage("Failed to open browser.");
            });
        } else console.log("submission: ", res.result.url);
        */
    });
}

export function activate(context: vscode.ExtensionContext) {
    console.log('"Online Judge Extension" is now active!');

    let setup = vscode.commands.registerCommand("online-judge-extension.setup", async () => {
        if (!(await check_py_version())) return;

        vscode.window.showInformationMessage("Checking...");
        child_process.exec("pip3 install setuptools", (error, stdout, stderr) => {
            if (stdout !== "") console.log(stdout);
            if (stderr !== "") console.error(stderr);
            if (error) vscode.window.showErrorMessage("Something went wrong during the installation of setuptools.");
            else vscode.window.showInformationMessage("setuptools installed successfully.");
        });
        child_process.exec("pip3 install selenium", (error, stdout, stderr) => {
            if (stdout !== "") console.log(stdout);
            if (stderr !== "") console.error(stderr);
            if (error) vscode.window.showErrorMessage("Something went wrong during the installation of selenium.");
            else vscode.window.showInformationMessage("selenium installed successfully.");
        });
        child_process.exec("pip3 install online-judge-tools", (error, stdout, stderr) => {
            if (stdout !== "") console.log(stdout);
            if (stderr !== "") console.error(stderr);
            if (error) vscode.window.showErrorMessage("Something went wrong during the installation of online-judge-tools.");
            else vscode.window.showInformationMessage("online-judge-tools installed successfully.");
        });
        child_process.exec("pip3 install online-judge-verify-helper", (error, stdout, stderr) => {
            if (stdout !== "") console.log(stdout);
            if (stderr !== "") console.error(stderr);
            if (error) vscode.window.showErrorMessage("Something went wrong during the installation of online-judge-verify-helper.");
            else vscode.window.showInformationMessage("online-judge-verify-helper installed successfully.");
        });
    });
    context.subscriptions.push(setup);

    let createdir = vscode.commands.registerCommand("online-judge-extension.createdir", async (target_directory: vscode.Uri) => {
        if (!(await check_oj_api_version())) return;

        const template = await get_template();
        if (template === undefined) return;
        const [template_uri, file_or_command] = template;

        const service = await select_service([services.Atcoder, services.Atcoder_Problems, services.CodeChef, services.Codeforces, services.yukicoder]);
        if (service === undefined) return;
        const contest_id = await vscode.window.showInputBox({
            ignoreFocusOut: true,
            placeHolder: "ex) abc001",
            prompt: "Enter the contest id.",
        });
        if (contest_id === undefined || contest_id === "") return;

        get_contest_data(service, contest_id, async (contest: any, dirname: string, stat: string) => {
            if (service === services.Atcoder) {
                contest.result.problems = contest.result.problems.filter((problem: any) => !("alphabet" in problem.context && problem.context.alphabet === "A-Final"));
            }
            const dir = vscode.Uri.joinPath(target_directory, dirname);
            vscode.workspace.fs.createDirectory(dir);
            vscode.workspace.fs.writeFile(vscode.Uri.joinPath(dir, "contest.oje.json"), new TextEncoder().encode(JSON.stringify(contest, null, 4)));
            contest.result.problems.forEach(async (problem: any, index: number) => {
                problem.status = stat;
                const dir2 = vscode.Uri.joinPath(dir, "alphabet" in problem.context ? problem.context.alphabet : String(index) + " " + problem.name);
                await vscode.workspace.fs.createDirectory(dir2);
                vscode.workspace.fs.writeFile(vscode.Uri.joinPath(dir2, "problem.oje.json"), new TextEncoder().encode(JSON.stringify(problem, null, 4)));
                const file = vscode.Uri.joinPath(dir2, file_or_command);
                if (template_uri === undefined) {
                    vscode.workspace.fs.writeFile(file, new Uint8Array());
                } else {
                    vscode.workspace.fs.copy(template_uri, file);
                }
            });
        });
    });
    context.subscriptions.push(createdir);

    let addproblem = vscode.commands.registerCommand("online-judge-extension.addproblem", async (target_directory: vscode.Uri) => {
        if (!(await check_oj_api_version())) return;

        const template = await get_template();
        if (template === undefined) return;
        const [template_uri, file_or_command] = template;
        if (await file_exists(vscode.Uri.joinPath(target_directory, "contest.oje.json"))) {
            vscode.window.showErrorMessage("Something went wrong.");
            return;
        }

        const problem_url = await vscode.window.showInputBox({
            ignoreFocusOut: true,
            placeHolder: "ex) https://codeforces.com/contest/1606/problem/A",
            prompt: "Enter the problem url.",
        });
        if (problem_url === undefined || problem_url === "") return;
        get_problem_data(problem_url, async (problem: any, name: string) => {
            const dir = vscode.Uri.joinPath(target_directory, make_file_folder_name(name));
            await vscode.workspace.fs.createDirectory(dir);
            vscode.workspace.fs.writeFile(vscode.Uri.joinPath(dir, "problem.oje.json"), new TextEncoder().encode(JSON.stringify(problem, null, 4)));
            const file = vscode.Uri.joinPath(dir, file_or_command);
            if (template_uri === undefined) {
                vscode.workspace.fs.writeFile(file, new Uint8Array());
            } else {
                vscode.workspace.fs.copy(template_uri, file);
            }
        });
    });
    context.subscriptions.push(addproblem);

    let update = vscode.commands.registerCommand("online-judge-extension.update", async (target_directory: vscode.Uri) => {
        if (!(await check_oj_api_version())) return;

        if (await file_exists(vscode.Uri.joinPath(target_directory, "contest.oje.json"))) {
            const template = await get_template();
            if (template === undefined) return;
            const [template_uri, file_or_command] = template;

            const url: string = JSON.parse((await vscode.workspace.fs.readFile(vscode.Uri.joinPath(target_directory, "contest.oje.json"))).toString()).result.url;
            const service: number = Number(Object.keys(service_url).find((value) => url.startsWith(service_url[Number(value)])));
            const contest_id = url.split("/").at(-1);
            if (contest_id === undefined) {
                vscode.window.showErrorMessage("Faild to extract contest id from url.");
                return;
            }

            get_contest_data(service, contest_id, async (contest: any, dirname: string, stat: string) => {
                if (path.basename(target_directory.fsPath) !== dirname) {
                    const new_uri = vscode.Uri.joinPath(target_directory, "../" + dirname);
                    await vscode.workspace.fs.rename(target_directory, new_uri);
                    target_directory = new_uri;
                }
                if (service === services.Atcoder) {
                    contest.result.problems = contest.result.problems.filter((problem: any) => !("alphabet" in problem.context && problem.context.alphabet === "A-Final"));
                }
                vscode.workspace.fs.writeFile(vscode.Uri.joinPath(target_directory, "contest.oje.json"), new TextEncoder().encode(JSON.stringify(contest, null, 4)));
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
                    vscode.workspace.fs.writeFile(vscode.Uri.joinPath(dir, "problem.oje.json"), new TextEncoder().encode(JSON.stringify(problem, null, 4)));
                });
            });
        } else if (await file_exists(vscode.Uri.joinPath(target_directory, "problem.oje.json"))) {
            const template = await get_template();
            if (template === undefined) return;
            const [template_uri, file_or_command] = template;
            const url: string = JSON.parse((await vscode.workspace.fs.readFile(vscode.Uri.joinPath(target_directory, "problem.oje.json"))).toString()).result.url;
            // TODO
        } else {
            vscode.window.showErrorMessage("Something went wrong.");
        }
    });
    context.subscriptions.push(update);

    let login = vscode.commands.registerCommand("online-judge-extension.login", async () => {
        const info = await Promise.all([check_oj_version(), has_selenium()]);
        if (!info[0]) return;
        const service = await select_service([services.Atcoder, services.Codeforces, services.HackerRank, services.Toph, services.yukicoder]);
        if (service === undefined) return;
        login_service(service, info[1]);
    });
    context.subscriptions.push(login);

    let bundle = vscode.commands.registerCommand("online-judge-extension.bundle", async (target_file: vscode.Uri) => {
        if (!(await check_oj_verify_version())) return;

        const config = vscode.workspace.getConfiguration("oje");
        let include_path = config.get<string[]>("includePath");
        if (include_path === undefined) {
            vscode.window.showErrorMessage('Failed to get configuration: "Oje: includePath"');
            return;
        }

        vscode.window.withProgress(
            {
                title: `Bundling ${path.basename(target_file.fsPath)}`,
                location: vscode.ProgressLocation.Notification,
                cancellable: false,
            },
            async (progress) => {
                return new Promise(async (resolve) => {
                    let interval: any;
                    let customCancellationToken = new vscode.CancellationTokenSource();
                    customCancellationToken.token.onCancellationRequested(() => {
                        customCancellationToken.dispose();
                        resolve(null);
                        return;
                    });
                    let loopCounter = 1;
                    progress.report({ message: "working." });
                    interval = setInterval(() => {
                        loopCounter++;
                        if (loopCounter > 3) loopCounter = 1;
                        progress.report({ message: "working" + ".".repeat(loopCounter) });
                    }, 300);
                    child_process.exec(`cd ${path.dirname(target_file.fsPath)} && oj-bundle ${target_file.fsPath}${include_path.map((value) => " -I " + value).join()}`, (error, stdout, stderr) => {
                        if (stderr !== "") console.error(stderr);
                        if (error) {
                            vscode.window.showErrorMessage("Faild to bundle the file.");
                            return;
                        }
                        copy_paste.copy(stdout, () => {
                            clearInterval(interval);
                            progress.report({ message: "copied to clipboard." });
                            setTimeout(() => customCancellationToken.cancel(), 2500);
                        });
                    });
                });
            }
        );
    });
    context.subscriptions.push(bundle);
}

export function deactivate() {}

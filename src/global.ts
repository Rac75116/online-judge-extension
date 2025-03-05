import * as vscode from "vscode";
import * as path from "node:path";
import * as crypto from "node:crypto";
import * as childProcess from "node:child_process";
import { KnownError } from "./error";
import { cpp_template, java_template, py_template } from "./templates";

export const services: { [name: string]: number } = {
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
export const service_name: { [id: number]: string } = {
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
export const service_url: { [service: number]: string } = {
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

type async_exec_result_t = { error: childProcess.ExecException | null; stdout: string; stderr: string };
export function async_exec(command: string, print_log: boolean = false, options: childProcess.ExecOptions = {}): Promise<async_exec_result_t> {
    return new Promise((resolve) => {
        console.log("Execute: " + command);
        childProcess.exec(command, options, (error, stdout, stderr) => {
            if (print_log) {
                if (stdout !== "") {
                    console.log(stdout);
                }
                if (stderr !== "") {
                    console.error(stderr);
                }
            }
            resolve({ error: error, stdout: stdout, stderr: stderr });
        });
    });
}

export async function file_exists(uri: vscode.Uri) {
    try {
        const stat = await vscode.workspace.fs.stat(uri);
        return stat.type;
    } catch {
        return vscode.FileType.Unknown;
    }
}

export function get_config_checking<type>(name: string) {
    const result = vscode.workspace.getConfiguration("oj-ext").get<type>(name);
    if (result === undefined) {
        throw new KnownError(`Failed to get configuration: "oj-ext.${name}"`);
    }
    return result;
}

export async function select_service(target: number[]) {
    if (target.length === 1) {
        return target[0];
    } else {
        const service = (await vscode.window.showQuickPick(target.map((id) => service_name[id])))?.replaceAll(" ", "_");
        if (service === undefined) {
            return undefined;
        } else {
            return services[service];
        }
    }
}

export function make_file_folder_name(old: string) {
    return old.replaceAll("\\", "_").replaceAll("/", "_").replaceAll(":", "_").replaceAll("*", "_").replaceAll("?", "_").replaceAll('"', "_").replaceAll("<", "_").replaceAll(">", "_").replaceAll("|", "_").replaceAll(";", "_").replaceAll("%", "_");
}

export async function copy_template(dest: vscode.Uri) {
    const template_path = get_config_checking<string>("templatePath");
    if (template_path.length === 0) {
        await vscode.workspace.fs.writeFile(vscode.Uri.joinPath(dest, "Main.cpp"), new TextEncoder().encode(cpp_template));
        await vscode.workspace.fs.writeFile(vscode.Uri.joinPath(dest, "Main.py"), new TextEncoder().encode(py_template));
        await vscode.workspace.fs.writeFile(vscode.Uri.joinPath(dest, "Main.java"), new TextEncoder().encode(java_template));
        return;
    } else if (template_path[0] === "$") {
        const { error, stdout, stderr } = await async_exec(template_path.slice(1), false, { cwd: dest.fsPath });
        if (error) {
            throw new KnownError("Failed to execute the command of `oj-ext.templatePath`.");
        }
        return;
    }
    const template_uri = vscode.Uri.file(template_path);
    const ft = await file_exists(template_uri);
    if (ft === vscode.FileType.File) {
        await vscode.workspace.fs.copy(template_uri, vscode.Uri.joinPath(dest, path.basename(template_path)));
    } else if (ft === vscode.FileType.Directory || ft === vscode.FileType.SymbolicLink) {
        const entries = await vscode.workspace.fs.readDirectory(template_uri);
        for (const [name, type] of entries) {
            if (type === vscode.FileType.Unknown) {
                throw new KnownError(`Failed to get the file type of ${name} while reading the directory pointed to by "templatePath".`);
            }
        }
        for (const [name, type] of entries) {
            await vscode.workspace.fs.copy(vscode.Uri.joinPath(template_uri, name), vscode.Uri.joinPath(dest, name));
        }
    } else {
        throw new KnownError('The file pointed to by "templatePath" does not exist.');
    }
}

export async function catch_error(title: string, callback: () => void) {
    try {
        await callback();
    } catch (error: any) {
        if (error.name === "PythonNotInstalledError") {
            vscode.window.showErrorMessage(`oj-ext.${title}: ${error.message} Please install it with a check for "Add Python3.xx to Path".`);
        } else if (error.name === "EnvironmentError") {
            const ret = await vscode.window.showErrorMessage(`oj-ext.${title}: ${error.message} Do you want to run the "setup" command?`, "OK", "cancel");
            if (ret === "OK") {
                await vscode.commands.executeCommand("oj-ext.setup");
            }
        } else {
            vscode.window.showErrorMessage(`oj-ext.${title}: ${error.message}`);
        }
    }
}

export function random_id(len: number) {
    const elements = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    return Array.from(crypto.randomFillSync(new Uint8Array(len)))
        .map((n) => elements[n % elements.length])
        .join("");
}

export function expand_variables(str: string): string {
    return str.replace(/(\${[a-zA-Z0-9_]+(?::[^}]*)?})/g, (match: string, variable: string) => {
        const parts = variable.slice(2, -1).split(":");
        const variableName = parts[0];
        const parameter = parts[1] || "";
        console.log(match, variable, parts, variableName, parameter);

        const variables: Record<string, (parameter?: string) => string | undefined> = {
            workspaceFolder: (param?: string) => {
                if (param) {
                    const folder = vscode.workspace.workspaceFolders?.find((f) => f.name === param);
                    return folder?.uri.fsPath;
                } else {
                    const folder = vscode.workspace.workspaceFolders?.[0];
                    return folder?.uri.fsPath;
                }
            },
            file: () => {
                const editor = vscode.window.activeTextEditor;
                return editor?.document?.uri.fsPath;
            },
            fileBasename: () => {
                const filePath = variables["file"]();
                return filePath ? path.basename(filePath) : undefined;
            },
            fileBasenameNoExtension: () => {
                const filePath = variables["file"]();
                if (filePath) {
                    return path.basename(filePath, path.extname(filePath));
                }
                return undefined;
            },
            fileDirname: () => {
                const filePath = variables["file"]();
                return filePath ? path.dirname(filePath) : undefined;
            },
            fileExtname: () => {
                const filePath = variables["file"]();
                return filePath ? path.extname(filePath) : undefined;
            },
            relativeFile: () => {
                const filePath = variables["file"]();
                if (filePath) {
                    const workspaceFolders = vscode.workspace.workspaceFolders;
                    if (workspaceFolders) {
                        for (const folder of workspaceFolders) {
                            const folderPath = folder?.uri.fsPath;
                            if (filePath.startsWith(folderPath)) {
                                return path.relative(folderPath, filePath);
                            }
                        }
                    }
                }
                return undefined;
            },
            relativeFileDirname: () => {
                const relativeFilePath = variables["relativeFile"]();
                return relativeFilePath ? path.dirname(relativeFilePath) : undefined;
            },
            selectedText: () => {
                const editor = vscode.window.activeTextEditor;
                if (editor) {
                    const selection = editor.selection;
                    if (!selection.isEmpty) {
                        return editor?.document?.getText(selection);
                    }
                }
                return undefined;
            },
            lineNumber: () => {
                const editor = vscode.window.activeTextEditor;
                if (editor) {
                    const position = editor?.selection?.active;
                    if (position) {
                        return (position.line + 1).toString();
                    }
                }
                return undefined;
            },
            pathSeparator: () => {
                return path.sep;
            },
            env: (param?: string) => {
                if (param) {
                    return process.env[param];
                }
                return undefined;
            },
            config: (param?: string) => {
                if (param) {
                    return vscode.workspace.getConfiguration().get(param);
                }
                return undefined;
            },
        };

        const resolver = variables[variableName];
        if (resolver) {
            const value = resolver(parameter);
            if (value !== undefined) {
                return value;
            }
        }
        return match;
    });
}

import * as vscode from "vscode";
import * as path from "node:path";
import * as childProcess from "node:child_process";

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
export function async_exec(command: string): Promise<async_exec_result_t> {
    return new Promise((resolve) => {
        console.log("Execute: " + command);
        childProcess.exec(command, (error, stdout, stderr) => {
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
        throw new Error(`Failed to get configuration: "Oj-ext: ${name}"`);
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

export async function get_template(): Promise<[vscode.Uri | undefined, string]> {
    const template_path = get_config_checking<string>("templateFile");
    let template_uri: vscode.Uri | undefined = undefined;
    let file_or_command = "Main";
    if (template_path !== "") {
        template_uri = vscode.Uri.file(template_path);
        const ft = await file_exists(template_uri);
        if (ft !== vscode.FileType.File) {
            if (ft === vscode.FileType.Directory) {
                throw new Error('"Template File" path is a directory, not a file.');
            } else if (ft === vscode.FileType.SymbolicLink) {
                throw new Error('"Template File" path is a symbolic link, not a file.');
            } else {
                throw new Error('The file pointed to by "Template File" path does not exist.');
            }
        }
        file_or_command = path.basename(template_path);
    }
    return [template_uri, file_or_command];
}

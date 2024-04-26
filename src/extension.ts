import * as vscode from 'vscode';
import * as child_process from 'node:child_process';
import * as path from 'node:path';
import { check_py_version } from './checker';

export function activate(context: vscode.ExtensionContext) {
    console.log('"Online Judge Extension" is now active!');

    let disposable1 = vscode.commands.registerCommand('online-judge-extension.setup', async () => {
        if (!(await check_py_version())) return;
        vscode.window.showInformationMessage('Installing setuptools...');
        child_process.exec('pip3 install setuptools', (error, stdout, stderr) => {
            if (error) {
                vscode.window.showErrorMessage('Something went wrong.');
                return;
            }
            vscode.window.showInformationMessage('Installing online-judge-tools...');
            child_process.exec('pip3 install online-judge-tools', (error, stdout, stderr) => {
                if (error) vscode.window.showErrorMessage('Something went wrong.');
                else vscode.window.showInformationMessage('online-judge-tools installed successfully.');
            });
        });
    });
    context.subscriptions.push(disposable1);

    let disposable2 = vscode.commands.registerCommand('online-judge-extension.newdir', async (target_directory: vscode.Uri) => {
        const config = vscode.workspace.getConfiguration('atcoder');
        const template_path = config.get<string>('templateFile');
        let template_uri: vscode.Uri | undefined = undefined;
        let file_or_command = 'Main';
        if (template_path !== undefined && template_path !== '') {
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
        const contest_name = await vscode.window.showInputBox({
            ignoreFocusOut: true,
            placeHolder: 'ex) abc001',
            prompt: 'Enter the contest name.',
        });
        if (contest_name === undefined || contest_name === '') return;
        child_process.exec(`oj-api --wait=0.0 get-contest https://atcoder.jp/contests/${contest_name}`, async (stdout, stderr) => {
            if(stdout !== null) console.log(stdout);
            let contest = JSON.parse(stderr);
            const createdir = (stat: string) => {
                const dir = vscode.Uri.joinPath(target_directory, contest_name);
                vscode.workspace.fs.createDirectory(dir);
                vscode.workspace.fs.writeFile(vscode.Uri.joinPath(dir, 'contest.json'), new TextEncoder().encode(JSON.stringify(contest, null, 4)));
                contest.result.problems.forEach((problem: any) => {
                    problem.status = stat;
                    const dir2 = vscode.Uri.joinPath(dir, problem.context.alphabet);
                    vscode.workspace.fs.createDirectory(dir2);
                    vscode.workspace.fs.writeFile(vscode.Uri.joinPath(dir2, 'problem.json'), new TextEncoder().encode(JSON.stringify(problem, null, 4)));
                    const file = vscode.Uri.joinPath(dir2, file_or_command);
                    if (template_uri === undefined) {
                        vscode.workspace.fs.writeFile(file, new Uint8Array());
                    } else {
                        vscode.workspace.fs.copy(template_uri, file);
                    }
                });
            };
            if (contest.status === 'ok') {
                createdir('summary');
            } else {
                let n = 0;
                let s = 0;
                let f2 = false;
                if (/abc[0-9]{3}/.test(contest_name)) {
                    let abc = Number(contest_name.substring(3));
                    if (abc <= 125) n = 4;
                    else if (abc <= 211) n = 6;
                    else if (abc <= 318) n = 8;
                    else n = 7;
                } else if (/arc[0-9]{3}/.test(contest_name)) {
                    let arc = Number(contest_name.substring(3));
                    if (arc <= 57) n = 4;
                    else {
                        n = 6;
                        if (arc <= 104) s = 2;
                        if (arc === 120) f2 = true;
                    }
                } else if (/agc[0-9]{3}/.test(contest_name)) {
                    let agc = Number(contest_name.substring(3));
                    n = 6;
                    if (agc === 28) f2 = true;
                } else {
                    const cnt = await vscode.window.showInputBox({
                        ignoreFocusOut: true,
                        placeHolder: 'ex) 7',
                        prompt: 'Enter the number of problems. (1-26)',
                    });
                    if (cnt === undefined || cnt === '') return;
                    n = Number(cnt);
                    if (!Number.isInteger(n) || n < 1 || n > 26) {
                        vscode.window.showErrorMessage('Incorrect input.\nEnter an integer between 1 and 26.');
                        return;
                    }
                }
                let problem_id: string[] = [];
                for (let i = s; i < n; ++i) problem_id.push(String.fromCharCode('a'.charCodeAt(0) + i));
                if (f2) problem_id.push('f2');
                contest.status = 'guess';
                contest.result = {
                    url: `https://atcoder.jp/contests/${contest_name}`,
                    name: null,
                    problems: [],
                };
                problem_id.forEach((id) =>
                    contest.result.problems.push({
                        url: `https://atcoder.jp/contests/${contest_name}/${contest_name.replaceAll('-', '_')}_${id}`,
                        name: null,
                        context: {
                            contest: {
                                url: `https://atcoder.jp/contests/${contest_name}`,
                                name: null,
                            },
                            alphabet: id.toUpperCase(),
                        },
                    })
                );
                createdir('guess');
            }
        });
    });
    context.subscriptions.push(disposable2);

	let disposable3 = vscode.commands.registerCommand('online-judge-extension.login', async () => {
		const sites = ['Atcoder', 'Codeforces', 'yukicoder', 'HackerRank', 'Toph'];
		const site = await vscode.window.showQuickPick(sites);
		if(site === undefined) return;
		let terminal = vscode.window.activeTerminal;
		if(terminal === undefined) terminal = vscode.window.createTerminal();
		terminal.show(true);
	});
	context.subscriptions.push(disposable3);
}

export function deactivate() {}

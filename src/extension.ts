import * as vscode from 'vscode';
import * as child_process from 'node:child_process';
import * as path from 'node:path';
import * as https from 'node:https';
import { check_py_version } from './checker';

function get_contest_info(contest_name : string, callback : (id : string[], title : string[], label : string[], time : number[], memory : number[]) => void) {
	let problem_id : string[] = [], problem_title : string[] = [], problem_label : string[] = [], timelimit : number[] = [], memorylimit : number[] = [];
	https.get(`https://atcoder.jp/contests/${contest_name}/tasks`, (res : any) => {
		if(res.statusCode !== 200) return;
		let html = '';
		res.on('data', (d : Uint8Array) => {
			const txt = new TextDecoder().decode(d);
			html += txt.replaceAll('	', '').replaceAll('\n', '');
		}).on('end', () => {
			const url = `/contests/${contest_name}/tasks/`;
			const re = `<td class="text-center no-break"><a href="${url}(.*?)">(.*?)</a></td><td><a href="${url}.*?">(.*?)</a></td><td class="text-right">(.*?)</td><td class="text-right">(.*?)</td>`;
			const arr = html.match(new RegExp(re.replaceAll('(.*?)', '.*?'), 'g'));
			if(arr === null) return;
			arr.forEach(str => {
				const s = str.replace(new RegExp(re, 'g'), '$1@@$2@@$3@@$4@@$5').split('@@');
				problem_id.push(s[0]);
				problem_title.push(s[2]);
				problem_label.push(s[1]);
				timelimit.push(parseFloat(s[3]) * (s[3].includes('sec') ? 1000 : 1));
				memorylimit.push(parseFloat(s[4]) * (s[4].includes('MB') ? 1000 : 1));
			});
		});
	}).on('close', async () => {
		if(problem_id.length === 0) {
			let n = 0;
			let s = 0;
			let f2 = false;
			if (/abc[0-9]{3}/.test(contest_name)) {
				let abc = Number(contest_name.substring(3));
				if(abc <= 125) n = 4;
				else if(abc <= 211) n = 6;
				else if(abc <= 318) n = 8;
				else n = 7;
			} else if (/arc[0-9]{3}/.test(contest_name)) {
				let arc = Number(contest_name.substring(3));
				if(arc <= 57) n = 4;
				else {
					n = 6;
					if(arc <= 104) s = 2;
					if(arc === 120) f2 = true;
				}
			} else if (/agc[0-9]{3}/.test(contest_name)) {
				let agc = Number(contest_name.substring(3));
				n = 6;
				if(agc === 28) f2 = true;
			}
			for (let i = s; i < n; ++i)
				problem_id.push(String.fromCharCode('a'.charCodeAt(0) + i));
			if (f2) problem_id.push('f2');
			for (let i = 0; i < problem_id.length; ++i) {
				problem_title.push('unknown');
				problem_label.push(problem_id[i].toUpperCase());
				problem_id[i] = contest_name.replaceAll('-', '_') + '_' + problem_id[i];
				timelimit.push(2000);
				memorylimit.push(1024000);
			}
		}
		callback(problem_id, problem_title, problem_label, timelimit, memorylimit);
	});
}

function add_problem(folder: vscode.Uri, contest_name: string, name: string, filename: string, template_uri: vscode.Uri | undefined) {
	const fullpath = vscode.Uri.joinPath(folder, name);
	vscode.workspace.fs.createDirectory(fullpath);
	const filepath = vscode.Uri.joinPath(fullpath, filename);
	const id = contest_name.replaceAll('-', '_') + '_' + name;
	const jsonstr =
`{
    "title": "${id}",
    "url": "https://atcoder.jp/contests/${contest_name}/tasks/${id}"
}\n`;
	vscode.workspace.fs.writeFile(vscode.Uri.joinPath(fullpath, 'problem/info.json'), (new TextEncoder).encode(jsonstr));
	if(template_uri != undefined) vscode.workspace.fs.copy(template_uri, filepath);
	else vscode.workspace.fs.writeFile(filepath, new Uint8Array);
}

export function activate(context: vscode.ExtensionContext) {
	console.log('"Online Judge Extension" is now active!');

	let disposable1 = vscode.commands.registerCommand('online-judge-extension.setup', async () => {
		if(!await check_py_version()) return;
		vscode.window.showInformationMessage('Installing setuptools...');
		child_process.exec('pip3 install setuptools', (error, stdout, stderr) => {
			if(error) {
				vscode.window.showErrorMessage('Something went wrong.');
				return;
			}
			vscode.window.showInformationMessage('Installing online-judge-tools...');
			child_process.exec('pip3 install online-judge-tools', (error, stdout, stderr) => {
				if(error) vscode.window.showErrorMessage('Something went wrong.');
				else vscode.window.showInformationMessage('online-judge-tools installed successfully.');
			});
		});
	});
	context.subscriptions.push(disposable1);

	let disposable2 = vscode.commands.registerCommand('online-judge-extension.newdir', async(target_directory : vscode.Uri) => {
		const config = vscode.workspace.getConfiguration('atcoder');
		const template_path = config.get<string>('templateFile');
		let template_uri : vscode.Uri | undefined = undefined;
		let filename = 'Main.txt';
		if(template_path !== undefined && template_path !== '') {
			template_uri = vscode.Uri.file(template_path);
			try {
				const stat = await vscode.workspace.fs.stat(template_uri);
				if(stat.type !== 1) {
					if(stat.type === 2) vscode.window.showErrorMessage('"Template File" path is a directory, not a file.');
					else vscode.window.showErrorMessage('The file pointed to by "Template File" path does not exist.');
					return;
				}
			} catch {
				vscode.window.showErrorMessage('The file pointed to by "Template File" path does not exist.');
				return;
			}
			filename = path.basename(template_path);
		}
		const contest_name = await vscode.window.showInputBox({
			title: 'Enter the contest name'
		});
		if(contest_name === undefined) return;
		if(contest_name === '') {
			vscode.window.showErrorMessage('The contest name is empty.');
			return;
		}
		get_contest_info(contest_name, (problem_id, problem_title, problem_label, timelimit, memorylimit) => {
			console.log(problem_id, problem_title, problem_label, timelimit, memorylimit);
		});
		/*
		let problem_id : string[] = [];
		const contest_name_ub = contest_name.replaceAll('-', '_');
		https.get(`https://atcoder.jp/contests/${contest_name}/tasks`, (res : any) => {
			if(res.statusCode !== 200) return;
			let html = '';
			res.on('data', (d : Uint8Array) => html += new TextDecoder().decode(d)).on('end', () => {
				const re = `<td><a href="/contests/${contest_name}/tasks/${contest_name_ub}_.*"`;
				const arr = html.match(new RegExp(re, 'g'));
				if(arr === null) return;
				arr.forEach(str => problem_id.push(str.slice(re.length - 3, -1)));
			});
		}).on('close', async () => {
			if(problem_id.length === 0) {
				let n = 0;
				let s = 0;
				let f2 = false;
				if(/abc[0-9]{3}/.test(contest_name)) {
					let abc = Number(contest_name.substring(3));
					if(abc <= 125) n = 4;
					else if(abc <= 211) n = 6;
					else if(abc <= 318) n = 8;
					else n = 7;
				}else if(/arc[0-9]{3}/.test(contest_name)) {
					let arc = Number(contest_name.substring(3));
					if(arc <= 57) n = 4;
					else {
						n = 6;
						if(arc <= 104) s = 2;
						if(arc === 120) f2 = true;
					}
				}else if(/agc[0-9]{3}/.test(contest_name)) {
					let agc = Number(contest_name.substring(3));
					n = 6;
					if(agc === 28) f2 = true;
				}
				if(n === 0) {
					const problems = await vscode.window.showInputBox({
						title: 'Enter the number of problems (1-26)'
					});
					if(problems === undefined) return;
					n = Number(problems);
					if(!Number.isInteger(n) || n < 1 || n > 26) {
						vscode.window.showErrorMessage('Incorrect input.\nEnter an integer between 1 and 26.');
						return;
					}
				}
				for(let i = s; i < n; ++i)
					problem_id.push(String.fromCharCode('a'.charCodeAt(0) + i));
				if(f2) problem_id.push('f2');
			}
			const folder = vscode.Uri.joinPath(target_directory, contest_name);
			problem_id.forEach(name => add_problem(folder, contest_name, name, filename, template_uri));
		});
		*/
	});
	context.subscriptions.push(disposable2);

	/*
	let disposable3 = vscode.commands.registerCommand('online-judge-extension.login', async() => {
		if(!await check_py_oj_version()) return;
		const sites = ['Atcoder', 'Codeforces', 'yukicoder', 'HackerRank', 'Toph'];
		const site = await vscode.window.showQuickPick(sites);
		if(site === undefined) return;
		let terminal = vscode.window.activeTerminal;
		if(terminal === undefined) terminal = vscode.window.createTerminal();
		terminal.show(true);
		terminal.sendText('python "' + path.join(path.dirname(__dirname), 'src/login.py') + `" ${site}`);
	});
	context.subscriptions.push(disposable3);
	*/
}

export function deactivate() {}

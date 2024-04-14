import * as vscode from 'vscode';
import * as child_process from 'node:child_process';
import * as path from 'node:path';

const py_version = [3, 12];
const oj_version = [11, 5, 1];
function check_py_version() {
	return new Promise((resolve) => {
		child_process.exec('pip3 --version', (error, stdout, stderr) => {
			if(error) {
				vscode.window.showErrorMessage('Please install python.');
				resolve(false);
				return;
			}
			const version = stdout.toString().replace(/.*python (\d+)\.(\d+)\)/, "$1 $2").split(' ').map(Number);
			if(py_version > version) {
				vscode.window.showErrorMessage(`This extension requires python ${py_version[0]}.${py_version[1]} or higher.`);
				resolve(false);
				return;
			}
			resolve(true);
		});
	});
}
function check_oj_version() {
	return new Promise((resolve) => {
		child_process.exec('oj --version', (error, stdout, stderr) => {
			if(error) {
				vscode.window.showErrorMessage('Please install online-judge-tools.');
				resolve(false);
				return;
			}
			console.log();
			const version = stdout.toString().replace(/online-judge-tools (\d+)\.(\d+)\.(\d+).*/, "$1 $2 $3").split(' ').map(Number);
			if(oj_version > version) {
				vscode.window.showErrorMessage(`This extension requires online-judge-tools ${oj_version[0]}.${oj_version[1]}.${oj_version[2]} or higher.`);
				resolve(false);
				return;
			}
			resolve(true);
		});
	});
}
async function check_py_oj_version() {
	const [py_ok, oj_ok] = await Promise.all([check_py_version(), check_oj_version()]);
	return py_ok && oj_ok;
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

	let disposable2 = vscode.commands.registerCommand('online-judge-extension.newdir', async() => {
		if(!await check_py_oj_version()) return;
		
	});
	context.subscriptions.push(disposable2);

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
}

export function deactivate() {}

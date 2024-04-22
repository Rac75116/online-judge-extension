import * as vscode from 'vscode';
import * as child_process from 'node:child_process';

const py_version = [3, 12];
const oj_version = [11, 5, 1];
export function check_py_version() {
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
export function check_oj_version() {
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
export async function check_py_oj_version() {
	const [py_ok, oj_ok] = await Promise.all([check_py_version(), check_oj_version()]);
	return py_ok && oj_ok;
}

import * as vscode from "vscode";
import { setup_command } from "./setup";
import { login_command } from "./login";
import { logout_command } from "./logout";
import { bundle_command } from "./bundle";
import { submit_command } from "./submit";
import { createdir_command } from "./createdir";
import { addproblem_command } from "./addproblem";
import { update_command } from "./update";

export async function activate(context: vscode.ExtensionContext) {
    console.log('"online-judge-extension" is now active!');

    context.subscriptions.push(setup_command);
    context.subscriptions.push(login_command);
    context.subscriptions.push(logout_command);
    context.subscriptions.push(bundle_command);
    context.subscriptions.push(submit_command);
    context.subscriptions.push(createdir_command);
    context.subscriptions.push(addproblem_command);
    context.subscriptions.push(update_command);
}

export function deactivate() {}

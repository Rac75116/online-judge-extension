import * as vscode from "vscode";
import * as os from "node:os";
import { exec_async, get_language, random_id } from "./global";

const clang_format = `---
BasedOnStyle: LLVM
AccessModifierOffset: 0
AlignAfterOpenBracket: DontAlign
AlignArrayOfStructures: None
AlignConsecutiveAssignments: None
AlignConsecutiveBitFields: None
AlignConsecutiveDeclarations: None
AlignConsecutiveMacros: None
AlignEscapedNewlines: DontAlign
AlignOperands: DontAlign
AlignTrailingComments: false
AllowAllArgumentsOnNextLine: false
AllowAllParametersOfDeclarationOnNextLine: false
AllowShortBlocksOnASingleLine: Always
AllowShortCaseLabelsOnASingleLine: true
AllowShortEnumsOnASingleLine: true
AllowShortFunctionsOnASingleLine: All
AllowShortIfStatementsOnASingleLine: AllIfsAndElse
AllowShortLambdasOnASingleLine: All
AllowShortLoopsOnASingleLine: true
AlwaysBreakAfterReturnType: None
AlwaysBreakBeforeMultilineStrings: false
AlwaysBreakTemplateDeclarations: No
AttributeMacros:
BinPackArguments: true
BinPackParameters: true
BitFieldColonSpacing: None
BreakBeforeBinaryOperators: NonAssignment
BreakBeforeBraces: Custom
BreakBeforeConceptDeclarations: false
BreakBeforeTernaryOperators: true
BreakConstructorInitializers: BeforeColon
BreakInheritanceList: BeforeColon
BreakStringLiterals: false
ColumnLimit: 0
CompactNamespaces: true
ConstructorInitializerIndentWidth: 0
ContinuationIndentWidth: 0
Cpp11BracedListStyle: true
DeriveLineEnding: false
DerivePointerAlignment: false
DisableFormat: false
EmptyLineAfterAccessModifier: Never
EmptyLineBeforeAccessModifier: Never
FixNamespaceComments: false
IndentAccessModifiers: false
IndentCaseBlocks: true
IndentCaseLabels: false
IndentExternBlock: NoIndent
IndentGotoLabels: false
IndentPPDirectives: None
IndentRequires: false
IndentWidth: 0
IndentWrappedFunctionNames: false
KeepEmptyLinesAtTheStartOfBlocks: false
LambdaBodyIndentation: OuterScope
Language: Cpp
MaxEmptyLinesToKeep: 0
NamespaceIndentation: None
PPIndentWidth: 0
PackConstructorInitializers: BinPack
PenaltyBreakAssignment: 1000
PenaltyBreakBeforeFirstCallParameter: 1000
PenaltyBreakComment: 1
PenaltyBreakFirstLessLess: 1000
PenaltyBreakString: 1
PenaltyBreakTemplateDeclaration: 1000
PenaltyExcessCharacter: 0
PenaltyIndentedWhitespace: 1000
PenaltyReturnTypeOnItsOwnLine: 0
PointerAlignment: Left
ReferenceAlignment: Left
ReflowComments: false
ShortNamespaceLines: 100000
SortIncludes: Never
SortUsingDeclarations: false
SpaceAfterCStyleCast: false
SpaceAfterLogicalNot: false
SpaceAfterTemplateKeyword: false
SpaceAroundPointerQualifiers: Default
SpaceBeforeAssignmentOperators: false
SpaceBeforeCaseColon: false
SpaceBeforeCpp11BracedList: false
SpaceBeforeCtorInitializerColon: false
SpaceBeforeInheritanceColon: false
SpaceBeforeParens: Never
SpaceBeforeRangeBasedForLoopColon: false
SpaceBeforeSquareBrackets: false
SpaceInEmptyBlock: false
SpaceInEmptyParentheses: false
SpacesBeforeTrailingComments: 0
SpacesInAngles: Never
SpacesInCStyleCastParentheses: false
SpacesInConditionalStatement: false
SpacesInParentheses: false
SpacesInSquareBrackets: false
Standard: Latest
TabWidth: 0
UseCRLF: false
UseTab: Never
BraceWrapping:
    AfterCaseLabel: false
    AfterClass: false
    AfterControlStatement: Never
    AfterEnum: false
    AfterFunction: false
    AfterNamespace: false
    AfterStruct: false
    AfterUnion: false
    AfterExternBlock: false
    BeforeCatch: false
    BeforeElse: false
    BeforeLambdaBody: false
    BeforeWhile: false
    IndentBraces: false
    SplitEmptyFunction: false
    SplitEmptyRecord: false
    SplitEmptyNamespace: false
`;

export async function minify_code(source_code: string, ext: string) {
    const working_dir = vscode.Uri.joinPath(vscode.Uri.file(os.homedir()), `./oj-ext/minify/${random_id(32)}`);
    await vscode.workspace.fs.createDirectory(working_dir);
    const uri = vscode.Uri.joinPath(working_dir, `minified${ext}`);
    await vscode.workspace.fs.writeFile(uri, new TextEncoder().encode(source_code));
    let result = source_code;
    const lang = get_language(ext);
    if (lang === "c++" || lang === "c") {
        try {
            await vscode.workspace.fs.writeFile(vscode.Uri.joinPath(working_dir, ".clang-format"), new TextEncoder().encode(clang_format));
            const document = await vscode.workspace.openTextDocument(uri);
            const edits: vscode.TextEdit[] | undefined = await vscode.commands.executeCommand("vscode.executeFormatDocumentProvider", uri, {});
            if (edits && edits.length > 0) {
                const workspaceEdit = new vscode.WorkspaceEdit();
                for (const edit of edits) {
                    workspaceEdit.replace(uri, edit.range, edit.newText);
                }
                const success = await vscode.workspace.applyEdit(workspaceEdit);
                if (success) {
                    await document.save();
                }
            }
        } catch {
            vscode.window.showWarningMessage("oj-ext: Failed to minify the code, continue with the original code.");
        } finally {
            result = new TextDecoder().decode(await vscode.workspace.fs.readFile(uri));
        }
    } else if (lang === "python") {
        await vscode.workspace.fs.createDirectory(working_dir);
        const uri = vscode.Uri.joinPath(working_dir, "minified.py");
        await vscode.workspace.fs.writeFile(uri, new TextEncoder().encode(source_code));
        const { error, stdout, stderr } = await exec_async(`pyminify ${uri.fsPath}`);
        if (error) {
            vscode.window.showWarningMessage("oj-ext: Failed to minify the code, continue with the original code.");
        } else {
            result = stdout;
        }
    }
    const workspaceEdit = new vscode.WorkspaceEdit();
    workspaceEdit.deleteFile(uri);
    await vscode.workspace.applyEdit(workspaceEdit);
    await vscode.workspace.fs.delete(working_dir, { recursive: true });
    return result;
}

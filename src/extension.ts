'use strict';
import { 
    commands, 
    CancellationToken,
    Disposable,
    ExtensionContext, 
    QuickPickOptions,
    QuickPickItem,
    Range,
    TextEditor,
    TextEditorEdit,
    window, 
} from 'vscode';

import {
    Clip, 
    Clipboard 
} from './Clipboard';

export function activate(context: ExtensionContext) {

    let palette: CodePalette = new CodePalette();
    var handlers = [];
    // Copy
    handlers.push(commands.registerTextEditorCommand(
        'clipboard.copy', 
        (textEditor: TextEditor) => {
            palette.addClip(textEditor);
            commands.executeCommand("editor.action.clipboardCopyAction");
        }
    ));

    // Cut
    handlers.push(commands.registerTextEditorCommand(
        'clipboard.cut', 
        (textEditor: TextEditor, textEditorEdit: TextEditorEdit) => {
            palette.addClip(textEditor);
            commands.executeCommand("editor.action.clipboardCutAction");
        }
    ));

    // Paste
    [1, 2, 3, 4, 5].forEach(element => {
        handlers.push(commands.registerTextEditorCommand(
            'clipboard.paste-' + element, 
            (textEditor: TextEditor, textEditorEdit: TextEditorEdit) => {
                palette.pasteClip(element, textEditor, textEditorEdit);
                commands.executeCommand("editor.action.clipboardPasteAction");
            }));
    });
    

    // Show Clipboard
    handlers.push(commands.registerTextEditorCommand(
        'clipboard.showClipboard', 
        (textEditor: TextEditor, textEditorEdit: TextEditorEdit) => {
            palette.showClipboard(Mode.All, textEditor, textEditorEdit);
        }
    ));

    // Show Clipboard (Language)
    handlers.push(commands.registerTextEditorCommand(
        'clipboard.showClipboardLang', 
        (textEditor: TextEditor, textEditorEdit: TextEditorEdit) => {
            palette.showClipboard(Mode.Language, textEditor, textEditorEdit);
        }
    ));

    // Show Clipboard (File)
    handlers.push(commands.registerTextEditorCommand(
        'clipboard.showClipboardFile', 
        (textEditor: TextEditor, textEditorEdit: TextEditorEdit) => {
            palette.showClipboard(Mode.File, textEditor, textEditorEdit);
        }
    ));

    // Remove Clips
    handlers.push(commands.registerTextEditorCommand(
        'clipboard.removeClip', 
        () => {
            palette.removeClip();
        }
    ));

    context.subscriptions.concat(handlers);
}

export function deactivate() { }

// UI
enum Mode {
    All,
    Language,
    File
}

class CodePalette {
    private clipboard: Clipboard = new Clipboard();

    public showClipboard(
        mode: Mode, 
        textEditor: TextEditor, 
        textEditorEdit: TextEditorEdit
    ) {
        // Filter depending on the mode
        let filteredClips: Clip[];
        switch (mode) {
            case Mode.All:
                filteredClips = this.clipboard.getClips();
                break;
            case Mode.File:
                filteredClips = this.clipboard.getClips()
                    .filter(
                        (clip) => 
                        clip.filename.toLocaleLowerCase() == 
                        textEditor.document.fileName.toLocaleLowerCase()
                    );
                break;
            case Mode.Language:
                filteredClips = this.clipboard.getClips()
                    .filter(
                        (clip) => 
                        clip.language.toLocaleLowerCase() == 
                        textEditor.document.languageId.toLocaleLowerCase()
                    );
                break;
        }

        this.showClipboardMenu(filteredClips.slice()).then((opt) => {
            if (opt !== null && opt instanceof Clip) {
                let text = (<Clip>opt).text;
                this.pasteText(text, textEditor, textEditorEdit);
            }
        });
    }

    
    /**
     * addClip
     */
    public addClip(textEditor: TextEditor) {
        if (!textEditor) {
            window.showWarningMessage("No editor is open!");
            return;
        }
        
        let selections = textEditor.selections;
        let doc = textEditor.document;
        
        for(let s of selections) {
            var text = doc.getText(new Range(s.start, s.end));
            
            this.clipboard.addClip(
                new Clip (text, doc.fileName, doc.languageId)
            );
        }
    }
    
    /**
     * removeClip
     */
    public removeClip() {
        this.showClipboardMenu(this.clipboard.getClips().slice()).then((opt) => {
            if (opt !== null && opt instanceof Clip) {
                this.clipboard.removeClip(opt);
            }
        });
    }

    /**
     * pasteClip
     */
    public pasteClip(index: number, textEditor: TextEditor, textEditorEdit: TextEditorEdit) {
        let clips = this.clipboard.getClips();
        if (index in clips) {
            this.pasteText(clips[index].text, textEditor, textEditorEdit);
        }
    }

    private pasteText(text: string, textEditor: TextEditor, textEditorEdit: TextEditorEdit) {
        // Using textEditorEdit doesn't seem to work like this :(
        // textEditorEdit.delete(textEditor.selection);
        // textEditorEdit.insert(textEditor.selection.start, text);

        textEditor.edit(function (textInserter) {
            textInserter.delete(textEditor.selection);
        }).then(function () {
            textEditor.edit(function (textInserter) {
                textInserter.insert(textEditor.selection.start, text)
            })
        });
    }

    private showClipboardMenu(items: QuickPickItem[]): Thenable<QuickPickItem | undefined> {
        let options: QuickPickOptions = { 
            matchOnDescription: true, 
            placeHolder: "Select your clip to copy!" 
        };

        // Clear option
        items.push({
            label: "", 
            description: "Clear Clipboard" 
        });

        return this.showClipboardOptions(items, options);
    }

    private showClipboardOptions<T extends QuickPickItem>(items: T[] | Thenable<T[]>, options?: QuickPickOptions, token?: CancellationToken): Thenable<T | undefined> {
        return window.showQuickPick(items).then((opt) => {
            if (opt === undefined) return null;

            if (opt instanceof Clip) {
                window.setStatusBarMessage("Clipboard cleared!");
                return opt;
            } else {
                // Handle other options
                if (opt.description === 'Clear Clipboard') {
                    this.clipboard.clear();
                    window.setStatusBarMessage("Clipboard cleared!");
                }
            }
            return null;
        });
    }
}
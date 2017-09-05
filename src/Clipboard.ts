'use strict';
import * as vscode from 'vscode';

export class Clip implements vscode.QuickPickItem {
    text: string;
    language: string;
    filename: string;

    // QuickPickItem interface
    get label(): string {
        var l: string = this.text
            .replace(/\n|\r/g, ' ')
            .trim()
            .substr(0, 70);

        if (this.text.length > 70) l += '...';
        return l;
    }

    get description(): string {
        return this.language.toUpperCase();
    }

    get detail(): string {
        return this.filename;
    }

    constructor(selection: string, filename: string, language: string) {
        this.text = selection;
        this.filename = filename;
        this.language = language;
    }
}

export class Clipboard {

    private clips:Clip[] = [];

    public addClip(sel: Clip) {
        this.clips.push(sel);
    }

    public removeClip(sel: Clip) {
        var i = this.clips.indexOf(sel);
        if (i >= 0) {
            this.clips.splice(i, 1);
        }
    }

    public getClips(): Clip[] {
        return this.clips;
    }

    public clear() {
        this.clips = [];
    }

    public dispose() {
        
    }
}
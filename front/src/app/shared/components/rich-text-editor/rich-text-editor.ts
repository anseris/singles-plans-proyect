import {
  Component,
  ElementRef,
  effect,
  input,
  model,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { richTextToPlainText, sanitizeRichText } from '../../utils/rich-text';

const EMOJIS = [
  '😀', '😃', '😄', '😊', '🙂', '😉', '😍', '🥰', '😎', '🤩',
  '🥳', '😜', '🤔', '🙌', '👍', '👎', '👏', '🙏', '💪', '🔥',
  '✨', '🎉', '💡', '❤️', '💜', '💙', '💚', '🧡', '💛', '💕',
  '🌈', '🌸', '🍀', '☀️', '🌊', '🏔️', '🚶', '🚴', '🍕', '☕',
  '🍷', '🎸', '📸', '🐶', '🐱', '🌍', '⛺', '🗺️', '🎒', '🥾',
];

@Component({
  selector: 'app-rich-text-editor',
  imports: [FormsModule],
  templateUrl: './rich-text-editor.html',
  styleUrl: './rich-text-editor.scss',
})
export class RichTextEditor {
  readonly value = model('');
  readonly placeholder = input('Escribe aquí...');
  readonly maxLength = input(5000);

  readonly emojis = EMOJIS;
  readonly emojiOpen = signal(false);
  readonly linkOpen = signal(false);
  readonly linkUrl = signal('');
  readonly plainLength = signal(0);

  private readonly editor = viewChild.required<ElementRef<HTMLElement>>('editor');
  private savedRange: Range | null = null;

  constructor() {
    effect(() => {
      const next = sanitizeRichText(this.value());
      const element = this.editor().nativeElement;
      untracked(() => {
        if (element.innerHTML !== next) element.innerHTML = next;
        this.plainLength.set(richTextToPlainText(next).length);
      });
    });
  }

  keepSelection(event: MouseEvent): void {
    event.preventDefault();
  }

  format(command: string, value?: string): void {
    const element = this.editor().nativeElement;
    element.focus();
    document.execCommand('styleWithCSS', false, 'false');
    document.execCommand(command, false, value);
    this.sync();
  }

  toggleEmoji(): void {
    this.savedRange = this.currentRange();
    this.emojiOpen.update((open) => !open);
    if (this.emojiOpen()) this.linkOpen.set(false);
  }

  insertEmoji(emoji: string): void {
    this.restoreSelection();
    this.format('insertText', emoji);
    this.emojiOpen.set(false);
  }

  toggleLink(): void {
    this.savedRange = this.currentRange();
    this.linkOpen.update((open) => !open);
    if (this.linkOpen()) this.emojiOpen.set(false);
  }

  applyLink(): void {
    const raw = this.linkUrl().trim();
    if (raw) {
      const url = /^(https?:\/\/|mailto:)/i.test(raw) ? raw : `https://${raw}`;
      this.restoreSelection();
      this.format('createLink', url);
    }
    this.linkOpen.set(false);
    this.linkUrl.set('');
  }

  cancelLink(): void {
    this.linkOpen.set(false);
    this.linkUrl.set('');
  }

  onInput(): void {
    this.sync();
  }

  onPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const text = event.clipboardData?.getData('text/plain') ?? '';
    document.execCommand('insertText', false, text);
    this.sync();
  }

  private sync(): void {
    const element = this.editor().nativeElement;
    const plain = richTextToPlainText(element.innerHTML);
    if (plain.length > this.maxLength()) {
      element.innerHTML = sanitizeRichText(this.value());
      return;
    }
    const sanitized = plain ? sanitizeRichText(element.innerHTML) : '';
    if (sanitized !== element.innerHTML) element.innerHTML = sanitized;
    this.plainLength.set(plain.length);
    this.value.set(sanitized);
  }

  private currentRange(): Range | null {
    const selection = window.getSelection();
    return selection && selection.rangeCount > 0 ? selection.getRangeAt(0).cloneRange() : null;
  }

  private restoreSelection(): void {
    if (!this.savedRange) return;
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(this.savedRange);
  }
}

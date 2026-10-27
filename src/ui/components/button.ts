export interface ButtonOptions {
  primary?: boolean;
  size?: 'small' | 'medium' | 'large';
}

const SIZES = {
  small: 'h-[30px] gap-1.5 px-[11px] text-[12.5px]',
  medium: 'h-9 gap-[7px] px-3.5 text-[13.5px]',
  large: 'h-12 gap-2 px-5 text-[15px]',
};

/** Shared by every raised control: it lifts a pixel under the pointer and sinks a pixel when pressed. */
const PRESSABLE =
  'cursor-pointer select-none border-0 no-underline transition-[box-shadow,translate] duration-150 ease-soft hover:-translate-y-px active:translate-y-px';

/** Ink with a lit top edge. */
const RAISED_INK =
  'bg-ink bg-linear-to-b from-[#3d3931] to-ink text-white shadow-raised-ink hover:shadow-raised-ink-hover active:from-ink active:to-[#2b2822] active:shadow-pressed-ink';
/** Paper-white with a lit top edge. */
const RAISED =
  'bg-white bg-linear-to-b from-white to-[#f3f0e9] text-ink shadow-raised hover:shadow-raised-hover active:from-[#efebe3] active:to-[#f6f3ed] active:shadow-pressed';

/** Class string for a pill button or link; `is-done` is added briefly after a copy succeeds. */
export function btn({ primary = false, size = 'medium' }: ButtonOptions = {}): string {
  return [
    'inline-flex items-center whitespace-nowrap rounded-full font-[550] leading-none [&.is-done]:text-ok',
    PRESSABLE,
    SIZES[size],
    primary ? RAISED_INK : RAISED,
  ].join(' ');
}

/** A round icon-only button, such as close. */
export function roundBtn(): string {
  return `grid size-9 flex-none place-items-center rounded-full text-ink ${PRESSABLE} ${RAISED}`;
}

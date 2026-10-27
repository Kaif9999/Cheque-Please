export interface ButtonOptions {
  primary?: boolean;
  size?: 'small' | 'medium' | 'large';
  /** Sits on the map rather than on paper, so it needs its own shadow. */
  floating?: boolean;
}

const SIZES = {
  small: 'h-[30px] gap-1.5 px-[11px] text-[12.5px]',
  medium: 'h-9 gap-[7px] px-3.5 text-[13.5px]',
  large: 'h-12 gap-2 px-5 text-[15px]',
};

/** Class string for a pill button or link; `is-done` is added briefly after a copy succeeds. */
export function btn({ primary = false, size = 'medium', floating = false }: ButtonOptions = {}): string {
  return [
    'inline-flex cursor-pointer items-center whitespace-nowrap rounded-full border font-[550] leading-none no-underline transition active:scale-[.97]',
    '[&.is-done]:border-ok [&.is-done]:bg-white [&.is-done]:text-ok',
    SIZES[size],
    primary ? 'border-ink bg-ink text-white hover:bg-[#2e2b25]' : 'border-line-2 bg-white text-ink hover:border-ink-3',
    floating ? 'border-transparent shadow-float hover:border-transparent' : '',
  ].join(' ');
}

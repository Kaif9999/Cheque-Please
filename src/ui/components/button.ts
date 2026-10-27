export interface ButtonOptions {
  primary?: boolean;
  small?: boolean;
}

/** Class string for a pill button or link; `is-done` is added briefly after a copy succeeds. */
export function btn({ primary = false, small = false }: ButtonOptions = {}): string {
  return [
    'inline-flex cursor-pointer items-center whitespace-nowrap rounded-full border font-[550] leading-none no-underline transition active:scale-[.97]',
    '[&.is-done]:border-ok [&.is-done]:bg-white [&.is-done]:text-ok',
    small ? 'h-[30px] gap-1.5 px-[11px] text-[12.5px]' : 'h-9 gap-[7px] px-3.5 text-[13.5px]',
    primary ? 'border-ink bg-ink text-white hover:bg-[#2e2b25]' : 'border-line-2 bg-white text-ink hover:border-ink-3',
  ].join(' ');
}

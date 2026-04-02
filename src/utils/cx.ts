/** falsy 値（false / null / undefined / ""）を除外してスペース区切りで結合する */
export function cx(...args: (string | false | null | undefined)[]): string {
  return args.filter(Boolean).join(" ");
}

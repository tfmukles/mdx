import { codes } from 'micromark-util-symbol/codes';
import { values } from 'micromark-util-symbol/values';

const lookupSymbolValue = (string: string): string | null => {
  let lookupValue: string | null = null;
  Object.entries(values).forEach(([key, value]) => {
    if (value === string) {
      lookupValue = key;
    }
  });
  return lookupValue;
};

export const lookupSymbolCode = (
  string: string | undefined | null
): number | null => {
  if (!string) {
    return null;
  }
  const lookup = lookupSymbolValue(string);
  let lookupValue: number | null = null;
  if (lookup) {
    Object.entries(codes).forEach(([key, value]) => {
      if (key === lookup) {
        lookupValue = value;
      }
    });
  }
  return lookupValue;
};

export const printSymbolCode = (num: number) => {
  let lookupValue: string | null = null;
  Object.entries(codes).forEach(([key, value]) => {
    if (value === num) {
      lookupValue = key;
    }
  });
  console.log(lookupValue);
};

export const logTokenEvents = (item: any) => {
  console.log(
    item.events.map((e: any) => {
      return `${e[0]} - ${e[1].type} | ${item.sliceSerialize(e[1])}`;
    })
  );
};

import { Forager } from 'forager'
import * as Types from 'forager/lib/types';

export declare type ReadOptions = {
  range?: Types.Range;
  Headers?: object
};

export async function getBinary(path: string, options?: any) {
  return Forager.read(path,options)
}

export async function getJson(path: string, options?: any): Promise<unknown> {
  return Forager.readJson(path,options)
}

export async function isReadable(path: string,options?: any) {
  try {
    await Forager.read(path,options)
    return true
  } catch (e) {
    return false
  }
}

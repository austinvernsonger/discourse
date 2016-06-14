import { censor } from 'discourse/lib/censored-words';

export function setup(helper) {
  return helper.addPreProcessor(censor);
}

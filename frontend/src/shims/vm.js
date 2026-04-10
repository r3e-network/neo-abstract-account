const unsupportedVmError = () =>
  new Error('The Node vm module is unavailable in the browser runtime.');

export function runInThisContext() {
  throw unsupportedVmError();
}

export function runInNewContext() {
  throw unsupportedVmError();
}

export class Script {
  constructor() {
    throw unsupportedVmError();
  }
}

export default {
  runInThisContext,
  runInNewContext,
  Script,
};

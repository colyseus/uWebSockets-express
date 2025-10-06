export function merge(a: any, b: any) {
  if (a && b) {
    for (var key in b) {
      a[key] = b[key];
    }
  }
  return a;
};

export function mixin(target: any, source: any) {
  for (const key of Object.getOwnPropertyNames(source)) {
    // skip if property is already defined by compatibility layer
    if (typeof target[key] === 'function') {
      continue;
    }

    if (typeof source[key] === 'function') {
      target[key] = source[key].bind(target);

    } else {
      target[key] = source[key];
    }

  }
  return target;
};
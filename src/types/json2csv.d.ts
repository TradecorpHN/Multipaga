declare module 'json2csv' {
  // Agrega tipado solo para lo que usas
  export class Parser<T = any> {
    constructor(opts?: any);
    parse(data: T[]): string;
  }
}

export class Singletons {
  static instances: { [id: string]: any } = {};

  private constructor() { }

  static get<T>(T: new () => any) {
    if (!(T.name in Singletons.instances))
      Singletons.instances[T.name] = new T()
    return Singletons.instances[T.name] as T
  }
}
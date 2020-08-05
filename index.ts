import tss from 'typescript/lib/tsserverlibrary';
import ipc from 'node-ipc';

function init(modules: { typescript: typeof tss }) {
  const ts = modules.typescript;

  function create(info: tss.server.PluginCreateInfo) {
    ipc.config.id = 'tsserver-connection-plugin';
    ipc.config.retry = 1500;
    ipc.config.silent = true;
    ipc.serve();
    ipc.server.start();

    ipc.server.on('runFunction', (args)=>{
      const result = (info.languageService as any)[args.functionName](...args.params);
      const response = {
        result,
        seq: args.seq
      };
      (ipc.server as any)['broadcast']('functionResponse', response)
    })
    
    // Set up decorator
    const proxy: tss.LanguageService = Object.create(null);
    for (let functionName of Object.keys(info.languageService) as Array<
      keyof tss.LanguageService
    >) {
      const x = info.languageService[functionName];
      proxy[functionName] = (...args: Array<{}>) => {
        (ipc.server as any)['broadcast']('callback', {name: functionName, args, result: x.apply(info.languageService, args)})
        return x.apply(info.languageService, args);
      }
    }
    return proxy;
  }

  return { create };
}

export = init;
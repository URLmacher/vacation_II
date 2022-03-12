import { PLATFORM, FrameworkConfiguration } from 'aurelia-framework';

export function configure(config: FrameworkConfiguration): void {
  config.globalResources(PLATFORM.moduleName(`resources/good-game/good-game`));
}

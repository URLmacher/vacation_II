import { FrameworkConfiguration, PLATFORM } from 'aurelia-framework';

export function configure(config: FrameworkConfiguration): void {
  config
    .feature(PLATFORM.moduleName(`resources/good-game/index`))
}
